import { defineStore } from 'pinia'
import { authService } from '~/services/auth.service'
import { api } from '~/services/api'

import type {
  AuthUser,
  LoginCredentials,
  RegisterData,
} from '~/types'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  initialized: boolean
  error: string | null
}

let initPromise: Promise<boolean> | null = null

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message

  if (typeof error === 'object' && error !== null) {
    const e = error as any
    const message = e?.data?.message ?? e?.message
    if (typeof message === 'string' && message.length > 0) return message
  }

  return fallback
}

function getStatus(error: unknown): number | undefined {
  const e = error as any
  return e?.status ?? e?.statusCode ?? e?.response?.status
}

// Accepts any of these shapes:
//   { data: user }  |  { data: { user } }  |  user  |  { user }
function extractUser(response: any): AuthUser | null {
  const payload = response?.data ?? response
  const user = payload?.user ?? payload?.data ?? payload

  if (user && typeof user === 'object' && (user.id || user.email || user.username)) {
    return user as AuthUser
  }
  return null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    initialized: false,
    error: null,
  }),

  getters: {
    role: (state): string => {
      const role = String(state.user?.role ?? '').toUpperCase()
      if (!role) return ''
      return role.startsWith('ROLE_') ? role : `ROLE_${role}`
    },

    isAdmin(): boolean {
      return this.role === 'ROLE_ADMIN'
    },

    isStaff(): boolean {
      return ['ROLE_ADMIN', 'ROLE_STAFF'].includes(this.role)
    },

    userName: (state): string => state.user?.fullName ?? 'Guest',

    userEmail: (state): string => state.user?.email ?? '',
  },

  actions: {
    hasRole(role: string): boolean {
      return this.role === role
    },

    hasAnyRole(roles: string[]): boolean {
      return roles.some(role => this.hasRole(role))
    },

    /**
     * Run once when the app starts (plugin or route middleware).
     * Restores the session from stored tokens after refresh / reopen.
     */
    async initialize(): Promise<boolean> {
      if (this.initialized) return this.isAuthenticated
      if (!import.meta.client) return false

      initPromise ??= this.fetchProfile().finally(() => {
        this.initialized = true
        initPromise = null
      })

      return initPromise
    },

    async signin(credentials: LoginCredentials): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const response: any = await authService.signin(credentials)
        const authData = response?.data ?? response

        if (!authData?.accessToken || !authData?.refreshToken) {
          throw new Error('Invalid authentication response')
        }

        api.setTokens(authData.accessToken, authData.refreshToken)

        const profileResponse = await authService.profile()
        const user = extractUser(profileResponse)

        if (!user) {
          console.error('PROFILE RESPONSE (unexpected shape):', profileResponse)
          throw new Error('Unable to load user profile')
        }

        this.user = user
        this.isAuthenticated = true
        this.initialized = true

        return true
      } catch (error: unknown) {
        console.error('LOGIN ERROR:', error)

        this.clearAuth()
        this.error = getErrorMessage(error, 'Login failed')

        return false
      } finally {
        this.loading = false
      }
    },

    async refresh() {
        try {
            const accessToken = await authService.refresh()

            this.accessToken = accessToken
            this.isAuthenticated = true
        } catch {
            this.clearAuth()
        }
    },

    async register(data: RegisterData): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const response: any = await authService.signup(data)

        const registrationSucceeded =
          response?.success === true ||
          response?.boolean === 1 ||
          response?.success === undefined

        if (!registrationSucceeded) {
          this.error = response?.message || 'Registration failed'
          return false
        }

        return true
      } catch (error: unknown) {
        this.error = getErrorMessage(error, 'Registration failed')
        return false
      } finally {
        this.loading = false
      }
    },

    async fetchProfile(): Promise<boolean> {
      // No stored tokens -> simply not logged in
      if (!api.hasTokens()) {
        this.user = null
        this.isAuthenticated = false
        return false
      }

      try {
        // api layer auto-refreshes the access token on 401
        const response = await authService.profile()
        const user = extractUser(response)

        if (!user) throw new Error('User profile not found')

        this.user = user
        this.isAuthenticated = true
        return true
      } catch (error: unknown) {
        const status = getStatus(error)

        // Only drop the session when the server says credentials are invalid
        // (refresh token expired). Network errors keep the tokens.
        if (status === 401 || status === 403) {
          this.clearAuth()
        } else {
          console.error('PROFILE ERROR:', error)
          this.user = null
          this.isAuthenticated = false
        }
        return false
      }
    },

    async checkAuth(): Promise<boolean> {
      return this.initialize()
    },

    async logout(): Promise<void> {
      this.loading = true

      try {
        await authService.logout()
      } catch (error: unknown) {
        console.error('LOGOUT ERROR:', error)
      } finally {
        this.clearAuth()
        this.loading = false
        this.initialized = true

        await navigateTo('/auth/login')
      }
    },

    clearAuth(): void {
      this.user = null
      this.isAuthenticated = false
      api.clearTokens()
    },

    clearError(): void {
      this.error = null
    },
  },
})
