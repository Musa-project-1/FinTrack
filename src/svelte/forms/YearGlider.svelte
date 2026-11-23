<script lang="ts">
  import { yearGliderStore, type YearSlot } from '../stores/year-glider.svelte';
  let { slot }: { slot: YearSlot } = $props();
  const state = $derived(yearGliderStore[slot]);
</script>

{#if state.years.length}
  <span class="year-glider-indicator" aria-hidden="true"></span>
  {#each state.years as year (year)}
    <button type="button" data-action="select-rekap-year" data-year={year} aria-pressed={year === state.activeYear}>{year}</button>
  {/each}
{/if}

<style>
  :global {
    :root[data-group-transition] .hybrid-topbar { view-transition-name: group-topbar; }
    :root[data-group-transition] .mobile-bottom-nav { view-transition-name: group-bottom-nav; }

    :root[data-group-transition] #app-group-name {
      view-transition-name: group-chip;
      width: fit-content;
      max-width: 100%;
    }

    :root[data-group-transition] body[data-workspace-state="ready"] > main.container,
    :root[data-group-transition] body:is([data-workspace-state="loading"], [data-workspace-state="unavailable"]) > .workspace-startup {
      view-transition-name: group-workspace;
    }

    :root[data-group-transition]::view-transition-group(root),
    :root[data-group-transition]::view-transition-old(root),
    :root[data-group-transition]::view-transition-new(root) {
      animation: none;
    }

    ::view-transition-group(group-topbar),
    ::view-transition-group(group-bottom-nav) {
      z-index: 10;
      animation: none;
    }

    ::view-transition-old(group-topbar),
    ::view-transition-new(group-topbar),
    ::view-transition-old(group-bottom-nav),
    ::view-transition-new(group-bottom-nav) {
      animation: none;
    }

    ::view-transition-group(group-chip) {
      z-index: 12;
      animation-duration: 240ms;
      animation-timing-function: var(--hybrid-ease-out);
    }

    ::view-transition-old(group-chip),
    ::view-transition-new(group-chip) {
      height: 100%;
      width: auto;
      object-fit: contain;
    }

    .workspace-startup-loading {
      padding: 10px 16px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      box-shadow: var(--shadow-sm);
    }

    #group-overview-name:focus:not(:focus-visible) { outline: none; }

    @media (prefers-reduced-motion: no-preference) {
      ::view-transition-group(group-workspace) {
        animation-duration: 280ms;
        animation-timing-function: var(--hybrid-ease-out);
      }

      /* :is() keeps the attribute selector usable in browsers without transition types. */
      :root:is(:active-view-transition-type(group-forward), [data-group-transition="group-forward"])::view-transition-old(group-workspace) {
        animation: group-leave-left 200ms var(--hybrid-ease-out) both;
      }
      :root:is(:active-view-transition-type(group-forward), [data-group-transition="group-forward"])::view-transition-new(group-workspace) {
        animation: group-enter-from-right 280ms var(--hybrid-ease-out) both;
      }
      :root:is(:active-view-transition-type(group-backward), [data-group-transition="group-backward"])::view-transition-old(group-workspace) {
        animation: group-leave-right 200ms var(--hybrid-ease-out) both;
      }
      :root:is(:active-view-transition-type(group-backward), [data-group-transition="group-backward"])::view-transition-new(group-workspace) {
        animation: group-enter-from-left 280ms var(--hybrid-ease-out) both;
      }

      main.container.group-switch-fallback[data-group-dir="group-forward"] {
        animation: group-enter-from-right 240ms var(--hybrid-ease-out) both;
      }
      main.container.group-switch-fallback[data-group-dir="group-backward"] {
        animation: group-enter-from-left 240ms var(--hybrid-ease-out) both;
      }

      @keyframes group-leave-left {
        to { opacity: 0; transform: translateX(-24px) scale(.985); }
      }
      @keyframes group-leave-right {
        to { opacity: 0; transform: translateX(24px) scale(.985); }
      }
      @keyframes group-enter-from-left {
        from { opacity: 0; transform: translateX(-28px) scale(.985); }
      }
      @keyframes group-enter-from-right {
        from { opacity: 0; transform: translateX(28px) scale(.985); }
      }

      #app-group-name.is-group-arrived {
        animation: group-chip-arrive 300ms var(--hybrid-ease-out);
      }
      @keyframes group-chip-arrive {
        from {
          border-color: var(--hybrid-brand);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--hybrid-brand) 15%, transparent);
        }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      ::view-transition-group(*),
      ::view-transition-old(*),
      ::view-transition-new(*) {
        animation: none !important;
      }
    }
  }
</style>
