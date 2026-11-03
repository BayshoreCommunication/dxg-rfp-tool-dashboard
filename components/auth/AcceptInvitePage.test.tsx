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

const mockStartGoogle = jest.fn()

jest.mock('@/app/actions/acceptInvitation', () => ({
  startGoogleInvitationAction: (...a: unknown[]) => mockStartGoogle(...a),
}))

const TOKEN = 'q3Jf8w_-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'

const found = (companySso = false): InvitationLookupResult => ({
  success: true,
  message: 'ok',
  data: {
    email: 'new.planner@acme.test',
    role: 'planner',
    organizationName: 'Acme Events',
    inviterName: 'Olivia Owner',
    teamName: 'East Coast',
    expiresAt: '2026-11-10T00:00:00.000Z',
    accountExists: false,
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
    expect(screen.getByText(/Olivia Owner invited you/)).toBeInTheDocument()
    expect(screen.getAllByText('Planner').length).toBeGreaterThan(0)
    expect(screen.getAllByText('East Coast').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/new\.planner@acme\.test/).length).toBeGreaterThan(0)
  })

  it('has no password form any more', () => {
    render(<AcceptInvitePage token={TOKEN} lookup={found()} />)
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /forgot/i })).not.toBeInTheDocument()
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
