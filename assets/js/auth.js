/**
 * FinPilot — Auth & Layout
 * Handles JWT session management and shared UI behaviours
 * (sidebar, mobile menu, logout).
 */

const Auth = {

  saveToken(token, user) {
    localStorage.setItem('finpilot_token', token);
    if (user) localStorage.setItem('finpilot_user', JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem('finpilot_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('finpilot_user')) || null;
    } catch {
      return null;
    }
  },

  saveUser(user) {
    localStorage.setItem('finpilot_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('finpilot_token');
    localStorage.removeItem('finpilot_user');
    window.location.href = 'login.html';
  },

  isLoggedIn() {
    return !!localStorage.getItem('finpilot_token');
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  /** Populate sidebar user info */
  initUserUI() {
    const user = this.getUser();
    if (!user) return;

    const initials = (user.nome || 'U')
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    const avatarEls = document.querySelectorAll('#user-avatar-initials');
    avatarEls.forEach(el => { el.textContent = initials; });

    const nameEls  = document.querySelectorAll('#sidebar-user-name');
    const emailEls = document.querySelectorAll('#sidebar-user-email');
    nameEls.forEach(el  => { el.textContent = user.nome  || '—'; });
    emailEls.forEach(el => { el.textContent = user.email || '—'; });
  },
};

// ─── Sidebar / Mobile Menu ──────────────────────────────
function initLayout() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const toggle   = document.getElementById('menu-toggle');
  const logoutBtn = document.getElementById('logout-btn');

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle?.addEventListener('click', () => {
    sidebar?.classList.contains('open') ? closeSidebar() : openSidebar();
  });

  overlay?.addEventListener('click', closeSidebar);

  logoutBtn?.addEventListener('click', () => {
    Auth.logout();
  });

  // Close sidebar on nav item click (mobile)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth < 768) closeSidebar();
    });
  });

  // Populate user info
  Auth.initUserUI();
}

// ─── Init on every protected page ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auth guard: only run on app pages (not login/register)
  const isAuthPage = document.querySelector('.auth-page');
  if (!isAuthPage) {
    if (!Auth.requireAuth()) return;
    initLayout();
  }

  // Set current month label on dashboard
  const monthLabel = document.getElementById('current-month-label');
  if (monthLabel) {
    monthLabel.textContent = new Date().toLocaleDateString('pt-BR', {
      month: 'long',
      year:  'numeric',
    });
  }
});