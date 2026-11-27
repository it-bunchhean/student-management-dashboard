import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiResponse, PaginatedResponse, ApiError } from '~/types'

const apiUrl =
  import.meta.env.VITE_API_BASE_URL
  || (typeof process !== 'undefined' ? process.env?.NUXT_PUBLIC_API_BASE_URL : undefined)
  || (typeof process !== 'undefined' ? process.env?.VITE_API_BASE_URL : undefined)
  || 'http://localhost:8080/api/v1'

const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

class ApiService {
  private instance: AxiosInstance
  private refreshPromise: Promise<void> | null = null
  private BASE_URL = `${apiUrl}`

  constructor() {
    this.instance = axios.create({
      baseURL: this.BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use(
      (config) => {
        const token = this.getToken()
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response interceptor — refresh on 401, retry once
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        const requestPath = originalRequest?.url ?? ''
        const isAuthRequest = /^\/?auth\/(login|signin|signup|register|refresh)(\?|$)/.test(requestPath)

        if (
          error.response?.status === 401 &&
          !isAuthRequest &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true

          try {
            // all parallel 401s share ONE refresh call and wait for it
            await this.refreshToken()
            return this.instance(originalRequest)
          } catch {
            // refresh token expired/invalid -> user must login again
            this.clearTokens()

            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
              window.location.href = '/auth/login'
            }
            return Promise.reject(this.normalizeError(error))
          }
        }

        return Promise.reject(this.normalizeError(error))
      },
    )
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_KEY)
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_KEY)
  }

  hasTokens(): boolean {
    return !!(this.getToken() || this.getRefreshToken())
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  }

  private refreshToken(): Promise<void> {
    this.refreshPromise ??= (async () => {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token')

      const response = await axios.post(
        `${this.BASE_URL}/auth/refresh`,
        { refreshToken },
        {
          timeout: 15000,
          withCredentials: true,
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        },
      )

      const data = response.data?.data ?? response.data
      if (!data?.accessToken) throw new Error('Invalid refresh response')

      this.setTokens(data.accessToken, data.refreshToken ?? refreshToken)
    })().finally(() => {
      this.refreshPromise = null
    })

    return this.refreshPromise
  }

  private normalizeError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data
      const serverMessage = typeof responseData?.message === 'string'
        ? responseData.message
        : typeof responseData?.error === 'string'
          ? responseData.error
          : typeof responseData?.detail === 'string'
            ? responseData.detail
            : undefined
      return {
        message: serverMessage ?? error.message ?? 'An error occurred',
        code: responseData?.code,
        errors: responseData?.errors,
        status: error.response?.status,
      }
    }
    return { message: 'An unexpected error occurred' }
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.get(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.post(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.put(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.patch(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.instance.delete(url, config)
    return response.data
  }

  async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    const response: AxiosResponse<T> = await this.instance.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })

    return response.data
  }

  // Set auth tokens (called after login / refresh)
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.setItem(REFRESH_KEY, refreshToken)
  }

  // Clear auth tokens (called after logout) — kept for backward compatibility
  removeTokens(): void {
    this.clearTokens()
  }
}

// Singleton Export
export const api = new ApiService()

// Generic CRUD Builder
export function createCrudService<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>(
  basePath: string,
) {
  return {
    async getAll(params?: Record<string, any>): Promise<PaginatedResponse<T>> {
      return api.get<PaginatedResponse<T>>(basePath, { params })
    },

    async getById(id: number): Promise<ApiResponse<T>> {
      return api.get<ApiResponse<T>>(`${basePath}/${id}`)
    },

    async create(data: CreateDTO): Promise<ApiResponse<T>> {
      return api.post<ApiResponse<T>>(basePath, data)
    },

    async update(id: number, data: UpdateDTO): Promise<ApiResponse<T>> {
      return api.put<ApiResponse<T>>(`${basePath}/${id}`, data)
    },

    async patch(id: number, data: Partial<UpdateDTO>): Promise<ApiResponse<T>> {
      return api.patch<ApiResponse<T>>(`${basePath}/${id}`, data)
    },

    async remove(id: number): Promise<ApiResponse<void>> {
      return api.delete<ApiResponse<void>>(`${basePath}/${id}`)
    },

    async bulkDelete(ids: number[]): Promise<ApiResponse<void>> {
      return api.post<ApiResponse<void>>(`${basePath}/bulk-delete`, { ids })
    },
  }
}
