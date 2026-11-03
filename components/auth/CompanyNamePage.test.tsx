import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CompanyNamePage from './CompanyNamePage'

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}))

const mockSave = jest.fn()
const mockSkip = jest.fn()
jest.mock('@/app/actions/organizationProfile', () => ({
  saveCompanyNameAction: (...a: unknown[]) => mockSave(...a),
  skipCompanyNameAction: (...a: unknown[]) => mockSkip(...a),
}))

beforeEach(() => jest.clearAllMocks())

const typeName = (value: string) =>
  fireEvent.change(screen.getByLabelText('Company name'), { target: { value } })

describe('CompanyNamePage', () => {
  it('saves the trimmed company name and goes to the dashboard', async () => {
    mockSave.mockResolvedValue({ success: true, message: 'OK', data: { name: 'Acme Events' } })
    const navigate = jest.fn()
    render(<CompanyNamePage firstName="Pat" navigate={navigate} />)
    expect(screen.getByRole('heading', { name: 'Welcome, Pat' })).toBeInTheDocument()
    typeName('  Acme Events  ')
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
    expect(mockSave).toHaveBeenCalledWith('Acme Events')
  })

  it('asks for a name instead of sending an empty one', () => {
    render(<CompanyNamePage firstName="Pat" navigate={jest.fn()} />)
    typeName('   ')
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your company name.')
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('shows a refusal and stays on the page', async () => {
    mockSave.mockResolvedValue({ success: false, status: 403, code: 'FORBIDDEN', message: 'no' })
    const navigate = jest.fn()
    render(<CompanyNamePage firstName="" navigate={navigate} />)
    typeName('Acme')
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/Owner or an Admin/)
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Continue/ })).not.toBeDisabled()
  })

  it('skipping clears the prompt for this session and goes to the dashboard', async () => {
    mockSkip.mockResolvedValue(undefined)
    const navigate = jest.fn()
    render(<CompanyNamePage firstName="Pat" navigate={navigate} />)
    fireEvent.click(screen.getByRole('button', { name: /Skip for now/ }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'))
    expect(mockSkip).toHaveBeenCalledTimes(1)
    expect(mockSave).not.toHaveBeenCalled()
  })
})
