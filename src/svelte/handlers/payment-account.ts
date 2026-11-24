import type { PaymentAccount } from '../../types/finkas';
import { postToBackend } from 'finkas/core/api';
import { normalizePaymentAccount, validatePaymentAccount } from 'finkas/core/payment-account';
import { getActiveGroupId, getIsAdminSession, getState, saveCache, setState } from 'finkas/core/state';
import { showToast } from 'finkas/core/utils';
import { withLiquidSave } from '../ui/keel';

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
    await withLiquidSave(
      button,
      async () => {
        const result = await postToBackend<{ paymentAccount: PaymentAccount }>({ action: 'setPaymentAccount', groupId, paymentAccount });
        if (getActiveGroupId() !== groupId) return { outcome: 'neutral' as const };
        if (!result?.status || !result.data) {
          return {
            outcome: 'error' as const,
            done: () => showToast(result?.message || 'Rekening belum tersimpan. Coba lagi saat online.', 'error')
          };
        }
        const saved = result.data.paymentAccount;
        return {
          outcome: 'success' as const,
          onSettled: () => {
            setState({ paymentAccount: saved });
            saveCache();
          },
          done: () => showToast(result.message || 'Rekening tersimpan.', 'success')
        };
      },
      { settleMs: 340 }
    );
  });
};
