export default defineNuxtRouteMiddleware(async (to) => {
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
