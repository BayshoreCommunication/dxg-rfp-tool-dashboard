import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SingleSignOnSection from './SingleSignOnCard'
import { validateSsoForm, ssoSavePayload, testSignInEmailError } from './ssoSettings'
import { securityErrorMessage } from './securityMessages'

const getMock = jest.fn()
const saveMock = jest.fn()
const statusMock = jest.fn()
const requireMock = jest.fn()
const accessMock = jest.fn()

jest.mock('@/app/actions/sso', () => ({
  getSsoSettingsAction: () => getMock(),
  saveSsoConnectionAction: (input: unknown) => saveMock(input),
  checkSsoConnectionAction: jest.fn(),
  setSsoStatusAction: (status: unknown) => statusMock(status),
  setRequireSsoAction: (value: unknown) => requireMock(value),
  deleteSsoConnectionAction: jest.fn(),
}))

jest.mock('@/app/actions/organizationMembers', () => ({
  getOrganizationAccessAction: () => accessMock(),
}))

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

const admin = { success: true, data: { userId: 'u1', role: 'organization_admin', canManageMembers: true, canInvite: true } }
const planner = { success: true, data: { userId: 'u2', role: null, canManageMembers: false, canInvite: false } }

const connection = (status: 'draft' | 'active') => ({
  issuer: 'https://acme.okta.com',
  clientId: 'client-123',
  hasClientSecret: true,
  domains: ['acme.test'],
  status,
  lastTestedAt: null,
  lastTestOutcome: null,
  version: 3,
  updatedAt: null,
})

const settings = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  data: {
    connection: null,
    requireSso: false,
    redirectUri: 'https://api.example.test/api/auth/sso/callback',
    verifiedDomains: ['acme.test', 'acme-events.test'],
    ...overrides,
  },
})

beforeEach(() => {
  jest.clearAllMocks()
  accessMock.mockResolvedValue(admin)
})

describe('SingleSignOnSection', () => {
  it('shows a read-only notice to roles that are not Owner or Admin', async () => {
    accessMock.mockResolvedValue(planner)
    render(<SingleSignOnSection />)
    expect(await screen.findByText(/managed by your organization's Owner and Admins/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Issuer URL')).not.toBeInTheDocument()
    expect(getMock).not.toHaveBeenCalled()
  })

  it('shows the redirect URI and validates a first connection before saving', async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(settings())
    render(<SingleSignOnSection />)
    expect(await screen.findByText('https://api.example.test/api/auth/sso/callback')).toBeInTheDocument()
    expect(screen.getByText('Not set up')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Issuer URL'), 'http://acme.okta.com')
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    expect(screen.getByText(/must start with https/)).toBeInTheDocument()
    expect(screen.getByText(/Enter the client ID/)).toBeInTheDocument()
    expect(screen.getByText(/Enter the client secret/)).toBeInTheDocument()
    expect(screen.getByText(/at least one verified domain/)).toBeInTheDocument()
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('saves a new connection with the chosen verified domains', async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(settings())
    saveMock.mockResolvedValue({ success: true, data: connection('draft') })
    render(<SingleSignOnSection />)
    await user.type(await screen.findByLabelText('Issuer URL'), 'https://acme.okta.com')
    await user.type(screen.getByLabelText('Client ID'), 'client-123')
    await user.type(screen.getByLabelText('Client secret'), 'shh')
    await user.click(screen.getByRole('checkbox', { name: 'acme.test' }))
    await user.click(screen.getByRole('button', { name: 'Save settings' }))
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith({
        issuer: 'https://acme.okta.com',
        clientId: 'client-123',
        clientSecret: 'shh',
        domains: ['acme.test'],
        version: undefined,
      }),
    )
    expect(await screen.findByRole('button', { name: 'Turn on' })).toBeInTheDocument()
    expect(screen.getByLabelText('Client secret')).toHaveValue('')
    expect(screen.getByLabelText('Client secret')).toHaveAttribute('placeholder', expect.stringMatching(/Leave blank/))
  })

  it('shows a human message for a backend refusal', async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(settings({ connection: connection('draft') }))
    saveMock.mockResolvedValue({ success: false, code: 'SSO_ISSUER_UNREACHABLE', status: 422, message: 'x' })
    render(<SingleSignOnSection />)
    await user.click(await screen.findByRole('button', { name: 'Save settings' }))
    expect(await screen.findByText(/couldn't reach your identity provider/)).toBeInTheDocument()
    expect(screen.queryByText(/SSO_ISSUER_UNREACHABLE/)).not.toBeInTheDocument()
    // Secret left blank: the stored one is kept.
    expect(saveMock.mock.calls[0][0]).toMatchObject({ clientSecret: undefined, version: 3 })
  })

  it('only lets Require SSO be turned on once the connection is on, after confirming', async () => {
    const user = userEvent.setup()
    getMock.mockResolvedValue(settings({ connection: connection('draft') }))
    const { unmount } = render(<SingleSignOnSection />)
    expect(await screen.findByRole('button', { name: 'Require' })).toBeDisabled()
    unmount()

    getMock.mockResolvedValue(settings({ connection: connection('active') }))
    requireMock.mockResolvedValue({ success: true, data: { requireSso: true, signedOutMembers: 2 } })
    render(<SingleSignOnSection />)
    await user.click(await screen.findByRole('button', { name: 'Require' }))
    const dialog = screen.getByRole('dialog', { name: /Require company sign-in/ })
    expect(within(dialog).getByText(/Owner keeps Google or Microsoft/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Require company sign-in' }))
    await waitFor(() => expect(requireMock).toHaveBeenCalledWith(true))
    expect(await screen.findByText('Required')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Turn off' })).toBeDisabled()
  })

  it('opens a test sign-in in a new tab for an email on a connected domain', async () => {
    const user = userEvent.setup()
    const open = jest.spyOn(window, 'open').mockImplementation(() => null)
    getMock.mockResolvedValue(settings({ connection: connection('active') }))
    render(<SingleSignOnSection />)
    await user.type(await screen.findByLabelText('Test sign-in'), 'pat@other.test')
    await user.click(screen.getByRole('button', { name: /Test sign-in/ }))
    expect(screen.getByText(/Use an email on acme.test/)).toBeInTheDocument()
    expect(open).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Test sign-in'))
    await user.type(screen.getByLabelText('Test sign-in'), 'Pat@Acme.test')
    await user.click(screen.getByRole('button', { name: /Test sign-in/ }))
    expect(open).toHaveBeenCalledWith('/api/sso/start?kind=company&email=pat%40acme.test', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })

  it('treats a 403 from the SSO API as read-only', async () => {
    getMock.mockResolvedValue({ success: false, status: 403, code: 'FORBIDDEN', message: 'no' })
    render(<SingleSignOnSection />)
    expect(await screen.findByText(/managed by your organization's Owner and Admins/)).toBeInTheDocument()
  })
})

describe('ssoSettings', () => {
  const ok = { issuer: 'https://acme.okta.com', clientId: 'c', clientSecret: '', domains: ['acme.test'] }

  it('accepts a complete form and keeps a stored secret', () => {
    expect(validateSsoForm(ok, { hasClientSecret: true, verifiedDomains: ['acme.test'] })).toEqual({})
    expect(validateSsoForm(ok, { hasClientSecret: false, verifiedDomains: ['acme.test'] })).toHaveProperty('clientSecret')
  })

  it('refuses issuers that are not plain https URLs and unverified domains', () => {
    const opts = { hasClientSecret: true, verifiedDomains: ['acme.test'] }
    expect(validateSsoForm({ ...ok, issuer: 'acme.okta.com' }, opts)).toHaveProperty('issuer')
    expect(validateSsoForm({ ...ok, issuer: 'https://acme.okta.com?x=1' }, opts)).toHaveProperty('issuer')
    expect(validateSsoForm({ ...ok, domains: ['evil.test'] }, opts)).toHaveProperty('domains')
  })

  it('trims the payload and leaves out a blank secret', () => {
    expect(ssoSavePayload({ ...ok, issuer: ' https://acme.okta.com ', clientId: ' c ', domains: ['b.test', 'a.test'] })).toEqual({
      issuer: 'https://acme.okta.com',
      clientId: 'c',
      clientSecret: undefined,
      domains: ['a.test', 'b.test'],
    })
  })

  it('checks the test sign-in email against the connection domains', () => {
    expect(testSignInEmailError('pat@acme.test', ['acme.test'])).toBeNull()
    expect(testSignInEmailError('pat', ['acme.test'])).toMatch(/email address/)
    expect(testSignInEmailError('pat@x.test', ['acme.test'])).toMatch(/acme.test/)
  })

  it.each(['SSO_ISSUER_UNREACHABLE', 'SSO_DOMAIN_NOT_VERIFIED', 'VERSION_CONFLICT', 'SSO_CONNECTION_NOT_ACTIVE', 'VALIDATION_ERROR'])(
    'maps the admin error %s to a human message',
    (code) => {
      const message = securityErrorMessage(code, 'sso')
      expect(message).not.toContain(code)
      expect(message.length).toBeGreaterThan(20)
    },
  )
})
