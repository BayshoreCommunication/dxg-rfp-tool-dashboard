import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AccessRequestsSection from './AccessRequestsSection'

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockList = jest.fn()
const mockSettings = jest.fn()
const mockApprove = jest.fn()
const mockDeny = jest.fn()
const mockAuto = jest.fn()
jest.mock('@/app/actions/accessRequests', () => ({
  listAccessRequestsAction: (...a: unknown[]) => mockList(...a),
  getAccessRequestSettingsAction: (...a: unknown[]) => mockSettings(...a),
  approveAccessRequestAction: (...a: unknown[]) => mockApprove(...a),
  denyAccessRequestAction: (...a: unknown[]) => mockDeny(...a),
  setAutoApproveDomainAction: (...a: unknown[]) => mockAuto(...a),
}))

const request = {
  id: 'r1', email: 'laiba@bayshore.test', name: 'Laiba Khan', status: 'pending',
  autoApproved: false, createdAt: new Date().toISOString(), decidedAt: null,
}
const teams = [{ id: 't1', name: 'East Coast' }, { id: 't2', name: 'Old', archived: true }]

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue({ success: true, message: 'ok', data: [request] })
  mockSettings.mockResolvedValue({ success: true, message: 'ok', data: { autoApproveDomain: false, verifiedDomains: ['bayshore.test'] } })
})

it('approves a request with the chosen role and team', async () => {
  const onInvited = jest.fn()
  mockApprove.mockResolvedValue({ success: true, message: 'ok' })
  render(<AccessRequestsSection teams={teams} onInvited={onInvited} />)
  expect(await screen.findByText('Laiba Khan')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Access requests (1)' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Old' })).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Role for laiba@bayshore.test'), { target: { value: 'team_manager' } })
  fireEvent.change(screen.getByLabelText('Team for laiba@bayshore.test'), { target: { value: 't1' } })
  mockList.mockResolvedValue({ success: true, message: 'ok', data: [] })
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
  await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('r1', { role: 'team_manager', teamId: 't1' }))
  expect(onInvited).toHaveBeenCalled()
  expect(await screen.findByText('No requests waiting.')).toBeInTheDocument()
})

it('denies a request', async () => {
  mockDeny.mockResolvedValue({ success: true, message: 'ok' })
  render(<AccessRequestsSection teams={[]} onInvited={jest.fn()} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Deny' }))
  await waitFor(() => expect(mockDeny).toHaveBeenCalledWith('r1'))
})

it('turns on auto-approve for the verified domain', async () => {
  mockAuto.mockResolvedValue({ success: true, message: 'ok', data: { autoApproveDomain: true, verifiedDomains: ['bayshore.test'] } })
  render(<AccessRequestsSection teams={[]} onInvited={jest.fn()} />)
  const toggle = await screen.findByRole('checkbox', { name: /Auto-approve users from our verified domain/ })
  expect(toggle).not.toBeChecked()
  fireEvent.click(toggle)
  await waitFor(() => expect(mockAuto).toHaveBeenCalledWith(true))
  await waitFor(() => expect(toggle).toBeChecked())
})

it('stays hidden while the organization has no verified domain and nothing to review', async () => {
  mockList.mockResolvedValue({ success: true, message: 'ok', data: [] })
  mockSettings.mockResolvedValue({ success: true, message: 'ok', data: { autoApproveDomain: false, verifiedDomains: [] } })
  const { container } = render(<AccessRequestsSection teams={[]} onInvited={jest.fn()} />)
  await waitFor(() => expect(mockSettings).toHaveBeenCalled())
  await waitFor(() => expect(container).toBeEmptyDOMElement())
})
