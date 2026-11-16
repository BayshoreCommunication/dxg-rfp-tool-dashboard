/** @jest-environment node */

/* The Google provider must ask for the account chooser: without
   prompt=select_account a browser holding one Google session (usually a
   personal account) is signed straight in and never offered a work account.

   This loads the real auth.ts. next-auth ships ES modules Jest cannot load
   here, so NextAuth() and the provider factories are replaced by recorders:
   the test reads the options auth.ts actually passes to Google(), then builds
   the authorization URL the way Auth.js does. */

type RecordedConfig = { providers: Array<Record<string, unknown>> }

jest.mock('next-auth', () => {
  class CredentialsSignin extends Error {
    code = 'credentials'
  }
  const NextAuth = jest.fn(() => ({
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    handlers: {},
    unstable_update: jest.fn(),
  }))
  return { __esModule: true, default: NextAuth, CredentialsSignin }
})
jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: (options: Record<string, unknown>) => ({ id: 'credentials', type: 'credentials', ...options }),
}))
jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  // Same shape the real factory returns: the app's options under `options`.
  default: (options: Record<string, unknown>) => ({ id: 'google', type: 'oidc', options }),
}))
jest.mock('@/lib/authRefresh', () => ({
  AUTH_API_ORIGIN: 'https://api.example.test',
  authBffHeaders: jest.fn(),
  BACKEND_REFRESH_COMMAND: 'refresh',
  BACKEND_REFRESH_HANDOFF: 'handoff',
  backendRefreshCoordinator: {},
  fetchWithTimeout: jest.fn(),
  verifyBackendRefreshCommand: jest.fn(),
}))
jest.mock('@/lib/server/twoFactorPending', () => ({}))
jest.mock('@/lib/server/googleSignup', () => ({}))
jest.mock('@/lib/server/ssoBind', () => ({}))

import NextAuth from 'next-auth'
import '@/auth'

type GoogleProvider = {
  id: string
  options: { authorization: { params: Record<string, string> } }
}

const googleProvider = (): GoogleProvider => {
  const config = (NextAuth as unknown as jest.Mock).mock.calls[0][0] as RecordedConfig
  const provider = config.providers.find((entry) => entry.id === 'google')
  if (!provider) throw new Error('auth.ts registers no google provider')
  return provider as unknown as GoogleProvider
}

/* Auth.js writes the provider's authorization params onto Google's
   authorization endpoint with URLSearchParams
   (@auth/core lib/actions/signin/authorization-url.js). */
const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const authorizationUrl = () => {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT)
  const params = googleProvider().options.authorization.params
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

describe('Google sign-in authorization request', () => {
  it('asks Google for the account chooser', () => {
    const prompt = authorizationUrl().searchParams.get('prompt') ?? ''
    expect(prompt.split(' ')).toContain('select_account')
  })

  it('still asks for consent and offline access', () => {
    const url = authorizationUrl()
    expect((url.searchParams.get('prompt') ?? '').split(' ')).toContain('consent')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('response_type')).toBe('code')
  })

  it('sends the prompt values space-separated, as Google documents', () => {
    const url = authorizationUrl()
    expect(url.searchParams.get('prompt')).toBe('consent select_account')
    // URLSearchParams writes the space as "+", which Google reads as a space.
    expect(url.toString()).toContain('prompt=consent+select_account')
  })
})
