import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'react-toastify'
import VendorListSettings from './VendorListSettings'
import type { Vendor } from './vendorListModel'

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('next/navigation', () => ({ usePathname: () => '/settings/vendors' }))

const mockAccess = jest.fn()
const mockList = jest.fn()
const mockCategories = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockArchive = jest.fn()
const mockRestore = jest.fn()
const mockFind = jest.fn()
const mockAddContacts = jest.fn()
jest.mock('@/app/actions/vendorList', () => ({
  getVendorListAccessAction: (...a: unknown[]) => mockAccess(...a),
  listVendorsAction: (...a: unknown[]) => mockList(...a),
  listVendorCategoriesAction: (...a: unknown[]) => mockCategories(...a),
  createVendorAction: (...a: unknown[]) => mockCreate(...a),
  updateVendorAction: (...a: unknown[]) => mockUpdate(...a),
  archiveVendorAction: (...a: unknown[]) => mockArchive(...a),
  restoreVendorAction: (...a: unknown[]) => mockRestore(...a),
  findVendorByCompanyAction: (...a: unknown[]) => mockFind(...a),
  addContactsToVendorAction: (...a: unknown[]) => mockAddContacts(...a),
}))

const vendor = (over: Partial<Vendor> = {}): Vendor => ({
  id: 'v1', company: 'Brightline AV', category: 'Lighting',
  contacts: [{ name: 'Jane Doe', email: 'jane@brightline.test' }],
  addedBy: 'u1', archived: false, archivedAt: null, createdAt: null, updatedAt: null, ...over,
})
const page = (items: Vendor[], total = items.length) => ({ success: true, message: 'OK', data: { items, total, limit: 50, offset: 0 } })

beforeEach(() => {
  jest.clearAllMocks()
  mockList.mockResolvedValue(page([vendor(), vendor({ id: 'v2', company: 'Soundstage Co', category: 'Audio', contacts: [] })]))
  mockCategories.mockResolvedValue({ success: true, message: 'OK', data: ['Audio', 'Lighting'] })
})

it('lists vendors with their category and contacts', async () => {
  render(<VendorListSettings canEdit />)
  expect(await screen.findByText('Brightline AV')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Vendor list' })).toBeInTheDocument()
  expect(screen.getByText('jane@brightline.test')).toBeInTheDocument()
  expect(screen.getByText('No contacts yet')).toBeInTheDocument()
  expect(mockList).toHaveBeenCalledWith({ search: '', category: '', status: 'active', limit: 50, offset: 0 })
  expect(screen.getByRole('link', { name: 'Vendors' })).toHaveAttribute('aria-current', 'page')
})

it('adds a vendor with typed contacts', async () => {
  mockCreate.mockResolvedValue({ success: true, message: 'OK', data: vendor({ id: 'v3', company: 'Northlight Rigging' }) })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add vendor' }))
  const dialog = screen.getByRole('dialog', { name: 'Add vendor' })
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: ' Northlight Rigging ' } })
  fireEvent.change(within(dialog).getByLabelText(/Category/), { target: { value: 'Rigging' } })
  fireEvent.change(within(dialog).getByLabelText('Contact 1 name'), { target: { value: 'Ravi Shah' } })
  fireEvent.change(within(dialog).getByLabelText('Contact 1 email'), { target: { value: 'Ravi@northlight.test' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add vendor' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
    company: 'Northlight Rigging', category: 'Rigging', contacts: [{ name: 'Ravi Shah', email: 'ravi@northlight.test' }],
  }))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Northlight Rigging added to the vendor list.'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(mockList).toHaveBeenCalledTimes(2)
})

it('checks the form before calling the backend', async () => {
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add vendor' }))
  const dialog = screen.getByRole('dialog', { name: 'Add vendor' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add vendor' }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter the company name.')
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'Acme' } })
  fireEvent.change(within(dialog).getByLabelText('Contact 1 email'), { target: { value: 'nope' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add vendor' }))
  expect(within(dialog).getByRole('alert')).toHaveTextContent("“nope” isn't a valid email address.")
  expect(mockCreate).not.toHaveBeenCalled()
})

it('imports pasted contacts and reports what was skipped', async () => {
  mockCreate.mockResolvedValue({ success: true, message: 'OK', data: vendor({ id: 'v3', company: 'Acme' }) })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Add vendor' }))
  const dialog = screen.getByRole('dialog', { name: 'Add vendor' })
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'Acme' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Paste contacts' }))
  fireEvent.change(within(dialog).getByLabelText('Paste a list of contacts'), {
    target: { value: 'Jane Doe <jane@acme.test>\nSam Lee, sam@acme.test\nnot a contact\njane@acme.test' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add pasted contacts' }))
  expect(within(dialog).getByRole('status')).toHaveTextContent('Added 2 contacts. 1 address already listed. Skipped 1 line without a valid email address.')
  expect(within(dialog).getByLabelText('Contact 2 email')).toHaveValue('sam@acme.test')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add vendor' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
    company: 'Acme', category: '', contacts: [{ name: 'Jane Doe', email: 'jane@acme.test' }, { name: 'Sam Lee', email: 'sam@acme.test' }],
  }))
})

it('edits a vendor, sending only what changed', async () => {
  mockUpdate.mockResolvedValue({ success: true, message: 'OK', data: vendor({ category: 'Lighting and video' }) })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Brightline AV' }))
  const dialog = screen.getByRole('dialog', { name: 'Edit Brightline AV' })
  expect(within(dialog).getByLabelText('Contact 1 email')).toHaveValue('jane@brightline.test')
  fireEvent.change(within(dialog).getByLabelText(/Category/), { target: { value: 'Lighting and video' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('v1', { category: 'Lighting and video' }))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Brightline AV updated.'))
})

it("explains when the vendor being edited is gone or belongs to another organization", async () => {
  mockUpdate.mockResolvedValue({ success: false, status: 404, code: 'VENDOR_NOT_FOUND', message: 'Vendor not found.' })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Brightline AV' }))
  const dialog = screen.getByRole('dialog', { name: 'Edit Brightline AV' })
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'Brightline' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent("That vendor is no longer on your organization's list.")
})

it('archives after a confirmation', async () => {
  mockArchive.mockResolvedValue({ success: true, message: 'OK', data: vendor({ archived: true }) })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Archive Brightline AV' }))
  expect(mockArchive).not.toHaveBeenCalled()
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Archive Brightline AV?' })).getByRole('button', { name: 'Archive vendor' }))
  await waitFor(() => expect(mockArchive).toHaveBeenCalledWith('v1'))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Brightline AV archived.'))
})

it('shows archived vendors and restores one', async () => {
  render(<VendorListSettings canEdit />)
  await screen.findByText('Brightline AV')
  mockList.mockResolvedValue(page([vendor({ id: 'v9', company: 'Old Stage Ltd', archived: true })]))
  fireEvent.click(screen.getByRole('button', { name: 'Archived' }))
  await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ search: '', category: '', status: 'archived', limit: 50, offset: 0 }))
  mockRestore.mockResolvedValue({ success: true, message: 'OK', data: vendor({ id: 'v9', company: 'Old Stage Ltd' }) })
  fireEvent.click(await screen.findByRole('button', { name: 'Restore Old Stage Ltd' }))
  await waitFor(() => expect(mockRestore).toHaveBeenCalledWith('v9'))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Old Stage Ltd is back on the vendor list.'))
})

it('says why a restore is refused when the company name was taken meanwhile', async () => {
  mockList.mockResolvedValue(page([vendor({ id: 'v9', company: 'Old Stage Ltd', archived: true })]))
  mockRestore.mockResolvedValue({ success: false, status: 409, code: 'VENDOR_COMPANY_TAKEN', message: 'taken' })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Restore Old Stage Ltd' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Another vendor on the list is now called Old Stage Ltd. Rename or archive it, then restore this one.'))
})

it('searches and filters by category on the backend', async () => {
  jest.useFakeTimers()
  try {
    render(<VendorListSettings canEdit />)
    await act(async () => { await Promise.resolve() })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search vendors' }), { target: { value: 'bright' } })
    await act(async () => { jest.advanceTimersByTime(350) })
    expect(mockList).toHaveBeenLastCalledWith({ search: 'bright', category: '', status: 'active', limit: 50, offset: 0 })
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by category' }), { target: { value: 'Lighting' } })
    await act(async () => { await Promise.resolve() })
    expect(mockList).toHaveBeenLastCalledWith({ search: 'bright', category: 'Lighting', status: 'active', limit: 50, offset: 0 })
  } finally {
    jest.useRealTimers()
  }
})

it('loads the next page on request', async () => {
  mockList.mockResolvedValueOnce(page([vendor()], 2))
  render(<VendorListSettings canEdit />)
  expect(await screen.findByText('Showing 1 of 2 vendors')).toBeInTheDocument()
  mockList.mockResolvedValueOnce({ success: true, message: 'OK', data: { items: [vendor({ id: 'v2', company: 'Soundstage Co' })], total: 2, limit: 50, offset: 1 } })
  fireEvent.click(screen.getByRole('button', { name: 'Show more vendors' }))
  expect(await screen.findByText('Soundstage Co')).toBeInTheDocument()
  expect(mockList).toHaveBeenLastCalledWith({ search: '', category: '', status: 'active', limit: 50, offset: 1 })
  expect(screen.getByText('2 vendors')).toBeInTheDocument()
})

it('is read-only for a Planner', async () => {
  render(<VendorListSettings canEdit={false} />)
  expect(await screen.findByText('Brightline AV')).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: 'Search vendors' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add vendor' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Archive/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Archived' })).not.toBeInTheDocument()
  expect(screen.getByText('Only Owners, Admins and Team Managers can add, edit or archive vendors.')).toBeInTheDocument()
})

it('shows a plain message when the list cannot be loaded', async () => {
  mockList.mockResolvedValue({ success: false, status: 403, message: "You don't have permission to perform this action" })
  render(<VendorListSettings canEdit={false} />)
  expect(await screen.findByRole('alert')).toHaveTextContent("Your role can't see the organization's vendor list.")
})

it('offers the first vendor on an empty list', async () => {
  mockList.mockResolvedValue(page([]))
  render(<VendorListSettings canEdit />)
  expect(await screen.findByText('No vendors yet')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: 'Add vendor' })).toHaveLength(2)
})

it('keeps the loaded vendors when the next page fails', async () => {
  mockList.mockResolvedValueOnce(page([vendor()], 2))
  render(<VendorListSettings canEdit />)
  expect(await screen.findByText('Showing 1 of 2 vendors')).toBeInTheDocument()
  mockList.mockResolvedValueOnce({ success: false, status: 500, message: 'boom' })
  fireEvent.click(screen.getByRole('button', { name: 'Show more vendors' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("More vendors couldn't be loaded. Try again."))
  expect(screen.getByText('Brightline AV')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Show more vendors' })).toBeEnabled()
})

it('drops the edit controls once the backend refuses a write for the role', async () => {
  mockArchive.mockResolvedValue({ success: false, status: 403, message: "You don't have permission to perform this action" })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Archive Brightline AV' }))
  const dialog = screen.getByRole('dialog', { name: 'Archive Brightline AV?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Archive vendor' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Only Owners, Admins and Team Managers can edit the vendor list.')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('button', { name: 'Add vendor' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^(Edit|Archive) / })).not.toBeInTheDocument()
})

it('reloads the list when the vendor being edited was archived by someone else', async () => {
  mockUpdate.mockResolvedValue({ success: false, status: 409, code: 'VENDOR_ARCHIVED', message: 'archived' })
  render(<VendorListSettings canEdit />)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Brightline AV' }))
  const dialog = screen.getByRole('dialog', { name: 'Edit Brightline AV' })
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'Brightline' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('This vendor is archived. Restore it before editing it.')
  expect(mockList).toHaveBeenCalledTimes(2)
})
