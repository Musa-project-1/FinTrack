export const normalizePaymentAccount = (value) => ({
  bank: String(value?.bank ?? '').trim().slice(0, 60),
  number: String(value?.number ?? '').replace(/[^\d]/g, '').slice(0, 34),
  holder: String(value?.holder ?? '').trim().slice(0, 80),
  whatsapp: String(value?.whatsapp ?? '').replace(/[^\d]/g, '').replace(/^0/, '62').slice(0, 15)
});


export const validatePaymentAccount = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Pengaturan rekening tidak valid.';
  const number = String(value.number ?? '').trim();
  const whatsapp = String(value.whatsapp ?? '').trim();
  if (number && (!/^[\d -]+$/.test(number) || number.replace(/\D/g, '').length > 34)) {
    return 'Nomor rekening harus berupa angka yang valid.';
  }
  const account = normalizePaymentAccount(value);
  if (Boolean(account.bank) !== Boolean(account.number) || (number && !account.number)) {
    return 'Nama bank dan nomor rekening harus diisi bersama.';
  }
  if (whatsapp && (!/^[+\d ().-]+$/.test(whatsapp) || !account.whatsapp ||
      account.whatsapp.length < 8 || whatsapp.replace(/\D/g, '').replace(/^0/, '62').length > 15)) {
    return 'Nomor WhatsApp bendahara tidak valid.';
  }
  return '';
};
