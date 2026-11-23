export interface OnboardingGroupItem {
  id: string;
  name: string;
  initials: string;
}

export type OnboardingGroupStatus = 'loading' | 'empty' | 'not-found' | 'error' | 'ready';

export interface OnboardingGroupInput {
  status: OnboardingGroupStatus;
  items?: OnboardingGroupItem[];
  onPick?: ((id: string) => void) | null;
}

export const onboardingGroupsStore = $state<Required<OnboardingGroupInput>>({
  status: 'loading',
  items: [],
  onPick: null
});

export function updateOnboardingGroupsStore({ status, items = [], onPick }: OnboardingGroupInput) {
  onboardingGroupsStore.status = status;
  onboardingGroupsStore.items = items;
  onboardingGroupsStore.onPick = onPick ?? null;
}
