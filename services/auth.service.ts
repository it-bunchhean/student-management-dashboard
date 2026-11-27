import { api } from './api'
import axios from 'axios'
import type { ApiResponse, AuthUser, AuthTokens, LoginCredentials, RegisterData } from '~/types'

// Auth Service
export const authService = {

  async signin(credentials: LoginCredentials): Promise<ApiResponse<AuthTokens>> {
    const response = await api.post<ApiResponse<AuthTokens> | AuthTokens>(
      '/auth/login',
      credentials,
    )

    const body = response as ApiResponse<AuthTokens> & Partial<AuthTokens>
    const data = (body.data ?? body) as AuthTokens & Record<string, unknown>
    const accessToken = data.accessToken ?? data.access_token
    const refreshToken = data.refreshToken ?? data.refresh_token

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      throw new Error('Invalid authentication response from server')
    }

    const normalized = { ...data, accessToken, refreshToken }

    api.setTokens(accessToken, refreshToken)

    return { ...(body as ApiResponse<AuthTokens>), data: normalized }
  },

  async signup(data: RegisterData): Promise<ApiResponse<AuthUser>> {
    return api.post<ApiResponse<AuthUser>>('/auth/signup', data)
  },

  async logout(): Promise<void> {
    try {
      // Send the refresh token so the backend can revoke it (if it supports that)
      await api.post('/auth/logout', { refreshToken: api.getRefreshToken() })
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : (error as any)?.status
      if (status !== 404 && status !== 401) {
        throw error
      }
    } finally {
      api.removeTokens()
    }
  },

  async refresh(): Promise<string> {
   const { data } = await api.post<ApiResponse<RefreshTokenResponse>>(
    '/auth/refresh'
   ) 

   return data.data.accessToken
  },

  async profile(): Promise<ApiResponse<AuthUser>> {
    return api.get<ApiResponse<AuthUser>>('/users/me')
  },

  async isAuthenticated(): Promise<ApiResponse<boolean>> {
    return api.get<ApiResponse<boolean>>('/users/is-authenticated')
  },

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return api.post<ApiResponse<void>>('/auth/forgot-password', { email })
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    return api.post<ApiResponse<void>>('/auth/reset-password', { token, password })
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return api.post<ApiResponse<void>>('/auth/change-password', { currentPassword, newPassword })
  },

  async updateProfile(data: Partial<AuthUser>): Promise<ApiResponse<AuthUser>> {
    return api.patch<ApiResponse<AuthUser>>('/users/me', data)
  },

  async uploadAvatar(file: File, onProgress?: (p: number) => void): Promise<ApiResponse<{ url: string }>> {
    return api.uploadFile<ApiResponse<{ url: string }>>('/auth/avatar', file, onProgress)
  },
}
