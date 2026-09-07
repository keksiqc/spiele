<script setup lang="ts">
const { locale } = useI18n()

useHead({ htmlAttrs: { lang: locale } })
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <Toaster position="bottom-right" theme="dark" :offset="16" :duration="3600" />
  </div>
</template>
