import { fireEvent, render, screen } from '@testing-library/react'
import SignaturesSettings from './SignaturesSettings'
import type { SignaturesSettingsForm } from './SettingsDetials'

jest.mock('next/font/google', () => ({
  Dancing_Script: () => ({ className: 'mock-dancing-script' }),
  Pacifico: () => ({ className: 'mock-pacifico' }),
  Great_Vibes: () => ({ className: 'mock-great-vibes' }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockOnChange = jest.fn()

const uploadValue: SignaturesSettingsForm = {
  signatureType: 'Upload',
  signatureImageUrl: '',
  signatureText: '',
  signatureStyle: '',
}

const drawValue: SignaturesSettingsForm = {
  signatureType: 'Draw',
  signatureImageUrl: '',
  signatureText: '',
  signatureStyle: '',
}

beforeEach(() => jest.clearAllMocks())

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SignaturesSettings — rendering', () => {
  it('renders the Signatures heading', () => {
    render(<SignaturesSettings value={uploadValue} onChange={mockOnChange} />)
    expect(screen.getByText('Signatures')).toBeInTheDocument()
  })

  it('renders the signature type selector', () => {
    render(<SignaturesSettings value={uploadValue} onChange={mockOnChange} />)
    expect(screen.getByLabelText(/your signature type/i)).toBeInTheDocument()
  })

  it('renders Upload and Draw options in the type selector', () => {
    render(<SignaturesSettings value={uploadValue} onChange={mockOnChange} />)
    expect(screen.getByRole('option', { name: 'Upload' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Draw' })).toBeInTheDocument()
  })
})

describe('SignaturesSettings — Upload mode', () => {
  it('shows the drag & drop upload zone in Upload mode', () => {
    render(<SignaturesSettings value={uploadValue} onChange={mockOnChange} />)
    expect(screen.getByText(/click to upload or drag/i)).toBeInTheDocument()
  })

  it('shows accepted file type hint', () => {
    render(<SignaturesSettings value={uploadValue} onChange={mockOnChange} />)
    expect(screen.getByText(/PNG, JPG, SVG/i)).toBeInTheDocument()
  })

  it('shows signature preview image when signatureImageUrl is set', () => {
    render(
      <SignaturesSettings
        value={{ ...uploadValue, signatureImageUrl: 'data:image/png;base64,abc' }}
        onChange={mockOnChange}
      />,
    )
    expect(screen.getByAltText('Uploaded signature')).toBeInTheDocument()
  })

  it('shows delete button when signatureImageUrl is set', () => {
    render(
      <SignaturesSettings
        value={{ ...uploadValue, signatureImageUrl: 'data:image/png;base64,abc' }}
        onChange={mockOnChange}
      />,
    )
    expect(screen.getByLabelText('Remove signature')).toBeInTheDocument()
  })

  it('calls onChange with empty signatureImageUrl when delete button is clicked', () => {
    render(
      <SignaturesSettings
        value={{ ...uploadValue, signatureImageUrl: 'data:image/png;base64,abc' }}
        onChange={mockOnChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('Remove signature'))
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureImageUrl: '' }),
    )
  })

  it('does not show upload zone in Draw mode', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    expect(screen.queryByText(/click to upload or drag/i)).not.toBeInTheDocument()
  })
})

describe('SignaturesSettings — Draw mode', () => {
  it('shows the typed name input in Draw mode', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    expect(screen.getByPlaceholderText(/e\.g\. John Smith/i)).toBeInTheDocument()
  })

  it('shows all four font picker buttons', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    expect(screen.getByRole('button', { name: 'Brush Script' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dancing Script' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pacifico' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Great Vibes' })).toBeInTheDocument()
  })

  it('shows preview placeholder when signatureText is empty', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    expect(
      screen.getByText(/your signature preview will appear here/i),
    ).toBeInTheDocument()
  })

  it('shows typed name in preview when signatureText is set', () => {
    render(
      <SignaturesSettings
        value={{ ...drawValue, signatureText: 'Jane Doe', signatureStyle: '"Brush Script MT", cursive' }}
        onChange={mockOnChange}
      />,
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('calls onChange with updated signatureText when name is typed', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. John Smith/i), {
      target: { value: 'John Doe' },
    })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureText: 'John Doe' }),
    )
  })

  it('calls onChange with updated signatureStyle when a font is selected', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dancing Script' }))
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureStyle: expect.stringContaining('Dancing Script') }),
    )
  })
})

describe('SignaturesSettings — mode switching', () => {
  it('calls onChange with cleared fields when type changes to Draw', () => {
    render(<SignaturesSettings value={uploadValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByLabelText(/your signature type/i), {
      target: { value: 'Draw' },
    })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureType: 'Draw',
        signatureImageUrl: '',
        signatureText: '',
        signatureStyle: '',
      }),
    )
  })

  it('calls onChange with cleared fields when type changes to Upload', () => {
    render(<SignaturesSettings value={drawValue} onChange={mockOnChange} />)
    fireEvent.change(screen.getByLabelText(/your signature type/i), {
      target: { value: 'Upload' },
    })
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ signatureType: 'Upload', signatureText: '', signatureStyle: '' }),
    )
  })
})
