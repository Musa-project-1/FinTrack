export const normalizePaymentAccount = (value: unknown) => {
  const v = (value as Record<string, unknown> | null | undefined);
  return {
    bank: String(v?.bank ?? '').trim().slice(0, 60),
    number: String(v?.number ?? '').replace(/[^\d]/g, '').slice(0, 34),
    holder: String(v?.holder ?? '').trim().slice(0, 80),
    whatsapp: String(v?.whatsapp ?? '').replace(/[^\d]/g, '').replace(/^0/, '62').slice(0, 15)
  };
};

export const validatePaymentAccount = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Pengaturan rekening tidak valid.';
  const v = (value as Record<string, unknown>);
  const number = String(v.number ?? '').trim();
  const whatsapp = String(v.whatsapp ?? '').trim();
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
