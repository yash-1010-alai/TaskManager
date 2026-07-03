/* ======================================================
   NexTask — auth.js
   Handles login, register, password toggle, strength
   Connects to: POST /auth/login  POST /auth/register
   ====================================================== */

// ─── Helpers ───────────────────────────────────────────
function showAlert(id, msgId, message, type = 'error') {
  const el  = document.getElementById(id);
  const msg = document.getElementById(msgId);
  if (!el || !msg) return;
  el.className = `alert alert-${type} show`;
  msg.textContent = message;
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.classList.toggle('btn-loading', loading);
  btn.disabled = loading;
}

// ─── Password Toggle ───────────────────────────────────
function initPasswordToggle(toggleId, inputId) {
  const toggle = document.getElementById(toggleId);
  const input  = document.getElementById(inputId);
  if (!toggle || !input) return;
  let visible = false;
  toggle.addEventListener('click', () => {
    visible = !visible;
    input.type = visible ? 'text' : 'password';
    toggle.style.color = visible ? 'var(--purple-400)' : '';
  });
}

// ─── Password Strength ─────────────────────────────────
function initPasswordStrength(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('input', () => {
    const val = input.value;
    let score = 0;
    if (val.length >= 8)              score++;
    if (/[A-Z]/.test(val))           score++;
    if (/[0-9]/.test(val))           score++;
    if (/[^A-Za-z0-9]/.test(val))    score++;

    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong 💪'];

    for (let i = 1; i <= 4; i++) {
      const bar = document.getElementById(`pbar${i}`);
      if (bar) bar.style.background = i <= score ? colors[score] : 'rgba(255,255,255,0.08)';
    }
    const lbl = document.getElementById('pwdStrengthLabel');
    if (lbl) {
      lbl.textContent = val.length > 0 ? labels[score] : '';
      lbl.style.color = colors[score] || 'var(--text-muted)';
    }
  });
}

// ─── Login Form ────────────────────────────────────────
(function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  initPasswordToggle('toggleLoginPwd', 'loginPassword');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('loginAlert');

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      showAlert('loginAlert', 'loginAlertMsg', 'Please fill in all fields.');
      return;
    }

    setLoading('loginBtn', true);
    try {
      const res = await API.loginForm(email, password);
      const data = await res.json();

      if (!res.ok) {
        showAlert('loginAlert', 'loginAlertMsg', data.detail || 'Invalid credentials.');
        return;
      }

      API.setToken(data.access_token);

      // Fetch current user info
      const meRes  = await API.get('/auth/me');
      if (!meRes) {
        showAlert('loginAlert', 'loginAlertMsg', 'Authentication error. Please try again.');
        API.clearToken();
        return;
      }
      const meData = await meRes.json();
      if (!meRes.ok) {
        showAlert('loginAlert', 'loginAlertMsg', meData.detail || 'Failed to load user info.');
        API.clearToken();
        return;
      }
      API.setUser(meData);

      showToast('Welcome back, ' + meData.email + '! 🎉', 'success');
      setTimeout(() => { window.location.href = '/static/dashboard.html'; }, 800);

    } catch (err) {
      showAlert('loginAlert', 'loginAlertMsg', 'Network error. Is the server running?');
    } finally {
      setLoading('loginBtn', false);
    }
  });
})();

// ─── Register Form ─────────────────────────────────────
(function initRegister() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  initPasswordToggle('toggleRegPwd', 'regPassword');
  initPasswordStrength('regPassword');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('registerAlert');

    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const roleEl   = document.getElementById('regRole');
    const role     = roleEl ? roleEl.value : 'member';

    if (!email || !password) {
      showAlert('registerAlert', 'registerAlertMsg', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      showAlert('registerAlert', 'registerAlertMsg', 'Password must be at least 8 characters.');
      return;
    }

    setLoading('registerBtn', true);
    try {
      const res = await API.post('/auth/register', { email, password, role });
      const data = await res.json();

      if (!res.ok) {
        showAlert('registerAlert', 'registerAlertMsg', data.detail || 'Registration failed.');
        return;
      }

      showAlert('registerAlert', 'registerAlertMsg', '✓ Account created! Signing you in…', 'success');

      // Auto-login after register
      await new Promise(r => setTimeout(r, 800));
      const loginRes  = await API.loginForm(email, password);
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        API.setToken(loginData.access_token);
        const meRes  = await API.get('/auth/me');
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          API.setUser(meData);
          showToast('Account created successfully! 🚀', 'success');
          setTimeout(() => { window.location.href = '/static/dashboard.html'; }, 600);
        } else {
          // Token set but couldn't fetch user — store minimal data
          API.setUser({ email, role });
          setTimeout(() => { window.location.href = '/static/dashboard.html'; }, 600);
        }
      } else {
        showAlert('registerAlert', 'registerAlertMsg', 'Account created! Please log in.', 'success');
        setTimeout(() => { window.location.href = '/static/login.html'; }, 1200);
      }

    } catch (err) {
      showAlert('registerAlert', 'registerAlertMsg', 'Network error. Is the server running?');
    } finally {
      setLoading('registerBtn', false);
    }
  });
})();
