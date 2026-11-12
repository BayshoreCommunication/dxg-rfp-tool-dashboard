/** @jest-environment node */

import { RFP_NOUN } from '@/test/wording'
import { createHash } from 'node:crypto'
import {
  backendSsoStartUrl,
  createSsoBindValue,
  hashSsoBind,
  normalizeSsoEmail,
  parseSsoStartRequest,
  sanitizeHandoff,
  SSO_ERROR_MESSAGES,
  SSO_FALLBACK_MESSAGE,
  ssoErrorMessage,
  ssoStartPath,
} from './sso'

const INVITE = 'q3Jf8w_-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'

describe('ssoErrorMessage', () => {
  // Every code in the plan's contract, plus the ones the round trip can add.
  const planCodes = [
    'SSO_REQUIRED',
    'SSO_NOT_CONFIGURED',
    'SSO_DOMAIN_NOT_ALLOWED',
    'SSO_IDENTITY_MISMATCH',
    'MICROSOFT_EMAIL_UNVERIFIED',
    'EMAIL_IN_ANOTHER_ORGANIZATION',
    'PASSWORD_SIGN_IN_DISABLED',
    'ORGANIZATION_SETUP_REQUIRED',
  ]

  it.each(Object.keys(SSO_ERROR_MESSAGES))('maps %s to a human message without the raw code', (code) => {
    const message = ssoErrorMessage(code)
    expect(message).not.toContain(code)
    expect(message.length).toBeGreaterThan(20)
  })

  it.each(planCodes)('knows the plan code %s', (code) => {
    expect(ssoErrorMessage(code)).not.toBe(SSO_FALLBACK_MESSAGE)
  })

  it('never names the organization for SSO_NOT_CONFIGURED or SSO_REQUIRED', () => {
    expect(ssoErrorMessage('SSO_NOT_CONFIGURED')).not.toMatch(/organization/i)
    expect(ssoErrorMessage('SSO_REQUIRED')).toMatch(/Sign in with your company/)
    expect(ssoErrorMessage('ORGANIZATION_SETUP_REQUIRED')).toMatch(/isn't part of an organization yet.*Contact RFPilot support/)
  })

  it('falls back for unknown and inherited keys', () => {
    expect(ssoErrorMessage('SOMETHING_NEW')).toBe(SSO_FALLBACK_MESSAGE)
    expect(ssoErrorMessage('toString')).toBe(SSO_FALLBACK_MESSAGE)
    expect(ssoErrorMessage(undefined)).toBe(SSO_FALLBACK_MESSAGE)
  })

  it('says proposal, not RFP', () => {
    for (const message of Object.values(SSO_ERROR_MESSAGES)) expect(message).not.toMatch(RFP_NOUN)
  })
})

describe('parseSsoStartRequest', () => {
  const parse = (query: string) => parseSsoStartRequest(new URLSearchParams(query))

  it('accepts Microsoft with or without an invitation', () => {
    expect(parse('kind=microsoft')).toEqual({ ok: true, request: { kind: 'microsoft', invite: undefined } })
    expect(parse(`kind=microsoft&invite=${INVITE}`)).toEqual({
      ok: true,
      request: { kind: 'microsoft', invite: INVITE },
    })
  })

  it('needs a usable email for company sign-in and lowercases it', () => {
    expect(parse('kind=company&email=%20Pat@Acme.TEST%20')).toEqual({
      ok: true,
      request: { kind: 'company', email: 'pat@acme.test', invite: undefined },
    })
    expect(parse('kind=company')).toEqual({ ok: false, code: 'SSO_EMAIL_INVALID' })
    expect(parse('kind=company&email=not-an-email')).toEqual({ ok: false, code: 'SSO_EMAIL_INVALID' })
  })

  it('refuses unknown kinds and malformed invitations', () => {
    expect(parse('kind=google')).toEqual({ ok: false, code: 'SSO_INVALID_REQUEST' })
    expect(parse('')).toEqual({ ok: false, code: 'SSO_INVALID_REQUEST' })
    expect(parse('kind=microsoft&invite=../../x')).toEqual({ ok: false, code: 'INVITATION_INVALID' })
  })
})

describe('urls and values', () => {
  it('builds the backend /start URL on the public API origin', () => {
    const url = new URL(
      backendSsoStartUrl('https://api.example.test', { kind: 'company', email: 'pat@acme.test', invite: INVITE }, 'ab'.repeat(32)),
    )
    expect(url.origin).toBe('https://api.example.test')
    expect(url.pathname).toBe('/api/auth/sso/start')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      kind: 'company',
      email: 'pat@acme.test',
      invite: INVITE,
      bind: 'ab'.repeat(32),
    })
  })

  it('builds the dashboard start path for the buttons', () => {
    expect(ssoStartPath({ kind: 'microsoft' })).toBe('/api/sso/start?kind=microsoft')
    expect(ssoStartPath({ kind: 'company', email: 'pat@acme.test' })).toBe(
      '/api/sso/start?kind=company&email=pat%40acme.test',
    )
  })

  it('hashes the bind value as lowercase hex SHA-256', async () => {
    const value = createSsoBindValue()
    expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(createSsoBindValue()).not.toBe(value)
    await expect(hashSsoBind(value)).resolves.toBe(createHash('sha256').update(value).digest('hex'))
  })

  it('only passes handoffs that can be one', () => {
    expect(sanitizeHandoff('h'.repeat(32))).toBe('h'.repeat(32))
    expect(sanitizeHandoff('short')).toBeNull()
    expect(sanitizeHandoff('has spaces in it, sixteen+')).toBeNull()
    expect(sanitizeHandoff(undefined)).toBeNull()
  })

  it('normalizes emails', () => {
    expect(normalizeSsoEmail(' A@B.CO ')).toBe('a@b.co')
    expect(normalizeSsoEmail('a b@c.co')).toBeNull()
    expect(normalizeSsoEmail(42)).toBeNull()
  })
})
