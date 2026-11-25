<template>
  <div class="animate-fade-in">
    <div class="mb-8">
      <h2 class="font-display text-3xl font-bold" style="color: var(--text-primary)">Create account</h2>
      <p class="mt-2 text-sm" style="color: var(--text-secondary)">Join student system to manage your institution</p>
    </div>

    <form class="space-y-4" @submit.prevent="handleRegister">
      <div class="grid grid-cols-1 gap-3">
        <div class="space-y-1.5">
          <label class="text-xs font-semibold" style="color: var(--text-secondary)">Username</label>
          <input v-model="form.username" type="text" placeholder="@username" class="input-field"
            :class="errors.username ? 'error' : ''" />
          <p v-if="errors.username" class="text-xs text-red-400">{{ errors.username }}</p>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-semibold" style="color: var(--text-secondary)">Email address</label>
        <div class="relative">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style="color: var(--text-muted)" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <input v-model="form.email" type="email" placeholder="you@institution.edu" class="input-field pl-10"
            :class="errors.email ? 'error' : ''" />
        </div>
        <p v-if="errors.email" class="text-xs text-red-400">{{ errors.email }}</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-semibold" style="color: var(--text-secondary)">Password</label>
        <div class="relative">
          <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style="color: var(--text-muted)" fill="none"
            stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <input v-model="form.password" :type="showPass ? 'text' : 'password'" placeholder="Min. 8 characters"
            class="input-field pl-10 pr-10" :class="errors.password ? 'error' : ''" />
          <button type="button" class="absolute right-3.5 top-1/2 -translate-y-1/2" style="color: var(--text-muted)"
            @click="showPass = !showPass">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
        <!-- Password strength -->
        <div class="flex gap-1 mt-1.5">
          <div v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full transition-colors duration-300"/>
        </div>
        <p v-if="errors.password" class="text-xs text-red-400">{{ errors.password }}</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-semibold" style="color: var(--text-secondary)">Confirm Password</label>
        <input v-model="form.confirmPassword" :type="showPass ? 'text' : 'password'" placeholder="••••••••"
          class="input-field" :class="errors.confirmPassword ? 'error' : ''" />
        <p v-if="errors.confirmPassword" class="text-xs text-red-400">{{ errors.confirmPassword }}</p>
      </div>

      <div class="flex items-start gap-2">
        <input v-model="form.agree" id="agree" type="checkbox" class="checkbox-custom mt-0.5" />
        <label for="agree" class="text-xs cursor-pointer" style="color: var(--text-secondary)">
          I agree to the
          <a href="#" class="text-primary-400 hover:underline">Terms of Service</a>
          and
          <a href="#" class="text-primary-400 hover:underline">Privacy Policy</a>
        </label>
      </div>
      <p v-if="errors.agree" class="text-xs text-red-400 -mt-2">{{ errors.agree }}</p>

      <button type="submit" class="btn-primary w-full py-3" :disabled="loading">
        <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ loading ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <p class="mt-6 text-center text-sm" style="color: var(--text-muted)">
      Already have an account?
      <NuxtLink to="/auth/login" class="text-primary-400 font-semibold hover:underline ml-1">Sign in</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { validateForm, isRequired, isEmail, isMinLength, isMatch, hasErrors } from '~/utils/validators'
import { useAuthStore } from '~/stores/auth.store'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Create Account' })

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const loading = ref(false)
const showPass = ref(false)

const form = reactive({ username: '', email: '', role: 'ROLE_USER', password: '', confirmPassword: '', agree: false })
const errors = ref<Record<string, string>>({})

const passwordStrength = computed(() => {
  const p = form.password
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})

const handleRegister = async () => {
  errors.value = validateForm(form as unknown as Record<string, unknown>, {
    username: [v => isRequired(v, 'Username')],
    email: [v => isRequired(v, 'Email'), v => isEmail(v as string)],
    password: [v => isRequired(v, 'Password'), v => isMinLength(8)(v as string)],
    confirmPassword: [v => isMatch(form.password)(v as string)],
    agree: [v => v ? undefined : 'You must agree to the terms'],
  })
  if (hasErrors(errors.value)) return

  loading.value = true
  try {
    const success = await authStore.register({
      username: form.username,
      email: form.email,
      password: form.password,
      role: form.role as any 
    })

    if (success) {
      toast.success('Account created!', 'Welcome to student management system. You can now sign in.')
      router.push('/users')
    } else {
      toast.error('Registration failed', authStore.error || 'Could not create account.')
    }
  } catch (err: any) {
    console.error('Registration error:', err)
    toast.error('Registration error', 'An unexpected error occurred.')
  } finally {
    loading.value = false
  }
}

</script>
