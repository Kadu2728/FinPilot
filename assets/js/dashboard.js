/**
 * FinPilot — Dashboard JS
 * KPIs, Charts (Chart.js), Metas CRUD, Recent Transactions
 */

// ─── Chart.js global defaults ───────────────────────────
Chart.defaults.color         = '#94A3B8';
Chart.defaults.borderColor   = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family   = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size     = 12;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.padding  = 14;

// ─── State ──────────────────────────────────────────────
let chartRecDesp   = null;
let chartCategorias = null;
let chartFluxo      = null;
let allReceitas = [];
let allDespesas = [];
let allMetas    = [];
let filterMonth = '';

// ─── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  populateMonthFilter();
  await loadAll();
  initMetasModal();
});

// ─── Month Filter ────────────────────────────────────────
function populateMonthFilter() {
  const sel = document.getElementById('filter-month');
  if (!sel) return;
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const opt  = document.createElement('option');
    opt.value  = val;
    opt.textContent = label;
    if (i === 0) opt.selected = true;
    sel.appendChild(opt);
  }

  filterMonth = sel.value;
  sel.addEventListener('change', () => {
    filterMonth = sel.value;
    renderAll();
  });
}

// ─── Load Data ───────────────────────────────────────────
async function loadAll() {
  try {
    const [rec, desp, metas] = await Promise.all([
      API.getReceitas(),
      API.getDespesas(),
      API.getMetas(),
    ]);

    allReceitas = Array.isArray(rec)   ? rec   : (rec?.items   || []);
    allDespesas = Array.isArray(desp)  ? desp  : (desp?.items  || []);
    allMetas    = Array.isArray(metas) ? metas : (metas?.items || []);

    renderAll();
  } catch (err) {
    showToast('error', 'Erro ao carregar', 'Verifique a conexão com o servidor.');
    console.error(err);
  }
}

// ─── Render Everything ───────────────────────────────────
function renderAll() {
  const rec  = filterByMonth(allReceitas, 'data_receita');
  const desp = filterByMonth(allDespesas, 'data_despesa');

  renderKPIs(rec, desp);
  renderChartRecDesp();
  renderChartCategorias(desp);
  renderChartFluxo(rec, desp);
  renderMetas(rec, desp);
  renderRecent(rec, desp);
}

// ─── Filter by Month ────────────────────────────────────
function filterByMonth(items, dateKey) {
  if (!filterMonth) return items;
  return items.filter(item => {
    const d = (item[dateKey] || '').substring(0, 7);
    return d === filterMonth;
  });
}

// ─── KPIs ────────────────────────────────────────────────
function renderKPIs(rec, desp) {
  const totalRec  = rec.reduce((s, r) => s + parseFloat(r.valor || 0), 0);
  const totalDesp = desp.reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const saldo     = totalRec - totalDesp;

  document.getElementById('kpi-receita').textContent      = formatCurrency(totalRec);
  document.getElementById('kpi-receita-delta').textContent = `${rec.length} lançamento${rec.length !== 1 ? 's' : ''}`;

  document.getElementById('kpi-despesa').textContent      = formatCurrency(totalDesp);
  document.getElementById('kpi-despesa-delta').textContent = `${desp.length} lançamento${desp.length !== 1 ? 's' : ''}`;

  const saldoEl    = document.getElementById('kpi-saldo');
  const saldoDelta = document.getElementById('kpi-saldo-delta');
  saldoEl.textContent   = formatCurrency(saldo);
  saldoEl.style.color   = saldo >= 0 ? 'var(--green)' : 'var(--red)';
  saldoDelta.textContent = saldo >= 0 ? 'resultado positivo' : 'resultado negativo';

  // Meta KPI
  const meta = allMetas[0];
  if (meta) {
    const pct = Math.min(100, (totalRec / parseFloat(meta.meta_mensal || 1)) * 100);
    document.getElementById('kpi-meta').textContent      = formatCurrency(meta.meta_mensal);
    document.getElementById('kpi-meta-delta').textContent = `${pct.toFixed(0)}% concluída`;
  }
}

// ─── Chart: Receitas x Despesas (6 months) ──────────────
function renderChartRecDesp() {
  const ctx = document.getElementById('chart-recdesp');
  if (!ctx) return;

  const labels = [];
  const recData  = [];
  const despData = [];

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    labels.push(d.toLocaleDateString('pt-BR', { month: 'short' }));

    const r = allReceitas
      .filter(x => (x.data_receita  || '').startsWith(key))
      .reduce((s, x) => s + parseFloat(x.valor || 0), 0);
    const e = allDespesas
      .filter(x => (x.data_despesa  || '').startsWith(key))
      .reduce((s, x) => s + parseFloat(x.valor || 0), 0);

    recData.push(r);
    despData.push(e);
  }

  if (chartRecDesp) chartRecDesp.destroy();

  chartRecDesp = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Receitas',
          data: recData,
          backgroundColor: 'rgba(34,197,94,0.7)',
          borderColor:     'rgba(34,197,94,1)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Despesas',
          data: despData,
          backgroundColor: 'rgba(239,68,68,0.7)',
          borderColor:     'rgba(239,68,68,1)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatCurrency(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: v => 'R$ ' + (v / 1000).toFixed(0) + 'k' },
        },
      },
    },
  });
}

// ─── Chart: Gastos por Categoria ────────────────────────
function renderChartCategorias(desp) {
  const ctx = document.getElementById('chart-categorias');
  if (!ctx) return;

  const grouped = {};
  desp.forEach(d => {
    const cat = d.categoria || 'Outros';
    grouped[cat] = (grouped[cat] || 0) + parseFloat(d.valor || 0);
  });

  const labels = Object.keys(grouped);
  const data   = Object.values(grouped);
  const colors = [
    '#4F6EF7','#7C3AED','#22C55E','#EF4444','#F59E0B',
    '#3B82F6','#EC4899','#14B8A6','#F97316','#8B5CF6',
  ];

  if (chartCategorias) chartCategorias.destroy();

  if (labels.length === 0) {
    chartCategorias = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } },
    });
    return;
  }

  chartCategorias = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: 'var(--bg-surface)',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '60%',
      plugins: {
        legend: { position: 'right' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

// ─── Chart: Fluxo de Caixa (últimos 30 dias) ────────────
function renderChartFluxo(rec, desp) {
  const ctx = document.getElementById('chart-fluxo');
  if (!ctx) return;

  // Build daily labels for last 30 days
  const days    = [];
  const recMap  = {};
  const despMap = {};

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push(key);
    recMap[key]  = 0;
    despMap[key] = 0;
  }

  rec.forEach(r => { if (recMap[r.data_receita]  !== undefined) recMap[r.data_receita]  += parseFloat(r.valor || 0); });
  desp.forEach(d => { if (despMap[d.data_despesa] !== undefined) despMap[d.data_despesa] += parseFloat(d.valor || 0); });

  const labels     = days.map(d => d.split('-').slice(1).join('/'));
  const recData    = days.map(d => recMap[d]);
  const despData   = days.map(d => -despMap[d]);

  if (chartFluxo) chartFluxo.destroy();

  chartFluxo = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Entradas',
          data: recData,
          borderColor: '#22C55E',
          backgroundColor: 'rgba(34,197,94,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Saídas',
          data: despData,
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239,68,68,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatCurrency(Math.abs(ctx.parsed.y))}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8 },
          grid: { display: false },
        },
        y: {
          ticks: { callback: v => 'R$ ' + Math.abs(v / 1000).toFixed(0) + 'k' },
        },
      },
    },
  });
}

// ─── Metas ───────────────────────────────────────────────
function renderMetas(rec) {
  const container = document.getElementById('metas-list');
  const emptyEl   = document.getElementById('metas-empty');
  if (!container) return;

  const totalRec = rec.reduce((s, r) => s + parseFloat(r.valor || 0), 0);

  if (allMetas.length === 0) {
    if (emptyEl) emptyEl.style.display = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  // Remove old rendered items
  container.querySelectorAll('.meta-item').forEach(el => el.remove());

  allMetas.forEach(meta => {
    const pct   = Math.min(100, (totalRec / parseFloat(meta.meta_mensal || 1)) * 100);
    const color = pct >= 100 ? 'green' : pct >= 60 ? 'yellow' : 'var(--brand-primary)';

    const el = document.createElement('div');
    el.className = 'meta-item';
    el.style.cssText = 'margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)';
    el.dataset.id    = meta.id;

    el.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <div>
          <div class="font-medium text-sm">Meta Mensal</div>
          <div class="text-xs text-muted">${formatCurrency(meta.valor_atual || totalRec)} de ${formatCurrency(meta.meta_mensal)}</div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-icon btn-sm btn-edit-meta" data-id="${meta.id}" data-valor="${meta.meta_mensal}" aria-label="Editar meta">✏</button>
          <button class="btn btn-danger btn-icon btn-sm btn-del-meta" data-id="${meta.id}" aria-label="Excluir meta">🗑</button>
        </div>
      </div>
      <div class="progress-wrapper">
        <div class="progress-bar-track">
          <div class="progress-bar-fill ${color === 'green' ? 'green' : color === 'yellow' ? 'yellow' : ''}"
               style="width:${pct}%"></div>
        </div>
        <div class="flex justify-between text-xs text-muted" style="margin-top:6px">
          <span>${pct.toFixed(0)}% concluída</span>
          <span>${pct >= 100 ? '🎉 Meta atingida!' : `faltam ${formatCurrency(meta.meta_mensal - totalRec)}`}</span>
        </div>
      </div>
    `;

    container.appendChild(el);
  });

  // Bind edit/delete
  container.querySelectorAll('.btn-edit-meta').forEach(btn => {
    btn.addEventListener('click', () => openMetaModal(btn.dataset.id, btn.dataset.valor));
  });
  container.querySelectorAll('.btn-del-meta').forEach(btn => {
    btn.addEventListener('click', () => deleteMeta(btn.dataset.id));
  });
}

// ─── Recent Transactions ─────────────────────────────────
function renderRecent(rec, desp) {
  const tbody = document.getElementById('recent-tbody');
  if (!tbody) return;

  const merged = [
    ...rec.map(r  => ({ ...r, tipo: 'receita',  data: r.data_receita  })),
    ...desp.map(d => ({ ...d, tipo: 'despesa',  data: d.data_despesa  })),
  ]
    .sort((a, b) => new Date(b.data) - new Date(a.data))
    .slice(0, 10);

  if (merged.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <div class="empty-state-icon" aria-hidden="true">📭</div>
          <p>Nenhuma transação no período</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = merged.map(item => `
    <tr>
      <td class="font-medium">${item.descricao}</td>
      <td><span class="badge ${item.tipo === 'receita' ? 'badge-green' : 'badge-red'}">${item.categoria || '—'}</span></td>
      <td class="td-muted">${formatDate(item.data)}</td>
      <td><span class="badge ${item.tipo === 'receita' ? 'badge-green' : 'badge-blue'}">${item.tipo === 'receita' ? 'Receita' : 'Despesa'}</span></td>
      <td class="text-right font-semibold ${item.tipo === 'receita' ? 'text-green' : 'text-red'}">
        ${item.tipo === 'receita' ? '+' : '-'}${formatCurrency(item.valor)}
      </td>
    </tr>
  `).join('');
}

// ─── Metas Modal ─────────────────────────────────────────
function initMetasModal() {
  const modal    = document.getElementById('modal-meta');
  const btnNova  = document.getElementById('btn-nova-meta');
  const btnNova2 = document.getElementById('btn-nova-meta-2');
  const btnClose = document.getElementById('modal-meta-close');
  const btnCancel = document.getElementById('btn-cancel-meta');
  const btnSave  = document.getElementById('btn-save-meta');

  function openModal(id = '', valor = '') {
    document.getElementById('meta-id').value    = id;
    document.getElementById('meta-valor').value = valor;
    document.getElementById('modal-meta-title').textContent = id ? 'Editar Meta' : 'Nova Meta';
    modal.classList.add('open');
  }

  function closeModal() { modal.classList.remove('open'); }

  btnNova?.addEventListener('click',  () => openModal());
  btnNova2?.addEventListener('click', () => openModal());
  btnClose?.addEventListener('click', closeModal);
  btnCancel?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Save
  btnSave?.addEventListener('click', async () => {
    const id    = document.getElementById('meta-id').value;
    const valor = parseFloat(document.getElementById('meta-valor').value);
    if (!valor || valor <= 0) {
      showToast('error', 'Valor inválido', 'Informe um valor maior que zero.');
      return;
    }

    btnSave.classList.add('loading');
    btnSave.disabled = true;

    try {
      if (id) {
        await API.updateMeta(id, { meta_mensal: valor });
        showToast('success', 'Meta atualizada!');
      } else {
        await API.createMeta({ meta_mensal: valor, valor_atual: 0 });
        showToast('success', 'Meta criada!');
      }
      closeModal();
      await loadAll();
    } catch (err) {
      showToast('error', 'Erro ao salvar meta');
    } finally {
      btnSave.classList.remove('loading');
      btnSave.disabled = false;
    }
  });
}

function openMetaModal(id, valor) {
  document.getElementById('meta-id').value    = id;
  document.getElementById('meta-valor').value = valor;
  document.getElementById('modal-meta-title').textContent = 'Editar Meta';
  document.getElementById('modal-meta').classList.add('open');
}

async function deleteMeta(id) {
  if (!confirm('Excluir esta meta?')) return;
  try {
    await API.deleteMeta(id);
    showToast('success', 'Meta excluída!');
    await loadAll();
  } catch {
    showToast('error', 'Erro ao excluir meta');
  }
}