import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'react-toastify'
import TemplateListSettings from './TemplateListSettings'
import type { RfpTemplate } from './templateModel'

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('next/navigation', () => ({ usePathname: () => '/settings/templates' }))

const mockList = jest.fn()
const mockPublish = jest.fn()
const mockUnpublish = jest.fn()
const mockArchive = jest.fn()
const mockRestore = jest.fn()
const mockRename = jest.fn()
jest.mock('@/app/actions/proposalTemplates', () => ({
  getTemplateAccessAction: jest.fn(),
  listTemplatesAction: (...a: unknown[]) => mockList(...a),
  publishTemplateAction: (...a: unknown[]) => mockPublish(...a),
  unpublishTemplateAction: (...a: unknown[]) => mockUnpublish(...a),
  archiveTemplateAction: (...a: unknown[]) => mockArchive(...a),
  restoreTemplateAction: (...a: unknown[]) => mockRestore(...a),
  renameTemplateAction: (...a: unknown[]) => mockRename(...a),
  saveTemplateAction: jest.fn(),
}))
jest.mock('@/app/actions/vendorList', () => ({
  getVendorListAccessAction: jest.fn().mockResolvedValue({ canRead: false, canEdit: false }),
}))

const template = (over: Partial<RfpTemplate> = {}): RfpTemplate => ({
  id: 't1', title: 'Annual kickoff', description: 'For sales kickoffs', scope: 'organization', presentationLayout: 'template-one', published: true,
  publishedAt: null, ownedByMe: false, usable: true, archived: false, archivedAt: null, eventName: 'Annual Sales Kickoff', createdAt: '2026-11-09T12:00:00.000Z', updatedAt: null, ...over,
})
const mine = template({ id: 't2', title: 'My roadshow', description: '', scope: 'personal', published: false, ownedByMe: true, presentationLayout: null })
const draft = template({ id: 't3', title: 'Draft gala', published: false, usable: false })
const page = (items: RfpTemplate[], total = items.length) => ({ success: true, message: 'OK', data: { items, total, limit: 50, offset: 0 } })
const ok = (data: RfpTemplate) => ({ success: true, message: 'OK', data })
const OWNER = { canUse: true, canManage: true }
const PLANNER = { canUse: true, canManage: false }
const section = () => screen.getByRole('region', { name: 'RFP templates' })

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue(page([template(), draft, mine]))
})

it('lists templates with their scope and state, under the Templates tab', async () => {
  render(<TemplateListSettings access={OWNER} />)
  expect(await screen.findByText('Annual kickoff')).toBeInTheDocument()
  expect(mockList).toHaveBeenCalledWith({ search: '', scope: 'all', status: 'active', limit: 50, offset: 0 })
  expect(screen.getByRole('link', { name: 'Templates' })).toHaveAttribute('aria-current', 'page')
  expect(within(section()).getByText('Published')).toBeInTheDocument()
  expect(within(section()).getByText('Not published')).toBeInTheDocument()
  expect(within(section()).getByText('Personal')).toBeInTheDocument()
  expect(within(section()).getByText('3 templates')).toBeInTheDocument()
  expect(section().textContent).not.toMatch(/proposal/i)
})

it('an Owner unpublishes and publishes organization templates', async () => {
  mockUnpublish.mockResolvedValue(ok(template({ published: false })))
  mockPublish.mockResolvedValue(ok(template({ id: 't3', title: 'Draft gala' })))
  render(<TemplateListSettings access={OWNER} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Unpublish Annual kickoff' }))
  await waitFor(() => expect(mockUnpublish).toHaveBeenCalledWith('t1'))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Annual kickoff unpublished.'))
  fireEvent.click(screen.getByRole('button', { name: 'Publish Draft gala' }))
  await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('t3'))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Draft gala published to your organization.'))
  expect(mockList).toHaveBeenCalledTimes(3)
})

it('an Owner shares their own personal template only after confirming', async () => {
  mockPublish.mockResolvedValue(ok({ ...mine, scope: 'organization', published: true }))
  render(<TemplateListSettings access={OWNER} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Share My roadshow with the organization' }))
  expect(mockPublish).not.toHaveBeenCalled()
  const dialog = screen.getByRole('dialog', { name: 'Share My roadshow with your organization?' })
  expect(dialog).toHaveTextContent("It won't return to your personal templates")
  fireEvent.click(within(dialog).getByRole('button', { name: 'Share template' }))
  await waitFor(() => expect(mockPublish).toHaveBeenCalledWith('t2'))
})

it('an Owner archives an organization template after confirming, and restores it from the archive', async () => {
  mockArchive.mockResolvedValue(ok(template({ archived: true, published: false, usable: false })))
  render(<TemplateListSettings access={OWNER} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Archive Annual kickoff' }))
  const dialog = screen.getByRole('dialog', { name: 'Archive Annual kickoff?' })
  expect(dialog).toHaveTextContent('it stays unpublished until an Owner or Admin publishes it again')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Archive template' }))
  await waitFor(() => expect(mockArchive).toHaveBeenCalledWith('t1'))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Annual kickoff archived.'))

  mockList.mockResolvedValue(page([template({ archived: true, published: false, usable: false })]))
  mockRestore.mockResolvedValue(ok(template({ published: false, usable: false })))
  fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ search: '', scope: 'all', status: 'archived', limit: 50, offset: 0 }))
  fireEvent.click(await screen.findByRole('button', { name: 'Restore Annual kickoff' }))
  await waitFor(() => expect(mockRestore).toHaveBeenCalledWith('t1'))
})

it('an Owner renames a template', async () => {
  mockRename.mockResolvedValue(ok(template({ title: 'Kickoff 2027' })))
  render(<TemplateListSettings access={OWNER} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Annual kickoff' }))
  const dialog = screen.getByRole('dialog', { name: 'Edit template details' })
  fireEvent.change(within(dialog).getByLabelText('Template name'), { target: { value: 'Kickoff 2027' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(mockRename).toHaveBeenCalledWith('t1', { title: 'Kickoff 2027', description: 'For sales kickoffs' }))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Kickoff 2027 updated.'))
})

it('a Planner manages only their own personal templates', async () => {
  mockList.mockResolvedValue(page([template(), mine]))
  render(<TemplateListSettings access={PLANNER} />)
  expect(await screen.findByRole('button', { name: 'Archive My roadshow' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Edit My roadshow' })).toBeInTheDocument()
  for (const name of ['Unpublish Annual kickoff', 'Archive Annual kickoff', 'Edit Annual kickoff', 'Share My roadshow with the organization']) {
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  }
  expect(screen.getByText('Only Owners and Admins can publish, unpublish or archive organization templates.')).toBeInTheDocument()
})

it('filters by scope and search', async () => {
  render(<TemplateListSettings access={OWNER} />)
  await screen.findByText('Annual kickoff')
  fireEvent.click(screen.getByRole('button', { name: 'Mine' }))
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ search: '', scope: 'personal', status: 'active', limit: 50, offset: 0 }))
  fireEvent.change(screen.getByLabelText('Search templates'), { target: { value: ' gala ' } })
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ search: 'gala', scope: 'personal', status: 'active', limit: 50, offset: 0 }))
})

it('a role the backend no longer lets manage stops being offered management', async () => {
  mockUnpublish.mockResolvedValue({ success: false, status: 403, message: "You don't have permission to perform this action" })
  render(<TemplateListSettings access={OWNER} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Unpublish Annual kickoff' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Your role doesn't allow this."))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Unpublish Annual kickoff' })).not.toBeInTheDocument())
})

it('a template that is gone is explained and the list reloads', async () => {
  mockUnpublish.mockResolvedValue({ success: false, status: 404, code: 'TEMPLATE_NOT_FOUND', message: 'Template not found.' })
  render(<TemplateListSettings access={OWNER} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Unpublish Annual kickoff' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('That template is no longer available. It may have been archived or unpublished by someone else.'))
  await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
})

it('a refused list says why and shows no rows', async () => {
  mockList.mockResolvedValue({ success: false, status: 403, message: "You don't have permission to perform this action" })
  render(<TemplateListSettings access={PLANNER} />)
  expect(await screen.findByRole('alert')).toHaveTextContent("Your role can't use RFP templates.")
  expect(screen.queryByText('Annual kickoff')).not.toBeInTheDocument()
})

it('says how to make a template when there are none', async () => {
  mockList.mockResolvedValue(page([]))
  render(<TemplateListSettings access={PLANNER} />)
  expect(await screen.findByText('No templates yet')).toBeInTheDocument()
})
