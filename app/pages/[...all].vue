<script setup lang="ts">
const { t } = useI18n()

useHead({ title: () => t('notFound.title') })
</script>

<template>
  <main class="flex min-h-screen flex-col">
    <AppHeader />

    <div
      class="
        mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-24
        sm:px-6
      "
    >
      <p class="text-sm text-muted">
        {{ t('notFound.label') }}
      </p>
      <h1
        class="
          mt-3 text-4xl font-bold tracking-tight
          sm:text-5xl
        "
      >
        {{ t('notFound.headline') }}
      </h1>
      <p class="mt-4 max-w-md text-lg/8 text-muted">
        {{ t('notFound.text') }}
      </p>
      <div class="mt-8">
        <NuxtLink to="/" class="btn btn-secondary">
          {{ t('site.home') }}
        </NuxtLink>
      </div>
    </div>
  </main>
</template>
