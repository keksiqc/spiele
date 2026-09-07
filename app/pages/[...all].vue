<script setup lang="ts">
useHead({ title: 'Seite nicht gefunden – spiele.keksi.dev' })
</script>

<template>
  <main
    class="
      grid min-h-screen place-items-center bg-slate-950 px-5 text-center
      text-slate-100
    "
  >
    <div>
      <p class="font-mono text-sm tracking-[0.22em] text-violet-300 uppercase">
        404
      </p>
      <h1 class="mt-4 text-4xl font-black tracking-tight">
        Diese Seite gibt es nicht.
      </h1>
      <p class="mx-auto mt-4 max-w-md leading-7 text-slate-400">
        Vielleicht wartet das nächste Spiel schon auf der Startseite.
      </p>
      <NuxtLink
        to="/" class="
          mt-8 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-bold
          text-slate-950 transition
          hover:bg-violet-200
        "
      >
        Zur Startseite
      </NuxtLink>
    </div>
  </main>
</template>
