import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import SignupPage from './SignupPage'

// ORG-306: a work email on a domain an organization has verified is asked to
// request access first; creating a separate organization stays possible.

jest.mock('next/image', () => ({ __esModule: true, default: () => null }))
jest.mock('next-auth/react', () => ({ signIn: jest.fn() }))

const mockSendOtp = jest.fn()
const mockVerifyOtp = jest.fn()
const mockSignUp = jest.fn()
const mockSignIn = jest.fn()
const mockRequest = jest.fn()
const mockSeparate = jest.fn()
const mockForget = jest.fn()
jest.mock('@/app/actions/auth', () => ({
  sendSignupOtpAction: (...a: unknown[]) => mockSendOtp(...a),
  verifySignupOtpAction: (...a: unknown[]) => mockVerifyOtp(...a),
  signUpAction: (...a: unknown[]) => mockSignUp(...a),
  signInAction: (...a: unknown[]) => mockSignIn(...a),
  requestOrganizationAccessAction: (...a: unknown[]) => mockRequest(...a),
  startGoogleSeparateOrganizationAction: (...a: unknown[]) => mockSeparate(...a),
  forgetGoogleDomainMatchAction: (...a: unknown[]) => mockForget(...a),
}))

const replace = jest.fn()
beforeEach(() => jest.clearAllMocks())

const reachMatch = async () => {
  mockSendOtp.mockResolvedValue({ success: true, message: 'sent' })
  mockVerifyOtp.mockResolvedValue({ success: true, message: 'ok', organizationMatch: { name: 'Bayshore Communication' } })
  render(<SignupPage navigate={replace} />)
  fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'laiba@bayshore.test' } })
  fireEvent.click(screen.getByRole('button', { name: /Continue with email/ }))
  fireEvent.change(await screen.findByLabelText('Verification code'), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: /Verify code/ }))
  await screen.findByRole('heading', { name: 'Your organization may already use RFPilot' })
}

it('offers Request access when the domain belongs to an organization, and sends it to the admins', async () => {
  await reachMatch()
  expect(screen.getByText('Bayshore Communication')).toBeInTheDocument()
  expect(screen.getByText('@bayshore.test')).toBeInTheDocument()
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()

  mockRequest.mockResolvedValue({ success: true, status: 'pending', organizationName: 'Bayshore Communication' })
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Laiba Khan' } })
  fireEvent.click(screen.getByRole('button', { name: 'Request access' }))
  await screen.findByRole('heading', { name: 'Request sent' })
  expect(mockRequest).toHaveBeenCalledWith('laiba@bayshore.test', 'Laiba Khan')
  expect(screen.getByRole('status')).toHaveTextContent(/asked the admins at Bayshore Communication/)
  expect(mockSignUp).not.toHaveBeenCalled()
})

it('says an invitation is on its way when the organization auto-approves', async () => {
  await reachMatch()
  mockRequest.mockResolvedValue({ success: true, status: 'invited', organizationName: 'Bayshore Communication' })
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Laiba Khan' } })
  fireEvent.click(screen.getByRole('button', { name: 'Request access' }))
  expect(await screen.findByRole('status')).toHaveTextContent(/emailed an invitation to laiba@bayshore.test/)
})

it('can still create a separate organization, which is sent explicitly', async () => {
  await reachMatch()
  fireEvent.click(screen.getByRole('button', { name: /Create a separate organization/ }))
  await screen.findByRole('heading', { name: 'Almost done' })
  mockSignUp.mockResolvedValue({ success: true, message: 'created' })
  mockSignIn.mockResolvedValue({ success: true, message: 'ok' })
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Laiba Khan' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-9' } })
  fireEvent.click(screen.getByRole('button', { name: /Create account/ }))
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
  expect(mockSignUp).toHaveBeenCalledWith({
    name: 'Laiba Khan', email: 'laiba@bayshore.test', password: 'correct-horse-9', separateOrganization: true,
  })
})

it('needs a name before sending a request', async () => {
  await reachMatch()
  fireEvent.click(screen.getByRole('button', { name: 'Request access' }))
  expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
  expect(mockRequest).not.toHaveBeenCalled()
})

it('after Google: Request access emails a code first; separate organization goes back to Google', async () => {
  render(<SignupPage navigate={replace} googleMatch={{ email: 'laiba@bayshore.test', organizationName: 'Bayshore Communication' }} />)
  expect(screen.getByRole('heading', { name: 'Your organization may already use RFPilot' })).toBeInTheDocument()

  mockSeparate.mockResolvedValue({ success: true })
  fireEvent.click(screen.getByRole('button', { name: /Create a separate organization/ }))
  await waitFor(() => expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' }))
  expect(mockSeparate).toHaveBeenCalled()

  mockForget.mockResolvedValue({ success: true })
  mockSendOtp.mockResolvedValue({ success: true, message: 'sent' })
  fireEvent.click(screen.getByRole('button', { name: 'Request access' }))
  await screen.findByRole('heading', { name: 'Verify your email' })
  expect(mockSendOtp).toHaveBeenCalledWith('laiba@bayshore.test')
})
