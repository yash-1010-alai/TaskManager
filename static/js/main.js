/* ======================================================
   NexTask — main.js
   Shared utilities: particles, navbar scroll, toasts, API
   ====================================================== */

// ─── Particle Canvas ───────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], animFrame;

  const COLORS = ['rgba(168,85,247,', 'rgba(99,102,241,', 'rgba(192,132,252,', 'rgba(129,140,248,'];
  const COUNT  = window.innerWidth < 768 ? 40 : 80;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 1.8 + 0.3;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
  }
  Particle.prototype.update = function() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < 0) this.x = W;
    if (this.x > W) this.x = 0;
    if (this.y < 0) this.y = H;
    if (this.y > H) this.y = 0;
  };
  Particle.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color + this.alpha + ')';
    ctx.fill();
  };

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(139,92,246,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    particles.forEach(p => { p.update(); p.draw(); });
    animFrame = requestAnimationFrame(loop);
  }

  resize();
  for (let i = 0; i < COUNT; i++) particles.push(new Particle());
  loop();
  window.addEventListener('resize', resize);
})();

// ─── Navbar Scroll Effect ──────────────────────────────
(function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
})();

// ─── Animated Counter ──────────────────────────────────
(function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      let start = 0;
      const step = Math.ceil(target / 50);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        el.textContent = start;
        if (start >= target) clearInterval(timer);
      }, 30);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
})();

// ─── Toast Notifications ───────────────────────────────
window.showToast = function(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span style="font-size:1rem;">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => { requestAnimationFrame(() => { toast.classList.add('show'); }); });
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
};

// ─── API Helper ────────────────────────────────────────
window.API = {
  BASE: window.location.origin,

  getToken() { return localStorage.getItem('nextoken'); },
  setToken(t) { localStorage.setItem('nextoken', t); },
  clearToken() { localStorage.removeItem('nextoken'); localStorage.removeItem('nexuser'); },

  getUser() {
    try { return JSON.parse(localStorage.getItem('nexuser')); } catch { return null; }
  },
  setUser(u) { localStorage.setItem('nexuser', JSON.stringify(u)); },

  async request(path, options = {}) {
    const token = this.getToken();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(this.BASE + path, { ...options, headers });
      if (res.status === 401) {
        this.clearToken();
        // Only redirect if on a protected page
        const page = document.body.id || '';
        const protectedPages = ['dashboardPage', 'tasksPage'];
        if (protectedPages.includes(page)) {
          window.location.href = '/static/login.html';
        }
        return null;
      }
      return res;
    } catch (err) {
      console.error('API request failed:', err);
      return null;
    }
  },

  async get(path)         { return this.request(path, { method: 'GET' }); },
  async post(path, body)  { return this.request(path, { method: 'POST',   body: JSON.stringify(body) }); },
  async put(path, body)   { return this.request(path, { method: 'PUT',    body: JSON.stringify(body) }); },
  async delete(path)      { return this.request(path, { method: 'DELETE' }); },

  // OAuth2PasswordRequestForm needs form-encoded body
  async loginForm(email, password) {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return fetch(this.BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
  }
};

// ─── Route Guard ───────────────────────────────────────
// Only blocks unauthenticated users from protected pages.
// Does NOT redirect logged-in users away from auth pages (user choice).
(function routeGuard() {
  const protectedPages = ['dashboardPage', 'tasksPage'];
  const page = document.body.id || '';
  const token = API.getToken();

  if (protectedPages.includes(page) && !token) {
    window.location.href = '/static/login.html';
  }
})();
