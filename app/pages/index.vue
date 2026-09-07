<script setup lang="ts">
const { t } = useI18n()

const games = computed(() => [
  {
    title: t('game.name'),
    description: t('game.summary'),
    playerCount: t('home.players', { count: 2 }),
    route: '/assoziationsspiel',
  },
])

useHead({
  title: () => t('home.title'),
  meta: [
    {
      name: 'description',
      content: () => t('home.description'),
    },
  ],
})
</script>

<template>
  <main class="flex min-h-screen flex-col">
    <AppHeader />

    <div
      class="
        mx-auto w-full max-w-3xl px-5 pt-16 pb-24
        sm:px-6 sm:pt-24
      "
    >
      <h1
        class="
          max-w-xl text-4xl font-bold tracking-tight text-balance
          sm:text-5xl
        "
      >
        {{ t('home.headline') }}
      </h1>
      <p class="mt-5 max-w-lg text-lg/8 text-muted">
        {{ t('home.intro') }}
      </p>

      <ul class="mt-14 divide-y divide-line border-y border-line">
        <li v-for="game in games" :key="game.route">
          <NuxtLink
            :to="game.route"
            class="
              group flex items-center justify-between gap-6 py-6
              transition-colors
              hover:text-lilac
            "
          >
            <div class="min-w-0">
              <p class="text-xl font-semibold">
                {{ game.title }}
              </p>
              <p class="mt-1.5 max-w-md text-sm/6 text-muted">
                {{ game.description }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-4">
              <span
                class="
                  hidden text-sm text-muted
                  sm:inline
                "
              >{{ game.playerCount }}</span>
              <Icon
                name="lucide:arrow-right"
                aria-hidden="true"
                class="
                  size-5 text-muted transition-transform
                  group-hover:translate-x-0.5 group-hover:text-lilac
                "
              />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </main>
</template>
