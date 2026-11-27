import type { LoginCredentials } from '~/types'

const normalizeRole = (role: string): string => {
  const value = role.trim().toUpperCase()
  return value.startsWith('ROLE_') ? value : `ROLE_${value}`
}

export const useAuth = () => {
  const authStore = useAuthStore()

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    const success = await authStore.signin(credentials)

    if (success) {
      await navigateTo('/dashboard')
    }

    return success
  }

  const logout = async (): Promise<void> => {
    await authStore.logout()
  }

  const requireAuth = async (): Promise<boolean> => {
    const ok = await authStore.initialize()

    if (!ok) {
      await navigateTo('/auth/login')
      return false
    }

    return true
  }

  const requireRole = async (roles: string | string[]): Promise<boolean> => {
    if (!(await requireAuth())) return false

    const allowed = (Array.isArray(roles) ? roles : [roles]).map(normalizeRole)

    if (!authStore.isAdmin && !authStore.hasAnyRole(allowed)) {
      await navigateTo('/dashboard')
      return false
    }

    return true
  }

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isAdmin: computed(() => authStore.isAdmin),
    isStaff: computed(() => authStore.isStaff),
    isTeacher: computed(() => authStore.hasRole('ROLE_TEACHER')),
    loading: computed(() => authStore.loading),
    error: computed(() => authStore.error),
    login,
    logout,
    requireAuth,
    requireRole,
    clearError: authStore.clearError,
  }
}
