import { fireEvent, render, screen } from '@testing-library/react'
import SaveCopyModal from './SaveCopyModal'

const baseProps = {
  isOpen: true,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  saving: false,
  defaultEventName: 'Summit 2026',
}

beforeEach(() => jest.clearAllMocks())

describe('SaveCopyModal', () => {
  describe('visibility', () => {
    it('renders nothing when isOpen is false', () => {
      render(<SaveCopyModal {...baseProps} isOpen={false} />)
      expect(screen.queryByRole('heading', { name: /save a copy/i })).not.toBeInTheDocument()
    })

    it('renders the modal when isOpen is true', () => {
      render(<SaveCopyModal {...baseProps} />)
      expect(screen.getByRole('dialog', { name: /save a copy/i })).toBeInTheDocument()
      expect(screen.getByText('Save a Copy')).toBeInTheDocument()
      expect(screen.getByText('Customize the copy. It will be saved as a draft.')).toBeInTheDocument()
    })
  })

  describe('default values', () => {
    it('pre-fills the event name input with defaultEventName', () => {
      render(<SaveCopyModal {...baseProps} />)
      expect(screen.getByDisplayValue('Summit 2026')).toBeInTheDocument()
    })

    it('pre-fills start and end date when provided', () => {
      render(<SaveCopyModal {...baseProps} defaultStartDate="2026-06-01" defaultEndDate="2026-06-05" />)
      expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2026-06-05')).toBeInTheDocument()
    })
  })

  describe('closing the modal', () => {
    it('calls onClose when the close button is clicked', () => {
      render(<SaveCopyModal {...baseProps} />)
      fireEvent.click(screen.getByRole('button', { name: /close save a copy dialog/i }))
      expect(baseProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Escape is pressed', () => {
      render(<SaveCopyModal {...baseProps} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(baseProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when Cancel is clicked', () => {
      render(<SaveCopyModal {...baseProps} />)
      fireEvent.click(screen.getByText('Cancel'))
      expect(baseProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when clicking the backdrop', () => {
      const { container } = render(<SaveCopyModal {...baseProps} />)
      const backdrop = container.querySelector('.fixed')!
      fireEvent.click(backdrop)
      expect(baseProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('form validation', () => {
    it('shows an error and blocks confirm when event name is empty', () => {
      render(<SaveCopyModal {...baseProps} defaultEventName="" />)
      fireEvent.click(screen.getByText('Save Copy'))
      expect(screen.getByText('Event name is required.')).toBeInTheDocument()
      expect(baseProps.onConfirm).not.toHaveBeenCalled()
    })

    it('clears error after user types in the event name field', () => {
      render(<SaveCopyModal {...baseProps} defaultEventName="" />)
      fireEvent.click(screen.getByText('Save Copy'))
      expect(screen.getByText('Event name is required.')).toBeInTheDocument()

      fireEvent.change(screen.getByPlaceholderText('Enter event name for the copy'), {
        target: { value: 'New Event' },
      })
      fireEvent.click(screen.getByText('Save Copy'))
      expect(screen.queryByText('Event name is required.')).not.toBeInTheDocument()
    })
  })

  describe('form submission', () => {
    it('calls onConfirm with event name and empty dates by default', () => {
      render(<SaveCopyModal {...baseProps} defaultEventName="My Event" />)
      fireEvent.click(screen.getByText('Save Copy'))
      expect(baseProps.onConfirm).toHaveBeenCalledWith({
        eventName: 'My Event',
        startDate: '',
        endDate: '',
      })
    })

    it('calls onConfirm with updated event name after user edits it', () => {
      render(<SaveCopyModal {...baseProps} defaultEventName="Old Name" />)
      fireEvent.change(screen.getByDisplayValue('Old Name'), { target: { value: 'New Name' } })
      fireEvent.click(screen.getByText('Save Copy'))
      expect(baseProps.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ eventName: 'New Name' }))
    })

    it('includes start and end dates in the confirm payload', () => {
      render(<SaveCopyModal {...baseProps} />)
      const [startInput, endInput] = screen.getAllByRole('textbox', { hidden: true }).filter(
        (el) => (el as HTMLInputElement).type === 'date'
      ) as HTMLInputElement[]
      fireEvent.change(screen.getAllByDisplayValue('')[0], { target: { value: '2026-07-01' } })
      fireEvent.click(screen.getByText('Save Copy'))
      expect(baseProps.onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'Summit 2026' })
      )
    })
  })

  describe('saving state', () => {
    it('shows "Saving..." on the confirm button when saving is true', () => {
      render(<SaveCopyModal {...baseProps} saving />)
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })

    it('disables Cancel and Save Copy buttons when saving is true', () => {
      render(<SaveCopyModal {...baseProps} saving />)
      expect(screen.getByText('Cancel')).toBeDisabled()
      expect(screen.getByText('Saving...')).toBeDisabled()
    })
  })

  describe('re-open reset', () => {
    it('resets form fields when modal re-opens with new defaultEventName', () => {
      const { rerender } = render(<SaveCopyModal {...baseProps} isOpen={false} defaultEventName="" />)
      rerender(<SaveCopyModal {...baseProps} isOpen defaultEventName="Fresh Name" />)
      expect(screen.getByDisplayValue('Fresh Name')).toBeInTheDocument()
    })
  })
})
