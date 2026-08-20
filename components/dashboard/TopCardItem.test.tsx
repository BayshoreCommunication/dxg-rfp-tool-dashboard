import { render, screen } from '@testing-library/react'
import TopCardItem from './TopCardItem'

const mockTotals = {
  totalProposals: 42,
  totalEmailSent: 15,
  totalEmailClicked: 7,
  totalProposalViews: 100,
  totalVendorResponses: 9,
  unreadVendorResponses: 3,
}

describe('TopCardItem', () => {
  it('renders skeleton and hides stat titles when isLoading is true', () => {
    render(<TopCardItem isLoading />)
    expect(screen.queryByText('Total Proposals')).not.toBeInTheDocument()
  })

  it('renders all five stat card titles', () => {
    render(<TopCardItem totals={mockTotals} />)
    expect(screen.getByText('Total Proposals')).toBeInTheDocument()
    expect(screen.getByText('Total Email Sent')).toBeInTheDocument()
    expect(screen.getByText('Total Email Clicked')).toBeInTheDocument()
    expect(screen.getByText('Total Proposal Views')).toBeInTheDocument()
    expect(screen.getByText('Vendor Responses')).toBeInTheDocument()
  })

  it('renders correct values from totals prop', () => {
    render(<TopCardItem totals={mockTotals} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('3 unread')).toBeInTheDocument()
  })

  it('defaults to 0 when totals are not provided', () => {
    render(<TopCardItem />)
    expect(screen.getAllByText('0')).toHaveLength(5)
  })

  it('renders trend values for each stat card', () => {
    render(<TopCardItem totals={mockTotals} />)
    expect(screen.getByText('+18%')).toBeInTheDocument()
    expect(screen.getByText('+5%')).toBeInTheDocument()
    expect(screen.getByText('+24%')).toBeInTheDocument()
    expect(screen.getByText('+12%')).toBeInTheDocument()
  })

  it('makes every metric card a meaningful navigation link', () => {
    render(<TopCardItem totals={mockTotals} />)

    expect(
      screen.getByRole('link', {
        name: 'Total Proposals: 42. Open proposals',
      }),
    ).toHaveAttribute('href', '/proposals')
    expect(
      screen.getByRole('link', {
        name: 'Total Email Sent: 15. Open email activity',
      }),
    ).toHaveAttribute('href', '/email')
    expect(
      screen.getByRole('link', {
        name: 'Total Email Clicked: 7. Open email activity',
      }),
    ).toHaveAttribute('href', '/email')
    expect(
      screen.getByRole('link', {
        name: 'Total Proposal Views: 100. Review proposals',
      }),
    ).toHaveAttribute('href', '/proposals')
    expect(
      screen.getByRole('link', {
        name: 'Vendor Responses: 9. Open responses',
      }),
    ).toHaveAttribute('href', '/vendor-responses')
  })
})
