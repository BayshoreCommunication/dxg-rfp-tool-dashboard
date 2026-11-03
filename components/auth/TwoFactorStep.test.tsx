import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TwoFactorStep from './TwoFactorStep'

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}))

const mockStart = jest.fn()
const mockComplete = jest.fn()
const mockCancel = jest.fn()

jest.mock('@/app/actions/auth', () => ({
  startTwoFactorEnrolmentAction: (...a: unknown[]) => mockStart(...a),
  completeTwoFactorAction: (...a: unknown[]) => mockComplete(...a),
  cancelTwoFactorAction: (...a: unknown[]) => mockCancel(...a),
}))

const later = () => Date.now() + 10 * 60_000

const renderStep = (nextStep: 'two_factor_challenge' | 'two_factor_enrolment') => {
  const onCancel = jest.fn()
  const onSignedIn = jest.fn()
  render(
    <TwoFactorStep
      pending={{ nextStep, expiresAt: later() }}
      onCancel={onCancel}
      onSignedIn={onSignedIn}
      accountLabel="planner@example.com"
    />,
  )
  return { onCancel, onSignedIn }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCancel.mockResolvedValue({ success: true })
})

describe('TwoFactorStep: challenge', () => {
  it('signs in with a 6-digit code', async () => {
    mockComplete.mockResolvedValue({ success: true, message: 'Signed in' })
    const { onSignedIn } = renderStep('two_factor_challenge')

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123 456' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify and sign in/ }))

    await waitFor(() => expect(onSignedIn).toHaveBeenCalled())
    expect(mockComplete).toHaveBeenCalledWith({ mode: 'challenge', code: '123456' })
  })

  it('does not call the server with an incomplete code', async () => {
    renderStep('two_factor_challenge')
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify and sign in/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/6-digit code/)
    expect(mockComplete).not.toHaveBeenCalled()
  })

  it('shows a wrong code as a human message and stays on the step', async () => {
    mockComplete.mockResolvedValue({
      success: false,
      code: 'TWO_FACTOR_INVALID_CODE',
      restart: false,
      message: 'raw',
    })
    renderStep('two_factor_challenge')
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify and sign in/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/isn't valid/)
    expect(screen.getByLabelText('Verification code')).toHaveValue('')
  })

  it('accepts a recovery code instead', async () => {
    mockComplete.mockResolvedValue({ success: true, message: 'Signed in' })
    const { onSignedIn } = renderStep('two_factor_challenge')
    fireEvent.click(screen.getByRole('button', { name: /Use a recovery code instead/ }))
    fireEvent.change(screen.getByLabelText('Recovery code'), { target: { value: 'ABCD-EFGH-JKMN' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify and sign in/ }))
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled())
    expect(mockComplete).toHaveBeenCalledWith({ mode: 'challenge', recoveryCode: 'ABCD-EFGH-JKMN' })
  })

  it('sends the user back to sign in when the attempt expired', async () => {
    mockComplete.mockResolvedValue({
      success: false,
      code: 'TWO_FACTOR_CHALLENGE_INVALID',
      restart: true,
      message: 'expired',
    })
    const { onCancel } = renderStep('two_factor_challenge')
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /Verify and sign in/ }))
    expect(await screen.findByText('Sign in again')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(/expired/)
    fireEvent.click(screen.getByRole('button', { name: /Back to sign in/ }))
    await waitFor(() => expect(onCancel).toHaveBeenCalled())
    expect(mockCancel).toHaveBeenCalled()
  })
})

describe('TwoFactorStep: forced enrolment', () => {
  it('shows the QR and key, confirms, then shows recovery codes once', async () => {
    mockStart.mockResolvedValue({
      success: true,
      message: 'ok',
      data: {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUri: 'otpauth://totp/RFPilot:planner?secret=JBSWY3DPEHPK3PXP',
        qrDataUrl: 'data:image/png;base64,AAAA',
      },
    })
    mockComplete.mockResolvedValue({
      success: true,
      message: 'Signed in',
      recoveryCodes: ['AAAA-BBBB-CCCC', 'DDDD-EEEE-FFFF'],
    })
    const { onSignedIn } = renderStep('two_factor_enrolment')

    expect(await screen.findByAltText(/QR code/)).toHaveAttribute('src', 'data:image/png;base64,AAAA')
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(mockStart).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('Code from your app'), { target: { value: '654321' } })
    fireEvent.click(screen.getByRole('button', { name: /Turn on and sign in/ }))

    expect(await screen.findByText('AAAA-BBBB-CCCC')).toBeInTheDocument()
    expect(mockComplete).toHaveBeenCalledWith({ mode: 'enrol', code: '654321' })

    const proceed = screen.getByRole('button', { name: /Continue to Dashboard/ })
    expect(proceed).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/saved these codes/))
    fireEvent.click(proceed)
    expect(onSignedIn).toHaveBeenCalled()
  })

  it('offers a retry when setup could not start', async () => {
    mockStart
      .mockResolvedValueOnce({ success: false, code: 'server_unavailable', message: 'x' })
      .mockResolvedValueOnce({
        success: true,
        message: 'ok',
        data: { secret: 'S3CR3T', otpauthUri: 'otpauth://x', qrDataUrl: null },
      })
    renderStep('two_factor_enrolment')
    fireEvent.click(await screen.findByRole('button', { name: /Try again/ }))
    expect(await screen.findByText('S3CR 3T')).toBeInTheDocument()
    expect(mockStart).toHaveBeenCalledTimes(2)
  })
})
