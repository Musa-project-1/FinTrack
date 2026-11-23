export const stampPreviewStore = $state({ seq: 0, styleKey: 'seal', animate: false });

export function updateStampPreviewStore(input: { styleKey: string; animate: boolean }) {
  stampPreviewStore.styleKey = input.styleKey;
  stampPreviewStore.animate = input.animate;
  if (input.animate) stampPreviewStore.seq++;
}

export function resetStampPreviewState() {
  updateStampPreviewStore({ styleKey: 'seal', animate: false });
  stampPreviewStore.seq++;
}
