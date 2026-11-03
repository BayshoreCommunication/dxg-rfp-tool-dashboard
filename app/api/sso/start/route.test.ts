/** @jest-environment node */

import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'

jest.mock('@/lib/authRefresh', () => ({ AUTH_API_ORIGIN: 'https://api.example.test' }))

import { GET } from './route'

const INVITE = 'q3Jf8w_-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'
const call = (query: string) => GET(new NextRequest(`https://app.example.test/api/sso/start?${query}`))

describe('GET /api/sso/start', () => {
  it('sets the bind cookie and redirects to the backend with its hash', async () => {
    const response = await call('kind=company&email=Pat@Acme.test')
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('https://api.example.test')
    expect(location.pathname).toBe('/api/auth/sso/start')
    expect(location.searchParams.get('kind')).toBe('company')
    expect(location.searchParams.get('email')).toBe('pat@acme.test')

    const cookie = response.cookies.get('rfp_sso_bind')
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe('lax')
    expect(cookie?.maxAge).toBe(600)
    expect(cookie?.path).toBe('/')
    expect(location.searchParams.get('bind')).toBe(createHash('sha256').update(cookie!.value).digest('hex'))
    // The raw bind value never leaves in the URL.
    expect(location.toString()).not.toContain(cookie!.value)
  })

  it('passes Microsoft and the invitation through', async () => {
    const response = await call(`kind=microsoft&invite=${INVITE}`)
    const location = new URL(response.headers.get('location')!)
    expect(location.searchParams.get('kind')).toBe('microsoft')
    expect(location.searchParams.get('invite')).toBe(INVITE)
    expect(location.searchParams.has('email')).toBe(false)
  })

  it('sends a bad request back to sign-in with a code, without a cookie', async () => {
    const response = await call('kind=company&email=nope')
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get('location')!)
    expect(location.origin).toBe('https://app.example.test')
    expect(location.pathname).toBe('/sign-in')
    expect(location.searchParams.get('error')).toBe('SSO_EMAIL_INVALID')
    expect(response.cookies.get('rfp_sso_bind')).toBeUndefined()
  })

  it('keeps an invitee on the invite page when the request is bad', async () => {
    const response = await call(`kind=company&invite=${INVITE}`)
    const location = new URL(response.headers.get('location')!)
    expect(location.pathname).toBe(`/invite/${INVITE}`)
    expect(location.searchParams.get('error')).toBe('SSO_EMAIL_INVALID')
  })
})
