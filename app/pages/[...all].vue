<script setup lang="ts">
useHead({ title: 'Seite nicht gefunden – spiele.keksi.dev' })
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
        Fehler 404
      </p>
      <h1
        class="
          mt-3 text-4xl font-bold tracking-tight
          sm:text-5xl
        "
      >
        Diese Seite gibt es nicht.
      </h1>
      <p class="mt-4 max-w-md text-lg/8 text-muted">
        Der Link ist vielleicht veraltet. Auf der Startseite findest du alle Spiele.
      </p>
      <div class="mt-8">
        <NuxtLink to="/" class="btn btn-secondary">
          Zur Startseite
        </NuxtLink>
      </div>
    </div>
  </main>
</template>
