import { render, screen, waitFor } from '@testing-library/react'
import TopHeader from './TopHeaser'

// ORG-607: the Vendors tab depends on the member's access to the vendor list.
const mockVendorAccess = jest.fn()
jest.mock('@/app/actions/vendorList', () => ({
  getVendorListAccessAction: (...a: unknown[]) => mockVendorAccess(...a),
}))
jest.mock('next/navigation', () => ({ usePathname: () => '/settings' }))

beforeEach(() => {
  mockVendorAccess.mockResolvedValue({ canRead: false, canEdit: false })
})

describe('TopHeader', () => {
  it('renders the Settings heading', () => {
    render(<TopHeader />)
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
  })

  it('renders the Overview badge', () => {
    render(<TopHeader />)
    expect(screen.getByText(/overview/i)).toBeInTheDocument()
  })

  it('shows a time-of-day greeting after mount', async () => {
    render(<TopHeader />)
    await waitFor(() =>
      expect(
        screen.getByText(/good (morning|afternoon|evening)/i),
      ).toBeInTheDocument(),
    )
  })

  it('shows the current date after mount', async () => {
    render(<TopHeader />)
    await waitFor(() => {
      const text = screen.getByText(/good (morning|afternoon|evening)/i).textContent ?? ''
      expect(text).toMatch(/·/)
    })
  })

  it('shows the Vendors section to a member who can read the vendor list', async () => {
    mockVendorAccess.mockResolvedValue({ canRead: true, canEdit: false })
    render(<TopHeader />)
    expect(await screen.findByRole('link', { name: 'Vendors' })).toHaveAttribute('href', '/settings/vendors')
  })

  it('hides the Vendors section from a Viewer', async () => {
    render(<TopHeader />)
    await waitFor(() => expect(mockVendorAccess).toHaveBeenCalled())
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vendors' })).not.toBeInTheDocument()
  })
})
