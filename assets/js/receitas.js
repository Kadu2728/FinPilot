/**
 * FinPilot — Receitas JS
 * Full CRUD for revenue entries with filters, pagination, and modals.
 */

// ─── State ──────────────────────────────────────────────
let allItems      = [];
let filteredItems = [];
let currentPage   = 1;
const PER_PAGE    = 10;
let deleteTargetId = null;

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadReceitas();
  initModal();
  initFilters();
  initDeleteModal();
});

// ─── Load ────────────────────────────────────────────────
async function loadReceitas() {
  try {
    const data = await API.getReceitas();
    allItems = Array.isArray(data) ? data : (data?.items || []);
    applyFilters();
  } catch {
    showToast('error', 'Erro ao carregar receitas', 'Verifique o servidor.');
  }
}

// ─── Filters ─────────────────────────────────────────────
function initFilters() {
  const searchEl  = document.getElementById('filter-search');
  const catEl     = document.getElementById('filter-categoria');
  const mesEl     = document.getElementById('filter-mes');
  const clearBtn  = document.getElementById('btn-clear-filter');

  searchEl?.addEventListener('input',  debounce(applyFilters, 250));
  catEl?.addEventListener('change',    applyFilters);
  mesEl?.addEventListener('change',    applyFilters);
  clearBtn?.addEventListener('click',  () => {
    if (searchEl) searchEl.value = '';
    if (catEl)    catEl.value    = '';
    if (mesEl)    mesEl.value    = '';
    applyFilters();
  });

  // Set current month as default
  if (mesEl) {
    const now = new Date();
    mesEl.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

function applyFilters() {
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();
  const cat    = document.getElementById('filter-categoria')?.value || '';
  const mes    = document.getElementById('filter-mes')?.value        || '';

  filteredItems = allItems.filter(item => {
    const matchSearch = !search || item.descricao?.toLowerCase().includes(search);
    const matchCat    = !cat    || item.categoria === cat;
    const matchMes    = !mes    || (item.data_receita || '').startsWith(mes);
    return matchSearch && matchCat && matchMes;
  });

  currentPage = 1;
  renderTable();
  renderKPIs();
  updateBadge();
}

// ─── KPIs ────────────────────────────────────────────────
function renderKPIs() {
  const total = filteredItems.reduce((s, r) => s + parseFloat(r.valor || 0), 0);
  const count = filteredItems.length;
  const media = count > 0 ? total / count : 0;

  document.getElementById('rec-total').textContent = formatCurrency(total);
  document.getElementById('rec-count').textContent = count;
  document.getElementById('rec-media').textContent = formatCurrency(media);
}

function updateBadge() {
  const badge = document.getElementById('total-count-badge');
  if (badge) badge.textContent = `${filteredItems.length} receita${filteredItems.length !== 1 ? 's' : ''}`;
}

// ─── Table ────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('receitas-tbody');
  if (!tbody) return;

  const start = (currentPage - 1) * PER_PAGE;
  const page  = filteredItems.slice(start, start + PER_PAGE);

  if (filteredItems.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">📭</div>
          <h3>Nenhuma receita encontrada</h3>
          <p>Tente ajustar os filtros ou crie uma nova receita.</p>
          <button class="btn btn-primary btn-sm" id="btn-empty-add">+ Nova Receita</button>
        </div>
      </td></tr>`;
    document.getElementById('btn-empty-add')?.addEventListener('click', () => openModal());
    renderPagination();
    return;
  }

  tbody.innerHTML = page.map(item => `
    <tr>
      <td>
        <div class="font-medium">${escapeHtml(item.descricao)}</div>
      </td>
      <td><span class="badge badge-green">${escapeHtml(item.categoria || 'Outros')}</span></td>
      <td class="td-muted">${formatDate(item.data_receita)}</td>
      <td class="text-right text-green font-semibold">+${formatCurrency(item.valor)}</td>
      <td class="text-right">
        <div class="flex gap-2" style="justify-content:flex-end">
          <button
            class="btn btn-ghost btn-icon btn-sm btn-edit"
            data-id="${item.id}"
            aria-label="Editar receita ${escapeHtml(item.descricao)}"
          >✏</button>
          <button
            class="btn btn-danger btn-icon btn-sm btn-delete"
            data-id="${item.id}"
            aria-label="Excluir receita ${escapeHtml(item.descricao)}"
          >🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Bind actions
  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = allItems.find(x => String(x.id) === btn.dataset.id);
      if (item) openModal(item);
    });
  });

  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });

  renderPagination();
}

// ─── Pagination ───────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filteredItems.length / PER_PAGE);
  const info       = document.getElementById('pagination-info');
  const controls   = document.getElementById('pagination-controls');

  const start = filteredItems.length === 0 ? 0 : (currentPage - 1) * PER_PAGE + 1;
  const end   = Math.min(currentPage * PER_PAGE, filteredItems.length);

  if (info) {
    info.textContent = filteredItems.length === 0
      ? 'Nenhum item'
      : `Mostrando ${start}–${end} de ${filteredItems.length}`;
  }

  if (!controls) return;
  controls.innerHTML = '';

  if (totalPages <= 1) return;

  // Prev
  const prev = document.createElement('button');
  prev.className = `btn btn-secondary btn-sm${currentPage === 1 ? ' disabled' : ''}`;
  prev.textContent = '‹';
  prev.disabled = currentPage === 1;
  prev.setAttribute('aria-label', 'Página anterior');
  prev.addEventListener('click', () => { currentPage--; renderTable(); });
  controls.appendChild(prev);

  // Page numbers
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-secondary'}`;
    btn.textContent = p;
    btn.setAttribute('aria-label', `Página ${p}`);
    btn.setAttribute('aria-current', p === currentPage ? 'page' : undefined);
    btn.addEventListener('click', () => { currentPage = p; renderTable(); });
    controls.appendChild(btn);
  }

  // Next
  const next = document.createElement('button');
  next.className = `btn btn-secondary btn-sm${currentPage === totalPages ? ' disabled' : ''}`;
  next.textContent = '›';
  next.disabled = currentPage === totalPages;
  next.setAttribute('aria-label', 'Próxima página');
  next.addEventListener('click', () => { currentPage++; renderTable(); });
  controls.appendChild(next);
}

// ─── Modal CRUD ──────────────────────────────────────────
function initModal() {
  const modal    = document.getElementById('modal-receita');
  const btnNova  = document.getElementById('btn-nova-receita');
  const btnClose = document.getElementById('modal-rec-close');
  const btnCancel = document.getElementById('btn-cancel-rec');
  const btnSave  = document.getElementById('btn-save-rec');

  btnNova?.addEventListener('click',   () => openModal());
  btnClose?.addEventListener('click',  closeModal);
  btnCancel?.addEventListener('click', closeModal);
  modal?.addEventListener('click',     e => { if (e.target === modal) closeModal(); });

  // Set today as default date
  const dateEl = document.getElementById('rec-data');
  if (dateEl) dateEl.value = todayISO();

  btnSave?.addEventListener('click', saveReceita);
}

function openModal(item = null) {
  const modal = document.getElementById('modal-receita');
  const title = document.getElementById('modal-rec-title');

  document.getElementById('rec-id').value           = item?.id || '';
  document.getElementById('rec-descricao').value    = item?.descricao || '';
  document.getElementById('rec-valor').value        = item?.valor || '';
  document.getElementById('rec-data').value         = item?.data_receita || todayISO();
  document.getElementById('rec-categoria').value    = item?.categoria || 'Vendas';

  title.textContent = item ? 'Editar Receita' : 'Nova Receita';
  clearFormErrors();
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-receita')?.classList.remove('open');
}

async function saveReceita() {
  const id      = document.getElementById('rec-id').value;
  const descricao = document.getElementById('rec-descricao').value.trim();
  const valor   = parseFloat(document.getElementById('rec-valor').value);
  const data    = document.getElementById('rec-data').value;
  const categoria = document.getElementById('rec-categoria').value;
  const btn     = document.getElementById('btn-save-rec');

  clearFormErrors();

  let hasError = false;
  if (!descricao) {
    showFormError('rec-desc-error', 'Descrição obrigatória.');
    document.getElementById('rec-descricao').classList.add('error');
    hasError = true;
  }
  if (!valor || valor <= 0) {
    showFormError('rec-valor-error', 'Valor deve ser maior que zero.');
    document.getElementById('rec-valor').classList.add('error');
    hasError = true;
  }
  if (hasError) return;

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const payload = { descricao, valor, data_receita: data, categoria };
    if (id) {
      await API.updateReceita(id, payload);
      showToast('success', 'Receita atualizada!');
    } else {
      await API.createReceita(payload);
      showToast('success', 'Receita criada!');
    }
    closeModal();
    await loadReceitas();
  } catch {
    showToast('error', 'Erro ao salvar receita');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ─── Delete Modal ─────────────────────────────────────────
function initDeleteModal() {
  const modal    = document.getElementById('modal-confirm-del');
  const btnClose  = document.getElementById('modal-del-close');
  const btnCancel = document.getElementById('btn-cancel-del');
  const btnConfirm = document.getElementById('btn-confirm-del');

  btnClose?.addEventListener('click',  closeDeleteModal);
  btnCancel?.addEventListener('click', closeDeleteModal);
  modal?.addEventListener('click',     e => { if (e.target === modal) closeDeleteModal(); });

  btnConfirm?.addEventListener('click', async () => {
    if (!deleteTargetId) return;
    const btn = document.getElementById('btn-confirm-del');
    btn.classList.add('loading');
    btn.disabled = true;
    try {
      await API.deleteReceita(deleteTargetId);
      showToast('success', 'Receita excluída!');
      closeDeleteModal();
      await loadReceitas();
    } catch {
      showToast('error', 'Erro ao excluir receita');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('modal-confirm-del').classList.add('open');
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('modal-confirm-del')?.classList.remove('open');
}

// ─── Helpers ─────────────────────────────────────────────
function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}