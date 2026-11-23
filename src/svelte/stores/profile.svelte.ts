import { getActiveIndicatorStyle, renderPassbookEmblem } from 'finkas/dues-status';

export { renderPassbookEmblem };

interface PassbookMonth {
  index: number;
  shortName: string;
  numLabel: string;
  kind: 'paid' | 'pending' | 'unpaid' | 'upcoming' | 'holiday';
  statusUpper: string;
  ariaLabel: string;
  action: '' | 'open-month-receipt' | 'quickpay-card' | 'open-self-pay';
  memberId: string;
  monthName: string;
  year: string;
  disabled: boolean;
}

export interface ProfileInput {
  stampStyle: string;
  months: PassbookMonth[];
  deposits: Array<{ id: string; note: string; date: string; formattedAmount: string }>;
}

function emptyProfile(): ProfileInput {
  return { stampStyle: getActiveIndicatorStyle(), months: [], deposits: [] };
}

export const profileStore = $state(emptyProfile());

export function updateProfileStore(input: ProfileInput) {
  Object.assign(profileStore, input);
}

export function setProfileStampStyle(styleKey: string) {
  profileStore.stampStyle = styleKey;
}

export function resetProfileState() {
  updateProfileStore(emptyProfile());
}
