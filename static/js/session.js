export function initSession() {
  if (document.body.dataset.authenticated !== "yes") return;
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
}
