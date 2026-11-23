import type { PaymentAccount } from '../../types/finkas';
import { postToBackend } from '../../core/api.js';
import { normalizePaymentAccount, validatePaymentAccount } from '../../core/payment-account.js';
import { getActiveGroupId, getIsAdminSession, getState, saveCache, setState } from '../../core/state.js';
import { showToast } from '../../core/utils.js';

export const initPaymentAccount = () => {
  const form = (document.getElementById('form-payment-account') as HTMLFormElement | null);
  if (!form) return;

  document.addEventListener('finkas:modal-opened', ({ detail }) => {
    if (detail.id !== 'modal-kelola-master') return;
    const account = normalizePaymentAccount(getState().paymentAccount);
    for (const [field, value] of Object.entries(account)) {
      const input = form.elements.namedItem(field);
      if (input && 'value' in input) input.value = value;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const groupId = getActiveGroupId();
    if (!groupId || !getIsAdminSession()) return;
    const fields = Object.fromEntries(new FormData(form));
    const validationError = validatePaymentAccount(fields);
    if (validationError) {
      showToast(validationError, 'warning');
      return;
    }
    const paymentAccount = normalizePaymentAccount(fields);
    const button = (event.submitter || form.querySelector('button[type="submit"]')) as HTMLButtonElement | null;
    if (button) button.disabled = true;
    try {
      const result = await postToBackend<{ paymentAccount: PaymentAccount }>({ action: 'setPaymentAccount', groupId, paymentAccount });
      if (getActiveGroupId() !== groupId) return;
      if (!result?.status || !result.data) return showToast(result?.message || 'Rekening belum tersimpan. Coba lagi saat online.', 'error');
      setState({ paymentAccount: result.data.paymentAccount });
      saveCache();
      showToast(result.message || 'Rekening tersimpan.', 'success');
    } finally {
      if (button) button.disabled = false;
    }
  });
};
