/** One standard password input shared by group entry and onboarding. */
export const syncPinInput = (input: HTMLInputElement | null) => {
  if (!input) return;
  input.value = input.value.replace(/\D/g, '').slice(0, 4);
  input.parentElement?.querySelectorAll('[aria-hidden="true"]').forEach((box, index) => {
    box.textContent = index < input.value.length ? '•' : '';
  });
};

export const resetPinInput = (input: HTMLInputElement | null) => {
  if (!input) return;
  input.value = '';
  input.setAttribute('aria-invalid', 'false');
  input.parentElement?.classList.remove('is-error');
  syncPinInput(input);
};

export const wirePinInput = (input: HTMLInputElement | null, submit: () => void) => {
  if (!input || input.dataset.pinBound) return;
  input.dataset.pinBound = '1';
  input.addEventListener('input', () => {
    syncPinInput(input);
    input.setAttribute('aria-invalid', 'false');
    input.parentElement?.classList.remove('is-error');
    const message = document.getElementById(input.getAttribute('aria-describedby') ?? '');
    message?.replaceChildren();
    if (input.value.length === 4) submit();
  });
  input.addEventListener('keydown', (event) => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter') { event.preventDefault(); submit(); }
  });
};
