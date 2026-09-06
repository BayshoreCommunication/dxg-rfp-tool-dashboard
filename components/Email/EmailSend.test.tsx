import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'react-toastify'
import EmailSend from './EmailSend'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockRouterPush = jest.fn()
const mockSearchParamsGet = jest.fn<string | null, [string]>(() => null)

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: mockSearchParamsGet }),
}))

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}))

const mockGetProposals = jest.fn()
const mockGetProposalById = jest.fn()
const mockSendEmail = jest.fn()

jest.mock('@/app/actions/proposals', () => ({
  getProposalsAction: (...a: unknown[]) => mockGetProposals(...a),
  getProposalByIdAction: (...a: unknown[]) => mockGetProposalById(...a),
}))

jest.mock('@/app/actions/email', () => ({
  sendProposalEmailAction: (...a: unknown[]) => mockSendEmail(...a),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProposal = {
  _id: 'prop-001',
  event: {
    eventName: 'Bayshore Summit 2026',
    eventFormat: 'Hybrid',
    eventType: { eventType: 'Conference', eventTypeOther: '' },
    startDate: '10/10/2026',
    endDate: '10/12/2026',
  },
  budget: {
    proposalSubmissionDueDate: '09/20/2026',
    vendorQuestionsDueDate: '09/10/2026',
  },
  contact: {
    contactEmail: 'client@example.com',
    contactOrganization: 'Apex Dynamics',
  },
  proposalSlug: 'bayshore-summit-prop-001',
  proposalLink: 'https://example.com/proposal/bayshore-summit-prop-001',
  publicProposalLink: 'https://example.com/proposal/bayshore-summit-prop-001',
}

const LOAD_TIMEOUT = { timeout: 4000 }

// Suppress jsdom "Not implemented: navigation" from the window.location.href fallback in EmailSend.
// window.location is non-configurable in this jsdom version so we filter the warning instead.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args[0]
    if (msg instanceof Error && msg.message.includes('Not implemented: navigation')) return
    if (typeof msg === 'string' && msg.includes('Not implemented: navigation')) return
  })
})

afterAll(() => jest.restoreAllMocks())

beforeEach(() => {
  jest.clearAllMocks()
  // Explicitly reset return values since clearAllMocks does not clear mockReturnValue
  mockSearchParamsGet.mockReturnValue(null)
  mockGetProposals.mockResolvedValue({ success: true, data: [mockProposal] })
  mockGetProposalById.mockResolvedValue({ success: true, data: mockProposal })
})

// Wait until the Send Campaign button is enabled (loading=false)
const waitForLoad = () =>
  waitFor(
    () => expect(screen.getByRole('button', { name: /send campaign/i })).not.toBeDisabled(),
    LOAD_TIMEOUT,
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EmailSend — rendering', () => {
  it('renders the "Compose & Send" heading', async () => {
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByText('Compose & Send')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('renders the proposal select dropdown', async () => {
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('lists loaded proposals in the dropdown', async () => {
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByText('Bayshore Summit 2026')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('renders the Subject and Message labels', async () => {
    render(<EmailSend />)
    await waitForLoad()
    expect(screen.getByText('Subject')).toBeInTheDocument()
    expect(screen.getByText('Message')).toBeInTheDocument()
  })

  it('renders the Send Campaign button', async () => {
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByText('Send Campaign')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('auto-fills subject and pre-selects proposal when proposalId is in the URL', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'proposalId' ? 'prop-001' : null))
    render(<EmailSend />)
    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('prop-001')
      expect(screen.getByDisplayValue(/Proposal for Bayshore Summit/)).toBeInTheDocument()
    }, LOAD_TIMEOUT)
  })
})

describe('EmailSend — deep-link prefill', () => {
  it('prefills recipient, subject and message from the URL and ignores invalid addresses', async () => {
    const params: Record<string, string> = {
      proposalId: 'prop-001',
      to: 'bids@northstar.example, not-an-email',
      subject: 'Text-based copy of your response',
      message: 'Hello,\n\nCould you send a text-based copy?',
    }
    mockSearchParamsGet.mockImplementation((key: string) => params[key] ?? null)
    render(<EmailSend />)
    await waitFor(() => {
      expect(screen.getByText('bids@northstar.example')).toBeInTheDocument()
      expect(screen.queryByText('not-an-email')).not.toBeInTheDocument()
      expect(screen.getByDisplayValue('Text-based copy of your response')).toBeInTheDocument()
      expect(screen.getByDisplayValue(/Could you send a text-based copy/)).toBeInTheDocument()
    }, LOAD_TIMEOUT)
  })
})

describe('EmailSend — email chip input', () => {
  it('adds a valid email chip when Enter is pressed', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'test@example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('adds a valid email chip when comma is pressed', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'vendor@acme.com' } })
    fireEvent.keyDown(input, { key: ',' })
    expect(screen.getByText('vendor@acme.com')).toBeInTheDocument()
  })

  it('does not add an invalid email format', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'not-an-email' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.queryByText('not-an-email')).not.toBeInTheDocument()
  })

  it('removes a chip when the × button is clicked', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'remove@example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('remove@example.com')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Remove remove@example.com'))
    expect(screen.queryByText('remove@example.com')).not.toBeInTheDocument()
  })

  it('does not add duplicate emails', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'dup@example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'dup@example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByText('dup@example.com')).toHaveLength(1)
  })

  it('removes the last chip when Backspace is pressed on an empty input', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'first@example.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.queryByText('first@example.com')).not.toBeInTheDocument()
  })
})

describe('EmailSend — send validation', () => {
  it('shows error toast when no proposal is selected', async () => {
    mockGetProposals.mockResolvedValue({ success: true, data: [] })
    render(<EmailSend />)
    await waitForLoad()
    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Please select a proposal.'))
  })

  it('shows error toast when no recipient is added', async () => {
    render(<EmailSend />)
    await waitForLoad()
    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Please add at least one valid recipient email.'),
    )
  })

  it('shows error toast when subject is empty', async () => {
    render(<EmailSend />)
    await waitForLoad()

    // Clear the auto-filled subject (single proposal now auto-fills it)
    const subjectInput = screen.getByDisplayValue(/Proposal for/)
    fireEvent.change(subjectInput, { target: { value: '' } })

    // Add a recipient chip
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'vendor@test.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Please enter an email subject.'))
  })

  it('requires explicit review approval before sending', async () => {
    render(<EmailSend />)
    await waitForLoad()
    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'vendor@test.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Review the recipients and invitation, then approve sending.',
      ),
    )
    expect(mockSendEmail).not.toHaveBeenCalled()
  })
})

describe('EmailSend — personalized invitation', () => {
  it('generates proposal-specific copy and marks it for review', async () => {
    render(<EmailSend />)
    await waitForLoad()
    fireEvent.click(screen.getByRole('button', { name: /generate personalized draft/i }))
    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toHaveValue('Invitation to propose: Bayshore Summit 2026 AV production')
    })
    const message = (screen.getByLabelText('Message') as HTMLTextAreaElement).value
    expect(message).toContain('Bayshore Summit 2026')
    expect(message).toContain('- Format: Hybrid')
    expect(message).toContain('- Proposal due: 09/20/2026')
    expect(message).toContain('secure View Proposal button')
    expect(message).not.toContain('https://')
    expect(screen.getByText(/AI-generated · 86% confidence/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /reviewed the recipients/i })).not.toBeChecked()
    expect(mockGetProposalById).toHaveBeenCalledWith('prop-001')
  })

  it('uses an authenticated sender preview and explains secure recipient links', async () => {
    render(<EmailSend />)
    await waitForLoad()

    expect(screen.getByRole('link', { name: /open proposal/i })).toHaveAttribute(
      'href',
      'http://localhost/proposal/bayshore-summit-prop-001',
    )
    expect(screen.getByText(/secure, recipient-specific access link/i)).toBeInTheDocument()
  })
})

describe('EmailSend — successful send', () => {
  // Use URL preselection so subject is auto-filled
  beforeEach(() => mockSearchParamsGet.mockImplementation((key: string) => (key === 'proposalId' ? 'prop-001' : null)))

  it('calls sendProposalEmailAction with correct payload', async () => {
    mockSendEmail.mockResolvedValue({ success: true, message: 'Sent!' })
    render(<EmailSend />)
    await waitForLoad()

    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'vendor@test.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: /reviewed the recipients/i }))

    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))

    await waitFor(() => {
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          proposalId: 'prop-001',
          recipientEmails: expect.arrayContaining(['vendor@test.com']),
          subject: expect.stringContaining('Bayshore Summit'),
          message: expect.not.stringContaining('https://'),
        }),
      )
    })
  })

  it('navigates to /email on successful send', async () => {
    mockSendEmail.mockResolvedValue({ success: true, message: 'Sent!' })
    render(<EmailSend />)
    await waitForLoad()

    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'vendor@test.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: /reviewed the recipients/i }))

    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/email'))
  })

  it('shows error toast when send fails', async () => {
    mockSendEmail.mockResolvedValue({ success: false, message: 'Server error' })
    render(<EmailSend />)
    await waitForLoad()

    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'vendor@test.com' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: /reviewed the recipients/i }))

    fireEvent.click(screen.getByRole('button', { name: /send campaign/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Server error'))
  })
})

describe('EmailSend — proposal selection', () => {
  it('shows an honest loading state before proposals arrive', async () => {
    let resolveRequest!: (value: unknown) => void
    mockGetProposals.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

    render(<EmailSend />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading submitted proposals')
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.queryByText(/No submitted proposals ready/)).not.toBeInTheDocument()

    resolveRequest({ success: true, data: [] })
    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeDisabled(), LOAD_TIMEOUT)
  })

  it('pre-selects proposal from URL query param', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'proposalId' ? 'prop-001' : null))
    render(<EmailSend />)
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('prop-001')
    }, LOAD_TIMEOUT)
  })

  it('shows the empty state only after a successful load', async () => {
    mockGetProposals.mockResolvedValue({ success: true, data: [] })
    render(<EmailSend />)
    await waitForLoad()
    expect(screen.getByText(/No submitted proposals ready to send/)).toBeInTheDocument()
  })

  it('distinguishes a load failure from an empty proposal list', async () => {
    mockGetProposals.mockResolvedValue({ success: false, message: 'Service unavailable' })
    render(<EmailSend />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable')
    }, LOAD_TIMEOUT)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.queryByText(/No submitted proposals ready to send/)).not.toBeInTheDocument()
  })
})

describe('EmailSend — asking one vendor a question', () => {
  const questionParams: Record<string, string> = {
    mode: 'question',
    proposalId: 'prop-001',
    vendor: 'Northstar AV',
    to: 'bids@northstar.example',
    subject: 'Questions about your response to Bayshore Summit 2026',
    message: 'Hello,\n\nWe could not find answers to:\n- Union Labor\n\nThank you.',
    returnTo: '/vendor-responses/response-1',
  }

  it('loads the named proposal directly, names the vendor, and drops the campaign controls', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => questionParams[key] ?? null)
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send question' })).not.toBeDisabled(), LOAD_TIMEOUT)
    expect(screen.getByRole('heading', { name: 'Ask Northstar AV a question' })).toBeInTheDocument()
    expect(screen.getByText(/About their response to Bayshore Summit 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to the response/ })).toHaveAttribute('href', '/vendor-responses/response-1')
    expect(mockGetProposalById).toHaveBeenCalledWith('prop-001')
    expect(mockGetProposals).not.toHaveBeenCalled()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Compose & Send')).not.toBeInTheDocument()
    expect(screen.queryByText('Personalized invitation')).not.toBeInTheDocument()
    expect(screen.queryByText(/Send Campaign/)).not.toBeInTheDocument()
    expect(screen.getByText('bids@northstar.example')).toBeInTheDocument()
    expect(screen.getByText('I reviewed this message.')).toBeInTheDocument()
  })

  it('sends the question as a plain vendor email and returns to the response', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => questionParams[key] ?? null)
    mockSendEmail.mockResolvedValue({ success: true, message: 'sent' })
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send question' })).not.toBeDisabled(), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Send question' }))
    await waitFor(() => expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      proposalId: 'prop-001',
      recipientEmails: ['bids@northstar.example'],
      subject: 'Questions about your response to Bayshore Summit 2026',
      kind: 'question',
    })))
    expect(mockSendEmail.mock.calls[0][0].message).toContain('- Union Labor')
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/vendor-responses/response-1'))
    expect(toast.success).toHaveBeenCalledWith('Question sent to Northstar AV.')
  })

  it('ignores an off-site returnTo', async () => {
    mockSearchParamsGet.mockImplementation((key: string) => (key === 'returnTo' ? 'https://evil.example/phish' : questionParams[key] ?? null))
    render(<EmailSend />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Send question' })).not.toBeDisabled(), LOAD_TIMEOUT)
    expect(screen.queryByRole('link', { name: /Back to the response/ })).not.toBeInTheDocument()
  })
})

describe('EmailSend — fixed to a just-published proposal', () => {
  it('loads that proposal directly, hides the picker, and hands the send back instead of navigating', async () => {
    const onSent = jest.fn()
    mockSendEmail.mockResolvedValue({ success: true, message: 'sent' })
    render(<EmailSend proposalId="prop-001" onSent={onSent} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /send invitations/i })).not.toBeDisabled(), LOAD_TIMEOUT)
    expect(mockGetProposalById).toHaveBeenCalledWith('prop-001')
    expect(mockGetProposals).not.toHaveBeenCalled()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/Inviting vendors to/)).toHaveTextContent('Bayshore Summit 2026')
    expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe(
      'Proposal for Bayshore Summit 2026 - DXG RFP Tool',
    )

    const input = screen.getByPlaceholderText(/john@email.com/i)
    fireEvent.change(input, { target: { value: 'bids@vendor.example' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: /reviewed the recipients/i }))
    fireEvent.click(screen.getByRole('button', { name: /send invitations/i }))

    await waitFor(() => expect(onSent).toHaveBeenCalledWith(['bids@vendor.example']))
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'prop-001', recipientEmails: ['bids@vendor.example'], kind: 'invitation' }),
    )
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('reports a proposal that could not be loaded', async () => {
    mockGetProposalById.mockResolvedValue({ success: false, message: 'Proposal not found.' })
    render(<EmailSend proposalId="prop-404" onSent={jest.fn()} />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Proposal not found.'), LOAD_TIMEOUT)
  })
})
