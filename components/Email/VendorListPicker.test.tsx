import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import type { Vendor } from '@/components/organization/vendors/vendorListModel'
import VendorListPicker from './VendorListPicker'

jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockAccess = jest.fn()
const mockList = jest.fn()
const mockCategories = jest.fn()
const mockCreate = jest.fn()
const mockFind = jest.fn()
const mockAddContacts = jest.fn()
jest.mock('@/app/actions/vendorList', () => ({
  getVendorListAccessAction: (...a: unknown[]) => mockAccess(...a),
  listVendorsAction: (...a: unknown[]) => mockList(...a),
  listVendorCategoriesAction: (...a: unknown[]) => mockCategories(...a),
  createVendorAction: (...a: unknown[]) => mockCreate(...a),
  updateVendorAction: jest.fn(),
  archiveVendorAction: jest.fn(),
  findVendorByCompanyAction: (...a: unknown[]) => mockFind(...a),
  addContactsToVendorAction: (...a: unknown[]) => mockAddContacts(...a),
}))

const vendor = (over: Partial<Vendor> = {}): Vendor => ({
  id: 'v1', company: 'Brightline AV', category: 'Lighting',
  contacts: [{ name: 'Jane Doe', email: 'jane@brightline.test' }, { name: '', email: 'bids@brightline.test' }],
  addedBy: 'u1', archived: false, archivedAt: null, createdAt: null, updatedAt: null, ...over,
})
const page = (items: Vendor[], total = items.length) => ({ success: true, message: 'OK', data: { items, total, limit: 200, offset: 0 } })

// The picker inside a tiny composer that owns the recipients, like EmailSend does.
function Harness({ initial = [] }: { initial?: string[] }) {
  const [recipients, setRecipients] = useState<string[]>(initial)
  return (
    <>
      <output data-testid="recipients">{recipients.join(',')}</output>
      <VendorListPicker
        recipients={recipients}
        onAdd={(emails) => setRecipients((prev) => [...new Set([...prev, ...emails])])}
        onRemove={(emails) => setRecipients((prev) => prev.filter((email) => !emails.includes(email)))}
      />
    </>
  )
}
const recipients = () => screen.getByTestId('recipients').textContent

beforeEach(() => {
  jest.clearAllMocks()
  mockAccess.mockResolvedValue({ canRead: true, canEdit: true })
  mockList.mockResolvedValue(page([vendor(), vendor({ id: 'v2', company: 'Soundstage Co', category: '', contacts: [] })]))
  mockCategories.mockResolvedValue({ success: true, message: 'OK', data: ['Lighting'] })
})

it('adds one contact, then the whole vendor, then removes them', async () => {
  render(<Harness />)
  fireEvent.click(await screen.findByRole('checkbox', { name: /Jane Doe/ }))
  expect(recipients()).toBe('jane@brightline.test')
  const all = screen.getByRole('checkbox', { name: 'Brightline AV: all contacts' }) as HTMLInputElement
  expect(all.indeterminate).toBe(true)
  fireEvent.click(all)
  expect(recipients()).toBe('jane@brightline.test,bids@brightline.test')
  expect(all).toBeChecked()
  fireEvent.click(all)
  expect(recipients()).toBe('')
  expect(mockList).toHaveBeenCalledWith({ search: '', status: 'active', limit: 200 })
})

it('cannot pick a vendor that has no contacts', async () => {
  render(<Harness />)
  expect(await screen.findByRole('checkbox', { name: 'Soundstage Co: all contacts' })).toBeDisabled()
})

it('offers to save typed addresses as a new vendor to members who can edit the list', async () => {
  mockCreate.mockResolvedValue({ success: true, message: 'OK', data: vendor({ id: 'v3', company: 'Northlight Rigging', contacts: [{ name: '', email: 'ravi@northlight.test' }] }) })
  render(<Harness initial={['jane@brightline.test', 'ravi@northlight.test']} />)
  expect(await screen.findByText("ravi@northlight.test isn't on your vendor list.")).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save new vendor to the list' }))
  const dialog = screen.getByRole('dialog', { name: 'Add vendor' })
  expect(within(dialog).getByLabelText('Contact 1 email')).toHaveValue('ravi@northlight.test')
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'Northlight Rigging' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add vendor' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
    company: 'Northlight Rigging', category: '', contacts: [{ name: '', email: 'ravi@northlight.test' }],
  }))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Northlight Rigging saved to the vendor list.'))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save new vendor to the list' })).not.toBeInTheDocument())
  expect(recipients()).toBe('jane@brightline.test,ravi@northlight.test')
})

it('offers to add the contact to the existing vendor when the company is already on the list', async () => {
  mockCreate.mockResolvedValue({ success: false, status: 409, code: 'VENDOR_COMPANY_TAKEN', message: 'taken' })
  mockFind.mockResolvedValue({ success: true, message: 'OK', data: vendor() })
  mockAddContacts.mockResolvedValue({ success: true, message: 'OK', data: vendor({ contacts: [...vendor().contacts, { name: '', email: 'new@brightline.test' }] }) })
  render(<Harness initial={['new@brightline.test']} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Save new vendor to the list' }))
  const dialog = screen.getByRole('dialog', { name: 'Add vendor' })
  fireEvent.change(within(dialog).getByLabelText('Company'), { target: { value: 'brightline av' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add vendor' }))
  expect(await within(dialog).findByText(/is already on your vendor list. Add this contact to it instead\?/)).toBeInTheDocument()
  expect(mockFind).toHaveBeenCalledWith('brightline av')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add to Brightline AV' }))
  await waitFor(() => expect(mockAddContacts).toHaveBeenCalledWith('v1', [{ name: '', email: 'new@brightline.test' }]))
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Contacts added to Brightline AV.'))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save new vendor to the list' })).not.toBeInTheDocument())
})

it('lets a Planner pick from the list but not save to it', async () => {
  mockAccess.mockResolvedValue({ canRead: true, canEdit: false })
  render(<Harness initial={['ravi@northlight.test']} />)
  expect(await screen.findByRole('checkbox', { name: /Jane Doe/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save new vendor to the list' })).not.toBeInTheDocument()
})

it('is not shown to a Viewer and never asks for the list', async () => {
  mockAccess.mockResolvedValue({ canRead: false, canEdit: false })
  const { container } = render(<VendorListPicker recipients={[]} onAdd={jest.fn()} onRemove={jest.fn()} />)
  await waitFor(() => expect(mockAccess).toHaveBeenCalled())
  expect(container).toBeEmptyDOMElement()
  expect(mockList).not.toHaveBeenCalled()
})

it('goes away when the backend refuses the list for the role', async () => {
  mockList.mockResolvedValue({ success: false, status: 403, message: "You don't have permission to perform this action" })
  const { container } = render(<VendorListPicker recipients={[]} onAdd={jest.fn()} onRemove={jest.fn()} />)
  await waitFor(() => expect(mockList).toHaveBeenCalled())
  await waitFor(() => expect(container).toBeEmptyDOMElement())
})

it('keeps typing available when the list fails to load', async () => {
  mockList.mockResolvedValue({ success: false, status: 500, message: 'boom' })
  render(<Harness />)
  expect(await screen.findByRole('alert')).toHaveTextContent("Your vendor list couldn't be loaded. You can still type the addresses.")
})

it('points an editor at Settings when the list is empty', async () => {
  mockList.mockResolvedValue(page([]))
  render(<Harness />)
  expect(await screen.findByRole('link', { name: 'Add vendors in Settings' })).toHaveAttribute('href', '/settings/vendors')
})
