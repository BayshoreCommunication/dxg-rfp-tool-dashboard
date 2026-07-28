import { fireEvent, render, screen } from '@testing-library/react'
import GlobalDateInput from './GlobalDateInput'

jest.mock('react-datepicker', () => ({
  __esModule: true,
  default: ({ onChange, placeholderText, disabled, id, name, minDate, ariaInvalid, ariaDescribedBy }: {
    onChange: (date: Date | null) => void
    placeholderText?: string
    disabled?: boolean
    id?: string
    name?: string
    minDate?: Date
    ariaInvalid?: 'true' | 'false'
    ariaDescribedBy?: string
  }) => (
    <input
      data-testid="datepicker"
      id={id}
      name={name}
      placeholder={placeholderText}
      disabled={disabled}
      min={minDate ? `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}` : undefined}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
    />
  ),
}))

describe('GlobalDateInput', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => mockOnChange.mockClear())

  it('renders label with format by default', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} label="Start Date" format="yyyy-MM-dd" />)
    expect(screen.getByText('Start Date (YYYY-MM-DD)')).toBeInTheDocument()
  })

  it('hides the label when hideLabel is true', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} label="Start Date" hideLabel />)
    expect(screen.queryByText(/Start Date/)).not.toBeInTheDocument()
  })

  it('omits format from label when showFormatInLabel is false', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} label="Start Date" showFormatInLabel={false} />)
    expect(screen.getByText('Start Date')).toBeInTheDocument()
    expect(screen.queryByText(/YYYY/)).not.toBeInTheDocument()
  })

  it('shows error message when error prop is provided', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} error="Date is required" />)
    expect(screen.getByText('Date is required')).toBeInTheDocument()
  })

  it('hides error message when showErrorMessage is false', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} error="Date is required" showErrorMessage={false} />)
    expect(screen.queryByText('Date is required')).not.toBeInTheDocument()
  })

  it('renders a calendar icon button', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('disables the input when disabled prop is true', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} disabled />)
    expect(screen.getByTestId('datepicker')).toBeDisabled()
  })

  it('calls onChange when the input value changes', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} />)
    fireEvent.change(screen.getByTestId('datepicker'), { target: { value: '2026-06-10' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.any(Date))
  })

  it('calls onChange with null when input is cleared', () => {
    render(<GlobalDateInput value={null} onChange={mockOnChange} />)
    const input = screen.getByTestId('datepicker')
    fireEvent.change(input, { target: { value: '2026-06-10' } })
    mockOnChange.mockClear()
    fireEvent.change(input, { target: { value: '' } })
    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('passes the earliest allowed date and accessible error state to the input', () => {
    render(
      <GlobalDateInput
        value={null}
        onChange={mockOnChange}
        minDate={new Date(2026, 6, 27)}
        ariaInvalid
        ariaDescribedBy="date-error"
      />,
    )

    expect(screen.getByTestId('datepicker')).toHaveAttribute('min', '2026-07-27')
    expect(screen.getByTestId('datepicker')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByTestId('datepicker')).toHaveAttribute('aria-describedby', 'date-error')
  })
})
