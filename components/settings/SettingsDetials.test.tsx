import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SettingsDetials from './SettingsDetials'

// ─── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('./BrandingSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="branding-settings" />,
}))

jest.mock('./ProposalsSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="proposals-settings" />,
}))

jest.mock('./SignaturesSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="signatures-settings" />,
}))

jest.mock('./TopHeaser', () => ({
  __esModule: true,
  default: () => <div data-testid="top-header" />,
}))

const mockGetSettings = jest.fn()
const mockUpdateSettings = jest.fn()

jest.mock('@/app/actions/settings', () => ({
  getSettingsAction: (...a: unknown[]) => mockGetSettings(...a),
  updateSettingsAction: (...a: unknown[]) => mockUpdateSettings(...a),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSettings = {
  branding: {
    brandName: 'Acme Corp',
    linkPrefix: 'acme',
    defaultFont: 'Inter',
    signatureColor: '#FF0000',
    logoFile: null,
  },
  proposals: {
    proposalLanguage: 'English',
    defaultCurrency: '$',
    expiryDate: '30 Days',
    priceSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    decimalPrecision: '2',
    contacts: {
      email: { enabled: true, value: 'test@example.com' },
      call: { enabled: false, value: '' },
    },
    downloadPreview: 'Yes',
    teammateEmail: '',
  },
  signatures: {
    signatureType: 'Upload',
    signatureImageUrl: '',
    signatureText: '',
    signatureStyle: '',
  },
}

const LOAD_TIMEOUT = { timeout: 3000 }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSettings.mockResolvedValue({ success: true, data: mockSettings })
  mockUpdateSettings.mockResolvedValue({ success: true, data: mockSettings })
})

afterEach(async () => {
  await act(async () => {})
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SettingsDetials — loading state', () => {
  it('shows skeleton while loading', () => {
    mockGetSettings.mockReturnValue(new Promise(() => {}))
    render(<SettingsDetials />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('removes skeleton after data loads', async () => {
    render(<SettingsDetials />)
    await waitFor(
      () => expect(document.querySelectorAll('.animate-pulse').length).toBe(0),
      LOAD_TIMEOUT,
    )
  })

  it('Update Settings button is disabled while loading', () => {
    mockGetSettings.mockReturnValue(new Promise(() => {}))
    render(<SettingsDetials />)
    expect(screen.getByRole('button', { name: /update settings/i })).toBeDisabled()
  })
})

describe('SettingsDetials — content', () => {
  it('renders all child settings sections after load', async () => {
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    expect(screen.getByTestId('proposals-settings')).toBeInTheDocument()
    expect(screen.getByTestId('signatures-settings')).toBeInTheDocument()
    expect(screen.getByTestId('top-header')).toBeInTheDocument()
  })

  it('renders the Update Settings button enabled after load', async () => {
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    expect(screen.getByRole('button', { name: /update settings/i })).not.toBeDisabled()
  })

  it('calls getSettingsAction on mount', async () => {
    render(<SettingsDetials />)
    await waitFor(() => expect(mockGetSettings).toHaveBeenCalledTimes(1))
  })
})

describe('SettingsDetials — update', () => {
  it('calls updateSettingsAction when Update Settings is clicked', async () => {
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('button', { name: /update settings/i }))
    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledTimes(1))
  })

  it('shows "Updating..." while save is in-flight', async () => {
    let resolveFn!: (v: unknown) => void
    mockUpdateSettings.mockReturnValue(new Promise((r) => { resolveFn = r }))
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('button', { name: /update settings/i }))
    await waitFor(() => expect(screen.getByText('Updating...')).toBeInTheDocument())
    await act(async () => { resolveFn({ success: true, data: mockSettings }) })
    await waitFor(() => screen.getByRole('button', { name: /update settings/i }))
  })

  it('shows success toast after successful update', async () => {
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('button', { name: /update settings/i }))
    const { toast } = require('react-toastify')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Settings updated successfully.'))
  })

  it('shows error toast after failed update', async () => {
    mockUpdateSettings.mockResolvedValue({ success: false, message: 'Update failed.' })
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('button', { name: /update settings/i }))
    const { toast } = require('react-toastify')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Update failed.'))
  })

  it('button is disabled while saving', async () => {
    mockUpdateSettings.mockReturnValue(new Promise(() => {}))
    render(<SettingsDetials />)
    await waitFor(() => screen.getByTestId('branding-settings'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('button', { name: /update settings/i }))
    await waitFor(() => expect(screen.getByText('Updating...')).toBeDisabled())
  })
})
