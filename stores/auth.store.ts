import { defineStore } from 'pinia'
import { authService } from '~/services/auth.service'

import type { AuthUser, LoginCredentials, RegisterData } from '~/types'

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

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  }),

  getters: {
    role: (state): string => state.user?.role ?? '',
    isAdmin: (state): boolean => state.user?.role === 'ROLE_ADMIN',
    isStaff: (state): boolean => ['ROLE_ADMIN', 'ROLE_STAFF'].includes(state.user?.role ?? ''),
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
        const response = await authService.signin(credentials)
        if (!response.success) {
          this.user = null
          this.isAuthenticated = false
          this.error = response.message || 'Login failed'
          return false
        }
        this.user = response.data
        this.isAuthenticated = true
        return true
      } catch (error: unknown) {
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
        if (!response.success) {
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
