import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { OrganizationProfile } from '@/app/actions/organizationProfile'
import OnboardingWizard from './OnboardingWizard'

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}))

const mockSaveDetails = jest.fn()
const mockChoosePlan = jest.fn()
const mockComplete = jest.fn()
jest.mock('@/app/actions/organizationProfile', () => ({
  saveOrganizationDetailsAction: (...a: unknown[]) => mockSaveDetails(...a),
  chooseOnboardingPlanAction: (...a: unknown[]) => mockChoosePlan(...a),
  completeOnboardingAction: (...a: unknown[]) => mockComplete(...a),
}))

const mockInvite = jest.fn()
const mockBulkInvite = jest.fn()
jest.mock('@/app/actions/invitations', () => ({
  createInvitationAction: (...a: unknown[]) => mockInvite(...a),
  createBulkInvitationsAction: (...a: unknown[]) => mockBulkInvite(...a),
}))

const profile = (overrides: Partial<OrganizationProfile> = {}): OrganizationProfile => ({
  name: "Pat's organization",
  type: null,
  industry: null,
  country: null,
  timeZone: 'America/New_York',
  eventsPerYear: null,
  plan: 'free_trial',
  onboardingStep: 'details',
  canManage: true,
  ...overrides,
})

const ok = { success: true, message: 'OK' }

beforeEach(() => jest.clearAllMocks())

describe('OnboardingWizard', () => {
  it('walks details → plan → team and finishes on the dashboard', async () => {
    mockSaveDetails.mockResolvedValue(ok)
    mockChoosePlan.mockResolvedValue(ok)
    mockComplete.mockResolvedValue(ok)
    const navigate = jest.fn()
    render(<OnboardingWizard firstName="Pat" profile={profile()} navigate={navigate} />)

    expect(screen.getByRole('heading', { name: 'Welcome, Pat' })).toBeInTheDocument()
    // The sign-up placeholder is not offered as the company name.
    expect(screen.getByLabelText('Company name')).toHaveValue('')
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: '  Acme Events ' } })
    fireEvent.change(screen.getByLabelText('Organization type'), { target: { value: 'agency' } })
    fireEvent.change(screen.getByLabelText('Country (optional)'), { target: { value: 'GB' } })
    fireEvent.change(screen.getByLabelText('Events per year (optional)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByRole('heading', { name: 'Choose your plan' })
    expect(mockSaveDetails).toHaveBeenCalledWith({
      name: 'Acme Events',
      type: 'agency',
      industry: '',
      country: 'GB',
      timeZone: 'America/New_York',
      eventsPerYear: '12',
    })

    fireEvent.click(screen.getByRole('button', { name: 'Start free trial' }))
    await screen.findByRole('heading', { name: 'Invite your team' })
    expect(mockChoosePlan).toHaveBeenCalledWith('free_trial')

    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
    expect(mockComplete).toHaveBeenCalled()
    expect(mockInvite).not.toHaveBeenCalled()
  })

  it('needs a company name before moving on', () => {
    render(<OnboardingWizard firstName="Pat" profile={profile()} navigate={jest.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your company name.')
    expect(mockSaveDetails).not.toHaveBeenCalled()
  })

  it('shows the backend reason for a refused field', async () => {
    mockSaveDetails.mockResolvedValue({
      success: false,
      message: 'bad',
      code: 'VALIDATION_ERROR',
      status: 400,
      details: { field: 'timeZone' },
    })
    render(<OnboardingWizard firstName="" profile={profile({ name: 'Acme' })} navigate={jest.fn()} />)
    expect(screen.getByLabelText('Company name')).toHaveValue('Acme')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a time zone from the list.')
    expect(screen.queryByRole('heading', { name: 'Choose your plan' })).not.toBeInTheDocument()
  })

  it('resumes at the step the backend recorded', () => {
    render(<OnboardingWizard firstName="Pat" profile={profile({ onboardingStep: 'team' })} navigate={jest.fn()} />)
    expect(screen.getByRole('heading', { name: 'Invite your team' })).toBeInTheDocument()
  })

  it('invites several people at once and then goes to the dashboard', async () => {
    mockBulkInvite.mockResolvedValue({
      success: true,
      message: 'OK',
      data: {
        rows: [
          { row: 1, email: 'sam@acme.test', outcome: 'invited' },
          { row: 2, email: 'alex@acme.test', outcome: 'refused', code: 'ALREADY_INVITED', message: 'Already invited' },
        ],
      },
    })
    mockComplete.mockResolvedValue(ok)
    const navigate = jest.fn()
    render(<OnboardingWizard firstName="Pat" profile={profile({ onboardingStep: 'team' })} navigate={navigate} />)

    fireEvent.change(screen.getByLabelText('Email addresses'), { target: { value: 'sam@acme.test, alex@acme.test' } })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'organization_admin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send invitations' }))

    expect(await screen.findByText('1 invitation sent')).toBeInTheDocument()
    expect(mockBulkInvite).toHaveBeenCalledWith({
      emails: ['sam@acme.test', 'alex@acme.test'],
      role: 'organization_admin',
      teamId: null,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Go to dashboard' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
  })

  it('stays put when finishing fails', async () => {
    mockComplete.mockResolvedValue({ success: false, message: 'no', status: 500 })
    const navigate = jest.fn()
    render(<OnboardingWizard firstName="Pat" profile={profile({ onboardingStep: 'team' })} navigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't finish setting up.")
    expect(navigate).not.toHaveBeenCalled()
  })
})
