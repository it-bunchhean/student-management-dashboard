import { defineStore } from "pinia";
import { authService } from "~/services/auth.service";

import type {
  AuthUser,
  LoginCredentials,
  RegisterData,
} from "~/types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Mock user for bypass when login and register are disabled
const mockUser: AuthUser = {
  id: "1",
  fullName: "Admin User",
  email: "admin@eduadmin.edu",
  verified: true,
  verificationToken: "mock-token",
  refreshToken: "mock-refresh-token",
  status: true,
  role: "ROLE_ADMIN",
  attempt: 0,
  lockTime: "",
};

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    // Auth disabled: default to mock user and authenticated
    user: mockUser,
    isAuthenticated: true,
    // Original state:
    // user: null,
    // isAuthenticated: false,
    loading: false,
    error: null,
  }),

  getters: {
    role: (state): string => state.user?.role ?? "",

    isAdmin: (state): boolean => state.user?.role === "ROLE_ADMIN",

    isStaff: (state): boolean => ["ROLE_ADMIN", "ROLE_STAFF"].includes(state.user?.role ?? "",),

    userName: (state): string => state.user?.fullName ?? "Guest",

    userEmail: (state): string => state.user?.email ?? "",
  },

  actions: {
    hasRole(role: string): boolean {
      return this.user?.role === role
    },

    hasAnyRole(roles: string[]): boolean {
      return roles.includes(this.user?.role ?? "")
    },

    async signin(credentials: LoginCredentials) {
      this.loading = true;
      this.error = null;

      // Signin disabled:
      /*
      try {
        await authService.signin(credentials)
        await this.fetchProfile()
        this.isAuthenticated = true

        return true;
      } catch (err: any) {
        this.error = err.message ?? "Login failed"
        return false
      } finally {
        this.loading = false
      }
      */

      this.isAuthenticated = true;
      this.loading = false;
      return true;
    },

    async register(data: RegisterData) {
      this.loading = true;
      this.error = null;

      // Register disabled:
      /*
      try {
        await authService.signup(data)

        return true;
      } catch (err: any) {
        this.error = err.message ?? "Registration failed"

        return false
      } finally {
        this.loading = false
      }
      */

      this.loading = false;
      return true;
    },

    async fetchProfile() {
      // Profile fetching disabled
      /*
      try {
        const response = await authService.profile();

        this.user = response.data;
        this.isAuthenticated = true;
      } catch (error: any) {
        console.error("Error fetching profile:", error.message);
        
        this.user = null;
        this.isAuthenticated = false;
      }
      */
    },

    async checkAuth() {
      // checkAuth disabled
      /*
      try {
        const response = await authService.isAuthenticated()
        if (response.data) {
          await this.fetchProfile();
        } else {
          this.user = null;
        }
      } catch (error: any) {
        console.error("Error checking authentication:", error.message);
        this.user = null;
        this.isAuthenticated = false;
      }
      */
    },

    async logout() {
      this.loading = true;

      // Logout disabled:
      /*
      try {
        await authService.logout();
      } catch (error: any) {
        console.error("Error logging out:", error.message);
      } finally {
        this.user = null;
        this.isAuthenticated = false;
        this.loading = false;

        await navigateTo("/auth/login");
      }
      */
      this.loading = false;
      await navigateTo("/dashboard");
    },

    clearError() {
      this.error = null;
    },
  },
});