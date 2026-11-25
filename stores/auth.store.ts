import { defineStore } from 'pinia'
import { authService } from '~/services/auth.service'

import type { AuthTokens, AuthUser, LoginCredentials, RegisterData } from '~/types'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.length > 0) return message
  }
  return fallback
}

function userFromToken(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const roleValue = payload.role ?? payload.roles
    const role = Array.isArray(roleValue) ? roleValue[0] : roleValue
    if (!role) return null
    return {
      ...payload,
      id: String(payload.id ?? payload.sub ?? ''),
      fullName: payload.fullName ?? payload.name ?? payload.username ?? '',
      email: payload.email ?? '',
      role: String(role).replace(/^ROLE_/, '').toUpperCase() === 'ADMIN' ? 'ROLE_ADMIN'
        : String(role).replace(/^ROLE_/, '').toUpperCase() === 'USER' ? 'ROLE_USER'
          : String(role),
    } as AuthUser
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  }),

  getters: {
    role: (state): string => {
      const role = String(state.user?.role ?? '').toUpperCase()
      return role.startsWith('ROLE_') ? role : role ? `ROLE_${role}` : ''
    },
    isAdmin(): boolean { return this.role === 'ROLE_ADMIN' },
    isStaff(): boolean { return ['ROLE_ADMIN', 'ROLE_STAFF'].includes(this.role) },
    userName: (state): string => state.user?.fullName ?? 'Guest',
    userEmail: (state): string => state.user?.email ?? '',
  },

  actions: {
    hasRole(role: string): boolean {
      return this.user?.role === role
    },

     hasAnyRole(roles: string[]): boolean {
       return roles.includes(this.user?.role ?? '')
     },

    async signin(credentials: LoginCredentials): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const authData = await authService.signin(credentials)

        if (!authData.data?.accessToken || !authData.data?.refreshToken) {
          throw new Error('Invalid authentication response')
        }

        const { api } = await import('~/services/api')

        api.setTokens(
          authData.data.accessToken,
          authData.data.refreshToken
        )

        this.isAuthenticated = true

        // The login response may contain tokens only. Load the account profile
        // now so role based redirects and route middleware have the user state.
        try {
          const profile = await authService.profile()
          this.user = profile.data as AuthUser
        } catch {
          this.user = userFromToken(authData.data.accessToken)
        }

        return true

      } catch (error: unknown) {
        console.error('LOGIN ERROR:', error)

        this.user = null
        this.isAuthenticated = false
        this.error = getErrorMessage(error, 'Login failed')

        return false

      } finally {
        this.loading = false
      }
    },

    async register(data: RegisterData): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const response = await authService.signup(data)
        const registrationSucceeded = response.success === true
          || response.boolean === 1
          || response.success === undefined

        if (!registrationSucceeded) {
          this.error = response.message || 'Registration failed'
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
      try {
        const response = await authService.profile()
        this.user = response.data
        this.isAuthenticated = true
        return true
      } catch {
        this.user = null
        this.isAuthenticated = false
        return false
      }
    },

    async checkAuth(): Promise<boolean> {
      try {
        const response = await authService.isAuthenticated()
        if (!response.data) {
          this.user = null
          this.isAuthenticated = false
          return false
        }

        return await this.fetchProfile()
      } catch {
        this.user = null
        this.isAuthenticated = false
        return false
      }
    },

    async logout(): Promise<void> {
      this.loading = true

      try {
        await authService.logout()
      } catch (error: unknown) {
        this.error = getErrorMessage(error, 'Logout failed')
      } finally {
        this.user = null
        this.isAuthenticated = false
        this.loading = false
      }

      await navigateTo('/auth/login')
    },

    clearError(): void {
      this.error = null
    },
  },
})
