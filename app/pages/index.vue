<script setup lang="ts">
import DonateButton from '~/components/DonateButton.vue'

const games = [
  {
    title: 'Assoziationsspiel',
    description: 'Findet abwechselnd Begriffe, deckt eure Antworten auf und baut gemeinsam eine Serie richtiger Antworten auf.',
    playerCount: '2 Spieler',
    route: '/assoziationsspiel',
  },
]

useHead({
  title: 'spiele.keksi.dev – kleine Spiele für zwei',
  meta: [
    {
      name: 'description',
      content: 'Spiele gemeinsam im Browser – aktuell mit dem großen Assoziationsspiel für zwei Personen.',
    },
  ],
})
</script>

<template>
  <main
    class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100"
  >
    <div class="pointer-events-none absolute inset-0 page-grid" aria-hidden="true" />
    <div
      class="
        pointer-events-none absolute top-0 -left-32 size-96 rounded-full
        bg-violet-600/20 blur-3xl
      " aria-hidden="true"
    />
    <div
      class="
        pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full
        bg-sky-500/10 blur-3xl
      " aria-hidden="true"
    />

    <header
      class="
        relative mx-auto flex max-w-6xl items-center justify-between p-5
        sm:px-8
      "
    >
      <NuxtLink
        to="/" class="
          inline-flex items-center gap-3 text-sm font-semibold tracking-wide
          text-slate-300 transition
          hover:text-white
        "
      >
        <span
          class="
            grid size-9 place-items-center rounded-xl bg-linear-to-br
            from-sky-300 to-violet-400 text-sm font-black text-slate-950
            shadow-lg shadow-violet-950/40
          "
        >S</span>
        <span>spiele.keksi.dev</span>
      </NuxtLink>
      <DonateButton />
    </header>

    <div
      class="
        relative mx-auto flex max-w-6xl flex-col gap-16 px-5 pt-12 pb-20
        sm:px-8 sm:pt-20
      "
    >
      <section class="max-w-3xl">
        <p
          class="
            mb-6 inline-flex items-center gap-2 rounded-full border
            border-sky-300/15 bg-sky-300/8 px-3 py-1.5 text-xs font-semibold
            tracking-[0.18em] text-sky-200 uppercase
          "
        >
          <span
            class="
              size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px]
              shadow-emerald-300
            "
          />
          Kleine Spiele, große Abende
        </p>
        <h1
          class="
            max-w-3xl text-5xl font-black tracking-tight text-white
            sm:text-7xl
          "
        >
          Willkommen bei
          <span
            class="
              mt-2 block bg-linear-to-r from-sky-200 via-violet-300 to-pink-300
              bg-clip-text text-transparent
            "
          >SPIELE.</span>
        </h1>
        <p
          class="
            mt-7 max-w-2xl text-lg/8 text-slate-400
            sm:text-xl
          "
        >
          Browser-Spiele, die direkt funktionieren. Raum erstellen, Link teilen und losspielen – ohne Download und ohne Anmeldung.
        </p>
      </section>

      <section aria-labelledby="games-heading">
        <div class="mb-5 flex items-end justify-between gap-4">
          <div>
            <p
              class="
                text-sm font-semibold tracking-[0.18em] text-slate-500 uppercase
              "
            >
              Auswahl
            </p>
            <h2 id="games-heading" class="mt-2 text-2xl font-bold text-white">
              Was möchtest du spielen?
            </h2>
          </div>
          <span
            class="
              hidden rounded-full border border-white/10 bg-white/5 px-3 py-1
              text-xs text-slate-400
              sm:inline-flex
            "
          >{{ games.length }} Spiel</span>
        </div>

        <div class="grid max-w-3xl gap-5">
          <NuxtLink
            v-for="game in games"
            :key="game.title"
            :to="game.route"
            class="
              group relative overflow-hidden rounded-4xl border border-white/10
              bg-white/5.5 p-1 shadow-2xl shadow-black/20 backdrop-blur-xl
              transition duration-300
              hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/8
            "
          >
            <div
              class="
                rounded-[1.8rem] border border-white/5 bg-slate-950/55 p-6
                sm:p-8
              "
            >
              <div class="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p
                    class="
                      text-sm font-semibold tracking-[0.16em] text-violet-300
                      uppercase
                    "
                  >
                    Spiel für zwei
                  </p>
                  <h3 class="mt-3 text-3xl font-bold tracking-tight text-white">
                    {{ game.title }}
                  </h3>
                </div>
                <span
                  class="
                    rounded-full border border-white/10 bg-white/5 px-3 py-1.5
                    text-sm font-medium text-slate-300
                  "
                >{{ game.playerCount }}</span>
              </div>
              <div
                class="
                  mt-8 flex flex-col items-start justify-between gap-6
                  sm:flex-row sm:items-end
                "
              >
                <p class="max-w-xl text-base/7 text-slate-400">
                  {{ game.description }}
                </p>
                <span
                  class="
                    inline-flex shrink-0 items-center gap-2 rounded-xl bg-white
                    px-4 py-2.5 text-sm font-bold text-slate-950 transition
                    group-hover:bg-violet-200
                  "
                >
                  Spielen
                  <span
                    aria-hidden="true" class="
                      text-lg transition-transform
                      group-hover:translate-x-0.5
                    "
                  >→</span>
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>
  </main>
</template>
