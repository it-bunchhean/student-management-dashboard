export default defineNuxtRouteMiddleware(async (to) => {
  // The session tokens live in localStorage, which is only available in the
  // browser. Defer protected-route checks until client hydration so SSR does
  // not redirect authenticated users before their session can be restored.
  if (import.meta.server) return

  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/403',
  ]

  if (publicRoutes.includes(to.path)) {
    return
  }

  const auth = useAuthStore()

  if (!auth.isAuthenticated) {
    await auth.checkAuth()
  }

  if (!auth.isAuthenticated) {
    return navigateTo({ path: '/auth/login', query: { redirect: to.fullPath } })
  }

  const requiredRoles = to.meta?.roles as string[] | undefined

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = auth.user?.role ?? ''
    const hasAccess = requiredRoles.includes(userRole)
    if (!hasAccess) {
      return navigateTo('/403')
    }
  }
})
