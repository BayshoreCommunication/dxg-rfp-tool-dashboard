import { fireEvent, render, screen } from '@testing-library/react'
import ProposalFilters from './ProposalFilters'

const mockCounts = {
  all: 10,
  draft: 3,
  live: 4,
  favorite: 2,
  expired: 1,
  archive: 0,
  saved: 5,
}

describe('ProposalFilters', () => {
  const mockOnSearchChange = jest.fn()
  const mockOnFilterChange = jest.fn()

  beforeEach(() => {
    mockOnSearchChange.mockClear()
    mockOnFilterChange.mockClear()
  })

  it('renders all seven filter tabs', () => {
    render(
      <ProposalFilters
        searchValue=""
        onSearchChange={mockOnSearchChange}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    )
    ;['ALL', 'DRAFT', 'LIVE', 'FAVORITE', 'EXPIRED', 'ARCHIVE', 'SAVED'].forEach((label) => {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    })
  })

  it('renders the search input with the current searchValue', () => {
    render(
      <ProposalFilters
        searchValue="summit 2026"
        onSearchChange={mockOnSearchChange}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    )
    expect(screen.getByDisplayValue('summit 2026')).toBeInTheDocument()
  })

  it('calls onSearchChange when typing in the search input', () => {
    render(
      <ProposalFilters
        searchValue=""
        onSearchChange={mockOnSearchChange}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    )
    fireEvent.change(screen.getByPlaceholderText(/search proposals/i), { target: { value: 'bayshore' } })
    expect(mockOnSearchChange).toHaveBeenCalledWith('bayshore')
  })

  it('calls onFilterChange with the correct key when a tab is clicked', () => {
    render(
      <ProposalFilters
        searchValue=""
        onSearchChange={mockOnSearchChange}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /draft/i }))
    expect(mockOnFilterChange).toHaveBeenCalledWith('draft')
  })

  it('calls onFilterChange for each tab with its correct key', () => {
    render(
      <ProposalFilters
        searchValue=""
        onSearchChange={mockOnSearchChange}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    )
    const tabMap: Array<[RegExp, string]> = [
      [/^live/i, 'live'],
      [/^favorite/i, 'favorite'],
      [/^archive/i, 'archive'],
      [/^saved/i, 'saved'],
    ]
    tabMap.forEach(([nameRegex, expectedKey]) => {
      fireEvent.click(screen.getByRole('button', { name: nameRegex }))
      expect(mockOnFilterChange).toHaveBeenCalledWith(expectedKey)
    })
  })

  it('displays badge counts for each tab', () => {
    render(
      <ProposalFilters
        searchValue=""
        onSearchChange={mockOnSearchChange}
        activeFilter="all"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    )
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
