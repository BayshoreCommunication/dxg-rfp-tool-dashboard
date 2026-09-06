import { fireEvent, render, screen } from '@testing-library/react'
import ProposalSuccessfullyCreate from './ProposalSuccessfullyCreate'

const baseProps = {
  proposalTitle: 'Bayshore Summit 2026',
  onBackToList: jest.fn(),
  onSendEmail: jest.fn(),
  onViewProposal: jest.fn(),
}

beforeEach(() => jest.clearAllMocks())

describe('ProposalSuccessfullyCreate', () => {
  it('shows the success heading', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />)
    expect(screen.getByText('Proposal published successfully')).toBeInTheDocument()
    expect(screen.getByText(/Publishing does not send invitation emails/)).toBeInTheDocument()
  })

  it('displays the proposal title in the message', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />)
    expect(screen.getByText(/Bayshore Summit 2026/)).toBeInTheDocument()
  })

  it('calls onBackToList when "Back To Proposal List" is clicked', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />)
    fireEvent.click(screen.getByText('Back To Proposal List'))
    expect(baseProps.onBackToList).toHaveBeenCalledTimes(1)
  })

  it('calls onViewProposal when "View Proposal" is clicked', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />)
    fireEvent.click(screen.getByText('View Proposal'))
    expect(baseProps.onViewProposal).toHaveBeenCalledTimes(1)
  })

  it('opens invitation composition without sending automatically', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />)
    expect(baseProps.onSendEmail).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Share with vendors' }))
    expect(baseProps.onSendEmail).toHaveBeenCalledTimes(1)
  })

  it('does not render "Save a Copy" button when onSaveCopy is not provided', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} />)
    expect(screen.queryByText('Save a Copy')).not.toBeInTheDocument()
  })

  it('renders "Save a Copy" button when onSaveCopy is provided', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} onSaveCopy={jest.fn()} />)
    expect(screen.getByText('Save a Copy')).toBeInTheDocument()
  })

  it('calls onSaveCopy when "Save a Copy" is clicked', () => {
    const onSaveCopy = jest.fn()
    render(<ProposalSuccessfullyCreate {...baseProps} onSaveCopy={onSaveCopy} />)
    fireEvent.click(screen.getByText('Save a Copy'))
    expect(onSaveCopy).toHaveBeenCalledTimes(1)
  })

  it('renders all four action buttons when onSaveCopy is provided', () => {
    render(<ProposalSuccessfullyCreate {...baseProps} onSaveCopy={jest.fn()} />)
    expect(screen.getByText('Back To Proposal List')).toBeInTheDocument()
    expect(screen.getByText('View Proposal')).toBeInTheDocument()
    expect(screen.getByText('Save a Copy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share with vendors' })).toBeInTheDocument()
  })
})
