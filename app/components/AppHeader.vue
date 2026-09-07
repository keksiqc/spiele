<template>
  <header
    class="
      mx-auto flex w-full max-w-3xl items-center justify-between gap-3 p-5
      sm:px-6
    "
  >
    <NuxtLink
      to="/"
      class="
        inline-flex items-center gap-2 text-sm font-semibold text-cloud
        transition-colors
        hover:text-lilac
      "
    >
      <span
        class="
          grid size-7 place-items-center rounded-lg bg-violet text-xs font-bold
          text-white
        "
        aria-hidden="true"
      >S</span>
      <span
        class="
          hidden
          sm:inline
        "
      >spiele.keksi.dev</span>
    </NuxtLink>

    <div class="flex items-center gap-2">
      <slot />
      <DonateButton />
    </div>
  </header>
</template>
