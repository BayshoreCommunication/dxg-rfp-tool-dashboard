import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ProposalTableList from './ProposalTableList'
import { toast } from 'react-toastify'

// ─── Module mocks ──────────────────────────────────────────────────────────────

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}))

const mockGetProposals = jest.fn()
const mockDeleteProposal = jest.fn()
const mockRestoreProposal = jest.fn()
const mockPermanentDelete = jest.fn()
const mockCopyProposal = jest.fn()
const mockUpdateMeta = jest.fn()
const mockCreateViewGrant = jest.fn()

jest.mock('@/app/actions/proposals', () => ({
  getProposalsAction: (...a: unknown[]) => mockGetProposals(...a),
  deleteProposalAction: (...a: unknown[]) => mockDeleteProposal(...a),
  restoreProposalAction: (...a: unknown[]) => mockRestoreProposal(...a),
  permanentlyDeleteProposalAction: (...a: unknown[]) => mockPermanentDelete(...a),
  copyProposalAction: (...a: unknown[]) => mockCopyProposal(...a),
  updateProposalMetaAction: (...a: unknown[]) => mockUpdateMeta(...a),
  createProposalViewAccessGrantAction: (...a: unknown[]) => mockCreateViewGrant(...a),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeProposal = (overrides = {}) => ({
  _id: 'prop-001',
  status: 'submitted',
  isDraft: false,
  isCopy: false,
  isActive: true,
  isFavorite: false,
  viewsCount: 42,
  createdAt: '2026-01-01T00:00:00.000Z',
  event: { eventName: 'Bayshore Summit 2026' },
  contact: { contactFirstName: 'AR', contactLastName: 'Sahak' },
  ...overrides,
})

const successPage = (proposals = [makeProposal()], total = 1) => ({
  success: true,
  data: proposals,
  pagination: { total, page: 1, limit: 5, totalPages: Math.ceil(total / 5) },
})

const emptyPage = () => ({ success: true, data: [], pagination: { total: 0, page: 1, limit: 5, totalPages: 1 } })

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOAD_TIMEOUT = { timeout: 2000 }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetProposals.mockResolvedValue(successPage())
  mockCreateViewGrant.mockResolvedValue({ success: true, token: 'secure-grant' })
  window.confirm = jest.fn(() => true)
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProposalTableList — loading state', () => {
  it('shows skeleton cards while proposals are loading', () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('removes skeleton once proposals load', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => {
      expect(screen.getByText('Bayshore Summit 2026')).toBeInTheDocument()
      // bg-slate-100 animate-pulse identifies skeleton placeholders (live-badge dot uses bg-emerald-400)
      expect(document.querySelectorAll('.bg-slate-100.animate-pulse').length).toBe(0)
    }, LOAD_TIMEOUT)
  })
})

describe('ProposalTableList — empty state', () => {
  it('with no proposals at all, invites the planner to create the first RFP instead of blaming a filter', async () => {
    mockGetProposals.mockResolvedValue(emptyPage())
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    const card = await screen.findByTestId('proposals-first-run', {}, LOAD_TIMEOUT)
    expect(card).toHaveTextContent('Create your first RFP')
    expect(card).toHaveTextContent('RFPilot turns your event details into an AV production RFP')
    expect(card).not.toHaveTextContent(/filter/i)
    const starters = within(card).getByRole('group', { name: 'Ways to start' })
    expect(within(starters).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/proposals/add-new-proposal?start=example',
      '/proposals/add-new-proposal',
      '/proposals/add-new-proposal?start=scratch',
    ])
  })

  it('with an empty filter view, names the filter and keeps the New Proposal link', async () => {
    mockGetProposals.mockResolvedValue(emptyPage())
    render(<ProposalTableList searchValue="" activeFilter="draft" />)
    await waitFor(() => expect(screen.getByText('No draft proposals yet. Try another filter.')).toBeInTheDocument(), LOAD_TIMEOUT)
    expect(screen.getByText('New Proposal')).toBeInTheDocument()
    expect(screen.queryByTestId('proposals-first-run')).not.toBeInTheDocument()
  })

  it('with an empty search, names the search term', async () => {
    mockGetProposals.mockResolvedValue(emptyPage())
    render(<ProposalTableList searchValue="gala" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('Nothing matches “gala”. Try a different search.')).toBeInTheDocument(), LOAD_TIMEOUT)
    expect(screen.queryByTestId('proposals-first-run')).not.toBeInTheDocument()
  })
})

describe('ProposalTableList — proposal cards', () => {
  it('renders the proposal event name', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('Bayshore Summit 2026')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('leaves the owner off the row — it is the planner themselves on every card', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Bayshore Summit 2026', {}, LOAD_TIMEOUT)
    expect(screen.queryByText('AR Sahak')).not.toBeInTheDocument()
    expect(screen.queryByText(/Owner:/)).not.toBeInTheDocument()
  })

  it('keeps the expiry date and its remaining-days pill on one line', async () => {
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ proposalSetting: { proposals: { expiryDate: '30 days' } } })])
    )
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Bayshore Summit 2026', {}, LOAD_TIMEOUT)

    // The date and the "Expired N days ago" pill are one fact — they must not
    // split across two lines the way a wrapping flex row would let them.
    const expiry = screen.getByText(/Expiry:/)
    expect(expiry).toHaveClass('whitespace-nowrap')
    expect(within(expiry).getByText(/days ago$/)).toBeInTheDocument()
  })

  it('renders the view count', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('exposes every proposal action with a mobile-friendly accessible label', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => screen.getByText('Bayshore Summit 2026'), LOAD_TIMEOUT)

    expect(screen.getByRole('button', { name: 'Copy URL' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute(
      'href',
      '/proposal/bayshore-summit-2026-prop-001'
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/proposals/proposal-edit?proposalId=prop-001'
    )
    expect(screen.getByRole('button', { name: 'Save a copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Share' })).toHaveAttribute(
      'href',
      '/email/send-email?proposalId=prop-001'
    )
  })

  it('shows "Submitted" status badge for submitted proposals', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('Submitted')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('keeps Share disabled for a draft proposal and explains why', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ isDraft: true, status: 'unsubmitted' })]))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('Draft')).toBeInTheDocument(), LOAD_TIMEOUT)
    expect(screen.queryByRole('link', { name: 'Share' })).not.toBeInTheDocument()
    const share = screen.getByRole('button', { name: 'Share' })
    expect(share).toBeDisabled()
    expect(share).toHaveAttribute('title', 'Publish the proposal to share it with vendors.')
  })

  it('shows "Draft" badge for draft proposals', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ isDraft: true, status: 'unsubmitted' })]))
    render(<ProposalTableList searchValue="" activeFilter="draft" />)
    await waitFor(() => expect(screen.getByText('Draft')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('shows "Saved Copy" badge for copied proposals', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ isCopy: true })]))
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => expect(screen.getByText('Saved Copy')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('shows "Live" for a submitted copy (isCopy:true, isDraft:false, isActive:true)', async () => {
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isCopy: true, isDraft: false, status: 'submitted', isActive: true })])
    )
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => screen.getByText('Saved Copy'), LOAD_TIMEOUT)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('shows "Live" for a submitted copy even when isDraft:true (backend did not clear flag)', async () => {
    // Backend sets status:"submitted" but may leave isDraft:true — status is authoritative for copies
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isCopy: true, isDraft: true, status: 'submitted', isActive: true })])
    )
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => screen.getByText('Saved Copy'), LOAD_TIMEOUT)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('shows "Live" for a submitted copy even when isActive:false (backend did not set isActive)', async () => {
    // Backend may not set isActive:true on copy submission — status is authoritative for copies
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isCopy: true, isDraft: false, status: 'submitted', isActive: false })])
    )
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => screen.getByText('Saved Copy'), LOAD_TIMEOUT)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('shows "Live" after copy is fully promoted (isCopy:false, isDraft:false, isActive:true)', async () => {
    // After edit+update the backend may clear isCopy and set isActive:true
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isCopy: false, isDraft: false, status: 'submitted', isActive: true })])
    )
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => screen.getByText('Bayshore Summit 2026'), LOAD_TIMEOUT)
    expect(screen.getByText('Live')).toBeInTheDocument()
    expect(screen.queryByText('Offline')).not.toBeInTheDocument()
  })

  it('shows "Offline" for a copy that is still a draft (not yet submitted)', async () => {
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isCopy: true, isDraft: true, status: 'unsubmitted' })])
    )
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => screen.getByText('Saved Copy'), LOAD_TIMEOUT)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('hides the favorite button for copied proposals', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ isCopy: true })]))
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => screen.getByText('Saved Copy'), LOAD_TIMEOUT)
    expect(screen.queryByTitle(/favorite/i)).not.toBeInTheDocument()
  })
})

describe('ProposalTableList — API params', () => {
  it('sends search term to getProposalsAction', async () => {
    render(<ProposalTableList searchValue="bayshore" activeFilter="all" />)
    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ search: 'bayshore' }))
    }, LOAD_TIMEOUT)
  })

  it('sends isDraft:true for "draft" filter', async () => {
    render(<ProposalTableList searchValue="" activeFilter="draft" />)
    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ isDraft: true }))
    }, LOAD_TIMEOUT)
  })

  it('sends status:"submitted" for "live" filter', async () => {
    render(<ProposalTableList searchValue="" activeFilter="live" />)
    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ status: 'submitted' }))
    }, LOAD_TIMEOUT)
  })

  it('sends favorite:true for "favorite" filter', async () => {
    render(<ProposalTableList searchValue="" activeFilter="favorite" />)
    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ favorite: true }))
    }, LOAD_TIMEOUT)
  })

  it('sends archived:true for "archive" filter', async () => {
    render(<ProposalTableList searchValue="" activeFilter="archive" />)
    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ archived: true }))
    }, LOAD_TIMEOUT)
  })

  it('sends isCopy:true for "saved" filter', async () => {
    render(<ProposalTableList searchValue="" activeFilter="saved" />)
    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ isCopy: true }))
    }, LOAD_TIMEOUT)
  })
})

describe('ProposalTableList — delete (archive)', () => {
  it('calls deleteProposalAction and shows success toast', async () => {
    mockDeleteProposal.mockResolvedValue({ success: true })
    const refreshCounts = jest.fn()
    render(<ProposalTableList searchValue="" activeFilter="all" onRefreshCounts={refreshCounts} />)
    await waitFor(() => screen.getByRole('button', { name: 'Archive' }), LOAD_TIMEOUT)
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Archive this proposal?' })
    expect(within(dialog).getByText('Bayshore Summit 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('30 days to change your mind')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Move to archive' }))
    await waitFor(() => expect(mockDeleteProposal).toHaveBeenCalledWith('prop-001'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(mockPermanentDelete).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Proposal moved to archive.')
    expect(refreshCounts).toHaveBeenCalledTimes(1)
  })

  it('does not delete when user cancels the confirm dialog', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => screen.getByRole('button', { name: 'Archive' }), LOAD_TIMEOUT)
    const trigger = screen.getByRole('button', { name: 'Archive' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
  })

  it.each(['Escape', 'backdrop'])('dismisses with %s without making a request', async (method) => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    if (method === 'Escape') fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }))
    if (method === 'backdrop') fireEvent.click(screen.getByRole('alertdialog'), { clientX: -1, clientY: -1 })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
  })

  it('does not dismiss when clicking inside the dialog', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Bayshore Summit 2026'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
  })

  it('wraps keyboard focus within the confirmation buttons', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))
    // Cancel and confirm are the only two controls left — Tab cycles between
    // them and never escapes to the page behind the modal.
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Move to archive' })
    confirm.focus()
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(cancel).toHaveFocus()
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
  })

  it('has no close button — Cancel, Escape and the backdrop are the ways out', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    expect(within(dialog).getAllByRole('button')).toHaveLength(2)
  })

  it('does not expose permanent deletion on stale active cards while switching filters', async () => {
    const { rerender } = render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    mockGetProposals.mockReturnValue(new Promise(() => {}))
    rerender(<ProposalTableList searchValue="" activeFilter="archive" />)
    expect(screen.queryByTitle('Delete forever')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
  })

  it('locks dismissal and duplicate submissions while archiving', async () => {
    let finish!: (value: { success: boolean }) => void
    mockDeleteProposal.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    const confirm = screen.getByRole('button', { name: 'Move to archive' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Archiving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    fireEvent.click(dialog, { clientX: -1, clientY: -1 })
    expect(dialog).toBeInTheDocument()
    expect(mockDeleteProposal).toHaveBeenCalledTimes(1)
    await act(async () => finish({ success: true }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('keeps a failed request open with an inline error and allows retry', async () => {
    mockDeleteProposal.mockResolvedValueOnce({ success: false, message: 'Please try again later.' }).mockResolvedValueOnce({ success: true })
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move to archive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again later.')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Move to archive' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(mockDeleteProposal).toHaveBeenCalledTimes(2)
  })

  it('handles network exceptions without losing the confirmation', async () => {
    mockDeleteProposal.mockRejectedValueOnce(new Error('Network unavailable'))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move to archive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not archive this proposal. Please try again.')
    expect(screen.getByRole('button', { name: 'Move to archive' })).toBeEnabled()
  })

  it('confirms the selected proposal rather than another card', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal(), makeProposal({ _id: 'prop-002', event: { eventName: 'Second proposal' } })], 2))
    mockDeleteProposal.mockResolvedValue({ success: true })
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Second proposal')
    fireEvent.click(screen.getAllByRole('button', { name: 'Archive' })[1])
    expect(within(screen.getByRole('alertdialog')).getByText('Second proposal')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move to archive' }))
    await waitFor(() => expect(mockDeleteProposal).toHaveBeenCalledWith('prop-002'))
  })

  it('shows a readable fallback for unnamed proposals', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ event: {} })]))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByRole('button', { name: 'Archive' })
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(within(screen.getByRole('alertdialog')).getByText('Untitled proposal')).toBeInTheDocument()
  })
})

describe('ProposalTableList — permanent delete confirmation', () => {
  beforeEach(() => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ isArchived: true, archivedAt: '2026-09-01T00:00:00.000Z' })]))
  })

  it('uses a distinct irreversible warning and only deletes after confirmation', async () => {
    mockPermanentDelete.mockResolvedValue({ success: true })
    render(<ProposalTableList searchValue="" activeFilter="archive" />)
    await screen.findByTitle('Delete forever')
    fireEvent.click(screen.getByTitle('Delete forever'))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete proposal forever?' })
    expect(within(dialog).getByText('This cannot be undone')).toBeInTheDocument()
    expect(within(dialog).queryByText('30 days to change your mind')).not.toBeInTheDocument()
    expect(mockPermanentDelete).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete forever' }))
    await waitFor(() => expect(mockPermanentDelete).toHaveBeenCalledWith('prop-001'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(mockDeleteProposal).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('cancels permanent deletion without calling the backend', async () => {
    render(<ProposalTableList searchValue="" activeFilter="archive" />)
    await screen.findByTitle('Delete forever')
    fireEvent.click(screen.getByTitle('Delete forever'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mockPermanentDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

describe('ProposalTableList — favorite toggle', () => {
  it('calls updateProposalMetaAction with isFavorite:true when toggling on', async () => {
    mockUpdateMeta.mockResolvedValue({ success: true })
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => screen.getByTitle('Mark as favorite'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByTitle('Mark as favorite'))
    await waitFor(() => {
      expect(mockUpdateMeta).toHaveBeenCalledWith('prop-001', { isFavorite: true })
    })
  })

  it('removes an unfavorited proposal from the favorite list immediately', async () => {
    mockGetProposals
      .mockResolvedValueOnce(successPage([makeProposal({ isFavorite: true })]))
      .mockResolvedValue(emptyPage())
    mockUpdateMeta.mockResolvedValue({ success: true })

    render(<ProposalTableList searchValue="" activeFilter="favorite" />)
    await screen.findByTitle('Remove favorite', {}, LOAD_TIMEOUT)
    fireEvent.click(screen.getByTitle('Remove favorite'))

    await waitFor(() => {
      expect(screen.queryByText('Bayshore Summit 2026')).not.toBeInTheDocument()
    }, LOAD_TIMEOUT)
    expect(mockUpdateMeta).toHaveBeenCalledWith('prop-001', { isFavorite: false })
  })

  it('restores the favorite row when removing the favorite fails', async () => {
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isFavorite: true })]),
    )
    mockUpdateMeta.mockResolvedValue({ success: false, message: 'Update failed' })

    render(<ProposalTableList searchValue="" activeFilter="favorite" />)
    await screen.findByTitle('Remove favorite', {}, LOAD_TIMEOUT)
    fireEvent.click(screen.getByTitle('Remove favorite'))

    expect(await screen.findByText('Bayshore Summit 2026', {}, LOAD_TIMEOUT)).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('Update failed')
  })
})

describe('ProposalTableList — copy URL', () => {
  it('creates a read-only grant and copies a usable secure URL', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => screen.getByTitle('Copy URL'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByTitle('Copy URL'))
    await waitFor(() => expect(mockCreateViewGrant).toHaveBeenCalledWith('prop-001'))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost/proposal-view/bayshore-summit-2026-prop-001?source=share&accessGrant=secure-grant'
    ))
  })

  it('does not copy an unusable bare URL when grant creation fails', async () => {
    mockCreateViewGrant.mockResolvedValue({ success: false, message: 'Grant failed' })
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => screen.getByTitle('Copy URL'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByTitle('Copy URL'))
    await waitFor(() => expect(mockCreateViewGrant).toHaveBeenCalledWith('prop-001'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
  })
})

describe('ProposalTableList — archive view', () => {
  it('shows Restore button in archive filter', async () => {
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isArchived: true, archivedAt: '2026-05-01T00:00:00.000Z' })])
    )
    render(<ProposalTableList searchValue="" activeFilter="archive" />)
    await waitFor(() => expect(screen.getByText('Restore')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('calls restoreProposalAction when Restore is clicked', async () => {
    mockRestoreProposal.mockResolvedValue({ success: true })
    mockGetProposals.mockResolvedValue(
      successPage([makeProposal({ isArchived: true, archivedAt: '2026-05-01T00:00:00.000Z' })])
    )
    render(<ProposalTableList searchValue="" activeFilter="archive" />)
    await waitFor(() => screen.getByText('Restore'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByText('Restore'))
    await waitFor(() => expect(mockRestoreProposal).toHaveBeenCalledWith('prop-001'))
  })
})

describe('ProposalTableList — infinite scroll', () => {
  // jsdom has no IntersectionObserver; this fake lets a test say "the sentinel
  // scrolled into view" by calling the registered callback.
  const installObserver = () => {
    const instances: { trigger: () => void; disconnect: jest.Mock }[] = []
    class FakeIntersectionObserver {
      constructor(private cb: IntersectionObserverCallback) {
        instances.push({
          trigger: () => this.cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never),
          disconnect: this.disconnect as jest.Mock,
        })
      }
      observe = jest.fn()
      unobserve = jest.fn()
      disconnect = jest.fn()
      takeRecords = jest.fn(() => [])
      root = null
      rootMargin = ''
      thresholds = []
    }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver
    ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver
    return instances
  }

  const page = (ids: string[], total: number, pageNumber: number) => ({
    success: true,
    data: ids.map((id) => makeProposal({ _id: id, event: { eventName: `Proposal ${id}` } })),
    pagination: { total, page: pageNumber, limit: 10, totalPages: Math.ceil(total / 10) },
  })

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).IntersectionObserver
    delete (global as unknown as Record<string, unknown>).IntersectionObserver
  })

  it('replaces the pager with a scroll sentinel while more pages remain', async () => {
    installObserver()
    mockGetProposals.mockResolvedValue(page(['a'], 25, 1))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)

    expect(screen.queryByRole('navigation', { name: 'Proposals pagination' })).not.toBeInTheDocument()
    expect(screen.getByTestId('proposals-scroll-sentinel')).toBeInTheDocument()
  })

  it('appends the next page when the sentinel scrolls into view', async () => {
    const observers = installObserver()
    mockGetProposals
      .mockResolvedValueOnce(page(['a', 'b'], 25, 1))
      .mockResolvedValueOnce(page(['c', 'd'], 25, 2))

    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)
    expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }))

    await act(async () => observers[observers.length - 1].trigger())

    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }))
    }, LOAD_TIMEOUT)
    // Earlier pages stay on screen — this appends, it does not replace.
    expect(await screen.findByText('Proposal c', {}, LOAD_TIMEOUT)).toBeInTheDocument()
    expect(screen.getByText('Proposal a')).toBeInTheDocument()
  })

  it('never renders a proposal twice when a page repeats a row', async () => {
    const observers = installObserver()
    mockGetProposals
      .mockResolvedValueOnce(page(['a', 'b'], 25, 1))
      // Archiving a row upstream shifts the offset, so page 2 repeats "b".
      .mockResolvedValueOnce(page(['b', 'c'], 25, 2))

    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)
    await act(async () => observers[observers.length - 1].trigger())

    await screen.findByText('Proposal c', {}, LOAD_TIMEOUT)
    expect(screen.getAllByText('Proposal b')).toHaveLength(1)
  })

  it('stops observing once the last page is loaded and says so', async () => {
    const observers = installObserver()
    mockGetProposals
      .mockResolvedValueOnce(page(['a'], 11, 1))
      .mockResolvedValueOnce(page(['b'], 11, 2))

    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)
    await act(async () => observers[observers.length - 1].trigger())
    await screen.findByText('Proposal b', {}, LOAD_TIMEOUT)

    expect(screen.queryByTestId('proposals-scroll-sentinel')).not.toBeInTheDocument()
    expect(screen.getByText('All 11 proposals loaded')).toBeInTheDocument()
  })

  it('restarts from page 1 when the filter changes', async () => {
    const observers = installObserver()
    mockGetProposals
      .mockResolvedValueOnce(page(['a'], 25, 1))
      .mockResolvedValueOnce(page(['b'], 25, 2))
      .mockResolvedValue(page(['z'], 25, 1))

    const { rerender } = render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)
    await act(async () => observers[observers.length - 1].trigger())
    await screen.findByText('Proposal b', {}, LOAD_TIMEOUT)

    mockGetProposals.mockClear()
    rerender(<ProposalTableList searchValue="" activeFilter="draft" />)

    await waitFor(() => {
      expect(mockGetProposals).toHaveBeenCalledWith(expect.objectContaining({ page: 1, isDraft: true }))
    }, LOAD_TIMEOUT)
    // No stale page-2 request for the list we just left.
    expect(mockGetProposals).not.toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    await screen.findByText('Proposal z', {}, LOAD_TIMEOUT)
    expect(screen.queryByText('Proposal a')).not.toBeInTheDocument()
  })

  it('keeps loaded proposals and offers a retry when the next page fails', async () => {
    const observers = installObserver()
    mockGetProposals
      .mockResolvedValueOnce(page(['a'], 25, 1))
      .mockResolvedValueOnce({ success: false, message: 'boom' })
      .mockResolvedValueOnce(page(['c'], 25, 2))

    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)
    await act(async () => observers[observers.length - 1].trigger())

    expect(await screen.findByRole('alert', {}, LOAD_TIMEOUT)).toHaveTextContent('Could not load more proposals.')
    expect(screen.getByText('Proposal a')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Proposal c', {}, LOAD_TIMEOUT)).toBeInTheDocument()
    // The retry re-requests the page that failed rather than skipping it.
    expect(mockGetProposals).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  })

  it('still loads more without an IntersectionObserver, via the fallback button', async () => {
    mockGetProposals
      .mockResolvedValueOnce(page(['a'], 25, 1))
      .mockResolvedValueOnce(page(['c'], 25, 2))

    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Proposal a', {}, LOAD_TIMEOUT)

    fireEvent.click(screen.getByRole('button', { name: 'Load more proposals' }))
    expect(await screen.findByText('Proposal c', {}, LOAD_TIMEOUT)).toBeInTheDocument()
  })
})
