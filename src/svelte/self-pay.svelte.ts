interface SelfPayMonth {
  periodKey: string;
  shortLabel: string;
  status: string;
  statusUpper: string;
  disabled: boolean;
  pressed: boolean;
  ariaLabel: string;
}

export interface SelfPayInput {
  showYearHeading: boolean;
  years: Array<{ year: number; months: SelfPayMonth[] }>;
}

export const selfPayStore = $state<SelfPayInput>({ showYearHeading: false, years: [] });

export function updateSelfPayStore(input: SelfPayInput) {
  Object.assign(selfPayStore, input);
}

export function resetSelfPayState() {
  updateSelfPayStore({ showYearHeading: false, years: [] });
}
