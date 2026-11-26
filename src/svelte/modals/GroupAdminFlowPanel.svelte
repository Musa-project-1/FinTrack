<script lang="ts">
  import { showToast } from 'finkas/core/utils';
  import {
    groupAdminFlow as flow,
    resetGroupAdminFlow,
    setGroupCreateStep
  } from '../stores/group-admin.svelte';
  import {
    submitRenameGroup,
    submitResetGroupPin,
    submitRemoveGroup
  } from '../handlers/groups';

  let createNama = $state('');
  let createPin = $state('');
  let showCreatePin = $state(false);
  let createAutoAdmin = $state(true);

  let renameValue = $state('');
  let pinValue = $state('');
  let showEditPin = $state(false);
  let removeConfirmText = $state('');

  const createInitial = $derived((createNama.trim()[0] || 'G').toUpperCase());
  const createSlug = $derived(
    createNama.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'baru'
  );
  const pinDigitsOnly = $derived(createPin.replace(/\D/g, '').slice(0, 4));
  const step1Valid = $derived(createNama.trim().length >= 3 && pinDigitsOnly.length === 4);
  const removeMatches = $derived(
    removeConfirmText.trim().toLowerCase() === flow.targetName.trim().toLowerCase() &&
    flow.targetName.trim().length > 0
  );

  $effect(() => {
    if (flow.mode === 'create') {
      const namaEl = document.getElementById('input-group-nama') as HTMLInputElement | null;
      const pinEl = document.getElementById('input-group-pin') as HTMLInputElement | null;
      const chkEl = document.getElementById('chk-group-admin-auto') as HTMLInputElement | null;
      createNama = namaEl?.value || '';
      createPin = pinEl?.value || '';
      createAutoAdmin = chkEl ? chkEl.checked : true;
      showCreatePin = false;
      setTimeout(() => { namaEl?.focus?.(); }, 40);
    } else if (flow.mode === 'rename') {
      renameValue = flow.targetName;
      setTimeout(() => {
        const el = document.getElementById('input-edit-group-nama') as HTMLInputElement | null;
        el?.focus?.();
        el?.select?.();
      }, 40);
    } else if (flow.mode === 'pin') {
      pinValue = '';
      showEditPin = false;
      setTimeout(() => {
        (document.getElementById('input-edit-group-pin') as HTMLInputElement | null)?.focus?.();
      }, 40);
    } else if (flow.mode === 'remove') {
      removeConfirmText = '';
      setTimeout(() => {
        (document.getElementById('input-remove-group-confirm') as HTMLInputElement | null)?.focus?.();
      }, 40);
    }
  });

  const generatePin4 = () => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return String(arr[0] % 10000).padStart(4, '0');
  };

  const syncDomCreatePin = (nextPin: string) => {
    createPin = nextPin;
    const pinEl = document.getElementById('input-group-pin') as HTMLInputElement | null;
    if (pinEl) pinEl.value = nextPin;
  };

  const onCreateNamaInput = (e: Event) => {
    createNama = (e.currentTarget as HTMLInputElement).value;
  };

  const onCreatePinInput = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const cleaned = el.value.replace(/\D/g, '').slice(0, 4);
    if (el.value !== cleaned) el.value = cleaned;
    createPin = cleaned;
  };

  const onAutoAdminChange = (e: Event) => {
    createAutoAdmin = (e.currentTarget as HTMLInputElement).checked;
  };

  const onGoStep2 = () => {
    const namaEl = document.getElementById('input-group-nama') as HTMLInputElement | null;
    const pinEl = document.getElementById('input-group-pin') as HTMLInputElement | null;
    const namaVal = (namaEl?.value || createNama).trim();
    const pinVal = (pinEl?.value || createPin).replace(/\D/g, '').slice(0, 4);
    createNama = namaVal;
    syncDomCreatePin(pinVal);

    if (namaVal.length < 3) {
      showToast('Nama grup minimal 3 karakter.', 'error');
      namaEl?.focus();
      return;
    }
    if (!/^\d{4}$/.test(pinVal)) {
      showToast('PIN wajib tepat 4 digit angka.', 'error');
      pinEl?.focus();
      return;
    }
    setGroupCreateStep(2);
    setTimeout(() => {
      (document.getElementById('input-group-admin-email') as HTMLInputElement | null)?.focus?.();
    }, 40);
  };

  const onEditPinInput = (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    pinValue = el.value.replace(/\D/g, '').slice(0, 4);
  };

  const onRenameSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    await submitRenameGroup(flow.targetId, renameValue);
  };

  const onPinSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    await submitResetGroupPin(flow.targetId, pinValue);
  };

  const onRemoveSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    await submitRemoveGroup(flow.targetId, removeConfirmText);
  };
</script>

<!-- ── Panel 1: Alur Buat Ruang Kas Baru (2 Langkah) ── -->
<div class="group-flow-panel" hidden={flow.mode !== 'create'}>
  <div class="group-flow-nav">
    <button type="button" class="group-flow-back" onclick={resetGroupAdminFlow}>
      <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
      <span>Daftar Grup</span>
    </button>
    <div class="group-flow-stepper" aria-label="Langkah pembuatan grup">
      <button type="button" class="flow-step-pill" class:is-active={flow.createStep === 1} class:is-done={flow.createStep === 2} onclick={() => setGroupCreateStep(1)}>
        <span class="flow-step-num">{flow.createStep === 2 ? '✓' : '1'}</span>
        <span>Identitas &amp; PIN</span>
      </button>
      <span class="flow-step-sep" aria-hidden="true"></span>
      <button type="button" class="flow-step-pill" class:is-active={flow.createStep === 2} onclick={onGoStep2}>
        <span class="flow-step-num">2</span>
        <span>Akun Admin</span>
      </button>
    </div>
  </div>

  <form id="form-create-group" class="group-flow-form">
    <!-- Langkah 1: Identitas & PIN -->
    <div class="group-flow-step" hidden={flow.createStep !== 1}>
      <div class="group-preview-card">
        <span class="group-preview-avatar" aria-hidden="true">{createInitial}</span>
        <div class="group-preview-copy">
          <strong>{createNama.trim() || 'Nama Ruang Kas Baru'}</strong>
          <small class="font-mono">admin.{createSlug}@finkas.id · PIN {pinDigitsOnly.length === 4 ? (showCreatePin ? pinDigitsOnly : '••••') : '____'}</small>
        </div>
        <span class="group-preview-badge">BARU</span>
      </div>

      <div class="group-flow-field">
        <div class="group-flow-label-row">
          <label for="input-group-nama">Nama Ruang Kas / Kelas</label>
          <span class="group-flow-counter font-mono">{createNama.length}/60</span>
        </div>
        <div class="input-with-icon">
          <i class="ph ph-users group-input-icon" aria-hidden="true"></i>
          <input
            type="text"
            id="input-group-nama"
            name="group-nama"
            class="form-control group-form-input"
            placeholder="Misal: Kas RT 05, Kelas XII-A, Arisan..."
            maxlength="60"
            required
            autocomplete="off"
            aria-label="Nama kelas atau grup baru"
            oninput={onCreateNamaInput}
          >
        </div>
      </div>

      <div class="group-flow-field">
        <div class="group-flow-label-row">
          <label for="input-group-pin">PIN Akses Warga (4 Angka)</label>
          <button
            type="button"
            class="group-inline-link"
            onclick={() => { syncDomCreatePin(generatePin4()); showCreatePin = true; }}
          >
            <i class="ph-bold ph-shuffle" aria-hidden="true"></i> Acak 4 Angka
          </button>
        </div>
        <div class="group-pin-field-row">
          <div class="input-with-icon group-pin-input-wrap">
            <i class="ph ph-lock-key group-input-icon" aria-hidden="true"></i>
            <input
              type={showCreatePin ? 'text' : 'password'}
              id="input-group-pin"
              name="group-pin"
              class="form-control group-form-input group-pin-input"
              inputmode="numeric"
              maxlength="4"
              placeholder="0000"
              required
              autocomplete="off"
              aria-label="PIN 4 digit"
              oninput={onCreatePinInput}
            >
          </div>
          <button
            type="button"
            class="btn btn-outline group-pin-eye-btn"
            aria-label={showCreatePin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
            aria-pressed={showCreatePin}
            onclick={() => { showCreatePin = !showCreatePin; }}
          >
            <i class={showCreatePin ? 'ph ph-eye-slash' : 'ph ph-eye'} aria-hidden="true"></i>
          </button>
        </div>
        <p class="group-flow-hint">Dipakai anggota untuk membuka ruang kas dan melihat status iuran.</p>
      </div>

      <div class="group-flow-actions">
        <button type="button" class="btn btn-secondary" onclick={resetGroupAdminFlow}>Batal</button>
        <button type="button" class="btn btn-primary" disabled={!step1Valid} onclick={onGoStep2}>
          <span>Lanjut ke Akun Admin</span>
          <i class="ph-bold ph-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- Langkah 2: Akun Admin & Konfirmasi -->
    <div class="group-flow-step" hidden={flow.createStep !== 2}>
      <div class="group-summary-strip">
        <div class="group-summary-item">
          <span class="group-summary-k">Ruang Kas</span>
          <strong class="group-summary-v">{createNama.trim() || '-'}</strong>
        </div>
        <div class="group-summary-item">
          <span class="group-summary-k">PIN Warga</span>
          <code class="group-summary-code">{pinDigitsOnly || '----'}</code>
        </div>
      </div>

      <div class="group-admin-opt-wrap is-flow">
        <label class="group-admin-opt-label" for="chk-group-admin-auto">
          <input
            type="checkbox"
            id="chk-group-admin-auto"
            name="chk-group-admin-auto"
            checked
            onchange={onAutoAdminChange}
          >
          <span>Buat akun Admin Grup langsung (Email &amp; Password)</span>
        </label>
        <div id="box-group-admin-creds" class="group-admin-creds-stack" hidden={!createAutoAdmin}>
          <div class="group-flow-field">
            <label for="input-group-admin-email">Email Pengurus / Bendahara</label>
            <div class="input-with-icon group-cred-email-field">
              <i class="ph ph-envelope group-input-icon" aria-hidden="true"></i>
              <input
                type="email"
                id="input-group-admin-email"
                name="group-admin-email"
                class="form-control group-form-input"
                placeholder="admin.nama@finkas.id"
                autocomplete="off"
                aria-label="Email admin grup"
              >
            </div>
          </div>
          <div class="group-flow-field">
            <label for="input-group-admin-pwd">Password Awal Admin</label>
            <div class="group-pwd-field-row">
              <div class="input-with-icon group-cred-pwd-field">
                <i class="ph ph-key group-input-icon" aria-hidden="true"></i>
                <input
                  type="text"
                  id="input-group-admin-pwd"
                  name="group-admin-pwd"
                  class="form-control group-form-input group-mono-input"
                  placeholder="Password acak..."
                  autocomplete="off"
                  aria-label="Password admin grup"
                >
              </div>
              <button
                type="button"
                class="btn btn-outline btn-refresh-pwd"
                id="btn-refresh-admin-pwd"
                title="Acak ulang password"
                aria-label="Acak ulang password"
              >
                <i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="group-flow-actions">
        <button type="button" class="btn btn-secondary" onclick={() => setGroupCreateStep(1)}>
          <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
          <span>Kembali</span>
        </button>
        <button type="submit" class="btn btn-primary btn-create-submit" disabled={flow.busy}>
          <i class="ph-bold ph-check" aria-hidden="true"></i>
          <span>{flow.busy ? 'Membuat...' : 'Buat Ruang Kas'}</span>
        </button>
      </div>
    </div>
  </form>
</div>

<!-- ── Panel 2: Edit Nama Grup ── -->
{#if flow.mode === 'rename'}
  <div class="group-flow-panel">
    <div class="group-flow-nav">
      <button type="button" class="group-flow-back" onclick={resetGroupAdminFlow}>
        <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
        <span>Daftar Grup</span>
      </button>
      <span class="group-flow-pill">Ubah Nama Grup</span>
    </div>
    <form class="group-flow-form" onsubmit={onRenameSubmit}>
      <div class="group-flow-field">
        <div class="group-flow-label-row">
          <label for="input-edit-group-nama">Nama baru untuk "{flow.targetName}"</label>
          <span class="group-flow-counter font-mono">{renameValue.length}/60</span>
        </div>
        <div class="input-with-icon">
          <i class="ph ph-pencil-simple group-input-icon" aria-hidden="true"></i>
          <input
            type="text"
            id="input-edit-group-nama"
            class="form-control group-form-input"
            maxlength="60"
            required
            autocomplete="off"
            bind:value={renameValue}
          >
        </div>
      </div>
      <div class="group-flow-actions">
        <button type="button" class="btn btn-secondary" onclick={resetGroupAdminFlow}>Batal</button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={flow.busy || renameValue.trim().length < 3 || renameValue.trim() === flow.targetName.trim()}
        >
          {flow.busy ? 'Menyimpan...' : 'Simpan Nama'}
        </button>
      </div>
    </form>
  </div>
{/if}

<!-- ── Panel 3: Ubah PIN Grup ── -->
{#if flow.mode === 'pin'}
  <div class="group-flow-panel">
    <div class="group-flow-nav">
      <button type="button" class="group-flow-back" onclick={resetGroupAdminFlow}>
        <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
        <span>Daftar Grup</span>
      </button>
      <span class="group-flow-pill">Ubah PIN Warga</span>
    </div>
    <form class="group-flow-form" onsubmit={onPinSubmit}>
      <div class="group-flow-field">
        <div class="group-flow-label-row">
          <label for="input-edit-group-pin">PIN 4 angka baru untuk "{flow.targetName}"</label>
          <button
            type="button"
            class="group-inline-link"
            onclick={() => { pinValue = generatePin4(); showEditPin = true; }}
          >
            <i class="ph-bold ph-shuffle" aria-hidden="true"></i> Acak
          </button>
        </div>
        <div class="group-pin-field-row">
          <div class="input-with-icon group-pin-input-wrap">
            <i class="ph ph-key group-input-icon" aria-hidden="true"></i>
            <input
              type={showEditPin ? 'text' : 'password'}
              id="input-edit-group-pin"
              class="form-control group-form-input group-pin-input"
              inputmode="numeric"
              maxlength="4"
              placeholder="0000"
              required
              autocomplete="off"
              value={pinValue}
              oninput={onEditPinInput}
            >
          </div>
          <button
            type="button"
            class="btn btn-outline group-pin-eye-btn"
            aria-label={showEditPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
            aria-pressed={showEditPin}
            onclick={() => { showEditPin = !showEditPin; }}
          >
            <i class={showEditPin ? 'ph ph-eye-slash' : 'ph ph-eye'} aria-hidden="true"></i>
          </button>
        </div>
        <p class="group-flow-hint">Anggota yang belum punya sesi aktif perlu memasukkan PIN baru ini.</p>
      </div>
      <div class="group-flow-actions">
        <button type="button" class="btn btn-secondary" onclick={resetGroupAdminFlow}>Batal</button>
        <button type="submit" class="btn btn-primary" disabled={flow.busy || pinValue.length !== 4}>
          {flow.busy ? 'Menyimpan...' : 'Simpan PIN Baru'}
        </button>
      </div>
    </form>
  </div>
{/if}

<!-- ── Panel 4: Konfirmasi Hapus Grup ── -->
{#if flow.mode === 'remove'}
  <div class="group-flow-panel is-danger">
    <div class="group-flow-nav">
      <button type="button" class="group-flow-back" onclick={resetGroupAdminFlow}>
        <i class="ph-bold ph-arrow-left" aria-hidden="true"></i>
        <span>Daftar Grup</span>
      </button>
      <span class="group-flow-pill is-danger">Hapus Permanen</span>
    </div>
    <form class="group-flow-form" onsubmit={onRemoveSubmit}>
      <div class="group-danger-banner">
        <i class="ph-fill ph-warning-octagon" aria-hidden="true"></i>
        <p>Seluruh data anggota, rekap iuran, dan riwayat transaksi di <strong>{flow.targetName}</strong> akan terhapus permanen dan tidak bisa dikembalikan.</p>
      </div>
      <div class="group-flow-field">
        <label for="input-remove-group-confirm">Ketik persis <strong>{flow.targetName}</strong> untuk konfirmasi</label>
        <div class="input-with-icon">
          <i class="ph ph-trash group-input-icon" aria-hidden="true"></i>
          <input
            type="text"
            id="input-remove-group-confirm"
            class="form-control group-form-input"
            placeholder={flow.targetName}
            autocomplete="off"
            bind:value={removeConfirmText}
          >
        </div>
      </div>
      <div class="group-flow-actions">
        <button type="button" class="btn btn-secondary" onclick={resetGroupAdminFlow}>Batal</button>
        <button type="submit" class="btn btn-danger" disabled={flow.busy || !removeMatches}>
          {flow.busy ? 'Menghapus...' : 'Hapus Grup Permanen'}
        </button>
      </div>
    </form>
  </div>
{/if}

<style>
  :global {
    .group-flow-panel { display: flex; flex-direction: column; gap: 14px; padding: 14px 16px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 14px; }
    .group-flow-panel[hidden], .group-flow-step[hidden], .group-admin-creds-stack[hidden] { display: none; }
    .group-flow-panel.is-danger { border-color: var(--danger-border); }

    .group-flow-nav { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
    .group-flow-back { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface); color: var(--text-main); font-size: 12px; font-weight: 700; cursor: pointer; }
    .group-flow-back:hover { border-color: var(--border-strong); background: var(--surface-2); }

    .group-flow-stepper { display: inline-flex; align-items: center; gap: 6px; }
    .flow-step-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--r-pill); border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 11.5px; font-weight: 700; cursor: pointer; }
    .flow-step-pill.is-active { border-color: var(--accent); background: var(--accent-tint); color: var(--accent-strong); }
    .flow-step-pill.is-done { border-color: var(--border-strong); color: var(--text-main); }
    .flow-step-num { width: 17px; height: 17px; border-radius: 50%; display: inline-grid; place-items: center; font-size: 11px; font-family: var(--font-mono); font-variant-numeric: tabular-nums; background: var(--surface-2); }
    .flow-step-pill.is-active .flow-step-num { background: var(--accent); color: var(--accent-ink); }
    .flow-step-sep { width: 14px; height: 1.5px; background: var(--border-strong); border-radius: 2px; }

    .group-flow-pill { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--r-pill); background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); }
    .group-flow-pill.is-danger { background: var(--danger-bg); border-color: var(--danger-border); color: var(--danger); }

    .group-flow-form, .group-flow-step { display: flex; flex-direction: column; gap: 12px; }

    .group-preview-card { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }
    .group-preview-avatar { width: 38px; height: 38px; border-radius: 10px; background: var(--accent-tint); color: var(--accent-strong); border: 1px solid var(--accent-border); display: grid; place-items: center; font-family: var(--font-display); font-weight: 800; font-size: 15px; flex-shrink: 0; }
    .group-preview-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .group-preview-copy strong { font-size: 13.5px; font-weight: 700; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .group-preview-copy small { font-size: 11px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .group-preview-badge { font-family: var(--font-mono); font-size: 11px; font-weight: 800; letter-spacing: 0.04em; padding: 3px 8px; border-radius: var(--r-pill); background: var(--accent-tint); color: var(--accent-strong); border: 1px solid var(--accent-border); flex-shrink: 0; }

    .group-flow-field { display: flex; flex-direction: column; gap: 6px; }
    .group-flow-field label { font-size: 12px; font-weight: 700; color: var(--text-main); }
    .group-flow-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .group-flow-counter { font-size: 11px; color: var(--text-faint); font-variant-numeric: tabular-nums; }
    .group-inline-link { display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--accent-strong); font-size: 11.5px; font-weight: 700; cursor: pointer; padding: 2px 4px; border-radius: 6px; }
    .group-inline-link:hover { background: var(--accent-tint); }

    .group-pin-field-row, .group-pwd-field-row { display: flex; align-items: center; gap: 8px; }
    .group-pin-input-wrap, .group-cred-pwd-field { flex: 1 1 auto; min-width: 0; }
    .group-pin-eye-btn { width: 40px; height: 40px; min-width: 40px; min-height: 40px; padding: 0; border-radius: 10px; background: var(--surface); display: inline-grid; place-items: center; flex-shrink: 0; }
    .group-flow-hint { margin: 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.4; }

    .group-summary-strip { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }
    .group-summary-item { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .group-summary-k { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-faint); }
    .group-summary-v { font-size: 13.5px; font-weight: 700; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .group-summary-code { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; padding: 3px 9px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-main); }

    .group-admin-opt-wrap.is-flow { margin-top: 0; padding-top: 0; border-top: 0; display: flex; flex-direction: column; gap: 10px; }
    .group-admin-creds-stack { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); }

    .group-danger-banner { display: flex; align-items: flex-start; gap: 10px; padding: 11px 12px; border-radius: 11px; background: var(--danger-bg); border: 1px solid var(--danger-border); color: var(--danger); font-size: 12.5px; line-height: 1.45; }
    .group-danger-banner i { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .group-danger-banner p { margin: 0; }

    .group-flow-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding-top: 4px; }
    .group-flow-actions .btn { min-height: 38px; padding: 0 14px; border-radius: 10px; font-size: 12.5px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
  }
</style>
