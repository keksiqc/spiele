<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <a
    href="https://ko-fi.com/keksiqc"
    target="_blank"
    rel="noreferrer"
    :aria-label="t('site.donate')"
    class="btn btn-ghost"
  >
    <Icon name="lucide:heart" aria-hidden="true" class="size-4" />
    <span
      class="
        hidden
        sm:inline
      "
    >{{ t('site.donate') }}</span>
  </a>
</template>
