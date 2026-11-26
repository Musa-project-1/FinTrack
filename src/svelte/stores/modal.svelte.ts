/**
 * @module stores/modal.svelte
 * Reactive Svelte 5 modal stack state for the 24 canonical Finkas dialogs.
 */

class ModalStore {
  stack = $state<string[]>([]);
  payloads = $state<Record<string, unknown>>({});

  activeModalId = $derived(this.stack.at(-1) ?? null);
  hasOpenModal = $derived(this.stack.length > 0);

  isOpen(id: string): boolean {
    return this.stack.includes(id);
  }

  getPayload<T = unknown>(id: string): T | undefined {
    return this.payloads[id] as T | undefined;
  }

  open(id: string, payload?: unknown): void {
    if (!id) return;
    if (payload !== undefined) {
      this.payloads = { ...this.payloads, [id]: payload };
    }
    const without = this.stack.filter((entry) => entry !== id);
    this.stack = [...without, id];
  }

  close(id?: string): void {
    const target = id || this.activeModalId;
    if (!target) return;
    if (!this.stack.includes(target)) return;
    this.stack = this.stack.filter((entry) => entry !== target);
    if (target in this.payloads) {
      const next = { ...this.payloads };
      delete next[target];
      this.payloads = next;
    }
  }

  closeAll(): void {
    this.stack = [];
    this.payloads = {};
  }
}

export const modalStore = new ModalStore();
