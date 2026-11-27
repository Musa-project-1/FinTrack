import { withLiquidSave } from "../ui/keel";

const setText = (id: string, text: string) => {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
};

export const groupAdminStage = {
  reset: () => {
    const modal = document.getElementById("modal-group-admin");
    modal?.removeAttribute?.("data-pay-state");
    modal?.removeAttribute?.("data-pay-tone");
  },
  start: (tone: "inflow" | "danger", title: string, highlight: string, sub: string) => {
    const modal = document.getElementById("modal-group-admin");
    modal?.setAttribute?.("data-pay-state", "saving");
    modal?.setAttribute?.("data-pay-tone", tone);
    setText("group-admin-verified-title", title);
    setText("group-admin-verified-amount", highlight);
    setText("group-admin-verified-sub", sub);
  },
  settle: (title: string, sub?: string) => {
    document.getElementById("modal-group-admin")?.setAttribute?.("data-pay-state", "settled");
    setText("group-admin-verified-title", title);
    if (sub !== undefined) setText("group-admin-verified-sub", sub);
  }
};

export interface GroupLiquidOpts {
  buttonId: string;
  tone?: "inflow" | "danger";
  savingTitle: string;
  doneTitle: string;
  highlight: string;
  sub: string;
  doneSub?: string;
  savingText: string;
  doneText: string;
  run: () => Promise<{ ok: boolean; afterSettle?: () => unknown }>;
}

export const runGroupLiquidAction = (opts: GroupLiquidOpts) =>
  withLiquidSave(
    opts.buttonId,
    async () => {
      const result = await opts.run();
      if (!result.ok) {
        return { outcome: "error" as const, done: () => result.afterSettle?.() };
      }
      return {
        outcome: "success" as const,
        onSettled: () => groupAdminStage.settle(opts.doneTitle, opts.doneSub),
        done: () => result.afterSettle?.()
      };
    },
    {
      savingText: opts.savingText,
      doneText: opts.doneText,
      minSavingMs: 360,
      settleMs: 560,
      onSaving: () => groupAdminStage.start(opts.tone ?? "inflow", opts.savingTitle, opts.highlight, opts.sub),
      onCleanup: () => groupAdminStage.reset()
    }
  );
