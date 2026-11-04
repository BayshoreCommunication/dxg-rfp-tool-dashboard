import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import SigninPage from './SigninPage'
import SignupPage from './SignupPage'

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

const mockSignIn = jest.fn()
const mockDiscover = jest.fn()
const mockSendOtp = jest.fn()
const mockVerifyOtp = jest.fn()
const mockSignUp = jest.fn()
jest.mock('@/app/actions/auth', () => ({
  signInAction: (...a: unknown[]) => mockSignIn(...a),
  discoverSignInMethodAction: (...a: unknown[]) => mockDiscover(...a),
  sendSignupOtpAction: (...a: unknown[]) => mockSendOtp(...a),
  verifySignupOtpAction: (...a: unknown[]) => mockVerifyOtp(...a),
  signUpAction: (...a: unknown[]) => mockSignUp(...a),
  startTwoFactorEnrolmentAction: jest.fn(() => new Promise(() => {})),
  completeTwoFactorAction: jest.fn(),
  cancelTwoFactorAction: jest.fn(),
}))

const replace = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('SigninPage', () => {
  const continueWith = async (email: string) => {
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  }

  it('asks for the email once, next to Google and Microsoft', () => {
    render(<SigninPage />)
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue with Microsoft/ })).toHaveAttribute(
      'href',
      '/api/sso/start?kind=microsoft',
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByRole('form', { name: /Sign in with your company/ })).not.toBeInTheDocument()
  })

  it('shows the password form for an email without company SSO, and signs in', async () => {
    mockDiscover.mockResolvedValue({ success: true, method: 'password' })
    mockSignIn.mockResolvedValue({ success: true, message: 'ok' })
    render(<SigninPage navigate={replace} />)
    await continueWith(' Pat@Acme.test ')
    expect(await screen.findByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(mockDiscover).toHaveBeenCalledWith('pat@acme.test')
    expect(screen.getByLabelText('Email Address')).toHaveValue('pat@acme.test')
    expect(screen.getByRole('link', { name: /Forgot password/i })).toHaveAttribute('href', '/forgot-password')
    expect(screen.queryByRole('form', { name: /Sign in with your company/ })).not.toBeInTheDocument()
    // The email chose the password route, so the other providers step aside.
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Continue with Microsoft/ })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/ }))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
    expect(mockSignIn).toHaveBeenCalledWith('pat@acme.test', 'correct-horse', false)
  })

  it('shows a refused password sign-in as a message', async () => {
    mockDiscover.mockResolvedValue({ success: true, method: 'password' })
    mockSignIn.mockResolvedValue({ success: false, code: 'WRONG_PASSWORD', message: 'Incorrect password. Please try again.' })
    render(<SigninPage navigate={replace} />)
    await continueWith('pat@acme.test')
    fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: /Sign In to Dashboard/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Incorrect password/)
    expect(replace).not.toHaveBeenCalled()
  })

  it('sends an email on a company SSO domain to company sign-in', async () => {
    mockDiscover.mockResolvedValue({ success: true, method: 'company' })
    render(<SigninPage />)
    await continueWith('pat@acme.test')
    const form = (await screen.findByRole('form', { name: /Sign in with your company/ })) as HTMLFormElement
    expect(form).toHaveAttribute('action', '/api/sso/start')
    expect(form.method).toBe('get')
    expect(Object.fromEntries(new FormData(form).entries())).toEqual({ kind: 'company', email: 'pat@acme.test' })
    expect(screen.getByRole('button', { name: /Continue with company sign-in/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument()
  })

  it('lets a company SSO email use a password instead (the Owner is exempt from Require SSO)', async () => {
    mockDiscover.mockResolvedValue({ success: true, method: 'company' })
    render(<SigninPage />)
    await continueWith('pat@acme.test')
    fireEvent.click(await screen.findByRole('button', { name: 'Use a password instead' }))
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByRole('form', { name: /Sign in with your company/ })).not.toBeInTheDocument()
  })

  it('goes back to the email step to change the email', async () => {
    mockDiscover.mockResolvedValue({ success: true, method: 'password' })
    render(<SigninPage />)
    await continueWith('pat@acme.test')
    fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).not.toHaveAttribute('readonly')
  })

  it('stops an unusable email before asking the server, and shows a rate limit', async () => {
    render(<SigninPage />)
    await continueWith('pat')
    expect(screen.getByRole('alert')).toHaveTextContent(/email address/)
    expect(mockDiscover).not.toHaveBeenCalled()

    mockDiscover.mockResolvedValue({ success: false, message: 'Too many attempts. Wait a few minutes and try again.' })
    await continueWith('pat@acme.test')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many attempts/)
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('starts Google through NextAuth', () => {
    render(<SigninPage />)
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
  })

  it.each([
    ['SSO_REQUIRED', /company account/],
    ['SSO_NOT_CONFIGURED', /couldn't find company sign-in/],
    ['MICROSOFT_EMAIL_UNVERIFIED', /Microsoft didn't confirm/],
    ['SSO_DOMAIN_NOT_ALLOWED', /isn't set up for this email domain/],
    ['SSO_IDENTITY_MISMATCH', /different company sign-in/],
    ['EMAIL_IN_ANOTHER_ORGANIZATION', /another RFPilot organization/],
    ['PASSWORD_SIGN_IN_DISABLED', /no longer available/],
    ['AccessDenied', /denied/],
    ['SOMETHING_NEW', /Sign-in failed/],
  ])('shows ?error=%s as a plain message', (code, message) => {
    render(<SigninPage authError={code} />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(alert).not.toHaveTextContent(code)
  })

  it('continues a pending second factor from a Google or Microsoft sign-in', () => {
    render(
      <SigninPage pendingTwoFactor={{ nextStep: 'two_factor_challenge', expiresAt: Date.now() + 600_000 }} />,
    )
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /two-factor|verification|code/i })).toBeInTheDocument()
  })
})

describe('SignupPage', () => {
  it('offers email sign-up, Google, Microsoft and a pointer to company sign-in', () => {
    render(<SignupPage />)
    fireEvent.click(screen.getByRole('button', { name: /Sign up with Google/ }))
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
    expect(screen.getByRole('link', { name: /Sign up with Microsoft/ })).toHaveAttribute(
      'href',
      '/api/sso/start?kind=microsoft',
    )
    expect(screen.getByRole('link', { name: /Sign in with your work email/ })).toHaveAttribute('href', '/sign-in')
    expect(screen.getByLabelText('Work email')).toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
  })

  it('verifies the email with a code, then creates the account and signs in', async () => {
    mockSendOtp.mockResolvedValue({ success: true, message: 'sent' })
    mockVerifyOtp.mockResolvedValue({ success: true, message: 'verified' })
    mockSignUp.mockResolvedValue({ success: true, message: 'created' })
    mockSignIn.mockResolvedValue({ success: true, message: 'ok' })
    render(<SignupPage navigate={replace} />)

    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: ' pat@acme.test ' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue with email/ }))
    await screen.findByRole('heading', { name: 'Verify your email' })
    expect(mockSendOtp).toHaveBeenCalledWith('pat@acme.test')

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '12a3456' } })
    expect(screen.getByLabelText('Verification code')).toHaveValue('123456')
    fireEvent.click(screen.getByRole('button', { name: /Verify code/ }))
    await screen.findByRole('heading', { name: 'Almost done' })
    expect(mockVerifyOtp).toHaveBeenCalledWith('pat@acme.test', '123456')

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Pat Morgan' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-9' } })
    fireEvent.click(screen.getByRole('button', { name: /Create account/ }))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'))
    expect(mockSignUp).toHaveBeenCalledWith({ name: 'Pat Morgan', email: 'pat@acme.test', password: 'correct-horse-9' })
    expect(mockSignIn).toHaveBeenCalledWith('pat@acme.test', 'correct-horse-9', false)
  })

  it('stops an unusable email before the server', () => {
    render(<SignupPage />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'pat' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue with email/ }))
    expect(screen.getByRole('alert')).toHaveTextContent(/work email/)
    expect(mockSendOtp).not.toHaveBeenCalled()
  })

  it('shows the server refusal for a taken email', async () => {
    mockSendOtp.mockResolvedValue({ success: false, message: 'An account with this email already exists' })
    render(<SignupPage />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'pat@acme.test' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue with email/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/)
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
  })
})
