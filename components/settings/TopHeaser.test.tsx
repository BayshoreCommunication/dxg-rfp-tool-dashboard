import { act, render, screen, waitFor } from '@testing-library/react'
import TopHeader from './TopHeaser'

// ORG-607: the Vendors tab depends on the member's access to the vendor list.
const mockVendorAccess = jest.fn()
jest.mock('@/app/actions/vendorList', () => ({
  getVendorListAccessAction: (...a: unknown[]) => mockVendorAccess(...a),
}))
// ORG-605: the Templates tab depends on the member's access to RFP templates.
const mockTemplateAccess = jest.fn()
jest.mock('@/app/actions/proposalTemplates', () => ({
  getTemplateAccessAction: (...a: unknown[]) => mockTemplateAccess(...a),
}))
jest.mock('next/navigation', () => ({ usePathname: () => '/settings' }))

beforeEach(() => {
  mockVendorAccess.mockResolvedValue({ canRead: false, canEdit: false })
  mockTemplateAccess.mockResolvedValue({ canUse: false, canManage: false })
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
    // Let the access answer settle: the tab would appear only after it.
    await act(async () => { await mockVendorAccess.mock.results[0].value })
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vendors' })).not.toBeInTheDocument()
  })

  it('shows the Templates section to a member who can use RFP templates', async () => {
    mockTemplateAccess.mockResolvedValue({ canUse: true, canManage: false })
    render(<TopHeader />)
    expect(await screen.findByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/settings/templates')
  })

  it('hides the Templates section from a Viewer', async () => {
    render(<TopHeader />)
    await waitFor(() => expect(mockTemplateAccess).toHaveBeenCalled())
    await act(async () => { await mockTemplateAccess.mock.results[0].value })
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Templates' })).not.toBeInTheDocument()
  })

  it('shows the Templates section at once on a page that already knows the member can use them', () => {
    mockTemplateAccess.mockClear()
    render(<TopHeader templatesLink />)
    expect(screen.getByRole('link', { name: 'Templates' })).toBeInTheDocument()
    expect(mockTemplateAccess).not.toHaveBeenCalled()
  })
})
