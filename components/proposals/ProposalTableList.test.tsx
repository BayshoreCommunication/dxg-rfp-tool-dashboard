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
  it('shows "No proposals found" message when list is empty', async () => {
    mockGetProposals.mockResolvedValue(emptyPage())
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText(/No proposals found/)).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('shows "New Proposal" link in empty state', async () => {
    mockGetProposals.mockResolvedValue(emptyPage())
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('New Proposal')).toBeInTheDocument(), LOAD_TIMEOUT)
  })
})

describe('ProposalTableList — proposal cards', () => {
  it('renders the proposal event name', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('Bayshore Summit 2026')).toBeInTheDocument(), LOAD_TIMEOUT)
  })

  it('renders the owner name', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await waitFor(() => expect(screen.getByText('AR Sahak')).toBeInTheDocument(), LOAD_TIMEOUT)
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
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
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
    await waitFor(() => screen.getByTitle('Delete'), LOAD_TIMEOUT)
    fireEvent.click(screen.getByTitle('Delete'))
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
    await waitFor(() => screen.getByTitle('Delete'), LOAD_TIMEOUT)
    const trigger = screen.getByTitle('Delete')
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
  })

  it.each(['close button', 'Escape', 'backdrop'])('dismisses with %s without making a request', async (method) => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByTitle('Delete')
    fireEvent.click(screen.getByTitle('Delete'))
    if (method === 'close button') fireEvent.click(screen.getByRole('button', { name: 'Close proposal deletion dialog' }))
    if (method === 'Escape') fireEvent(screen.getByRole('alertdialog'), new Event('cancel', { cancelable: true }))
    if (method === 'backdrop') fireEvent.click(screen.getByRole('alertdialog'), { clientX: -1, clientY: -1 })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
  })

  it('does not dismiss when clicking inside the dialog', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByTitle('Delete')
    fireEvent.click(screen.getByTitle('Delete'))
    fireEvent.click(within(screen.getByRole('alertdialog')).getByText('Bayshore Summit 2026'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(mockDeleteProposal).not.toHaveBeenCalled()
  })

  it('wraps keyboard focus within the confirmation buttons', async () => {
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    fireEvent.click(await screen.findByTitle('Delete'))
    const close = screen.getByRole('button', { name: 'Close proposal deletion dialog' })
    const confirm = screen.getByRole('button', { name: 'Move to archive' })
    confirm.focus()
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
  })

  it('does not expose permanent deletion on stale active cards while switching filters', async () => {
    const { rerender } = render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByTitle('Delete')
    mockGetProposals.mockReturnValue(new Promise(() => {}))
    rerender(<ProposalTableList searchValue="" activeFilter="archive" />)
    expect(screen.queryByTitle('Delete forever')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
  })

  it('locks dismissal and duplicate submissions while archiving', async () => {
    let finish!: (value: { success: boolean }) => void
    mockDeleteProposal.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByTitle('Delete')
    fireEvent.click(screen.getByTitle('Delete'))
    const confirm = screen.getByRole('button', { name: 'Move to archive' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Archiving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close proposal deletion dialog' })).toBeDisabled()
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
    await screen.findByTitle('Delete')
    fireEvent.click(screen.getByTitle('Delete'))
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
    await screen.findByTitle('Delete')
    fireEvent.click(screen.getByTitle('Delete'))
    fireEvent.click(screen.getByRole('button', { name: 'Move to archive' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not archive this proposal. Please try again.')
    expect(screen.getByRole('button', { name: 'Move to archive' })).toBeEnabled()
  })

  it('confirms the selected proposal rather than another card', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal(), makeProposal({ _id: 'prop-002', event: { eventName: 'Second proposal' } })], 2))
    mockDeleteProposal.mockResolvedValue({ success: true })
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByText('Second proposal')
    fireEvent.click(screen.getAllByTitle('Delete')[1])
    expect(within(screen.getByRole('alertdialog')).getByText('Second proposal')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Move to archive' }))
    await waitFor(() => expect(mockDeleteProposal).toHaveBeenCalledWith('prop-002'))
  })

  it('shows a readable fallback for unnamed proposals', async () => {
    mockGetProposals.mockResolvedValue(successPage([makeProposal({ event: {} })]))
    render(<ProposalTableList searchValue="" activeFilter="all" />)
    await screen.findByTitle('Delete')
    fireEvent.click(screen.getByTitle('Delete'))
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
