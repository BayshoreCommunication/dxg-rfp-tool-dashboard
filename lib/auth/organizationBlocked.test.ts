import { RFP_NOUN } from '@/test/wording'
import { invitationErrorView } from './invitation'
import {
  isOrganizationBlockedBody,
  ORGANIZATION_BLOCKED_CODE,
  ORGANIZATION_BLOCKED_MESSAGE,
  ORGANIZATION_BLOCKED_SIGN_IN_PATH,
} from './organizationBlocked'
import { ssoErrorMessage } from './sso'
import { twoFactorErrorMessage, twoFactorErrorRequiresRestart } from './twoFactor'

describe('organization blocked by RFPilot', () => {
  it('has one message that names neither who paused the access nor why', () => {
    expect(ORGANIZATION_BLOCKED_MESSAGE).toBe(
      "Your organization's access to RFPilot is paused. Contact RFPilot support for help.",
    )
    expect(ORGANIZATION_BLOCKED_MESSAGE).not.toMatch(/staff|admin|blocked|because|reason/i)
    expect(ORGANIZATION_BLOCKED_MESSAGE).not.toMatch(RFP_NOUN)
    expect(ORGANIZATION_BLOCKED_MESSAGE).not.toContain(ORGANIZATION_BLOCKED_CODE)
  })

  it('is the message on every sign-in path', () => {
    // /sign-in?error=, Google, Microsoft and company SSO (callback redirect and exchange).
    expect(ssoErrorMessage(ORGANIZATION_BLOCKED_CODE)).toBe(ORGANIZATION_BLOCKED_MESSAGE)
    // Two-factor challenge and enrolment confirm.
    expect(twoFactorErrorMessage(ORGANIZATION_BLOCKED_CODE)).toBe(ORGANIZATION_BLOCKED_MESSAGE)
    // Invitation accept (password, register, Google, Microsoft round trip).
    expect(invitationErrorView(ORGANIZATION_BLOCKED_CODE)).toEqual({
      kind: 'form',
      code: ORGANIZATION_BLOCKED_CODE,
      message: ORGANIZATION_BLOCKED_MESSAGE,
    })
  })

  it('ends the two-factor step: the backend issues no challenge for a blocked organization', () => {
    expect(twoFactorErrorRequiresRestart(ORGANIZATION_BLOCKED_CODE)).toBe(true)
  })

  it('sends a member whose session ended to the sign-in page with the code', () => {
    expect(ORGANIZATION_BLOCKED_SIGN_IN_PATH).toBe('/sign-in?error=ORGANIZATION_BLOCKED')
  })

  it('recognises the backend answer under either key and nothing else', () => {
    expect(isOrganizationBlockedBody({ code: 'ORGANIZATION_BLOCKED' })).toBe(true)
    expect(isOrganizationBlockedBody({ errorCode: 'ORGANIZATION_BLOCKED' })).toBe(true)
    expect(isOrganizationBlockedBody({ code: 'MEMBERSHIP_INACTIVE' })).toBe(false)
    expect(isOrganizationBlockedBody({ message: 'ORGANIZATION_BLOCKED' })).toBe(false)
    expect(isOrganizationBlockedBody(null)).toBe(false)
    expect(isOrganizationBlockedBody('ORGANIZATION_BLOCKED')).toBe(false)
  })
})
