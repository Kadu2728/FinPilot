/**
 * FinPilot — Metas JS
 * Full CRUD for financial goals with progress tracking,
 * aporte registration, and emoji picker.
 */

// ── State ──────────────────────────────────────────────────
let allMetas       = [];
let deleteTargetId = null;
let aporteTargetId = null;
let selectedEmoji  = '🎯';

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadMetas();
  initModal();
  initDeleteModal();
  initAporteModal();
  initEmojiPicker();
});

// ── Load ──────────────────────────────────────────────────
async function loadMetas() {
  try {
    const data = await API.getMetas();
    allMetas = Array.isArray(data) ? data : (data?.items || []);
    renderAll();
  } catch {
    showToast('error', 'Erro ao carregar metas', 'Verifique o servidor.');
  }
}

// ── Render ────────────────────────────────────────────────
function renderAll() {
  renderSummary();
  renderGrid();
  updateBadge();
}

function renderSummary() {
  const total      = allMetas.length;
  const concluidas = allMetas.filter(m => getPct(m) >= 100).length;
  const andamento  = allMetas.filter(m => getPct(m) < 100).length;
  const investido  = allMetas.reduce((s, m) => s + parseFloat(m.valor_atual || 0), 0);

  document.getElementById('sum-total').textContent      = total;
  document.getElementById('sum-concluidas').textContent = concluidas;
  document.getElementById('sum-andamento').textContent  = andamento;
  document.getElementById('sum-investido').textContent  = formatCurrency(investido);
}

function renderGrid() {
  const grid     = document.getElementById('metas-grid');
  const emptyEl  = document.getElementById('metas-empty');

  if (allMetas.length === 0) {
    grid.style.display    = 'none';
    emptyEl.style.display = '';
    return;
  }

  grid.style.display    = 'grid';
  emptyEl.style.display = 'none';
  grid.innerHTML        = '';

  allMetas.forEach(meta => {
    const pct         = getPct(meta);
    const isCompleta  = pct >= 100;
    const isQuase     = pct >= 75 && pct < 100;
    const barColor    = isCompleta ? 'green' : isQuase ? 'yellow' : '';
    const emoji       = meta.emoji || '🎯';
    const dataStr     = meta.data_prevista
      ? new Date(meta.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })
      : 'Sem prazo';
    const diasRestantes = meta.data_prevista ? calcDiasRestantes(meta.data_prevista) : null;

    const card = document.createElement('div');
    card.className = `meta-card${isCompleta ? ' completa' : isQuase ? ' quase' : ''}`;
    card.dataset.id = meta.id;

    card.innerHTML = `
      <div class="meta-actions">
        <button class="btn btn-ghost btn-icon btn-sm btn-aporte" data-id="${meta.id}" data-nome="${escHtml(meta.nome || meta.descricao || '')}" title="Registrar aporte" aria-label="Registrar aporte">💰</button>
        <button class="btn btn-ghost btn-icon btn-sm btn-edit" data-id="${meta.id}" title="Editar" aria-label="Editar meta">✏</button>
        <button class="btn btn-danger btn-icon btn-sm btn-delete" data-id="${meta.id}" title="Excluir" aria-label="Excluir meta">🗑</button>
      </div>

      <span class="meta-emoji">${emoji}</span>
      <div class="meta-nome">${escHtml(meta.nome || meta.descricao || 'Meta')}</div>
      <div class="meta-categoria">${escHtml(meta.categoria || 'Objetivo')}</div>

      <div class="meta-valores">
        <div>
          <div class="meta-valor-atual">${formatCurrency(meta.valor_atual || 0)}</div>
          <div class="meta-valor-alvo">de ${formatCurrency(meta.meta_mensal || meta.valor_alvo || 0)}</div>
        </div>
        <span class="badge ${isCompleta ? 'badge-green' : isQuase ? 'badge-yellow' : 'badge-brand'}">${pct.toFixed(0)}%</span>
      </div>

      <div class="progress-bar-track">
        <div class="progress-bar-fill ${barColor}" style="width:${Math.min(pct,100)}%"></div>
      </div>
      <div class="meta-progresso-text">
        <span class="text-muted">${isCompleta ? '🎉 Meta atingida!' : `faltam ${formatCurrency((meta.meta_mensal || meta.valor_alvo || 0) - (meta.valor_atual || 0))}`}</span>
        <span class="${isCompleta ? 'text-green' : 'text-muted'}">${pct.toFixed(1)}%</span>
      </div>

      <div class="meta-data">
        <span>📅</span>
        <span>${dataStr}</span>
        ${diasRestantes !== null ? `<span class="ml-auto ${diasRestantes < 0 ? 'text-red' : diasRestantes <= 30 ? 'text-yellow' : 'text-muted'}">${diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atrasado` : `${diasRestantes}d restantes`}</span>` : ''}
      </div>
    `;

    grid.appendChild(card);
  });

  // Bind actions
  grid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const meta = allMetas.find(m => String(m.id) === btn.dataset.id);
      if (meta) openModal(meta);
    });
  });

  grid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
  });

  grid.querySelectorAll('.btn-aporte').forEach(btn => {
    btn.addEventListener('click', () => openAporteModal(btn.dataset.id, btn.dataset.nome));
  });
}

function updateBadge() {
  const badge = document.getElementById('badge-total');
  if (badge) badge.textContent = `${allMetas.length} meta${allMetas.length !== 1 ? 's' : ''}`;
}

// ── Helpers ───────────────────────────────────────────────
function getPct(meta) {
  const alvo   = parseFloat(meta.meta_mensal || meta.valor_alvo || 1);
  const atual  = parseFloat(meta.valor_atual || 0);
  return alvo > 0 ? (atual / alvo) * 100 : 0;
}

function calcDiasRestantes(dateStr) {
  const hoje  = new Date();
  const alvo  = new Date(dateStr + 'T00:00:00');
  const diff  = Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24));
  return diff;
}

function escHtml(s = '') {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Emoji Picker ──────────────────────────────────────────
function initEmojiPicker() {
  document.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = btn.dataset.emoji;
      document.getElementById('meta-emoji').value = selectedEmoji;
    });
  });

  // Select default
  const defaultBtn = document.querySelector('[data-emoji="🎯"]');
  if (defaultBtn) defaultBtn.classList.add('selected');
}

function setEmojiPicker(emoji) {
  document.querySelectorAll('.emoji-opt').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.emoji === emoji);
  });
  selectedEmoji = emoji;
  document.getElementById('meta-emoji').value = emoji;
}

// ── Preview bar ───────────────────────────────────────────
function updatePreview() {
  const alvo  = parseFloat(document.getElementById('meta-valor-alvo').value) || 0;
  const atual = parseFloat(document.getElementById('meta-valor-atual-inp').value) || 0;
  const pct   = alvo > 0 ? Math.min(100, (atual / alvo) * 100) : 0;
  document.getElementById('preview-pct').textContent = pct.toFixed(1) + '%';
  document.getElementById('preview-bar').style.width = pct + '%';
}

// ── Modal ─────────────────────────────────────────────────
function initModal() {
  const modal     = document.getElementById('modal-meta');
  const btnNova   = document.getElementById('btn-nova-meta');
  const btnNovaE  = document.getElementById('btn-nova-meta-empty');
  const btnClose  = document.getElementById('modal-meta-close');
  const btnCancel = document.getElementById('btn-cancel-meta');
  const btnSave   = document.getElementById('btn-save-meta');

  btnNova?.addEventListener('click',  () => openModal());
  btnNovaE?.addEventListener('click', () => openModal());
  btnClose?.addEventListener('click', closeModal);
  btnCancel?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Live preview
  document.getElementById('meta-valor-alvo')?.addEventListener('input', updatePreview);
  document.getElementById('meta-valor-atual-inp')?.addEventListener('input', updatePreview);

  btnSave?.addEventListener('click', saveMeta);
}

function openModal(meta = null) {
  const modal = document.getElementById('modal-meta');
  const title = document.getElementById('modal-meta-title');

  document.getElementById('meta-id').value              = meta?.id || '';
  document.getElementById('meta-nome').value            = meta?.nome || meta?.descricao || '';
  document.getElementById('meta-categoria').value       = meta?.categoria || 'Outro';
  document.getElementById('meta-valor-alvo').value      = meta?.meta_mensal || meta?.valor_alvo || '';
  document.getElementById('meta-valor-atual-inp').value = meta?.valor_atual || 0;
  document.getElementById('meta-data-prevista').value   = meta?.data_prevista || '';

  const emoji = meta?.emoji || '🎯';
  setEmojiPicker(emoji);

  title.textContent = meta ? 'Editar Meta' : 'Nova Meta';
  clearErrors();
  updatePreview();
  modal.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-meta')?.classList.remove('open');
}

async function saveMeta() {
  const id         = document.getElementById('meta-id').value;
  const nome       = document.getElementById('meta-nome').value.trim();
  const categoria  = document.getElementById('meta-categoria').value;
  const valorAlvo  = parseFloat(document.getElementById('meta-valor-alvo').value);
  const valorAtual = parseFloat(document.getElementById('meta-valor-atual-inp').value) || 0;
  const dataPrev   = document.getElementById('meta-data-prevista').value;
  const emoji      = document.getElementById('meta-emoji').value;
  const btn        = document.getElementById('btn-save-meta');

  clearErrors();

  let hasError = false;
  if (!nome) {
    showFormError('meta-nome-error', 'Nome é obrigatório.');
    document.getElementById('meta-nome').classList.add('error');
    hasError = true;
  }
  if (!valorAlvo || valorAlvo <= 0) {
    showFormError('meta-alvo-error', 'Valor alvo deve ser maior que zero.');
    document.getElementById('meta-valor-alvo').classList.add('error');
    hasError = true;
  }
  if (hasError) return;

  btn.classList.add('loading');
  btn.disabled = true;

  const payload = {
    meta_mensal: valorAlvo,
    valor_atual: valorAtual,
    // Extended fields stored as JSON in descricao for now
    nome,
    categoria,
    emoji,
    data_prevista: dataPrev || null,
  };

  try {
    if (id) {
      await API.updateMeta(id, payload);
      showToast('success', 'Meta atualizada!');
    } else {
      await API.createMeta(payload);
      showToast('success', 'Meta criada!');
    }
    closeModal();
    await loadMetas();
  } catch {
    showToast('error', 'Erro ao salvar meta');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Delete Modal ──────────────────────────────────────────
function initDeleteModal() {
  const modal     = document.getElementById('modal-del');
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
      await API.deleteMeta(deleteTargetId);
      showToast('success', 'Meta excluída!');
      closeDeleteModal();
      await loadMetas();
    } catch {
      showToast('error', 'Erro ao excluir');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('modal-del').classList.add('open');
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('modal-del')?.classList.remove('open');
}

// ── Aporte Modal ──────────────────────────────────────────
function initAporteModal() {
  const modal     = document.getElementById('modal-aporte');
  const btnClose  = document.getElementById('modal-aporte-close');
  const btnCancel = document.getElementById('btn-cancel-aporte');
  const btnConfirm = document.getElementById('btn-confirm-aporte');

  btnClose?.addEventListener('click',  closeAporteModal);
  btnCancel?.addEventListener('click', closeAporteModal);
  modal?.addEventListener('click',     e => { if (e.target === modal) closeAporteModal(); });

  btnConfirm?.addEventListener('click', async () => {
    const valor = parseFloat(document.getElementById('aporte-valor').value);
    const errEl = document.getElementById('aporte-error');
    errEl.classList.add('hidden');

    if (!valor || valor <= 0) {
      errEl.textContent = 'Informe um valor válido.';
      errEl.classList.remove('hidden');
      return;
    }

    const meta = allMetas.find(m => String(m.id) === String(aporteTargetId));
    if (!meta) return;

    const novoAtual = parseFloat(meta.valor_atual || 0) + valor;
    const btn = document.getElementById('btn-confirm-aporte');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
      await API.updateMeta(aporteTargetId, {
        meta_mensal: meta.meta_mensal,
        valor_atual: novoAtual,
      });
      showToast('success', 'Aporte registrado!', `+${formatCurrency(valor)} adicionado à meta.`);
      closeAporteModal();
      await loadMetas();
    } catch {
      showToast('error', 'Erro ao registrar aporte');
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

function openAporteModal(id, nome) {
  aporteTargetId = id;
  document.getElementById('modal-aporte-title').textContent = `Aporte — ${nome}`;
  document.getElementById('aporte-valor').value = '';
  document.getElementById('aporte-error').classList.add('hidden');
  document.getElementById('modal-aporte').classList.add('open');
}

function closeAporteModal() {
  aporteTargetId = null;
  document.getElementById('modal-aporte')?.classList.remove('open');
}

// ── Form helpers ──────────────────────────────────────────
function clearErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));
}

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}