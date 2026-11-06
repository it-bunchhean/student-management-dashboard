<!-- AppBadge -->
<template>
    <span class="badge" :class="badgeClass">
        <span v-if="dot" class="w-1.5 h-1.5 rounded-lg bg-current" />
        <slot />
    </span>
</template>

<script setup lang="ts">
const props = defineProps<{
    variant?:
        | "success"
        | "warning"
        | "danger"
        | "info"
        | "primary"
        | "muted"
        | string;
    dot?: boolean;
}>();

const badgeClass = computed(() => {
    const variant = (props.variant ?? "muted").toLowerCase();
    const allowed = new Set([
        "success",
        "warning",
        "danger",
        "info",
        "primary",
        "muted",
    ]);
    return `badge-${allowed.has(variant) ? variant : "muted"}`;
});
</script>
