import { fireEvent, render, screen } from '@testing-library/react'
import ProposalsSettings from './ProposalsSettings'
import type { ProposalsSettingsForm } from './SettingsDetials'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockOnChange = jest.fn()

const defaultValue: ProposalsSettingsForm = {
  proposalLanguage: 'English',
  defaultCurrency: '$',
  expiryDate: 'None',
  priceSeparator: 'NONE',
  dateFormat: 'MM/DD/YYYY',
  decimalPrecision: '2',
  contacts: {
    email: { enabled: true, value: 'team@example.com' },
    call: { enabled: false, value: '+1-555-0123' },
  },
  downloadPreview: 'Yes',
  teammateEmail: '',
}

beforeEach(() => jest.clearAllMocks())

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProposalsSettings — rendering', () => {
  it('renders the Proposals heading', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByText('Proposals')).toBeInTheDocument()
  })

  it('renders the default currency input with current value', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('$')).toBeInTheDocument()
  })

  it('renders expiry date options: None / 7 Days / 14 Days / 30 Days', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    const select = screen.getByLabelText(/proposal expiry date/i) as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'None' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '7 Days' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '14 Days' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '30 Days' })).toBeInTheDocument()
  })

  it('renders teammate email input placeholder', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByPlaceholderText('example@email.com')).toBeInTheDocument()
  })
})

describe('ProposalsSettings — contact buttons', () => {
  it('email checkbox is checked when email.enabled is true', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByRole('checkbox', { name: /email/i })).toBeChecked()
  })

  it('call checkbox is unchecked when call.enabled is false', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByRole('checkbox', { name: /call/i })).not.toBeChecked()
  })

  it('email input is enabled when email.enabled is true', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('team@example.com')).not.toBeDisabled()
  })

  it('call input is disabled when call.enabled is false', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('+1-555-0123')).toBeDisabled()
  })

  it('email input is disabled when email.enabled is false', () => {
    render(
      <ProposalsSettings
        value={{
          ...defaultValue,
          contacts: { ...defaultValue.contacts, email: { enabled: false, value: 'off@example.com' } },
        }}
        onChange={mockOnChange}
      />,
    )
    expect(screen.getByDisplayValue('off@example.com')).toBeDisabled()
  })

  it('toggling email checkbox calls onChange with email.enabled toggled', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /email/i }))
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: expect.objectContaining({
          email: expect.objectContaining({ enabled: false }),
        }),
      }),
    )
  })

  it('toggling call checkbox calls onChange with call.enabled toggled', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /call/i }))
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: expect.objectContaining({
          call: expect.objectContaining({ enabled: true }),
        }),
      }),
    )
  })
})

describe('ProposalsSettings — onChange callbacks', () => {
  it('calls onChange when default currency changes', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByDisplayValue('$'), { target: { value: '€' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ defaultCurrency: '€' }))
  })

  it('calls onChange when expiry date changes', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByLabelText(/proposal expiry date/i), { target: { value: '30 Days' } })
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({ expiryDate: '30 Days' }))
  })

  it('calls onChange when teammate email changes', () => {
    render(<ProposalsSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByPlaceholderText('example@email.com'), {
      target: { value: 'teammate@company.com' },
    })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ teammateEmail: 'teammate@company.com' }),
    )
  })
})
