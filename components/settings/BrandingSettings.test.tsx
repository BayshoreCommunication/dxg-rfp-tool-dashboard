import { fireEvent, render, screen } from '@testing-library/react'
import BrandingSettings from './BrandingSettings'
import type { BrandingSettingsForm } from './SettingsDetials'

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockOnChange = jest.fn()
const mockOnLogoFileSelected = jest.fn()

const defaultValue: BrandingSettingsForm = {
  brandName: 'Acme Corp',
  linkPrefix: 'acme',
  defaultFont: 'Poppins',
  signatureColor: '#2FC6F5',
  logoFile: null,
}

beforeEach(() => jest.clearAllMocks())

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BrandingSettings — rendering', () => {
  it('renders the Branding heading', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByText('Branding')).toBeInTheDocument()
  })

  it('renders brand name input with current value', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument()
  })

  it('renders link prefix input with current value', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('acme')).toBeInTheDocument()
  })

  it('renders .goprospero.com suffix label', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByText('.goprospero.com')).toBeInTheDocument()
  })

  it('renders font dropdown with Poppins/Inter/Roboto options', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Poppins' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Inter' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Roboto' })).toBeInTheDocument()
  })

  it('renders signature color input with current value', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByDisplayValue('#2FC6F5')).toBeInTheDocument()
  })

  it('renders logo upload button with aria-label', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByLabelText('Upload company logo')).toBeInTheDocument()
  })
})

describe('BrandingSettings — logo button text', () => {
  it('shows "Upload" when no logo is set', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument()
  })

  it('shows "Change" when a logo is already set', () => {
    render(
      <BrandingSettings
        value={{ ...defaultValue, logoFile: 'https://example.com/logo.png' }}
        onChange={mockOnChange}
      />,
    )
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  it('shows logo preview image when logoFile is set', () => {
    render(
      <BrandingSettings
        value={{ ...defaultValue, logoFile: 'https://example.com/logo.png' }}
        onChange={mockOnChange}
      />,
    )
    expect(screen.getByAltText('Company logo preview')).toBeInTheDocument()
  })
})

describe('BrandingSettings — onChange callbacks', () => {
  it('calls onChange when brand name changes', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByDisplayValue('Acme Corp'), { target: { value: 'New Brand' } })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ brandName: 'New Brand' }),
    )
  })

  it('calls onChange when link prefix changes', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByDisplayValue('acme'), { target: { value: 'newbrand' } })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ linkPrefix: 'newbrand' }),
    )
  })

  it('calls onChange when font is changed', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Inter' } })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ defaultFont: 'Inter' }),
    )
  })

  it('calls onChange with valid hex when signature color changes', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByDisplayValue('#2FC6F5'), { target: { value: '#FF0000' } })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureColor: '#FF0000' }),
    )
  })

  it('resets to fallback color when a 7-char invalid hex is entered', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    // 7-char invalid hex → handleHexChange falls back to the default #2FC6F5
    fireEvent.change(screen.getByDisplayValue('#2FC6F5'), { target: { value: '#ZZZZZZ' } })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureColor: '#2FC6F5' }),
    )
  })

  it('does not call onChange while the user is mid-typing (< 7 chars)', () => {
    render(<BrandingSettings value={defaultValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByDisplayValue('#2FC6F5'), { target: { value: '#FF' } })
    expect(mockOnChange).not.toHaveBeenCalled()
  })
})
