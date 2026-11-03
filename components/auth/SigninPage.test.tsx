import { fireEvent, render, screen } from '@testing-library/react'
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

jest.mock('@/app/actions/auth', () => ({
  startTwoFactorEnrolmentAction: jest.fn(() => new Promise(() => {})),
  completeTwoFactorAction: jest.fn(),
  cancelTwoFactorAction: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

describe('SigninPage', () => {
  it('offers Google, Microsoft and company sign-in, and no password', () => {
    render(<SigninPage />)
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue with Microsoft/ })).toHaveAttribute(
      'href',
      '/api/sso/start?kind=microsoft',
    )
    expect(screen.getByRole('form', { name: /Sign in with your company/ })).toHaveAttribute('action', '/api/sso/start')
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Remember me/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Forgot password/i)).not.toBeInTheDocument()
  })

  it('starts Google through NextAuth', () => {
    render(<SigninPage />)
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }))
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
  })

  it('sends a typed work email to /api/sso/start as a company sign-in', () => {
    render(<SigninPage />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'pat@acme.test' } })
    const form = screen.getByRole('form', { name: /Sign in with your company/ }) as HTMLFormElement
    expect(form.method).toBe('get')
    expect(Object.fromEntries(new FormData(form).entries())).toEqual({ kind: 'company', email: 'pat@acme.test' })
  })

  it('stops an unusable email before leaving the page', () => {
    render(<SigninPage />)
    fireEvent.change(screen.getByLabelText('Work email'), { target: { value: 'pat' } })
    const submitted = fireEvent.submit(screen.getByRole('form', { name: /Sign in with your company/ }))
    expect(submitted).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent(/work email/)
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
  it('signs up with Google or Microsoft and points SSO companies to sign-in', () => {
    render(<SignupPage />)
    fireEvent.click(screen.getByRole('button', { name: /Sign up with Google/ }))
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' })
    expect(screen.getByRole('link', { name: /Sign up with Microsoft/ })).toHaveAttribute(
      'href',
      '/api/sso/start?kind=microsoft',
    )
    expect(screen.getByRole('link', { name: /Sign in with your company/ })).toHaveAttribute('href', '/sign-in#company')
    expect(screen.getByText(/Company already uses RFPilot SSO/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/password|email/i)).not.toBeInTheDocument()
  })
})
