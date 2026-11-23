export function initDraft() {
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
}
