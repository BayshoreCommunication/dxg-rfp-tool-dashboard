import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TwoFactorCard from './TwoFactorCard'

const startMock = jest.fn()
const confirmMock = jest.fn()

jest.mock('@/app/actions/security', () => ({
  startTwoFactorEnrolmentAction: () => startMock(),
  confirmTwoFactorEnrolmentAction: (code: string) => confirmMock(code),
  disableTwoFactorAction: jest.fn(),
  regenerateRecoveryCodesAction: jest.fn(),
}))

jest.mock('qrcode', () => ({ __esModule: true, default: { toDataURL: () => Promise.resolve('data:image/png;base64,x') } }))
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const off = { enabled: false, pendingEnrolment: false, recoveryCodesRemaining: 0, requiredByOrganization: false }

describe('TwoFactorCard enrolment', () => {
  beforeEach(() => {
    startMock.mockReset()
    confirmMock.mockReset()
  })

  it('shows the QR and key, confirms a code and shows recovery codes once', async () => {
    const user = userEvent.setup()
    const onChanged = jest.fn()
    startMock.mockResolvedValue({ success: true, data: { otpauthUri: 'otpauth://totp/RFPilot:a', secret: 'JBSWY3DPEHPK3PXP' } })
    confirmMock.mockResolvedValue({ success: true, data: { recoveryCodes: ['aaaa-bbbb', 'cccc-dddd'] } })

    render(<TwoFactorCard status={off} onChanged={onChanged} />)
    await user.click(screen.getByRole('button', { name: /turn on two-factor/i }))

    expect(await screen.findByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(await screen.findByAltText(/qr code/i)).toBeInTheDocument()

    const submit = screen.getByRole('button', { name: /^turn on$/i })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText(/6-digit code/i), '123456')
    await user.click(submit)

    expect(confirmMock).toHaveBeenCalledWith('123456')
    expect(await screen.findByText('aaaa-bbbb')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /saved them/i }))
    expect(onChanged).toHaveBeenCalled()
    expect(screen.queryByText('aaaa-bbbb')).not.toBeInTheDocument()
  })

  it('keeps the QR on a wrong code and shows a human message', async () => {
    const user = userEvent.setup()
    startMock.mockResolvedValue({ success: true, data: { otpauthUri: 'otpauth://totp/x', secret: 'ABCDEFGH' } })
    confirmMock.mockResolvedValue({ success: false, code: 'TWO_FACTOR_INVALID_CODE', status: 401, message: 'x' })

    render(<TwoFactorCard status={off} onChanged={jest.fn()} />)
    await user.click(screen.getByRole('button', { name: /turn on two-factor/i }))
    await user.type(await screen.findByLabelText(/6-digit code/i), '000000')
    await user.click(screen.getByRole('button', { name: /^turn on$/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/isn't valid/i))
    expect(screen.getByText('ABCD EFGH')).toBeInTheDocument()
  })

  it('shows status and disables turn off when the organization requires 2FA', () => {
    render(
      <TwoFactorCard
        status={{ enabled: true, pendingEnrolment: false, recoveryCodesRemaining: 7, requiredByOrganization: true }}
        onChanged={jest.fn()}
      />,
    )
    expect(screen.getByText(/7 recovery codes left/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /turn off/i })).toBeDisabled()
  })
})
