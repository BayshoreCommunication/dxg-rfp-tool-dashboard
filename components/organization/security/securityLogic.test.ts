import {
  confirmErrorRestarts,
  enrolmentReducer,
  formatSecret,
  initialEnrolmentState,
  recoveryCodesFileText,
  type EnrolmentState,
} from './enrolmentState'
import { domainOutcomeText, formatCheckTime, normalizeDomainInput } from './domainDisplay'
import { resetBlockReason, roleLabel } from './memberReset'
import { isSixDigitCode, secondFactorPayload, securityErrorMessage } from './securityMessages'

describe('securityErrorMessage', () => {
  const codes = [
    'TWO_FACTOR_INVALID_CODE',
    'TWO_FACTOR_LOCKED',
    'TWO_FACTOR_ENROLMENT_NOT_STARTED',
    'REAUTHENTICATION_FAILED',
    'TWO_FACTOR_REQUIRED_FOR_ACTOR',
    'TWO_FACTOR_RESET_SHARED_ACCOUNT',
    'DOMAIN_INVALID',
    'DOMAIN_NOT_VERIFIABLE',
    'DOMAIN_LIMIT_REACHED',
    'DOMAIN_ALREADY_ADDED',
  ]

  it.each(codes)('maps %s to a human message without the raw code', (code) => {
    const message = securityErrorMessage(code, 'domain')
    expect(message).not.toContain(code)
    expect(message.length).toBeGreaterThan(20)
  })

  it('explains the shared-account reset refusal and points to support', () => {
    expect(securityErrorMessage('TWO_FACTOR_RESET_SHARED_ACCOUNT', 'reset')).toMatch(/another organization.*support/i)
  })

  it('explains the Owner protection on reset', () => {
    expect(securityErrorMessage('FORBIDDEN', 'reset', 403)).toMatch(/only the owner/i)
    expect(securityErrorMessage(undefined, 'reset', 403)).toMatch(/only the owner/i)
  })

  it('treats a 403 elsewhere as a role refusal', () => {
    expect(securityErrorMessage('FORBIDDEN', 'domain', 403)).toMatch(/owners and admins/i)
    expect(securityErrorMessage(undefined, 'orgSecurity', 403)).toMatch(/owners and admins/i)
  })

  it('tells an admin to set up their own 2FA before requiring it', () => {
    expect(securityErrorMessage('TWO_FACTOR_REQUIRED_FOR_ACTOR', 'orgSecurity')).toMatch(/your own account/i)
  })

  it('says public mail domains are not verifiable', () => {
    expect(securityErrorMessage('DOMAIN_NOT_VERIFIABLE', 'domain')).toMatch(/public email/i)
  })

  it('handles rate limiting and unknown codes', () => {
    expect(securityErrorMessage(undefined, 'enrol', 429)).toMatch(/too many/i)
    expect(securityErrorMessage('SOMETHING_NEW', 'disable', 500)).toBe(
      "Couldn't turn off two-factor authentication. Please try again.",
    )
  })
})

describe('secondFactorPayload', () => {
  it('sends 6 digits as a code', () => {
    expect(secondFactorPayload(' 123 456 ')).toEqual({ code: '123456' })
  })
  it('sends anything else as a recovery code', () => {
    expect(secondFactorPayload('abcd-efgh')).toEqual({ recoveryCode: 'abcd-efgh' })
  })
  it('rejects empty input and partial numeric codes', () => {
    expect(secondFactorPayload('   ')).toBeNull()
    expect(secondFactorPayload('12345')).toBeNull()
  })
  it('validates 6-digit codes', () => {
    expect(isSixDigitCode('123456')).toBe(true)
    expect(isSixDigitCode('12345a')).toBe(false)
  })
})

describe('enrolmentReducer', () => {
  const scan: EnrolmentState = { step: 'scan', otpauthUri: 'otpauth://totp/x', secret: 'ABCD' }

  it('walks the happy path: start, scan, confirm, codes, finish', () => {
    let state = enrolmentReducer(initialEnrolmentState, { type: 'start' })
    expect(state).toEqual({ step: 'starting' })
    state = enrolmentReducer(state, { type: 'started', otpauthUri: 'otpauth://totp/x', secret: 'ABCD' })
    expect(state).toEqual(scan)
    state = enrolmentReducer(state, { type: 'confirm' })
    expect(state.step).toBe('confirming')
    state = enrolmentReducer(state, { type: 'confirmed', recoveryCodes: ['a', 'b'] })
    expect(state).toEqual({ step: 'codes', recoveryCodes: ['a', 'b'] })
    state = enrolmentReducer(state, { type: 'finish' })
    expect(state).toEqual({ step: 'idle' })
  })

  it('returns to idle with an error when starting fails', () => {
    const state = enrolmentReducer({ step: 'starting' }, { type: 'startFailed', error: 'nope' })
    expect(state).toEqual({ step: 'idle', error: 'nope' })
  })

  it('keeps the QR code on a wrong code', () => {
    const confirming = enrolmentReducer(scan, { type: 'confirm' })
    const state = enrolmentReducer(confirming, { type: 'confirmFailed', error: 'bad code' })
    expect(state).toEqual({ ...scan, error: 'bad code' })
  })

  it('restarts when the setup expired', () => {
    const confirming = enrolmentReducer(scan, { type: 'confirm' })
    const state = enrolmentReducer(confirming, { type: 'confirmFailed', error: 'expired', restart: true })
    expect(state).toEqual({ step: 'idle', error: 'expired' })
    expect(confirmErrorRestarts('TWO_FACTOR_ENROLMENT_NOT_STARTED')).toBe(true)
    expect(confirmErrorRestarts('TWO_FACTOR_INVALID_CODE')).toBe(false)
  })

  it('cancels from scan but never drops unsaved recovery codes', () => {
    expect(enrolmentReducer(scan, { type: 'cancel' })).toEqual({ step: 'idle' })
    const codes: EnrolmentState = { step: 'codes', recoveryCodes: ['a'] }
    expect(enrolmentReducer(codes, { type: 'cancel' })).toBe(codes)
  })

  it('ignores events that do not fit the current step', () => {
    expect(enrolmentReducer(initialEnrolmentState, { type: 'confirm' })).toBe(initialEnrolmentState)
    expect(enrolmentReducer(scan, { type: 'start' })).toBe(scan)
  })

  it('formats the setup key and recovery file', () => {
    expect(formatSecret('ABCDEFGHIJ')).toBe('ABCD EFGH IJ')
    const text = recoveryCodesFileText(['one', 'two'])
    expect(text).toContain('one\ntwo')
  })
})

describe('member reset gating', () => {
  it('blocks resetting yourself', () => {
    expect(resetBlockReason({ userId: 'u1', role: 'planner' }, { userId: 'u1', role: 'organization_admin' })).toMatch(/your own/i)
  })
  it('protects the Owner from Admins', () => {
    expect(resetBlockReason({ userId: 'o', role: 'owner' }, { userId: 'a', role: 'organization_admin' })).toMatch(/only the owner/i)
    expect(resetBlockReason({ userId: 'o', role: 'owner' }, { userId: 'o2', role: 'owner' })).toBeNull()
  })
  it('allows Admins to reset other members', () => {
    expect(resetBlockReason({ userId: 'p', role: 'planner' }, { userId: 'a', role: 'organization_admin' })).toBeNull()
  })
  it('labels roles for the UI', () => {
    expect(roleLabel('organization_admin')).toBe('Admin')
    expect(roleLabel('team_manager')).toBe('Team Manager')
  })
})

describe('domain display', () => {
  it('normalizes pasted domains', () => {
    expect(normalizeDomainInput(' https://Example.com/path ')).toBe('example.com')
    expect(normalizeDomainInput('jane@acme.co')).toBe('acme.co')
  })
  it('describes check outcomes without saying a domain is taken', () => {
    expect(domainOutcomeText('txt_record_found')).toMatch(/found/i)
    expect(domainOutcomeText('not_verified')).not.toMatch(/taken|another/i)
    expect(domainOutcomeText('dns_error:ENOTFOUND')).toMatch(/retry/i)
    expect(domainOutcomeText(null)).toBeNull()
  })
  it('formats the last check time', () => {
    const now = new Date('2026-11-03T12:00:00Z')
    expect(formatCheckTime(null, now)).toBe('Not checked yet')
    expect(formatCheckTime('2026-11-03T11:50:00Z', now)).toBe('10 min ago')
  })
})
