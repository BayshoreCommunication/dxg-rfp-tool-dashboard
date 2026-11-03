import {
  formatManualKey,
  initialTwoFactorState,
  isCompleteTotpCode,
  isPlausibleRecoveryCode,
  normalizeRecoveryCode,
  normalizeTotpCode,
  readSecondFactorStep,
  recoveryCodesFileText,
  twoFactorErrorMessage,
  twoFactorErrorRequiresRestart,
  twoFactorReducer,
  type TwoFactorState,
} from './twoFactor'

describe('readSecondFactorStep', () => {
  const step = {
    success: true,
    twoFactorRequired: true,
    nextStep: 'two_factor_challenge',
    challengeToken: 'tok_123',
    challengeExpiresAt: 1_900_000_000_000,
  }

  it('reads the challenge step returned instead of tokens', () => {
    expect(readSecondFactorStep(step)).toEqual({
      nextStep: 'two_factor_challenge',
      challengeToken: 'tok_123',
      expiresAt: 1_900_000_000_000,
    })
  })

  it('reads the forced enrolment step', () => {
    expect(readSecondFactorStep({ ...step, nextStep: 'two_factor_enrolment' })?.nextStep)
      .toBe('two_factor_enrolment')
  })

  it('treats an ordinary session response as no second factor', () => {
    expect(readSecondFactorStep({ success: true, accessToken: 'a', refreshToken: 'r', user: { _id: 'u' } }))
      .toBeNull()
    expect(readSecondFactorStep(null)).toBeNull()
    expect(readSecondFactorStep('nope')).toBeNull()
  })

  it('rejects a malformed step', () => {
    expect(readSecondFactorStep({ ...step, nextStep: 'sms' })).toBeNull()
    expect(readSecondFactorStep({ ...step, challengeToken: '' })).toBeNull()
    expect(readSecondFactorStep({ ...step, twoFactorRequired: 'yes' })).toBeNull()
  })

  it('falls back to a ten-minute expiry when the backend omits one', () => {
    const before = Date.now()
    const read = readSecondFactorStep({ ...step, challengeExpiresAt: undefined })
    expect(read!.expiresAt).toBeGreaterThanOrEqual(before + 10 * 60_000)
  })
})

describe('code input helpers', () => {
  it('keeps six digits from a pasted code', () => {
    expect(normalizeTotpCode(' 123 456 ')).toBe('123456')
    expect(normalizeTotpCode('123-4567')).toBe('123456')
    expect(isCompleteTotpCode('123456')).toBe(true)
    expect(isCompleteTotpCode('12345')).toBe(false)
  })

  it('keeps a pasted recovery code without whitespace', () => {
    expect(normalizeRecoveryCode(' abcd-efgh-jkmn \n')).toBe('abcd-efgh-jkmn')
    expect(isPlausibleRecoveryCode('abcd-efgh-jkmn')).toBe(true)
    expect(isPlausibleRecoveryCode('abc')).toBe(false)
  })

  it('groups the manual key in fours', () => {
    expect(formatManualKey('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP')
  })

  it('writes every recovery code into the download', () => {
    const text = recoveryCodesFileText(['AAAA-BBBB-CCCC', 'DDDD-EEEE-FFFF'], 'a@b.co')
    expect(text).toContain('AAAA-BBBB-CCCC')
    expect(text).toContain('DDDD-EEEE-FFFF')
    expect(text).toContain('Account: a@b.co')
  })
})

describe('error mapping', () => {
  it('turns backend codes into human messages', () => {
    expect(twoFactorErrorMessage('TWO_FACTOR_INVALID_CODE')).toMatch(/isn't valid/)
    expect(twoFactorErrorMessage('TWO_FACTOR_LOCKED')).toMatch(/Too many/)
    expect(twoFactorErrorMessage('SOMETHING_NEW')).not.toMatch(/SOMETHING_NEW/)
  })

  it('sends the user back to sign-in only for dead challenges', () => {
    expect(twoFactorErrorRequiresRestart('TWO_FACTOR_CHALLENGE_INVALID')).toBe(true)
    expect(twoFactorErrorRequiresRestart('TWO_FACTOR_INVALID_CODE')).toBe(false)
    expect(twoFactorErrorRequiresRestart('TWO_FACTOR_LOCKED')).toBe(false)
    expect(twoFactorErrorRequiresRestart(undefined)).toBe(false)
  })
})

describe('twoFactorReducer', () => {
  const challenge = initialTwoFactorState('two_factor_challenge')

  it('starts on the code entry or on setup', () => {
    expect(challenge.phase).toBe('challenge')
    expect(initialTwoFactorState('two_factor_enrolment').phase).toBe('enrol-loading')
  })

  it('switches between authenticator and recovery code and clears the error', () => {
    const failed = twoFactorReducer(challenge, { type: 'failed', code: 'TWO_FACTOR_INVALID_CODE' })
    const recovery = twoFactorReducer(failed, { type: 'use-recovery-code' })
    expect(recovery.phase).toBe('recovery')
    expect(recovery.error).toBe('')
    expect(twoFactorReducer(recovery, { type: 'use-authenticator' }).phase).toBe('challenge')
  })

  it('does not offer recovery codes during setup', () => {
    const scanning: TwoFactorState = {
      ...initialTwoFactorState('two_factor_enrolment'),
      phase: 'enrol-scan',
    }
    expect(twoFactorReducer(scanning, { type: 'use-recovery-code' })).toBe(scanning)
  })

  it('stays on the step after a wrong code', () => {
    const submitting = twoFactorReducer(challenge, { type: 'submit' })
    expect(submitting.submitting).toBe(true)
    const failed = twoFactorReducer(submitting, { type: 'failed', code: 'TWO_FACTOR_INVALID_CODE' })
    expect(failed.phase).toBe('challenge')
    expect(failed.submitting).toBe(false)
    expect(failed.error).toMatch(/isn't valid/)
  })

  it('moves to restart when the challenge has expired', () => {
    const failed = twoFactorReducer(challenge, { type: 'failed', code: 'TWO_FACTOR_CHALLENGE_INVALID' })
    expect(failed.phase).toBe('restart')
    expect(failed.error).toMatch(/expired/)
  })

  it('uses a local message when there is no backend code', () => {
    const failed = twoFactorReducer(challenge, { type: 'failed', message: 'Enter the 6-digit code.' })
    expect(failed.error).toBe('Enter the 6-digit code.')
  })

  it('walks forced enrolment from loading to scan to recovery codes', () => {
    const loading = initialTwoFactorState('two_factor_enrolment')
    const scanning = twoFactorReducer(loading, {
      type: 'enrolment-loaded',
      enrolment: { secret: 'S', otpauthUri: 'otpauth://totp/x', qrDataUrl: 'data:image/png;base64,x' },
    })
    expect(scanning.phase).toBe('enrol-scan')
    expect(scanning.enrolment?.secret).toBe('S')
    const done = twoFactorReducer(twoFactorReducer(scanning, { type: 'submit' }), {
      type: 'enrolled',
      recoveryCodes: ['A', 'B'],
    })
    expect(done.phase).toBe('recovery-codes')
    expect(done.recoveryCodes).toEqual(['A', 'B'])
    expect(done.submitting).toBe(false)
  })

  it('lets setup be retried unless the challenge is dead', () => {
    const loading = initialTwoFactorState('two_factor_enrolment')
    const failed = twoFactorReducer(loading, { type: 'enrolment-failed', code: 'server_unavailable' })
    expect(failed.phase).toBe('enrol-failed')
    expect(twoFactorReducer(failed, { type: 'retry-enrolment' }).phase).toBe('enrol-loading')
    expect(
      twoFactorReducer(loading, { type: 'enrolment-failed', code: 'TWO_FACTOR_CHALLENGE_INVALID' }).phase,
    ).toBe('restart')
  })
})
