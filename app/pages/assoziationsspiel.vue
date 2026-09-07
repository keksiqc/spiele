<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MAX_ROOM_ID_LENGTH, normalizeRoomId } from '#shared/game'
import DonateButton from '~/components/DonateButton.vue'
import ToastStack from '~/components/ToastStack.vue'
import { useGameRoom } from '~/composables/useGameRoom'
import { useToasts } from '~/composables/useToasts'

const route = useRoute()
const router = useRouter()
const roomInput = ref('')
const { notify, toasts } = useToasts()

const {
  connected,
  connecting,
  currentCategory,
  joined,
  leave,
  myInput,
  partnerInput,
  revealSent,
  revealed,
  roomId,
  send,
  streak,
  updateInput,
  join,
} = useGameRoom({
  onConnected: () => notify('Verbunden – viel Spaß!', 'success'),
  onDisconnected: () => notify('Die Verbindung wurde getrennt.', 'error'),
  onError: message => notify(message, 'error'),
  onMessage: (message) => {
    if (message.type === 'streak')
      notify('Richtige Antwort!', 'success')
    if (message.type === 'resetStreak')
      notify('Falsche Antwort!', 'error')
    if (message.type === 'allRevealed')
      notify('Antwort aufgedeckt.', 'info')
  },
})

const inputLocked = computed(() => revealSent.value || revealed.value)
const canReveal = computed(() => connected.value && !inputLocked.value)
const canResolve = computed(() => connected.value && revealed.value)
const connectionLabel = computed(() => {
  if (connected.value)
    return 'Verbunden'
  if (connecting.value)
    return 'Verbindung wird hergestellt'
  return 'Nicht verbunden'
})

function createRoomId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const result: string[] = []
  const values = new Uint32Array(6)
  const limit = Math.floor(0x1_0000_0000 / alphabet.length) * alphabet.length

  while (result.length < 6) {
    crypto.getRandomValues(values)
    for (const value of values) {
      if (value >= limit || result.length >= 6)
        continue
      result.push(alphabet[value % alphabet.length] ?? 'A')
    }
  }

  return result.join('')
}

function normalizeRoomInput() {
  roomInput.value = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_ROOM_ID_LENGTH)
}

function joinRoom(value: unknown = roomInput.value) {
  const normalized = normalizeRoomId(value)
  if (!normalized) {
    notify('Die Room ID muss aus 4 bis 12 Buchstaben oder Zahlen bestehen.', 'warning')
    return
  }

  roomInput.value = normalized
  if (join(normalized))
    void router.replace({ query: { room: normalized } })
}

function createRoom() {
  const newRoomId = createRoomId()
  roomInput.value = newRoomId
  joinRoom(newRoomId)
}

function leaveRoom() {
  leave()
  roomInput.value = ''
  void router.replace({ query: {} })
}

function handleInput(event: Event) {
  if (event.target instanceof HTMLInputElement)
    updateInput(event.target.value)
}

function handleReveal() {
  if (!canReveal.value)
    return
  if (send({ type: 'reveal' }))
    revealSent.value = true
}

function handleCorrect() {
  if (!canResolve.value)
    return
  const nextStreak = Math.min(streak.value + 1, 5)
  if (!send({ type: 'streak', value: nextStreak }))
    return

  streak.value = nextStreak
  notify('Richtige Antwort!', 'success')
  nextCategory()
}

function handleWrong() {
  if (!canResolve.value)
    return
  if (!send({ type: 'resetStreak' }))
    return

  streak.value = 0
  notify('Falsche Antwort!', 'error')
  nextCategory()
}

function nextCategory() {
  if (!send({ type: 'newCategory' }))
    notify('Warte kurz, die Verbindung ist noch nicht bereit.', 'warning')
}

async function copyRoomId() {
  if (!import.meta.client || !roomId.value)
    return

  try {
    await navigator.clipboard.writeText(roomId.value)
    notify('Room ID kopiert!', 'success')
  }
  catch {
    notify('Kopieren war nicht möglich – teile die Room ID manuell.', 'warning')
  }
}

onMounted(() => {
  const queryRoom = route.query.room
  if (typeof queryRoom !== 'string')
    return

  const normalized = normalizeRoomId(queryRoom)
  if (!normalized) {
    notify('Die Room ID in der URL ist ungültig.', 'warning')
    void router.replace({ query: {} })
    return
  }

  roomInput.value = normalized
  join(normalized)
})

useHead({
  title: 'Assoziationsspiel – spiele.keksi.dev',
  meta: [
    {
      name: 'description',
      content: 'Das große Assoziationsspiel für zwei Personen im Browser.',
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
        pointer-events-none absolute top-0 left-1/2 size-128 -translate-x-1/2
        rounded-full bg-violet-600/15 blur-3xl
      " aria-hidden="true"
    />

    <header
      class="
        relative mx-auto flex max-w-5xl items-center justify-between gap-4 p-5
        sm:px-8
      "
    >
      <div class="flex min-w-0 items-center gap-3">
        <NuxtLink
          to="/" class="
            grid size-9 shrink-0 place-items-center rounded-xl bg-white/8
            text-sm font-black text-slate-200 transition
            hover:bg-white/15
          "
        >
          ←
        </NuxtLink>
        <div
          v-if="joined" class="
            flex min-w-0 items-center gap-2 rounded-xl border border-white/10
            bg-white/5 px-3 py-2 font-mono text-sm text-slate-300
          "
        >
          <span class="truncate">{{ roomId }}</span>
          <button
            type="button" class="
              rounded-lg p-1 text-slate-400 transition
              hover:bg-white/10 hover:text-white
            " aria-label="Room ID kopieren" @click="copyRoomId"
          >
            <svg
              aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="
                size-4 fill-none stroke-current stroke-2
              "
            ><rect width="13" height="13" x="9" y="9" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
          </button>
        </div>
      </div>
      <DonateButton />
    </header>

    <div
      class="
        relative mx-auto max-w-5xl px-5 pt-10 pb-20
        sm:px-8 sm:pt-16
      "
    >
      <div class="mx-auto max-w-3xl">
        <div class="mb-10 text-center">
          <p
            class="
              text-sm font-semibold tracking-[0.22em] text-sky-200/80 uppercase
            "
          >
            Das große
          </p>
          <h1
            class="
              mt-3 text-5xl font-black tracking-tight
              sm:text-7xl
            "
          >
            <span
              class="
                bg-linear-to-r from-sky-200 via-violet-300 to-pink-300
                bg-clip-text text-transparent
              "
            >Assoziations</span>
            <span
              class="
                mt-1 block text-3xl font-light text-slate-300
                sm:text-4xl
              "
            >Spiel</span>
          </h1>
        </div>

        <section
          v-if="!joined" class="
            mx-auto max-w-xl rounded-4xl border border-white/10 bg-white/5.5 p-1
            shadow-2xl shadow-black/25 backdrop-blur-xl
          "
        >
          <form
            class="
              rounded-[1.8rem] border border-white/5 bg-slate-950/60 p-6
              sm:p-8
            " @submit.prevent="joinRoom()"
          >
            <div class="mb-7">
              <p
                class="
                  text-sm font-semibold tracking-[0.16em] text-violet-300
                  uppercase
                "
              >
                Neues Spiel
              </p>
              <h2 class="mt-2 text-2xl font-bold text-white">
                Raum betreten
              </h2>
              <p class="mt-2 text-sm/6 text-slate-400">
                Teile die Room ID mit deinem Mitspieler. Eine Person kann einen neuen Raum erstellen.
              </p>
            </div>
            <label
              for="room-id" class="
                mb-2 block text-sm font-medium text-slate-300
              "
            >Room ID</label>
            <input
              id="room-id"
              v-model="roomInput"
              :maxlength="MAX_ROOM_ID_LENGTH"
              autocomplete="off"
              inputmode="text"
              spellcheck="false"
              placeholder="z. B. AB12CD"
              class="
                w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4
                text-center font-mono text-xl font-bold tracking-[0.24em]
                text-white transition outline-none
                placeholder:font-sans placeholder:text-base
                placeholder:font-normal placeholder:tracking-normal
                focus:border-violet-300/60 focus:bg-white/8 focus:ring-4
                focus:ring-violet-400/10
              "
              @input="normalizeRoomInput"
            >
            <div
              class="
                mt-5 grid gap-3
                sm:grid-cols-2
              "
            >
              <button
                type="submit" :disabled="!roomInput" class="
                  rounded-2xl bg-white px-5 py-4 text-sm font-bold
                  text-slate-950 transition
                  hover:bg-violet-200
                  disabled:cursor-not-allowed disabled:opacity-40
                "
              >
                Beitreten
              </button>
              <button
                type="button" class="
                  rounded-2xl border border-white/10 bg-white/5 px-5 py-4
                  text-sm font-bold text-white transition
                  hover:border-sky-300/30 hover:bg-white/10
                " @click="createRoom"
              >
                Raum erstellen
              </button>
            </div>
          </form>
        </section>

        <section v-else class="space-y-5">
          <div
            class="
              flex flex-wrap items-center justify-between gap-3 rounded-2xl
              border border-white/10 bg-white/4.5 px-4 py-3 text-sm
            "
          >
            <div class="flex items-center gap-2 text-slate-300">
              <span
                class="size-2 rounded-full" :class="connected ? `
                  bg-emerald-300 shadow-[0_0_12px] shadow-emerald-300
                ` : connecting ? `animate-pulse bg-amber-300` : `bg-rose-300`"
              />
              {{ connectionLabel }}
            </div>
            <button
              type="button" class="
                text-slate-400 underline-offset-4 transition
                hover:text-white hover:underline
              " @click="leaveRoom"
            >
              Raum verlassen
            </button>
          </div>

          <div
            class="
              rounded-4xl border border-white/10 bg-white/5.5 p-1 shadow-2xl
              shadow-black/25 backdrop-blur-xl
            "
          >
            <div
              class="
                rounded-[1.8rem] border border-white/5 bg-slate-950/60 p-5
                sm:p-8
              "
            >
              <div class="flex flex-wrap items-center justify-between gap-4">
                <p
                  class="
                    text-sm font-semibold tracking-[0.16em] text-slate-500
                    uppercase
                  "
                >
                  Aktuelle Kategorie
                </p>
                <div class="flex items-center gap-1.5" aria-label="Streak Fortschritt">
                  <span
                    v-for="step in 5" :key="step" class="
                      size-2 rounded-full transition
                    " :class="step <= streak ? `
                      bg-violet-300 shadow-[0_0_10px] shadow-violet-300
                    ` : `bg-white/15`"
                  />
                  <span class="ml-2 font-mono text-sm text-slate-400">{{ streak }}/5</span>
                </div>
              </div>

              <div
                class="
                  mt-5 flex min-h-28 items-center justify-center rounded-3xl
                  border border-violet-300/20 bg-linear-to-br from-violet-400/15
                  via-sky-400/5 to-transparent px-5 text-center text-3xl
                  font-black tracking-tight text-white shadow-inner
                  shadow-white/5
                  sm:text-4xl
                "
              >
                <span v-if="currentCategory">{{ currentCategory }}</span>
                <span v-else class="text-base font-medium text-slate-500">Kategorie wird geladen …</span>
              </div>

              <div
                class="
                  mt-6 grid gap-4
                  sm:grid-cols-2
                "
              >
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-400">Deine Assoziation</span>
                  <input
                    :value="myInput"
                    :disabled="inputLocked || !connected"
                    maxlength="120"
                    autocomplete="off"
                    placeholder="Was fällt dir ein?"
                    class="
                      w-full rounded-2xl border border-white/10 bg-white/5 p-4
                      text-lg font-semibold text-white transition outline-none
                      placeholder:text-slate-600
                      focus:border-sky-300/60 focus:bg-white/8 focus:ring-4
                      focus:ring-sky-400/10
                      disabled:cursor-not-allowed disabled:opacity-50
                    "
                    @input="handleInput"
                  >
                </label>
                <label v-if="revealed" class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-400">Assoziation des Mitspielers</span>
                  <input
                    :value="partnerInput" readonly class="
                      w-full rounded-2xl border border-emerald-300/20
                      bg-emerald-300/8 p-4 text-lg font-semibold
                      text-emerald-100 outline-none
                    "
                  >
                </label>
                <div
                  v-else class="
                    hidden rounded-2xl border border-dashed border-white/10
                    bg-white/2 p-4 text-sm/6 text-slate-500
                    sm:block
                  "
                >
                  Beide antworten geheim. Klicke auf <span
                    class="font-semibold text-slate-300"
                  >Reveal</span>, sobald du bereit bist.
                </div>
              </div>

              <div
                class="
                  mt-7 grid grid-cols-2 gap-3
                  sm:grid-cols-4
                "
              >
                <button
                  type="button" :disabled="!canReveal" class="
                    rounded-2xl bg-white p-4 text-sm font-black tracking-wide
                    text-slate-950 transition
                    hover:bg-sky-200
                    disabled:cursor-not-allowed disabled:opacity-35
                  " @click="handleReveal"
                >
                  Reveal
                </button>
                <button
                  type="button" :disabled="!canResolve" class="
                    rounded-2xl bg-emerald-300 p-4 text-sm font-black
                    tracking-wide text-emerald-950 transition
                    hover:bg-emerald-200
                    disabled:cursor-not-allowed disabled:opacity-35
                  " @click="handleCorrect"
                >
                  Richtig
                </button>
                <button
                  type="button" :disabled="!canResolve" class="
                    rounded-2xl bg-rose-300 p-4 text-sm font-black tracking-wide
                    text-rose-950 transition
                    hover:bg-rose-200
                    disabled:cursor-not-allowed disabled:opacity-35
                  " @click="handleWrong"
                >
                  Falsch
                </button>
                <button
                  type="button" :disabled="!canResolve" class="
                    rounded-2xl border border-white/15 bg-white/5 p-4 text-sm
                    font-black tracking-wide text-white transition
                    hover:bg-white/10
                    disabled:cursor-not-allowed disabled:opacity-35
                  " @click="nextCategory"
                >
                  Weiter
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <ToastStack :toasts="toasts" />
  </main>
</template>
