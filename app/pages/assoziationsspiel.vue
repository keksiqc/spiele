<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { localizeCategory } from '#shared/categories'
import { MAX_ROOM_ID_LENGTH, normalizeRoomId } from '#shared/game'
import { useGameRoom } from '~/composables/useGameRoom'

const route = useRoute()
const router = useRouter()
const roomInput = ref('')
const { locale } = useI18nLocale()
const { $ts, $has: has } = useI18n()

const {
  connected,
  connecting,
  currentCategory,
  joined,
  leave,
  myInput,
  partnerInput,
  partnerRevealed,
  revealSent,
  revealed,
  roomId,
  send,
  streak,
  updateInput,
  join,
} = useGameRoom({
  onConnected: () => notify($ts('game.toast.connected'), 'success'),
  onDisconnected: () => notify($ts('game.toast.disconnected'), 'error'),
  onError: key => notify(has(key)
    ? $ts(key)
    : key, 'error'),
  onMessage: (message) => {
    if (message.type === 'streak')
      notify($ts('game.toast.correct'), 'success')
    if (message.type === 'resetStreak')
      notify($ts('game.toast.wrong'), 'error')
    if (message.type === 'allRevealed')
      notify($ts('game.toast.revealed'), 'info')
  },
})

const inputLocked = computed(() => revealSent.value || revealed.value)
const canReveal = computed(() => connected.value && !inputLocked.value)
const canResolve = computed(() => connected.value && revealed.value)
const revealStatus = computed(() => {
  if (revealed.value)
    return $ts('game.status.revealed')
  if (revealSent.value)
    return $ts('game.status.sent')
  if (partnerRevealed.value)
    return $ts('game.status.partnerReady')
  return $ts('game.status.secret')
})
const connectionLabel = computed(() => {
  if (connected.value)
    return $ts('game.connection.connected')
  if (connecting.value)
    return $ts('game.connection.connecting')
  return $ts('game.connection.offline')
})
const categoryLabel = computed(() => localizeCategory(currentCategory.value, locale.value ?? 'de'))
const { copy: copyToClipboard, isSupported: clipboardSupported } = useClipboard()

type ToastTone = 'success' | 'error' | 'warning' | 'info'

function notify(message: string, tone: ToastTone = 'info') {
  toast[tone](message)
}

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
    notify($ts('game.toast.invalidCode'), 'warning')
    return
  }

  roomInput.value = normalized
  if (join(normalized)) {
    void router.replace({
      query: { room: normalized },
    })
  }
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
  notify($ts('game.toast.correct'), 'success')
  nextCategory()
}

function handleWrong() {
  if (!canResolve.value)
    return
  if (!send({ type: 'resetStreak' }))
    return

  streak.value = 0
  notify($ts('game.toast.wrong'), 'error')
  nextCategory()
}

function nextCategory() {
  if (!send({ type: 'newCategory' }))
    notify($ts('game.toast.notReady'), 'warning')
}

async function copyRoomId() {
  if (!roomId.value)
    return

  if (!clipboardSupported.value) {
    notify($ts('game.toast.copyFailed'), 'warning')
    return
  }

  try {
    await copyToClipboard(roomId.value)
    notify($ts('game.toast.copied'), 'success')
  }
  catch {
    notify($ts('game.toast.copyFailed'), 'warning')
  }
}

onMounted(() => {
  const queryRoom = route.query.room
  if (typeof queryRoom !== 'string')
    return

  const normalized = normalizeRoomId(queryRoom)
  if (!normalized) {
    notify($ts('game.toast.invalidUrlCode'), 'warning')
    void router.replace({ query: {} })
    return
  }

  roomInput.value = normalized
  join(normalized)
})

useHead({
  title: () => $ts('game.title'),
  meta: [
    {
      name: 'description',
      content: () => $ts('game.description'),
    },
  ],
})
</script>

<template>
  <main class="flex min-h-screen flex-col">
    <AppHeader>
      <div
        v-if="joined"
        class="
          inline-flex items-center gap-1 rounded-lg border border-line pl-3
          text-sm
        "
      >
        <span
          class="
            hidden text-muted
            sm:inline
          "
        >{{ $ts('game.room') }}</span>
        <span class="font-semibold tracking-[0.12em]">{{ roomId }}</span>
        <button
          type="button"
          :aria-label="$ts('game.copyCode')"
          class="
            grid size-8 place-items-center rounded-md text-muted
            transition-colors
            hover:bg-line hover:text-cloud
          "
          @click="copyRoomId"
        >
          <Icon name="lucide:copy" class="size-4" />
        </button>
      </div>
    </AppHeader>

    <div
      class="
        mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-24
        sm:px-6
      "
    >
      <section
        v-if="!joined"
        class="
          mx-auto w-full max-w-md pt-16
          sm:pt-24
        "
      >
        <h1
          class="
            text-4xl font-bold tracking-tight text-balance
            sm:text-5xl
          "
        >
          {{ $ts('game.lobby.headline') }}
        </h1>
        <p class="mt-5 text-lg/8 text-muted">
          {{ $ts('game.lobby.intro') }}
        </p>

        <form class="mt-10" @submit.prevent="joinRoom()">
          <label for="room-id" class="block text-sm text-muted">
            {{ $ts('game.lobby.codeLabel') }}
          </label>
          <input
            id="room-id"
            v-model="roomInput"
            :maxlength="MAX_ROOM_ID_LENGTH"
            autocomplete="off"
            inputmode="text"
            spellcheck="false"
            :placeholder="$ts('game.lobby.codePlaceholder')"
            class="mt-2 field field-code"
            @input="normalizeRoomInput"
          >
          <div
            class="
              mt-3 grid gap-3
              sm:grid-cols-2
            "
          >
            <button
              type="submit" :disabled="!roomInput" class="btn btn-primary"
            >
              {{ $ts('game.lobby.join') }}
            </button>
            <button type="button" class="btn btn-secondary" @click="createRoom">
              {{ $ts('game.lobby.create') }}
            </button>
          </div>
        </form>

        <p class="mt-8 text-sm/6 text-faint">
          {{ $ts('game.lobby.privacy') }}
        </p>
      </section>

      <section
        v-else class="
          flex flex-1 flex-col pt-2
          sm:pt-6
        "
      >
        <div
          class="flex items-center justify-between gap-3 text-sm text-muted"
        >
          <span class="inline-flex items-center gap-2">
            <span
              class="status-dot"
              :class="{
                'status-online': connected,
                'status-connecting': !connected && connecting,
                'status-offline': !connected && !connecting,
              }"
            />
            {{ connectionLabel }}
          </span>
          <button type="button" class="btn btn-ghost" @click="leaveRoom">
            {{ $ts('game.leave') }}
          </button>
        </div>

        <div
          class="
            flex flex-1 flex-col justify-center py-10 text-center
            sm:py-14
          "
        >
          <p class="text-sm text-muted">
            {{ $ts('game.prompt') }}
          </p>
          <h1
            class="category-word mt-3"
            :class="{ 'category-word-long': categoryLabel.length > 13 }"
          >
            <span v-if="currentCategory">{{ categoryLabel }}</span>
            <span v-else class="category-placeholder">{{ $ts('game.loadingCategory') }}</span>
          </h1>
          <div
            class="mt-7 inline-flex items-center justify-center gap-1.5"
            role="img"
            :aria-label="$ts('game.streak', { count: streak })"
          >
            <span
              v-for="step in 5"
              :key="step"
              class="streak-tick"
              :class="{ 'streak-tick-on': step <= streak }"
            />
          </div>
        </div>

        <div class="mx-auto w-full max-w-md">
          <div
            class="
              grid gap-6
              sm:grid-cols-2 sm:gap-4
            "
          >
            <div class="grid gap-2 text-center">
              <label for="my-association" class="text-sm text-muted">{{ $ts('game.you') }}</label>
              <input
                id="my-association"
                :value="myInput"
                :disabled="inputLocked || !connected"
                maxlength="120"
                autocomplete="off"
                :placeholder="$ts('game.answerPlaceholder')"
                class="field field-answer"
                @input="handleInput"
              >
            </div>

            <div class="grid gap-2 text-center">
              <p class="text-sm text-muted">
                {{ $ts('game.partner') }}
              </p>
              <Transition name="reveal" mode="out-in">
                <div
                  v-if="revealed"
                  class="answer-box"
                  :class="{ 'answer-empty': !partnerInput }"
                >
                  {{ partnerInput || $ts('game.noAnswer') }}
                </div>
                <div v-else class="answer-hidden">
                  {{ partnerRevealed ? $ts('game.partnerReady') : $ts('game.partnerWriting') }}
                </div>
              </Transition>
            </div>
          </div>

          <div class="mt-8 flex flex-col items-center gap-3">
            <template v-if="!revealed">
              <button
                type="button"
                :disabled="!canReveal"
                class="
                  btn w-full btn-primary
                  sm:w-auto sm:min-w-56
                "
                @click="handleReveal"
              >
                <Icon name="lucide:eye" aria-hidden="true" class="size-4" />
                {{ revealSent ? $ts('game.waitingForPartner') : $ts('game.reveal') }}
              </button>
            </template>
            <template v-else>
              <div
                class="
                  grid w-full grid-cols-2 gap-3
                  sm:w-auto
                "
              >
                <button
                  type="button" :disabled="!canResolve" class="
                    btn btn-yes
                    sm:min-w-40
                  " @click="handleCorrect"
                >
                  <Icon name="lucide:check" aria-hidden="true" class="size-4" />
                  {{ $ts('game.correct') }}
                </button>
                <button
                  type="button" :disabled="!canResolve" class="
                    btn btn-no
                    sm:min-w-40
                  " @click="handleWrong"
                >
                  <Icon name="lucide:x" aria-hidden="true" class="size-4" />
                  {{ $ts('game.wrong') }}
                </button>
              </div>
              <button
                type="button" :disabled="!canResolve" class="btn btn-ghost" @click="nextCategory"
              >
                {{ $ts('game.skip') }}
              </button>
            </template>
            <p class="max-w-sm text-center text-sm/6 text-faint">
              {{ revealStatus }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
