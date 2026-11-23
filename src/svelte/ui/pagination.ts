const PAGE_SIZE = 10;

/**
 * Build a compact 7-slot page token sequence (numbers + '…' ellipsis).
 */
export const buildPageList = (current: number, total: number) => {
  if (total <= 7) return Array.from({ length: total }, (_, idx) => idx + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
};

const renderPageList = (listEl: Element | null, current: number, total: number) => {
  if (!listEl) return;
  const nodes = buildPageList(current, total).map((token) => {
    if (token === '…') {
      const span = document.createElement('span');
      span.className = 'dues-page-ellipsis';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = '…';
      return span;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `dues-page-btn${token === current ? ' is-active' : ''}`;
    btn.dataset.pageTarget = String(token);
    btn.setAttribute('aria-label', `Halaman ${token}`);
    if (token === current) btn.setAttribute('aria-current', 'page');
    btn.textContent = String(token);
    return btn;
  });
  listEl.replaceChildren(...nodes);
};

const renderPageRange = (rangeEl: Element | null, startIdx: number, endIdx: number, total: number, label: string) => {
  if (!rangeEl) return;
  const rangeStrong = document.createElement('strong');
  rangeStrong.textContent = `${startIdx}–${endIdx}`;
  const totalStrong = document.createElement('strong');
  totalStrong.textContent = String(total);
  rangeEl.replaceChildren(
    rangeStrong,
    document.createTextNode(' dari '),
    totalStrong,
    document.createTextNode(` ${label}`)
  );
};

export const createPagination = (id: string, label: string, render: () => void) => {
  let page = 1;
  let previousContext = '';

  const init = () => {
    const pager = document.getElementById(id);
    const input = pager?.querySelector<HTMLInputElement>('[data-page-number]');
    if (!pager || !input) return;

    pager.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      const targetBtn = event.target.closest<HTMLButtonElement>('[data-page-target]');
      if (targetBtn) {
        const next = Number(targetBtn.dataset.pageTarget);
        if (Number.isInteger(next) && next !== page) {
          page = next;
          render();
        }
        return;
      }

      const stepBtn = event.target.closest<HTMLButtonElement>('[data-page-step]');
      if (!stepBtn || stepBtn.disabled) return;
      page += Number(stepBtn.dataset.pageStep);
      render();
      if (stepBtn.disabled && !pager.hidden) {
        const active = pager.querySelector<HTMLButtonElement>('[data-page-target].is-active');
        active?.focus({ preventScroll: true });
      }
    });

    const applyInputPage = () => {
      const next = Math.trunc(input.valueAsNumber);
      if (!Number.isFinite(next)) {
        input.value = String(page);
        return;
      }
      page = next;
      render();
    };

    const form = pager.querySelector('form');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      applyInputPage();
    });
    input.addEventListener('change', applyInputPage);
  };

    const paginate = <T>(items: T[], context: string) => {
    if (previousContext !== context) {
      previousContext = context;
      page = 1;
    }
    const total = items.length;
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.max(1, Math.min(pageCount, Number.isInteger(page) ? page : 1));
    const start = (page - 1) * PAGE_SIZE;
    const pager = document.getElementById(id);
    const input = pager?.querySelector<HTMLInputElement>('[data-page-number]');

    if (pager && input) {
      pager.hidden = pageCount < 2;
      input.max = String(pageCount);
      input.value = String(page);
      const jumpForm = pager.querySelector<HTMLFormElement>('.dues-page-jump');
      if (jumpForm) jumpForm.hidden = pageCount <= 7;
      const totalEl = pager.querySelector('[data-page-total]');
      if (totalEl) totalEl.textContent = `/ ${pageCount}`;
      renderPageRange(
        pager.querySelector('[data-page-range]'),
        total ? start + 1 : 0,
        Math.min(start + PAGE_SIZE, total),
        total,
        label
      );
      renderPageList(pager.querySelector('[data-page-list]'), page, pageCount);
      const prevBtn = pager.querySelector<HTMLButtonElement>('[data-page-step="-1"]');
      const nextBtn = pager.querySelector<HTMLButtonElement>('[data-page-step="1"]');
      if (prevBtn) prevBtn.disabled = page === 1;
      if (nextBtn) nextBtn.disabled = page === pageCount;
    }

    return items.slice(start, start + PAGE_SIZE);
  };

  return { init, paginate };
};
