import { render, screen } from '@testing-library/react'
import DomainsCard from './DomainsCard'

const row = (domain: string, status: 'verified' | 'pending') => ({
  id: domain,
  domain,
  status,
  method: status === 'verified' ? 'dns_txt' : null,
  verification: { type: 'TXT', name: domain, value: `rfpilot-domain-verification=${domain}` },
  verifiedAt: null,
  lastCheckedAt: null,
  lastCheckOutcome: status === 'verified' ? 'txt_record_found' : null,
  nextCheckAt: null,
  createdAt: null,
})

jest.mock('@/app/actions/domains', () => ({
  listDomainsAction: jest.fn(() => Promise.resolve({ success: true, message: 'OK', data: [row('verified.co', 'verified'), row('pending.co', 'pending')] })),
  addDomainAction: jest.fn(),
  checkDomainAction: jest.fn(),
  removeDomainAction: jest.fn(),
}))
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }))

describe('DomainsCard', () => {
  it('offers Check now and the TXT record only until a domain is verified', async () => {
    render(<DomainsCard />)
    await screen.findByText('verified.co')
    expect(screen.getAllByRole('button', { name: /Check now/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Show TXT record|Hide record/ })).toHaveLength(1)
    // Both can still be removed.
    expect(screen.getByRole('button', { name: 'Remove verified.co' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove pending.co' })).toBeInTheDocument()
  })
})
