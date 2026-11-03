import {
  DEAD_LINK_CODES,
  invitationErrorView,
  invitationRoleLabel,
  redactInvitationUrl,
  sanitizeInvitationToken,
  switchesAcceptMode,
  validateRegisterForm,
} from './invitation'
import {
  parsePostSignInNotice,
  postSignInNoticeText,
  readCookie,
} from './postSignInNotice'

describe('invitationErrorView', () => {
  it.each(DEAD_LINK_CODES)('shows %s as a dead link with its own copy', (code) => {
    const view = invitationErrorView(code)
    expect(view.kind).toBe('dead-link')
    if (view.kind !== 'dead-link') return
    expect(view.title).toBeTruthy()
    expect(view.message).toBeTruthy()
    expect(`${view.title} ${view.message}`).not.toContain(code)
  })

  it('gives each dead-link code a different title', () => {
    const titles = DEAD_LINK_CODES.map((code) => {
      const view = invitationErrorView(code)
      return view.kind === 'dead-link' ? view.title : ''
    })
    expect(new Set(titles).size).toBe(DEAD_LINK_CODES.length)
  })

  it.each([
    ['WRONG_PASSWORD', /Incorrect password/],
    ['WEAK_PASSWORD', /at least 8/],
    ['INVITATION_EMAIL_MISMATCH', /different email/],
    ['ACCOUNT_EXISTS', /already exists/],
    ['ACCOUNT_NOT_FOUND', /no account/],
    ['EMAIL_IN_ANOTHER_ORGANIZATION', /another organization/],
    ['RATE_LIMITED', /Too many attempts/],
    ['server_unavailable', /reach the server/],
  ])('maps accept error %s to a form message', (code, message) => {
    const view = invitationErrorView(code)
    expect(view.kind).toBe('form')
    expect(view.message).toMatch(message)
  })

  it('never shows an unknown raw code', () => {
    const view = invitationErrorView('SOME_NEW_BACKEND_CODE')
    expect(view.kind).toBe('form')
    expect(view.message).not.toContain('SOME_NEW_BACKEND_CODE')
    expect(invitationErrorView(undefined).message).toBeTruthy()
  })
})

describe('switchesAcceptMode', () => {
  it('moves to sign-in when the account turns out to exist', () => {
    expect(switchesAcceptMode('ACCOUNT_EXISTS')).toBe('existing')
    expect(switchesAcceptMode('ALREADY_MEMBER')).toBe('existing')
  })

  it('moves to sign-up when there is no account', () => {
    expect(switchesAcceptMode('ACCOUNT_NOT_FOUND')).toBe('register')
  })

  it('stays put for anything else', () => {
    expect(switchesAcceptMode('WRONG_PASSWORD')).toBeNull()
  })
})

describe('invitation helpers', () => {
  it('labels backend roles the way the UI names them', () => {
    expect(invitationRoleLabel('organization_admin')).toBe('Admin')
    expect(invitationRoleLabel('team_manager')).toBe('Team Manager')
    expect(invitationRoleLabel('planner')).toBe('Planner')
    expect(invitationRoleLabel('viewer')).toBe('Viewer')
    expect(invitationRoleLabel('owner')).toBe('Owner')
    expect(invitationRoleLabel('mystery')).toBe('Member')
  })

  it('accepts base64url tokens and nothing else', () => {
    const token = 'q3Jf8w_-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'
    expect(sanitizeInvitationToken(token)).toBe(token)
    expect(sanitizeInvitationToken(`  ${token} `)).toBe(token)
    expect(sanitizeInvitationToken('short')).toBeNull()
    expect(sanitizeInvitationToken('../../etc/passwd-aaaaaaaaaaaa')).toBeNull()
    expect(sanitizeInvitationToken('%E0%A4%A')).toBeNull()
    expect(sanitizeInvitationToken(undefined)).toBeNull()
  })

  it('validates the create-account form', () => {
    expect(validateRegisterForm({ name: ' ', password: 'longenough', confirmPassword: 'longenough' }))
      .toMatch(/name/)
    expect(validateRegisterForm({ name: 'Jo', password: 'short', confirmPassword: 'short' }))
      .toMatch(/8 characters/)
    expect(validateRegisterForm({ name: 'Jo', password: 'longenough', confirmPassword: 'different' }))
      .toMatch(/don't match/)
    expect(validateRegisterForm({ name: 'Jo', password: 'longenough', confirmPassword: 'longenough' }))
      .toBeNull()
  })

  it('redacts the token from URLs sent to analytics', () => {
    expect(redactInvitationUrl('https://app.example/invite/abcDEF123_-xyz?error=X'))
      .toBe('https://app.example/invite/[token]?error=X')
    expect(redactInvitationUrl('https://app.example/dashboard')).toBe('https://app.example/dashboard')
  })
})

describe('post sign-in notice', () => {
  it('round-trips a welcome notice through the cookie value', () => {
    const raw = encodeURIComponent(JSON.stringify({ type: 'welcome', organizationName: 'Acme Events' }))
    const notice = parsePostSignInNotice(readCookie(`a=1; rfpilot-notice=${raw}; b=2`, 'rfpilot-notice'))
    expect(notice).toEqual({ type: 'welcome', organizationName: 'Acme Events' })
    expect(postSignInNoticeText(notice!)).toBe('Welcome to Acme Events')
  })

  it('ignores junk', () => {
    expect(parsePostSignInNotice('not-json')).toBeNull()
    expect(parsePostSignInNotice(encodeURIComponent('{"type":"welcome","organizationName":""}'))).toBeNull()
    expect(parsePostSignInNotice(null)).toBeNull()
  })

  it('words the low recovery code warning', () => {
    expect(postSignInNoticeText({ type: 'recovery-codes-low', remaining: 1 })).toMatch(/1 recovery code left/)
    expect(postSignInNoticeText({ type: 'recovery-codes-low', remaining: 0 })).toMatch(/last recovery code/)
  })
})
