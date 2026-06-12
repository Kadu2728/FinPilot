/**
 * FinPilot — API Layer
 * Handles all communication with the FastAPI backend.
 * Base URL can be configured via the BASE_URL constant.
 */

// Base URL for the backend API.
// Configure this to the backend origin if you serve the frontend from a different host/port.
// Example: 'http://localhost:8000' or 'http://localhost:8000/api'.
const BASE_URL = 'https://finpilot-production-fd18.up.railway.app';

// ─── HTTP Helper ────────────────────────────────────────
async function request(method, endpoint, body = null, requiresAuth = true) {
  const headers = { 'Content-Type': 'application/json' };

  if (requiresAuth) {
    const token = localStorage.getItem('finpilot_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data     = await response.json().catch(() => ({}));

    if (response.status === 401) {
      // Token expired — clear session and redirect
      localStorage.removeItem('finpilot_token');
      localStorage.removeItem('finpilot_user');
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      console.error('API request failed', {
        method,
        url: `${BASE_URL}${endpoint}`,
        status: response.status,
        statusText: response.statusText,
        body: data,
      });

      let detail = data.detail;
      if (Array.isArray(detail)) {
        detail = detail.map(item => {
          if (item.loc && item.msg) {
            return `${item.loc.join('.')}: ${item.msg}`;
          }
          return JSON.stringify(item);
        }).join(' | ');
      } else if (typeof detail === 'object' && detail !== null) {
        detail = JSON.stringify(detail);
      }

      throw new Error(detail || `Erro ${response.status}: ${response.statusText}`);
    }

    return data;
  } catch (err) {
    console.error('API request error', { method, endpoint, error: err });
    if (err instanceof TypeError) {
      throw new Error('Erro de conexão: não foi possível alcançar o servidor em http://localhost:8000. Verifique se o backend está rodando e se você abriu a página via HTTP (não file://).');
    }
    throw err;
  }
}

// ─── API Module ─────────────────────────────────────────
const API = {

  /* ── Auth ── */
  login(email, password) {
    return request('POST', '/auth/login', { email, senha: password }, false);
  },
  register(nome, email, password) {
    return request('POST', '/auth/register', { nome, email, senha: password }, false);
  },
  updateProfile(nome) {
    return request('PUT', '/auth/me', { nome });
  },
  changePassword(senhaAtual, senhaNova) {
    return request('PUT', '/auth/password', { senha_atual: senhaAtual, senha_nova: senhaNova });
  },

  /* ── Receitas ── */
  getReceitas(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/receitas${qs ? '?' + qs : ''}`);
  },
  createReceita(data) {
    return request('POST', '/receitas', data);
  },
  updateReceita(id, data) {
    return request('PUT', `/receitas/${id}`, data);
  },
  deleteReceita(id) {
    return request('DELETE', `/receitas/${id}`);
  },

  /* ── Despesas ── */
  getDespesas(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/despesas${qs ? '?' + qs : ''}`);
  },
  createDespesa(data) {
    return request('POST', '/despesas', data);
  },
  updateDespesa(id, data) {
    return request('PUT', `/despesas/${id}`, data);
  },
  deleteDespesa(id) {
    return request('DELETE', `/despesas/${id}`);
  },

  /* ── Metas ── */
  getMetas() {
    return request('GET', '/metas');
  },
  createMeta(data) {
    return request('POST', '/metas', data);
  },
  updateMeta(id, data) {
    return request('PUT', `/metas/${id}`, data);
  },
  deleteMeta(id) {
    return request('DELETE', `/metas/${id}`);
  },

  /* ── Dashboard ── */
  getDashboard(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/dashboard${qs ? '?' + qs : ''}`);
  },

};

// ─── Toast Notifications ────────────────────────────────
const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  info:    '✓',
  warning: '⚠',
};

function showToast(type = 'info', title = '', message = '', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${TOAST_ICONS[type] || '✓'}</div>
    <div class="toast-content">
      ${title    ? `<div class="toast-title">${title}</div>` : ''}
      ${message  ? `<div class="toast-message">${message}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ─── Currency Formatter ─────────────────────────────────
function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Date Formatter ─────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

// ─── Today Date ─────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// ─── Debounce ───────────────────────────────────────────
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}