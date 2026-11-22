import { render, screen, waitFor } from '@testing-library/react'
import { SettingsAccessProvider } from './SettingsAccessContext'
import { settingsAccessForRoles } from './settingsAccess'
import TopHeader from './TopHeaser'

jest.mock('next/navigation', () => ({ usePathname: () => '/settings' }))

// The tabs follow the member's access, which the page layout works out from the session's roles.
const renderAs = (role: string) =>
  render(
    <SettingsAccessProvider value={settingsAccessForRoles([role])}>
      <TopHeader />
    </SettingsAccessProvider>,
  )

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

  // ORG-607 and ORG-605: Vendors and Templates are there on first render, with no request.
  it('shows the Vendors and Templates sections to a Planner on first render', () => {
    renderAs('planner')
    expect(screen.getByRole('link', { name: 'Vendors' })).toHaveAttribute('href', '/settings/vendors')
    expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('href', '/settings/templates')
  })

  it('hides the Vendors and Templates sections from a Viewer', () => {
    renderAs('viewer')
    expect(screen.getByRole('link', { name: 'Security' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Vendors' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Templates' })).not.toBeInTheDocument()
  })
})
