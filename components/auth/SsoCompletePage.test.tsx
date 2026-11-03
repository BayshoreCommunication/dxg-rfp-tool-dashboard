import { render, screen, waitFor } from '@testing-library/react'
import SsoCompletePage from './SsoCompletePage'

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}))

const mockComplete = jest.fn()
jest.mock('@/app/actions/auth', () => ({
  completeSsoSignInAction: (...a: unknown[]) => mockComplete(...a),
}))

const HANDOFF = 'h_'.repeat(16)

beforeEach(() => jest.clearAllMocks())

describe('SsoCompletePage', () => {
  it('trades the handoff once and goes to the dashboard', async () => {
    mockComplete.mockResolvedValue({ success: true, message: 'ok' })
    const navigate = jest.fn()
    const { rerender } = render(<SsoCompletePage handoff={HANDOFF} navigate={navigate} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Signing you in/)
    rerender(<SsoCompletePage handoff={HANDOFF} navigate={navigate} />)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
    expect(mockComplete).toHaveBeenCalledTimes(1)
    expect(mockComplete).toHaveBeenCalledWith(HANDOFF)
  })

  it('continues on the sign-in code step when Microsoft needs a second factor', async () => {
    mockComplete.mockResolvedValue({
      success: false,
      code: 'two_factor_required',
      message: '2fa',
      twoFactor: { nextStep: 'two_factor_challenge', expiresAt: Date.now() + 600_000 },
    })
    const navigate = jest.fn()
    render(<SsoCompletePage handoff={HANDOFF} navigate={navigate} />)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/sign-in?step=two-factor'))
  })

  it('shows a refusal as a message with a way back', async () => {
    mockComplete.mockResolvedValue({
      success: false,
      code: 'SSO_BIND_MISMATCH',
      message: 'This sign-in was started in a different browser or tab. Please sign in again from this page.',
    })
    render(<SsoCompletePage handoff={HANDOFF} navigate={jest.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/different browser/)
    expect(screen.getByRole('link', { name: /Back to sign in/ })).toHaveAttribute('href', '/sign-in')
  })

  it('needs a handoff', () => {
    render(<SsoCompletePage navigate={jest.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/expired or was already used/)
    expect(mockComplete).not.toHaveBeenCalled()
  })
})
