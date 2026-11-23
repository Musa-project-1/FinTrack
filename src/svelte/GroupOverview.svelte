<script lang="ts">
  import { dashboardStore as vm } from './store.svelte';
</script>

<div>
  <span class="group-overview-role non-admin-only"><i class="ph ph-eye" aria-hidden="true"></i> <span data-i18n="role.member">Tampilan Anggota · Transparansi Kas</span></span>
  <span class="group-overview-role admin-only"><i class="ph ph-shield-check" aria-hidden="true"></i> <span data-i18n="role.admin">Mode Pengurus</span></span>
  <h1 id="group-overview-name" tabindex="-1">{vm.groupName}</h1>
  <div class="group-overview-meta">
    <span id="group-overview-fee">Iuran {vm.format(vm.monthlyFee)}/bln</span>
    <span id="group-overview-members">{vm.activeMembersCount} anggota aktif</span>
    <span id="group-overview-start">Awal kas: {vm.kasStartLabel}</span>
  </div>
</div>
<div class="group-overview-actions admin-only">
  <button type="button" class="btn btn-primary" data-action="buka-transaksi"><i class="ph ph-plus" aria-hidden="true"></i> Catat Kas</button>
  <button type="button" class="btn" data-action="print-reminder"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i> Pesan WA</button>
  <button type="button" class="btn" data-action="open-kelola-master"><i class="ph ph-sliders-horizontal" aria-hidden="true"></i> Data Master</button>
</div>
