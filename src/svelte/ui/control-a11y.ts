/** Keep native form controls as the source of labels, constraints and values. */
let labelId = 0;

export const enhanceControl = (native: HTMLInputElement | HTMLSelectElement, trigger: HTMLButtonElement, wrap: HTMLElement, sync: () => void, close: () => void) => {
  const wiredLabels = new WeakSet<HTMLLabelElement>();
  const error = document.createElement('span');
  error.id = `${native.id}-validation-message`;
  error.className = 'control-error';
  error.hidden = true;
  error.setAttribute('aria-live', 'polite');
  wrap.appendChild(error);
  native.tabIndex = -1;
  native.addEventListener('focus', () => trigger.focus());

  const clearError = () => {
    wrap.classList.remove('is-invalid');
    trigger.removeAttribute('aria-invalid');
    error.hidden = true;
    error.textContent = '';
  };
  const update = () => {
    const labels = Array.from(native.labels || []);
    labels.forEach(label => {
      if (!label.id) {
        do { label.id = `control-label-${++labelId}`; }
        while (document.getElementById(label.id) !== label);
      }
      if (!wiredLabels.has(label)) {
        label.addEventListener('click', event => {
          // Preserve links and controls inside an implicit wrapping label.
          if (event.target instanceof Element && event.target.closest('button, input, select, textarea, a')) return;
          event.preventDefault();
          trigger.focus();
        });
        wiredLabels.add(label);
      }
    });
    trigger.removeAttribute('aria-label');
    trigger.removeAttribute('aria-labelledby');
    const labelledby = native.getAttribute('aria-labelledby');
    const label = native.getAttribute('aria-label');
    if (labelledby) trigger.setAttribute('aria-labelledby', labelledby);
    else if (label) trigger.setAttribute('aria-label', label);
    else if (labels.length) trigger.setAttribute('aria-labelledby', labels.map(label => label.id).join(' '));
    const description = [native.getAttribute('aria-describedby'), error.id].filter(Boolean).join(' ');
    trigger.setAttribute('aria-describedby', description);
    trigger.disabled = native.matches(':disabled');
    trigger.setAttribute('aria-disabled', String(trigger.disabled));
    // Buttons do not support aria-required; expose the constraint in the description.
    if (native.required && !native.getAttribute('aria-describedby')) {
      trigger.setAttribute('aria-description', 'Wajib diisi');
    } else trigger.removeAttribute('aria-description');
    if (trigger.disabled) close();
    if (!native.willValidate || native.validity.valid) clearError();
    sync();
  };
  native.addEventListener('invalid', event => {
    event.preventDefault(); // Native validation still blocks submission and emits invalid.
    wrap.classList.add('is-invalid');
    trigger.setAttribute('aria-invalid', 'true');
    error.textContent = native.validationMessage;
    error.hidden = false;
    const first = native.form?.querySelector('input:invalid, select:invalid, textarea:invalid');
    if (!first || first === native) trigger.focus();
  });
  native.addEventListener('change', () => { clearError(); update(); });
  native.form?.addEventListener('reset', () => {
    // The reset event fires before native values are restored.
    setTimeout(() => { clearError(); update(); close(); }, 0);
  });
  const observer = new MutationObserver(update);
  observer.observe(native, {
    attributes: true, childList: true, subtree: true, characterData: true,
    attributeFilter: ['disabled', 'required', 'selected', 'label', 'value', 'aria-label', 'aria-labelledby', 'aria-describedby'],
  });
  update();
  return update;
};
