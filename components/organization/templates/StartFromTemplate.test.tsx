import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'react-toastify'
import StartFromTemplate from './StartFromTemplate'

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))

const mockList = jest.fn()
const mockCreate = jest.fn()
jest.mock('@/app/actions/proposalTemplates', () => ({
  listTemplatesAction: (...a: unknown[]) => mockList(...a),
  createRfpFromTemplateAction: (...a: unknown[]) => mockCreate(...a),
}))

const template = (over = {}) => ({
  id: 't1', title: 'Annual kickoff', description: 'For sales kickoffs', scope: 'organization', presentationLayout: 'template-one', published: true, publishedAt: null,
  ownedByMe: false, usable: true, archived: false, archivedAt: null, eventName: 'Annual Sales Kickoff', createdAt: null, updatedAt: null, ...over,
})
const page = (items: unknown[], total = items.length) => ({ success: true, message: 'OK', data: { items, total, limit: 200, offset: 0 } })

const openPicker = async () => {
  render(<StartFromTemplate />)
  fireEvent.click(screen.getByRole('button', { name: 'Start from a template' }))
  const dialog = screen.getByRole('dialog', { name: 'Start from a template' })
  await waitFor(() => expect(mockList).toHaveBeenCalled())
  return dialog
}

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue(page([
    template(),
    template({ id: 't2', title: 'My roadshow', description: '', scope: 'personal', published: false, ownedByMe: true, presentationLayout: null, eventName: '' }),
    // An Owner also gets unpublished organization templates back: they can't be used.
    template({ id: 't3', title: 'Draft gala', published: false, usable: false }),
  ]))
})

it('lists the templates the member can start from, grouped, and nothing that is not usable', async () => {
  const dialog = await openPicker()
  expect(await within(dialog).findByRole('radio', { name: /Annual kickoff/ })).toBeInTheDocument()
  expect(within(dialog).getByText('Organization templates')).toBeInTheDocument()
  expect(within(dialog).getByText('My templates')).toBeInTheDocument()
  expect(within(dialog).getByRole('radio', { name: /My roadshow/ })).toBeInTheDocument()
  expect(within(dialog).queryByText('Draft gala')).not.toBeInTheDocument()
  expect(within(dialog).getByText('Modern layout')).toBeInTheDocument()
  expect(mockList).toHaveBeenCalledWith({ scope: 'all', status: 'active', limit: 200 })
  expect(within(dialog).getByRole('button', { name: 'Create RFP' })).toBeDisabled()
  expect(dialog.textContent).not.toMatch(/proposal/i)
})

it('creates an RFP from the chosen template and opens it', async () => {
  mockCreate.mockResolvedValue({ success: true, message: 'OK', data: { proposalId: 'p9', eventName: 'Spring summit', presentationLayout: 'template-one' } })
  const dialog = await openPicker()
  fireEvent.click(await within(dialog).findByRole('radio', { name: /Annual kickoff/ }))
  fireEvent.change(within(dialog).getByLabelText('Event name (optional)'), { target: { value: 'Spring summit' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create RFP' }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/proposals/proposal-edit?proposalId=p9'))
  expect(mockCreate).toHaveBeenCalledWith('t1', 'Spring summit')
  expect(toast.success).toHaveBeenCalledWith('RFP started from Annual kickoff.')
})

it('filters the list as the member types', async () => {
  const dialog = await openPicker()
  await within(dialog).findByRole('radio', { name: /Annual kickoff/ })
  fireEvent.change(within(dialog).getByLabelText('Search templates'), { target: { value: 'roadshow' } })
  expect(within(dialog).queryByRole('radio', { name: /Annual kickoff/ })).not.toBeInTheDocument()
  expect(within(dialog).getByRole('radio', { name: /My roadshow/ })).toBeInTheDocument()
  fireEvent.change(within(dialog).getByLabelText('Search templates'), { target: { value: 'zzz' } })
  expect(within(dialog).getByText('No templates match.')).toBeInTheDocument()
})

it('at the plan limit shows the upgrade prompt, not an error', async () => {
  mockCreate.mockResolvedValue({ success: false, status: 403, code: 'PLAN_LIMIT_REACHED', message: 'Plan limit reached', details: { plan: 'free_trial', limit: 2, created: 2 } })
  const dialog = await openPicker()
  fireEvent.click(await within(dialog).findByRole('radio', { name: /My roadshow/ }))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create RFP' }))
  const limit = await screen.findByRole('status')
  expect(limit).toHaveTextContent("You've reached your plan's RFP limit")
  expect(limit).toHaveTextContent('Your organization has created 2 of the 2 RFPs its plan includes.')
  expect(within(limit).getByRole('link', { name: 'Contact us' })).toHaveAttribute('href', '/support')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Create RFP' })).not.toBeInTheDocument()
  expect(mockPush).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
})

it('a template that was archived or removed meanwhile is explained and the list reloads', async () => {
  mockCreate.mockResolvedValue({ success: false, status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Template not found.' })
  const dialog = await openPicker()
  fireEvent.click(await within(dialog).findByRole('radio', { name: /Annual kickoff/ }))
  mockList.mockResolvedValue(page([template({ id: 't2', title: 'My roadshow', scope: 'personal', published: false })]))
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create RFP' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('That template is no longer available.')
  await waitFor(() => expect(within(dialog).queryByRole('radio', { name: /Annual kickoff/ })).not.toBeInTheDocument())
  expect(mockList).toHaveBeenCalledTimes(2)
  expect(within(dialog).getByRole('button', { name: 'Create RFP' })).toBeDisabled()
})

it('says how to make a template when there are none', async () => {
  mockList.mockResolvedValue(page([]))
  const dialog = await openPicker()
  expect(await within(dialog).findByText('No templates yet')).toBeInTheDocument()
  expect(within(dialog).getByText(/choose Save as template on an RFP/)).toBeInTheDocument()
})

it('a role refused by the backend sees why, and no templates', async () => {
  mockList.mockResolvedValue({ success: false, status: 403, message: "You don't have permission to perform this action" })
  const dialog = await openPicker()
  expect(await within(dialog).findByRole('alert')).toHaveTextContent("Your role can't use RFP templates.")
  expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
})

it('the wizard variant offers the same picker', () => {
  render(<StartFromTemplate variant="banner" />)
  fireEvent.click(screen.getByRole('button', { name: 'Start from a template' }))
  expect(screen.getByRole('dialog', { name: 'Start from a template' })).toBeInTheDocument()
})
