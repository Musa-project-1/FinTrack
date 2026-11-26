<script lang="ts">
  import WorkspaceShell from './shell/WorkspaceShell.svelte';
  import AuthModals from './shell/modals/AuthModals.svelte';
  import GroupsModal from './shell/modals/GroupsModal.svelte';
  import GroupPinModal from './shell/modals/GroupPinModal.svelte';
  import GroupAdminModals from './shell/modals/GroupAdminModals.svelte';
  import NavigationModals from './shell/modals/NavigationModals.svelte';
  import QuickPayModal from './shell/modals/QuickPayModal.svelte';
  import MasterModals from './shell/modals/MasterModals.svelte';
  import ReportsModals from './shell/modals/ReportsModals.svelte';
  import TransactionsModals from './shell/modals/TransactionsModals.svelte';
  import FaqModals from './shell/modals/FaqModals.svelte';
  import TampilanModal from './shell/modals/TampilanModal.svelte';
  import SelfPayModal from './shell/modals/SelfPayModal.svelte';
  import StrukModal from './shell/modals/StrukModal.svelte';
</script>

<WorkspaceShell>
  {#snippet modals()}
    <AuthModals />
    <GroupsModal />
    <GroupPinModal />
    <GroupAdminModals />
    <NavigationModals />
    <QuickPayModal />
    <MasterModals />
    <ReportsModals />
    <TransactionsModals />
    <FaqModals />
    <TampilanModal />
    <SelfPayModal />
    <StrukModal />
  {/snippet}
</WorkspaceShell>
