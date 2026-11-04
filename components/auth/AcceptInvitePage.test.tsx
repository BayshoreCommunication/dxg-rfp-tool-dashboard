import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import type { InvitationLookupResult } from '@/app/actions/acceptInvitation'
import { invitationErrorView } from '@/lib/auth/invitation'
import AcceptInvitePage from './AcceptInvitePage'

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

const mockAccept = jest.fn()
const mockStartGoogle = jest.fn()

jest.mock('@/app/actions/acceptInvitation', () => ({
  acceptInvitationAction: (...a: unknown[]) => mockAccept(...a),
  startGoogleInvitationAction: (...a: unknown[]) => mockStartGoogle(...a),
}))

jest.mock('@/app/actions/auth', () => ({
  startTwoFactorEnrolmentAction: jest.fn(() => new Promise(() => {})),
  completeTwoFactorAction: jest.fn(),
  cancelTwoFactorAction: jest.fn(),
}))

const TOKEN = 'q3Jf8w_-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'

const found = (companySso = false, accountExists = false): InvitationLookupResult => ({
  success: true,
  message: 'ok',
  data: {
    email: 'new.planner@acme.test',
    role: 'planner',
    organizationName: 'Acme Events',
    inviterName: 'Olivia Owner',
    teamName: 'East Coast',
    expiresAt: '2026-11-10T00:00:00.000Z',
    accountExists,
    companySso,
  },
})

const dead = (code: string): InvitationLookupResult => {
  const error = invitationErrorView(code)
  return { success: false, message: error.message, error }
}

beforeEach(() => jest.clearAllMocks())

describe('AcceptInvitePage', () => {
  it('shows the organization, inviter, role, team and invited email', () => {
    render(<AcceptInvitePage token={TOKEN} lookup={found()} />)
    expect(screen.getAllByText('Acme Events').length).toBeGreaterThan(0)
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && /^Olivia Owner invited you to join Acme Events as Planner on the East Coast team\.$/.test(el.textContent ?? '')),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Planner').length).toBeGreaterThan(0)
    expect(screen.getAllByText('East Coast').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/new\.planner@acme\.test/).length).toBeGreaterThan(0)
  })

  it('names the invited email and expiry instead of an email field', () => {
    const { container } = render(<AcceptInvitePage token={TOKEN} lookup={found()} />)
    expect(screen.getByText(/expires Nov 10/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /email/i })).not.toBeInTheDocument()
    // Password managers save the new password against the invited email.
    const username = container.querySelector('input[autocomplete="username"]')
    expect(username).toHaveValue('new.planner@acme.test')
    expect(username).not.toBeDisabled()
  })

  it('follows the lookup and offers no switch between creating and signing in', () => {
    const { unmount } = render(<AcceptInvitePage token={TOKEN} lookup={found(false, false)} />)
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sign in instead/ })).not.toBeInTheDocument()
    unmount()
    render(<AcceptInvitePage token={TOKEN} lookup={found(false, true)} />)
    expect(screen.getByRole('heading', { name: 'Sign in to join' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create an account/ })).not.toBeInTheDocument()
  })

  it.each([
    ['INVITATION_EXPIRED', /has expired/],
    ['INVITATION_REVOKED', /withdrawn/],
    ['INVITATION_ALREADY_USED', /already been used/],
    ['INVITATION_SUPERSEDED', /newer invitation/],
    ['INVITATION_INVALID', /isn't valid/],
  ])('shows a dead link page for %s', (code, title) => {
    render(<AcceptInvitePage token={TOKEN} lookup={dead(code)} />)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go to sign in/ })).toHaveAttribute('href', '/sign-in')
    expect(screen.queryByText(code)).not.toBeInTheDocument()
  })

  it('creates an account with the invited email', async () => {
    mockAccept.mockReturnValue(new Promise(() => {}))
    render(<AcceptInvitePage token={TOKEN} lookup={found(false)} />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Pat Planner' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: /Create account and join/ }))
    await waitFor(() => expect(mockAccept).toHaveBeenCalled())
    expect(mockAccept).toHaveBeenCalledWith({
      token: TOKEN,
      mode: 'register',
      email: 'new.planner@acme.test',
      name: 'Pat Planner',
      password: 'correct-horse',
      organizationName: 'Acme Events',
    })
  })

  it('checks the form before calling the server', () => {
    render(<AcceptInvitePage token={TOKEN} lookup={found(false)} />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Pat' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: /Create account and join/ }))
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/)
    expect(mockAccept).not.toHaveBeenCalled()
  })

  it('signs an existing account in and switches forms when the account exists', async () => {
    const error = invitationErrorView('ACCOUNT_EXISTS')
    mockAccept.mockResolvedValue({ success: false, message: error.message, error })
    render(<AcceptInvitePage token={TOKEN} lookup={found(false)} />)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Pat' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: /Create account and join/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/)
    expect(screen.getByRole('button', { name: /Sign in and join/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument()
  })

  it('turns a dead link found during accept into the dead link page', async () => {
    const error = invitationErrorView('INVITATION_REVOKED')
    mockAccept.mockResolvedValue({ success: false, message: error.message, error })
    render(<AcceptInvitePage token={TOKEN} lookup={found(false, true)} />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in and join/ }))
    expect(await screen.findByRole('heading', { name: /withdrawn/ })).toBeInTheDocument()
  })

  it('continues to the two-factor step when the organization requires it', async () => {
    mockAccept.mockResolvedValue({
      success: false,
      message: '2fa',
      twoFactor: { nextStep: 'two_factor_enrolment', expiresAt: Date.now() + 600_000 },
    })
    render(<AcceptInvitePage token={TOKEN} lookup={found(false, true)} />)
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign in and join/ }))
    expect(await screen.findByRole('heading', { name: /Set up two-factor/ })).toBeInTheDocument()
  })

  it('parks the invitation before continuing with Google', async () => {
    mockStartGoogle.mockResolvedValue({ success: true, message: 'ok' })
    render(<AcceptInvitePage token={TOKEN} lookup={found()} />)
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' }))
    expect(mockStartGoogle).toHaveBeenCalledWith({ token: TOKEN, organizationName: 'Acme Events' })
  })

  it('sends Microsoft through /api/sso/start with the invitation', () => {
    render(<AcceptInvitePage token={TOKEN} lookup={found()} />)
    const link = screen.getByRole('link', { name: /Continue with Microsoft/ })
    expect(link).toHaveAttribute('href', `/api/sso/start?kind=microsoft&invite=${TOKEN}`)
  })

  it('offers company sign-in for the invited email only when the domain has a connection', () => {
    const { rerender } = render(<AcceptInvitePage token={TOKEN} lookup={found(false)} />)
    expect(screen.queryByRole('form', { name: /Sign in with your company/ })).not.toBeInTheDocument()

    rerender(<AcceptInvitePage token={TOKEN} lookup={found(true)} />)
    const form = screen.getByRole('form', { name: /Sign in with your company/ })
    expect(form).toHaveAttribute('action', '/api/sso/start')
    const values = Object.fromEntries(new FormData(form as HTMLFormElement).entries())
    expect(values).toEqual({ kind: 'company', invite: TOKEN, email: 'new.planner@acme.test' })
  })

  it('shows a refusal from the round trip as a message', () => {
    render(
      <AcceptInvitePage
        token={TOKEN}
        lookup={found()}
        initialErrorCode="INVITATION_EMAIL_MISMATCH"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/different email/)
  })

  it('explains Require SSO without showing the code', () => {
    render(<AcceptInvitePage token={TOKEN} lookup={found()} initialErrorCode="SSO_REQUIRED" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/company account/)
    expect(screen.queryByText(/SSO_REQUIRED/)).not.toBeInTheDocument()
  })
})
