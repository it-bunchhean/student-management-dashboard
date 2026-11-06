<template>
  <div class="min-h-screen flex items-center justify-center p-6" style="background: var(--surface-bg)">
    <div class="w-full max-w-sm text-center space-y-6">

      <div v-if="state === 'loading'" class="space-y-4">
        <div class="w-16 h-16 mx-auto rounded-full border-4 border-primary-500/20 border-t-primary-500 animate-spin" />
        <p class="text-sm" style="color: var(--text-muted)">Checking session…</p>
      </div>

      <template v-else-if="state === 'ready'">
        <div class="w-16 h-16 mx-auto rounded-full bg-primary-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">Confirm Attendance</h1>
        <p class="text-sm" style="color: var(--text-secondary)">
          You're about to check in for this class session.
        </p>

        <button class="btn-primary w-full py-3" :disabled="submitting" @click="submitCheckIn">
          <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {{ submitting ? 'Submitting…' : "I'm here — Check In" }}
        </button>
      </template>

      <template v-else-if="state === 'success'">
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">You're checked in!</h1>
        <p class="text-sm" style="color: var(--text-muted)">Your attendance has been recorded.</p>
      </template>

      <template v-else-if="state === 'expired'">
        <div class="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">QR Code Expired</h1>
        <p class="text-sm" style="color: var(--text-muted)">Ask your instructor for a new code.</p>
      </template>

      <template v-else>
        <div class="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="text-xl font-bold" style="color: var(--text-primary)">Something went wrong</h1>
        <p class="text-sm" style="color: var(--text-muted)">{{ errorMessage }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { get, rand } from '@vueuse/core/index.cjs'
import { attendanceService } from '~/services/attendance.service'

definePageMeta({ layout: false })

const route = useRoute()
const auth = useAuthStore()
const token = route.params.token as string

const state = ref<'loading' | 'ready' | 'success' | 'expired' | 'error'>('loading')
const submitting = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  // Login check disabled
  /*
  if (!auth.isAuthenticated) {
    // redirect to login, then return here after auth
    return navigateTo(`/auth/login?redirect=/attendance/checkin/${token}`)
  }
  */
  // Optionally validate the token/session is still active before showing the confirm screen
  state.value = 'ready'
})

const submitCheckIn = async () => {
  submitting.value = true
  try {
    const geo = await getLocation().catch(() => null)
    
    if (!auth.user?.id) {
      throw new Error('User not found')
    }
    
    if (!geo) {
      throw new Error('Location unvaliable')
    }
    
    await attendanceService.checkIn({
      studentId: Number(auth.user?.id),
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      radiusMeters: geo?.radiusMeters ?? 100
    })
    
    state.value = 'success'
  } catch (err: any) {
    console.error(err)
    
    const status = err?.response?.status ?? err?.status
    
    if (status === 410 || /expired/i.test(err?.message ?? '')) {
      state.value = 'expired'
    } else {
      errorMessage.value = 
        err?.response?.data?.message ??
        err?.message ?? 'Could not record attendance'
      state.value = 'error'
    }
  } finally {
    submitting.value = false
  }
}

const getLocation = () =>
  new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    if (!navigator.geolocation) return reject()
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      reject,
      { timeout: 5000 },
    )
  })
</script>