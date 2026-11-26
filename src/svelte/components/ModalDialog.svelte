<script lang="ts">
  import type { Snippet } from 'svelte';
  import { promoteToastLayer } from '../core/utils';
  import { modalStore } from '../stores/modal.svelte';

  interface Props {
    id: string;
    open?: boolean;
    class?: string;
    ariaLabelledby?: string;
    ariaLabel?: string;
    closeOnBackdrop?: boolean;
    onclose?: () => void;
    children?: Snippet;
  }

  let {
    id,
    open = undefined,
    class: className = 'modal-dialog',
    ariaLabelledby = undefined,
    ariaLabel = undefined,
    closeOnBackdrop = true,
    onclose = undefined,
    children,
  }: Props = $props();

  let dialogEl = $state<HTMLDialogElement | null>(null);
  let pressedOverlay = false;

  const isOpen = $derived(open !== undefined ? open : modalStore.isOpen(id));

  function requestClose() {
    if (open === undefined) {
      modalStore.close(id);
    }
    onclose?.();
  }

  $effect(() => {
    const el = dialogEl;
    if (!el) return;

    if (isOpen) {
      if (!el.open) {
        if (typeof el.showModal === 'function') {
          try {
            el.showModal();
          } catch {
            el.setAttribute('open', '');
          }
        } else {
          el.setAttribute('open', '');
        }
      }
      el.classList.add('active');
      document.body?.classList?.add('modal-open');
      promoteToastLayer();
    } else if (el.open || el.hasAttribute('open')) {
      el.classList.remove('active');
      if (typeof el.close === 'function') {
        el.close();
      } else {
        el.removeAttribute('open');
      }
      if (!modalStore.hasOpenModal) {
        document.body?.classList?.remove('modal-open');
      }
    }
  });

  function handleCancel(event: Event) {
    event.preventDefault();
    requestClose();
  }

  function handlePointerDown(event: PointerEvent) {
    pressedOverlay = event.target === dialogEl;
  }

  function handlePointerCancel() {
    pressedOverlay = false;
  }

  function handleClick(event: MouseEvent) {
    const shouldClose = closeOnBackdrop && pressedOverlay && event.target === dialogEl;
    pressedOverlay = false;
    if (shouldClose) {
      requestClose();
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  {id}
  class={className}
  aria-labelledby={ariaLabelledby}
  aria-label={ariaLabel}
  oncancel={handleCancel}
  onpointerdown={handlePointerDown}
  onpointercancel={handlePointerCancel}
  onclick={handleClick}
>
  {#if isOpen}
    {@render children?.()}
  {/if}
</dialog>
