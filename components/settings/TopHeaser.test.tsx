import { render, screen, waitFor } from '@testing-library/react'
import TopHeader from './TopHeaser'

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
})
