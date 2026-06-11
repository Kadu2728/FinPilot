/**
 * FinPilot — Relatórios JS
 * 6 Chart.js charts + KPI insights + period filters
 */

// ── Chart.js defaults ──────────────────────────────────────
Chart.defaults.color       = '#94A3B8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.padding  = 16;

// ── State ──────────────────────────────────────────────────
let allReceitas = [];
let allDespesas = [];
let activePeriod = 90;

const charts = {};

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initPeriodTabs();
  await loadData();
});

// ── Period Tabs ───────────────────────────────────────────
function initPeriodTabs() {
  document.querySelectorAll('.period-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePeriod = btn.dataset.period === 'all' ? 'all' : parseInt(btn.dataset.period);
      renderAll();
    });
  });
}

// ── Load ──────────────────────────────────────────────────
async function loadData() {
  try {
    const [rec, desp] = await Promise.all([
      API.getReceitas(),
      API.getDespesas(),
    ]);
    allReceitas = Array.isArray(rec)  ? rec  : (rec?.items  || []);
    allDespesas = Array.isArray(desp) ? desp : (desp?.items || []);
    renderAll();
  } catch {
    showToast('error', 'Erro ao carregar dados', 'Verifique o servidor.');
  }
}

// ── Filter by period ──────────────────────────────────────
function filterByPeriod(items, dateKey) {
  if (activePeriod === 'all') return items;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - activePeriod);
  return items.filter(item => {
    const d = new Date(item[dateKey] + 'T00:00:00');
    return d >= cutoff;
  });
}

// ── Render all ────────────────────────────────────────────
function renderAll() {
  const rec  = filterByPeriod(allReceitas, 'data_receita');
  const desp = filterByPeriod(allDespesas, 'data_despesa');

  updatePeriodoLabel();
  renderInsights(rec, desp);
  renderChartReceitasMes(rec);
  renderChartDespesasMes(desp);
  renderChartComparativo(rec, desp);
  renderChartEvolucao(rec, desp);
  renderTopCategorias(desp);
  renderDonutDesp(desp);
  renderDonutRec(rec);
}

function updatePeriodoLabel() {
  const el = document.getElementById('periodo-label');
  if (!el) return;
  if (activePeriod === 'all')  { el.textContent = 'Todo o período'; return; }
  if (activePeriod === 365)    { el.textContent = 'Últimos 12 meses'; return; }
  el.textContent = `Últimos ${activePeriod} dias`;
}

// ── Insights ──────────────────────────────────────────────
function renderInsights(rec, desp) {
  const totalR = rec.reduce((s, r) => s + parseFloat(r.valor || 0), 0);
  const totalD = desp.reduce((s, d) => s + parseFloat(d.valor || 0), 0);
  const saldo  = totalR - totalD;

  document.getElementById('ins-receita').textContent       = formatCurrency(totalR);
  document.getElementById('ins-receita-count').textContent = `${rec.length} lançamento${rec.length !== 1 ? 's' : ''}`;
  document.getElementById('ins-despesa').textContent       = formatCurrency(totalD);
  document.getElementById('ins-despesa-count').textContent = `${desp.length} lançamento${desp.length !== 1 ? 's' : ''}`;

  const saldoEl = document.getElementById('ins-saldo');
  saldoEl.textContent   = formatCurrency(saldo);
  saldoEl.style.color   = saldo >= 0 ? 'var(--green)' : 'var(--red)';

  // Melhor/Pior mês
  const mesesR = agruparPorMes(rec, 'data_receita');
  const mesesD = agruparPorMes(desp, 'data_despesa');
  const allMonths = new Set([...Object.keys(mesesR), ...Object.keys(mesesD)]);

  let melhor = null, melhorVal = -Infinity;
  let pior   = null, piorVal   = Infinity;

  allMonths.forEach(m => {
    const r = mesesR[m] || 0;
    const d = mesesD[m] || 0;
    const s = r - d;
    if (s > melhorVal) { melhorVal = s; melhor = m; }
    if (s < piorVal)   { piorVal   = s; pior   = m; }
  });

  if (melhor) {
    document.getElementById('ins-melhor').textContent     = formatMesLabel(melhor);
    document.getElementById('ins-melhor-val').textContent = formatCurrency(melhorVal);
  }
  if (pior) {
    document.getElementById('ins-pior').textContent     = formatMesLabel(pior);
    document.getElementById('ins-pior-val').textContent = formatCurrency(piorVal);
  }

  const nMeses = allMonths.size || 1;
  document.getElementById('ins-media').textContent = formatCurrency(saldo / nMeses);
}

// ── Chart: Receitas por Mês ───────────────────────────────
function renderChartReceitasMes(rec) {
  const ctx     = document.getElementById('chart-receitas-mes');
  const grouped = agruparPorMes(rec, 'data_receita');
  const labels  = Object.keys(grouped).sort();
  const data    = labels.map(l => grouped[l]);

  destroyChart('recMes');
  charts['recMes'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(formatMesLabel),
      datasets: [{
        label: 'Receitas',
        data,
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderColor: '#22C55E',
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: barOptions(v => formatCurrency(v)),
  });
}

// ── Chart: Despesas por Mês ───────────────────────────────
function renderChartDespesasMes(desp) {
  const ctx     = document.getElementById('chart-despesas-mes');
  const grouped = agruparPorMes(desp, 'data_despesa');
  const labels  = Object.keys(grouped).sort();
  const data    = labels.map(l => grouped[l]);

  destroyChart('despMes');
  charts['despMes'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.map(formatMesLabel),
      datasets: [{
        label: 'Despesas',
        data,
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderColor: '#EF4444',
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: barOptions(v => formatCurrency(v)),
  });
}

// ── Chart: Comparativo ────────────────────────────────────
function renderChartComparativo(rec, desp) {
  const ctx    = document.getElementById('chart-comparativo');
  const mesesR = agruparPorMes(rec, 'data_receita');
  const mesesD = agruparPorMes(desp, 'data_despesa');
  const allM   = [...new Set([...Object.keys(mesesR), ...Object.keys(mesesD)])].sort();

  destroyChart('comp');
  charts['comp'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allM.map(formatMesLabel),
      datasets: [
        {
          label: 'Receitas',
          data: allM.map(m => mesesR[m] || 0),
          backgroundColor: 'rgba(34,197,94,0.7)',
          borderColor: '#22C55E',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Despesas',
          data: allM.map(m => mesesD[m] || 0),
          backgroundColor: 'rgba(239,68,68,0.7)',
          borderColor: '#EF4444',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: barOptions(v => formatCurrency(v)),
  });
}

// ── Chart: Evolução Patrimonial ───────────────────────────
function renderChartEvolucao(rec, desp) {
  const ctx    = document.getElementById('chart-evolucao');
  const mesesR = agruparPorMes(rec, 'data_receita');
  const mesesD = agruparPorMes(desp, 'data_despesa');
  const allM   = [...new Set([...Object.keys(mesesR), ...Object.keys(mesesD)])].sort();

  let acum = 0;
  const data = allM.map(m => {
    acum += (mesesR[m] || 0) - (mesesD[m] || 0);
    return acum;
  });

  destroyChart('evolucao');
  charts['evolucao'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allM.map(formatMesLabel),
      datasets: [{
        label: 'Patrimônio Acumulado',
        data,
        borderColor: '#4F6EF7',
        backgroundColor: 'rgba(79,110,247,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#4F6EF7',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed.y)}` } },
      },
      scales: {
        x: { grid: { display: false } },
        y: { ticks: { callback: v => 'R$' + (v / 1000).toFixed(0) + 'k' } },
      },
    },
  });
}

// ── Top Categorias ────────────────────────────────────────
function renderTopCategorias(desp) {
  const el = document.getElementById('top-categorias-list');
  if (!el) return;

  const grouped = {};
  desp.forEach(d => {
    grouped[d.categoria || 'Outros'] = (grouped[d.categoria || 'Outros'] || 0) + parseFloat(d.valor || 0);
  });

  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max    = sorted[0]?.[1] || 1;

  if (sorted.length === 0) {
    el.innerHTML = '<p class="text-muted text-sm" style="padding:var(--space-4)">Nenhuma despesa no período.</p>';
    return;
  }

  el.innerHTML = sorted.map(([cat, val]) => `
    <div class="top-categoria-item">
      <div class="text-sm font-medium" style="min-width:120px;max-width:140px;truncate">${cat}</div>
      <div class="top-cat-bar-wrap">
        <div class="top-cat-bar" style="width:${(val/max)*100}%"></div>
      </div>
      <div class="text-sm font-semibold text-red" style="min-width:80px;text-align:right">${formatCurrency(val)}</div>
    </div>
  `).join('');
}

// ── Donut: Despesas ───────────────────────────────────────
function renderDonutDesp(desp) {
  const ctx = document.getElementById('chart-donut-desp');
  const grouped = {};
  desp.forEach(d => {
    grouped[d.categoria || 'Outros'] = (grouped[d.categoria || 'Outros'] || 0) + parseFloat(d.valor || 0);
  });

  destroyChart('donutD');
  charts['donutD'] = buildDonut(ctx, grouped, 'Gastos');
}

// ── Donut: Receitas ───────────────────────────────────────
function renderDonutRec(rec) {
  const ctx = document.getElementById('chart-donut-rec');
  const grouped = {};
  rec.forEach(r => {
    grouped[r.categoria || 'Outros'] = (grouped[r.categoria || 'Outros'] || 0) + parseFloat(r.valor || 0);
  });

  destroyChart('donutR');
  charts['donutR'] = buildDonut(ctx, grouped, 'Receitas');
}

function buildDonut(ctx, grouped, label) {
  const labels = Object.keys(grouped);
  const data   = Object.values(grouped);
  const colors = ['#4F6EF7','#22C55E','#EF4444','#F59E0B','#7C3AED','#3B82F6','#EC4899','#14B8A6','#F97316','#8B5CF6'];

  if (labels.length === 0) {
    return new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Sem dados'], datasets: [{ data: [1], backgroundColor: ['rgba(255,255,255,0.05)'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } } },
    });
  }

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: 'var(--bg-surface)',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '58%',
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
      },
    },
  });
}

// ── Helpers ───────────────────────────────────────────────
function agruparPorMes(items, dateKey) {
  const grouped = {};
  items.forEach(item => {
    const key = (item[dateKey] || '').substring(0, 7);
    if (!key) return;
    grouped[key] = (grouped[key] || 0) + parseFloat(item.valor || 0);
  });
  return grouped;
}

function formatMesLabel(key) {
  const [y, m] = key.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function barOptions(tooltipFn) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${tooltipFn(ctx.parsed.y)}` } },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: v => 'R$' + (v / 1000).toFixed(0) + 'k' },
      },
    },
  };
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}