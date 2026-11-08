<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl" style="color: var(--text-primary)">
          Good {{ greeting }}, {{ firstName }}
        </h1>
        <p class="text-base mt-1" style="color: var(--text-secondary)">
          Here's what's happening at your institution today.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-secondary border text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Export Report
        </button>
      </div> 
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatsCard
        label="Total Students"
        :value="pagination.totalPages"
        :trend="statistic.studentsGrowth"
        icon="users"
        iconColor="#818cf8"
        iconBg="rgba(99,102,241,0.15)"
        :fillPercent="0"
        :loading="statsLoading"
        subtext="+ 0 this month"
      />
      <StatsCard
        label="Total Teachers"
        :value="10"
        icon="user-check"
        iconColor="#34d399"
        iconBg="rgba(16,185,129,0.15)"
        :fillPercent="58"
        :loading="statsLoading"
        subtext="Across 5 departments"
      />
      <StatsCard
        label="Active Courses"
        :value="statistic.activeCourses"
        :trend="statistic.coursesGrowth"
        icon="book-open"
        iconColor="#fb923c"
        iconBg="rgba(251,146,60,0.15)"
        :fillPercent="65"
        :loading="statsLoading"
        subtext="This semester"
      />
      <StatsCard
        label="Total Revenue"
        :value="statistic.totalRevenue"
        format="currency"
        :trend="statistic.revenueGrowth"
        icon="dollar-sign"
        iconColor="#a78bfa"
        iconBg="rgba(167,139,250,0.15)"
        :fillPercent="84"
        :loading="statsLoading"
        subtext="Academic year 2024"
      />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div class="xl:col-span-2">
        <RevenueChart />
      </div>
      <PerformanceChart />
    </div>

    <!-- Bottom Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2">
        <UpcomingClasses />
      </div>
      <div class="space-y-4">
        <!-- <QuickActions /> -->
        <RecentActivities />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

definePageMeta({ layout: 'default' })
useHead({ title: 'Dashboard' })

const auth = useAuthStore()
const firstName = computed(() => auth.user?.fullName?.split(' ')[0] ?? 'Admin')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
})

const statsLoading = ref(false)
const studentStore = useStudentStore()
const { stats , pagination } = storeToRefs(studentStore)

const statistic = ref(mockDashboardStats)

onMounted(async () => {
  try {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        statsLoading.value = true
        setTimeout(() => {
          statsLoading.value = false
        }, 300) // Reduced delay
      })
    } else {
      setTimeout(() => {
        statsLoading.value = true
        setTimeout(() => {
          statsLoading.value = false
        }, 300)
      }, 100)
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    statsLoading.value = false
  }
})
</script>
