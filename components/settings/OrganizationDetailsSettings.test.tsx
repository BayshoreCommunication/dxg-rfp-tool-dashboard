import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import OrganizationDetailsSettings from './OrganizationDetailsSettings'

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockGet = jest.fn()
const mockSave = jest.fn()
jest.mock('@/app/actions/organizationProfile', () => ({
  getOrganizationProfileAction: (...a: unknown[]) => mockGet(...a),
  saveOrganizationDetailsAction: (...a: unknown[]) => mockSave(...a),
}))

const profile = {
  name: 'Northwind Events', type: 'agency', industry: 'Live events', country: 'US',
  timeZone: 'America/Chicago', eventsPerYear: 40, plan: 'free_trial', onboardingStep: 'done', canManage: true,
}

beforeEach(() => jest.clearAllMocks())

it('shows the details given at sign-up', async () => {
  mockGet.mockResolvedValue({ success: true, message: 'ok', data: profile })
  render(<OrganizationDetailsSettings />)
  expect(await screen.findByLabelText('Company name')).toHaveValue('Northwind Events')
  expect(screen.getByLabelText('Organization type')).toHaveValue('agency')
  expect(screen.getByLabelText('Industry')).toHaveValue('Live events')
  expect(screen.getByLabelText('Events per year')).toHaveValue('40')
  expect(screen.getByLabelText('Country')).toHaveValue('US')
  expect(screen.getByLabelText('Time zone')).toHaveValue('America/Chicago')
  expect(screen.getByText('Plan: Free trial')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save organization details' })).toBeDisabled()
})

it('lets an Owner or Admin change and save them', async () => {
  mockGet.mockResolvedValue({ success: true, message: 'ok', data: profile })
  mockSave.mockResolvedValue({ success: true, message: 'ok', data: { ...profile, name: 'Northwind Live', eventsPerYear: 55 } })
  render(<OrganizationDetailsSettings />)
  fireEvent.change(await screen.findByLabelText('Company name'), { target: { value: '  Northwind Live ' } })
  fireEvent.change(screen.getByLabelText('Events per year'), { target: { value: '55' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save organization details' }))
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith({
    name: 'Northwind Live', type: 'agency', industry: 'Live events', country: 'US', timeZone: 'America/Chicago', eventsPerYear: '55',
  }))
  await waitFor(() => expect(screen.getByLabelText('Company name')).toHaveValue('Northwind Live'))
})

it('explains a refused field', async () => {
  mockGet.mockResolvedValue({ success: true, message: 'ok', data: profile })
  mockSave.mockResolvedValue({ success: false, message: 'bad', code: 'VALIDATION_ERROR', status: 400, details: { field: 'industry' } })
  render(<OrganizationDetailsSettings />)
  fireEvent.change(await screen.findByLabelText('Industry'), { target: { value: 'x' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save organization details' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Keep the industry to 120 characters.')
})

it('needs a company name', async () => {
  mockGet.mockResolvedValue({ success: true, message: 'ok', data: profile })
  render(<OrganizationDetailsSettings />)
  fireEvent.change(await screen.findByLabelText('Company name'), { target: { value: '   ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save organization details' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a company name')
  expect(mockSave).not.toHaveBeenCalled()
})

it('is read-only for members who cannot manage the organization', async () => {
  mockGet.mockResolvedValue({ success: true, message: 'ok', data: { ...profile, canManage: false } })
  render(<OrganizationDetailsSettings />)
  expect(await screen.findByLabelText('Company name')).toBeDisabled()
  expect(screen.getByText(/Ask an Owner or Admin to change them/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save organization details' })).not.toBeInTheDocument()
})

it('keeps a value saved before the lists were narrowed', async () => {
  mockGet.mockResolvedValue({ success: true, message: 'ok', data: { ...profile, country: 'CA', timeZone: 'America/Toronto' } })
  render(<OrganizationDetailsSettings />)
  expect(await screen.findByLabelText('Country')).toHaveValue('CA')
  expect(screen.getByLabelText('Time zone')).toHaveValue('America/Toronto')
})
