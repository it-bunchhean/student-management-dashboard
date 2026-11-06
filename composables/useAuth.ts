export const useAuth = () => {
  const authStore = useAuthStore()
  const router = useRouter()

  const login = async (credentials: { email: string; password: string;}) => {
    // Login disabled
    /*
    const success = await authStore.login(credentials)
    if (success) {
      await router.push('/dashboard')
    }
    return success
    */
    await router.push('/dashboard')
    return true
  }

  const logout = async () => {
    // Logout disabled
    /*
    await authStore.logout()
    await router.push('/auth/login')
    */
    await router.push('/dashboard')
  }

  const requireAuth = () => {
    // Auth requirement disabled
    /*
    if (!authStore.isAuthenticated) {
      router.push('/auth/login')
      return false 
    }
    */
    return true
  }

  const requireRole = (role: string) => {
    // Role requirement disabled
    /*
    if (!authStore.isAuthenticated) {
      router.push('/auth/login')
      return false
    }
    if (authStore.user?.role !== role && authStore.user?.role !== 'admin') {
      router.push('/dashboard')
      return false
    }
    */
    return true
  }

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    isAdmin: computed(() => authStore.isAdmin),
    isTeacher: computed(() => authStore.isTeacher),
    loading: computed(() => authStore.loading),
    error: computed(() => authStore.error),
    login,
    logout,
    requireAuth,
    requireRole,
    clearError: authStore.clearError,
  }
}
