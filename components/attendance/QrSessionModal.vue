<template>
  <Teleport to="body">
    <Transition name="modal-overlay">
      <div v-if="modelValue" class="fixed inset-0 z-[8000] flex items-center justify-center p-4"
        <!-- style="background: rgba(0,0,0,0.65); backdrop-filter: blur(6px)"   -->
        @click.self="handleClose">
        <Transition name="modal">
          <div v-if="modelValue" class="w-full max-w-md rounded-md shadow-modal overflow-hidden"
            style="background: var(--surface-card); border: 1px solid var(--surface-border)">

            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4"
              style="border-bottom: 1px solid var(--surface-border)">
              <div>
                <h2 class="font-display font-bold text-lg" style="color: var(--text-primary)">
                  Attendance QR Code
                </h2>
                <p class="text-xs mt-0.5" style="color: var(--text-muted)">
                  {{ schedule?.coursName ?? 'Select a class schedule' }}
                </p>
              </div>
              <button class="btn-ghost w-8 h-8 rounded-lg" click="handleClose">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-6 flex flex-col items-center gap-5">

              <!-- Idle: pick schedule & start -->
              <div v-if="!session" class="w-full space-y-4">
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold" style="color: var(--text-secondary)">
                    Class Schedule *
                  </label>
                  <select v-model="selectedScheduleId" class="input-field py-2.5 text-sm w-full">
                    <option value="" disabled>Select schedule</option>
                    <option v-for="s in schedules" :key="s.scheduleId" :value="s.scheduleId">
                      {{ s.coursName }}
                    </option>
                  </select>
                </div>

                <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

                <button class="btn-primary w-full py-2.5" :disabled="!selectedScheduleId || starting"
                  @click="handleStart">
                  <svg v-if="starting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ starting ? 'Starting…' : 'Generate QR Code' }}
                </button>
              </div>

              <!-- Active: show QR -->
              <template v-else>
                <div class="relative w-56 h-56 rounded-xl p-3 bg-white flex items-center justify-center"
                  :class="isExpired ? 'opacity-40 grayscale' : ''">
                  <img v-if="qrDataUrl" :src="qrDataUrl" alt="Attendance QR" class="w-full h-full object-contain" />
                  <div v-else class="skeleton w-full h-full rounded-lg" />

                  <div v-if="isExpired"
                    class="absolute inset-0 flex items-center justify-center rounded-xl"
                    style="background: rgba(0,0,0,0.5)">
                    <span class="text-white text-xs font-bold uppercase tracking-wider">Expired</span>
                  </div>
                </div>

                <!-- Countdown -->
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full"
                    :class="isExpired ? 'bg-neutral-500' : 'bg-white animate-pulse'" />
                  <span class="text-sm font-semibold" style="color: var(--text-primary)">
                    {{ isExpired ? 'Session closed' : `Expires in ${countdownLabel}` }}
                  </span>
                </div>

                <!-- Live count -->
                <div class="w-full rounded-lg p-3 flex items-center justify-between"
                  style="background: var(--surface-hover)">
                  <span class="text-xs" style="color: var(--text-muted)">Checked in</span>
                  <span class="text-sm font-bold text-primary-400">{{ checkedInCount }} students</span>
                </div>

                <p class="text-[11px] text-center leading-relaxed" style="color: var(--text-muted)">
                  Ask students to open the EduAdmin app / camera and scan this code,
                  or visit
                  <span class="font-mono text-primary-400">/attendance/checkin/{{ session.qrToken.slice(0, 12) }}…</span>
                </p>

                <div class="flex gap-3 w-full">
                  <button class="btn-secondary flex-1 py-2" :disabled="closing" @click="handleClose(true)">
                    {{ closing ? 'Closing…' : 'Close Session' }}
                  </button>
                  <button v-if="!isExpired" class="btn-ghost flex-1 py-2" @click="refreshQr">
                    Refresh
                  </button>
                </div>
              </template>
            </div>
          </div>
        </Transition>
       </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { attendanceService, type SessionResponse } from '~/services/attendance.service'

const props = defineProps<{
  modelValue: boolean
  schedules: { scheduleId: number; coursName: string }[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const toast = useToast()

const selectedScheduleId = ref<number | ''>('')
const session = ref<SessionResponse | null>(null)
const qrDataUrl = ref('')
const starting = ref(false)
const closing = ref(false)
const error = ref('')
const checkedInCount = ref(0)

const schedule = computed(() =>
  props.schedules.find(s => s.scheduleId === selectedScheduleId.value)
)

// Countdown
const now = ref(Date.now())
let tickHandle: ReturnType<typeof setInterval> | null = null
let pollHandle: ReturnType<typeof setInterval> | null = null

const expiresAtMs = computed(() => session.value ? new Date(session.value.expiredAt).getTime() : 0)
const remainingMs = computed(() => Math.max(0, expiresAtMs.value - now.value))
const isExpired = computed(() => !!session.value && remainingMs.value <= 0)

const countdownLabel = computed(() => {
  const totalSec = Math.floor(remainingMs.value / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})

watch(() => props.modelValue, (open) => {
  if (open) {
    resetState()
  } else {
    stopTimers()
  }
})

const resetState = () => {
  selectedScheduleId.value = ''
  session.value = null
  qrDataUrl.value = ''
  error.value = ''
  checkedInCount.value = 0
}

const handleStart = async () => {
  if (!selectedScheduleId.value) return
  starting.value = true
  error.value = ''
  try {
    const result = await attendanceService.startSession(Number(selectedScheduleId.value))
    session.value = result
    await renderQr(result.qrToken)
    startTimers()
    toast.success('Session started', 'Students can now scan the QR code.')
  } catch (err: any) {
    error.value = err?.message ?? 'Failed to start session'
  } finally {
    starting.value = false
  }
}

const renderQr = async (token: string) => {
  // Encode a deep-link the student device opens, which posts the check-in
  const checkinUrl = `${window.location.origin}/attendance/checkin/${token}`
  qrDataUrl.value = await QRCode.toDataURL(checkinUrl, {
    width: 480,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
}

const refreshQr = () => {
  if (session.value) renderQr(session.value.qrToken)
}

const startTimers = () => {
  tickHandle = setInterval(() => { now.value = Date.now() }, 1000)
  // Optional: poll a "who checked in" endpoint every few seconds
  pollHandle = setInterval(async () => {
    // checkedInCount.value = await attendanceService.getCheckedInCount(session.value!.sessionId)
  }, 5000)
}

const stopTimers = () => {
  if (tickHandle) clearInterval(tickHandle)
  if (pollHandle) clearInterval(pollHandle)
  tickHandle = null
  pollHandle = null
}

const handleClose = async (forceCloseSession = false) => {
  if (forceCloseSession && session.value && !isExpired.value) {
    closing.value = true
    try {
      await attendanceService.CloseSession(session.value.sessionId)
      toast.success('Session closed')
    } catch (err: any) {
      toast.error('Failed to close session', err?.message)
    } finally {
      closing.value = false
    }
  }
  stopTimers()
  emit('update:modelValue', false)
}

onBeforeUnmount(stopTimers)

</script>
