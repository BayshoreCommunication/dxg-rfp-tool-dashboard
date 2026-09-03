import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'react-toastify'
import EmailDashboard from './EmailDashboard'

// ─── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}))

jest.mock('@/components/vendor/CampaignResponsesModal', () => ({
  __esModule: true,
  default: ({ campaignTitle, onClose }: { campaignTitle: string; onClose: () => void }) => (
    <div data-testid="responses-modal">
      <span>{campaignTitle}</span>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockGetCampaigns = jest.fn()
const mockDeleteCampaign = jest.fn()

jest.mock('@/app/actions/email', () => ({
  getEmailCampaignsAction: (...a: unknown[]) => mockGetCampaigns(...a),
  deleteEmailCampaignAction: (...a: unknown[]) => mockDeleteCampaign(...a),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeCampaign = (overrides = {}) => ({
  _id: 'camp-001',
  proposalTitle: 'Bayshore Summit',
  subject: 'Proposal for Bayshore Summit - DXG RFP Tool',
  message: 'Please review the proposal.',
  sentCount: 5,
  clickedCount: 3,
  vendorResponseClickCount: 2,
  vendorResponseCount: 1,
  unreadResponseCount: 1,
  recipients: [
    { email: 'first.vendor@example.com', status: 'sent' },
    { email: 'second.vendor@example.com', status: 'sent' },
  ],
  createdAt: '2026-06-01T12:00:00.000Z',
  ...overrides,
})

const successPage = (campaigns = [makeCampaign()], total = 1) => ({
  success: true,
  data: campaigns,
  pagination: { total, page: 1, limit: 6, totalPages: Math.ceil(total / 6) },
})

const emptyPage = () => ({
  success: true,
  data: [],
  pagination: { total: 0, page: 1, limit: 6, totalPages: 1 },
})

const LOAD_TIMEOUT = { timeout: 3000 }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetCampaigns.mockResolvedValue(successPage())
  mockDeleteCampaign.mockResolvedValue({ success: true })
})

afterEach(async () => {
  await act(async () => {})
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmailDashboard — loading state', () => {
  it('shows skeleton cards while loading', () => {
    mockGetCampaigns.mockReturnValue(new Promise(() => {})) // never resolves — keeps loading state
    render(<EmailDashboard />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('removes skeleton after data loads', async () => {
    render(<EmailDashboard />)
    await waitFor(() => expect(document.querySelectorAll('.animate-pulse').length).toBe(0), LOAD_TIMEOUT)
  })
})

describe('EmailDashboard — empty state', () => {
  it('shows empty state message when no campaigns exist', async () => {
    mockGetCampaigns.mockResolvedValue(emptyPage())
    render(<EmailDashboard />)
    await waitFor(() =>
      expect(screen.getByText('No sent email analytics yet')).toBeInTheDocument(), LOAD_TIMEOUT
    )
  })

  it('shows descriptive subtext in empty state', async () => {
    mockGetCampaigns.mockResolvedValue(emptyPage())
    render(<EmailDashboard />)
    await waitFor(() =>
      expect(screen.getByText(/Once you send proposal emails/)).toBeInTheDocument(), LOAD_TIMEOUT
    )
  })
})

describe('EmailDashboard — campaign cards', () => {
  it('renders the campaign subject as the card title', async () => {
    render(<EmailDashboard />)
    await waitFor(() =>
      expect(screen.getByText('Proposal for Bayshore Summit - DXG RFP Tool')).toBeInTheDocument(),
      LOAD_TIMEOUT
    )
  })

  it('renders campaign message body', async () => {
    render(<EmailDashboard />)
    await waitFor(() =>
      expect(screen.getByText('Please review the proposal.')).toBeInTheDocument(), LOAD_TIMEOUT
    )
  })

  it('shows "Proposal Email" badge on each campaign card', async () => {
    render(<EmailDashboard />)
    await waitFor(() =>
      expect(screen.getByText('Proposal Email')).toBeInTheDocument(), LOAD_TIMEOUT
    )
  })

  it('shows the recipient email addresses on each campaign card', async () => {
    render(<EmailDashboard />)
    await waitFor(() =>
      expect(screen.getByText('first.vendor@example.com')).toBeInTheDocument(), LOAD_TIMEOUT
    )
    expect(screen.getByText('second.vendor@example.com')).toBeInTheDocument()
  })

  it('shows every recipient without hiding addresses behind a disclosure', async () => {
    mockGetCampaigns.mockResolvedValue(successPage([makeCampaign({
      recipients: [
        { email: 'one@example.com', status: 'sent' },
        { email: 'two@example.com', status: 'sent' },
        { email: 'three@example.com', status: 'sent' },
        { email: 'four@example.com', status: 'sent' },
        { email: 'failed@example.com', status: 'failed' },
      ],
    })]))
    render(<EmailDashboard />)
    await waitFor(() => expect(screen.getByText('one@example.com')).toBeInTheDocument(), LOAD_TIMEOUT)
    expect(screen.getByText('two@example.com')).toBeInTheDocument()
    expect(screen.getByText('three@example.com')).toBeInTheDocument()
    expect(screen.getByText('four@example.com')).toBeInTheDocument()
    expect(screen.getByText('failed@example.com')).toBeInTheDocument()
    expect(screen.queryByText(/more/i)).not.toBeInTheDocument()
    expect(screen.getByTitle('Delivery failed: failed@example.com')).toBeInTheDocument()
  })
})

describe('EmailDashboard — metrics', () => {
  it('shows the Sent metric count', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Sent'), LOAD_TIMEOUT)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows the View Clicks metric count', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('View Clicks'), LOAD_TIMEOUT)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows the Submit Clicks metric count', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Submit Clicks'), LOAD_TIMEOUT)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows zero counts when metric values are absent', async () => {
    mockGetCampaigns.mockResolvedValue(successPage([makeCampaign({ sentCount: 0, clickedCount: 0, vendorResponseClickCount: 0, vendorResponseCount: 0, unreadResponseCount: 0 })]))
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Sent'), LOAD_TIMEOUT)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(3)
  })
})

describe('EmailDashboard — delete campaign', () => {
  it('keeps the delete action the same size as the metric cards', async () => {
    render(<EmailDashboard />)
    const deleteButton = await screen.findByRole('button', { name: 'Delete' }, LOAD_TIMEOUT)
    expect(deleteButton).toHaveClass('h-[76px]', 'w-[76px]')
  })

  it('calls deleteEmailCampaignAction when Delete is clicked', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByText('Delete'))
    await waitFor(() => expect(mockDeleteCampaign).toHaveBeenCalledWith('camp-001'))
    // wait for the post-delete reload to settle so no state updates leak outside act
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
  })

  it('shows "Deleting..." while delete is in-flight', async () => {
    let resolveFn!: (v: unknown) => void
    mockDeleteCampaign.mockReturnValue(new Promise((r) => { resolveFn = r }))

    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByText('Delete'))

    await waitFor(() => expect(screen.getByText('Deleting...')).toBeInTheDocument())
    // resolve inside act so subsequent state updates (setDeletingCampaignId, loadData) are captured
    await act(async () => { resolveFn({ success: true }) })
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
  })

  it('shows error toast when delete fails', async () => {
    mockDeleteCampaign.mockResolvedValue({ success: false, message: 'Server error' })
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByText('Delete'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server error'))
    // wait for setDeletingCampaignId(null) to settle (handleDelete returns early on failure)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
  })
})

describe('EmailDashboard — pagination', () => {
  it('renders previous and next page buttons', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('disables previous button on first page', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('disables next button when on last page', async () => {
    render(<EmailDashboard />)
    await waitFor(() => screen.getByText('Delete'), LOAD_TIMEOUT)
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('renders multiple campaigns across pages', async () => {
    const twoCampaigns = [
      makeCampaign({ _id: 'camp-001', subject: 'Campaign One' }),
      makeCampaign({ _id: 'camp-002', subject: 'Campaign Two' }),
    ]
    mockGetCampaigns.mockResolvedValue(successPage(twoCampaigns, 2))
    render(<EmailDashboard />)
    await waitFor(() => expect(screen.getByText('Campaign One')).toBeInTheDocument(), LOAD_TIMEOUT)
    expect(screen.getByText('Campaign Two')).toBeInTheDocument()
  })
})
