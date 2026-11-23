(() => {
  'use strict';
  const body = document.body;
  const key = `medki-draft-${body.dataset.user}`;
  // Tab-scoped storage: never save passwords or data in permanent localStorage.
  function storage(action) { try { return action(sessionStorage); } catch { return null; } }
  if (body.dataset.authenticated !== 'yes') {
    storage(s => { for (const k of Object.keys(s)) if (k.startsWith('medki-draft-')) s.removeItem(k); });
    return;
  }
  document.querySelector('form[action="/sair/"]')?.addEventListener('submit', () => storage(s => s.removeItem(key)));
  if (document.getElementById('notification-saved')) storage(s => s.removeItem(key));
  const form = document.getElementById('shortage-form');
  if (form) {
    const fields = ['patient', 'supply', 'shortage_date', 'note'];
    const raw = storage(s => s.getItem(key));
    try {
      if (raw && !form.querySelector('.errorlist')) {
        const draft = JSON.parse(raw);
        for (const name of fields) if (draft[name] !== undefined) form.elements[name].value = draft[name];
      }
    } catch { storage(s => s.removeItem(key)); }
    const save = () => storage(s => s.setItem(key, JSON.stringify(Object.fromEntries(fields.map(n => [n, form.elements[n].value])))));
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    form.addEventListener('submit', e => {
      save();
      if (!navigator.onLine) {
        e.preventDefault();
        document.getElementById('draft-status').textContent = 'Sem conexão. Seu rascunho está preservado nesta aba. Tente enviar ao recuperar a conexão.';
      }
    });
    window.addEventListener('offline', () => { save(); document.getElementById('draft-status').textContent = 'Conexão perdida. Rascunho preservado nesta aba.'; });
    window.addEventListener('online', () => { document.getElementById('draft-status').textContent = 'Conexão restabelecida. Revise os dados e envie quando desejar.'; });
  }
  const confirm = document.getElementById('shortage-confirm');
  confirm?.addEventListener('submit', () => {
    const b = confirm.querySelector('button');
    setTimeout(() => { b.disabled = true; b.textContent = 'Registrando…'; }, 0);
  });
  const dialog = document.getElementById('session-warning');
  let lastServerActivity = Date.now();
  const renew = document.getElementById('renew-session');
  async function renewSession() {
    const result = await fetch(renew.action, {method:'POST', body:new FormData(renew), credentials:'same-origin', headers:{'X-Requested-With':'XMLHttpRequest'}});
    if (!result.ok || result.redirected) throw new Error('Sessão indisponível. Entre novamente.');
    lastServerActivity = Date.now();
  }
  renew?.addEventListener('submit', async e => {
    e.preventDefault();
    try { await renewSession(); dialog.close(); } catch { document.getElementById('session-error').textContent = 'Não foi possível renovar. Confira a conexão ou entre novamente.'; }
  });
  // Renew only on real interaction, at most once per minute. Idle tabs do not keep sessions alive.
  let renewing = false;
  const interaction = async () => {
    if (!renewing && !dialog?.open && Date.now() - lastServerActivity > 60000) {
      renewing = true;
      try { await renewSession(); } catch {} finally { renewing = false; }
    }
  };
  for (const event of ['keydown', 'pointerdown']) document.addEventListener(event, interaction, {passive:true});
  setInterval(() => {
    const idle = Date.now() - lastServerActivity;
    if (idle > 28 * 60000 && dialog && !dialog.open) dialog.showModal();
    if (idle >= 30 * 60000) window.location.assign('/entrar/?expired=1');
  }, 10000);
})();
