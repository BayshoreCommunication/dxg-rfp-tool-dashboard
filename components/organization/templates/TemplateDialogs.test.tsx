import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { SaveAsTemplateDialog } from './TemplateDialogs'

const mockSave = jest.fn()
jest.mock('@/app/actions/proposalTemplates', () => ({
  saveTemplateAction: (...a: unknown[]) => mockSave(...a),
  renameTemplateAction: jest.fn(),
  archiveTemplateAction: jest.fn(),
}))

const saved = {
  id: 't1', title: 'Annual kickoff', description: '', scope: 'personal', presentationLayout: null, published: false, publishedAt: null,
  ownedByMe: true, usable: true, archived: false, archivedAt: null, eventName: 'Annual Sales Kickoff', createdAt: null, updatedAt: null,
}
const OWNER = { canUse: true, canManage: true }
const PLANNER = { canUse: true, canManage: false }

const open = (access = PLANNER, handlers: { onSaved?: jest.Mock; onFailure?: jest.Mock } = {}) => {
  render(<SaveAsTemplateDialog proposalId="p1" defaultTitle="Annual Sales Kickoff" access={access} onClose={jest.fn()} onSaved={handlers.onSaved ?? jest.fn()} onFailure={handlers.onFailure} />)
  return screen.getByRole('dialog', { name: 'Save as template' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSave.mockResolvedValue({ success: true, message: 'OK', data: saved })
})

it('a Planner saves a personal template and is not offered the organization', async () => {
  const onSaved = jest.fn()
  const dialog = open(PLANNER, { onSaved })
  expect(within(dialog).getByLabelText('Template name')).toHaveValue('Annual Sales Kickoff')
  expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument()
  expect(within(dialog).getByText(/Saved as a personal template that only you see/)).toBeInTheDocument()
  fireEvent.change(within(dialog).getByLabelText('Template name'), { target: { value: '  Annual   kickoff ' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save template' }))
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
  expect(mockSave).toHaveBeenCalledWith({ proposalId: 'p1', title: 'Annual kickoff', description: '', scope: 'personal', presentationLayout: null })
})

it('an Owner can save straight to the organization, with a layout and description', async () => {
  const dialog = open(OWNER)
  expect(within(dialog).getByRole('radio', { name: /Only me/ })).toBeChecked()
  fireEvent.click(within(dialog).getByRole('radio', { name: /Everyone in my organization/ }))
  fireEvent.change(within(dialog).getByLabelText('Description (optional)'), { target: { value: ' For sales kickoffs ' } })
  fireEvent.change(within(dialog).getByLabelText('Presentation layout (optional)'), { target: { value: 'template-two' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save template' }))
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith({
    proposalId: 'p1', title: 'Annual Sales Kickoff', description: 'For sales kickoffs', scope: 'organization', presentationLayout: 'template-two',
  }))
})

it('says what is and is not copied, in RFP words', () => {
  const dialog = open()
  expect(dialog).toHaveTextContent('Vendors, responses, dates, contacts and uploaded files are not copied.')
  expect(dialog.textContent).not.toMatch(/proposal/i)
})

it('needs a name before it asks the backend', () => {
  const dialog = open()
  fireEvent.change(within(dialog).getByLabelText('Template name'), { target: { value: '   ' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save template' }))
  expect(within(dialog).getByText('Give the template a name.')).toBeInTheDocument()
  expect(mockSave).not.toHaveBeenCalled()
})

it('explains a refusal in plain words and reports it', async () => {
  mockSave.mockResolvedValue({ success: false, status: 403, code: 'PROPOSAL_ACCESS_DENIED', message: 'raw' })
  const onFailure = jest.fn()
  const dialog = open(PLANNER, { onFailure })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save template' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent("You don't have access to this RFP.")
  expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'PROPOSAL_ACCESS_DENIED' }))
})
