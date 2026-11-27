/* MedKi — painel: família/cuidador, Agente Comunitário de Saúde e farmácia (RF01–RF16), no design e nas animações do vídeo de referência */
(function () {
  "use strict";
  const D = window.MedKiDB;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const tela = $("#tela"), lado = $("#lado"), barra = $("#barra");
  const reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let usuario = null;
  const PERFIL = { notificante: "Familiar ou cuidador", acs: "Agente Comunitário de Saúde", farmacia: "Farmácia da unidade" };

  // ---------- ícones (traço fino, como no vídeo) ----------
  const sv = (d, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    casa: sv('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>'),
    quadro: sv('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 13h4l2-3 3 5 2-3h7"/>'),
    calendario: sv('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    assist: sv('<path d="M7.5 19.5 4 21l1.3-3.6A8 8 0 1 1 7.5 19.5z"/><path d="M9 11.5h6"/>'),
    chat: sv('<path d="M12 21a9 9 0 1 0-7.8-4.5L3 21l4.6-1.2A9 9 0 0 0 12 21z"/>'),
    pacientes: sv('<path d="M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="9.5" cy="8" r="3.5"/><path d="M17 11.5c1.5 0 2.5-1.2 2.5-2.6M18 20v-1.2c0-1.4-.7-2.6-1.8-3.3"/>'),
    farmacia: sv('<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>'),
    relatorio: sv('<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.4-.9-1.3-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.6-2.5-1.5M12 6.5V8M12 16v1.5"/>'),
    lista: sv('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="2.6"/>'),
    vincular: sv('<path d="M14 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 3 18.5V20"/><circle cx="8.5" cy="8" r="3.5"/><path d="M19 8v6M16 11h6"/>'),
    equipe: sv('<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>'),
    ajuda: sv('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="m6 6 3.5 3.5M14.5 14.5 18 18M18 6l-3.5 3.5M9.5 14.5 6 18"/>'),
    texto: sv('<path d="M4 18 9 6l5 12M5.8 14h6.4M15 18l3-7 3 7M15.8 16h4.4"/>'),
    sair: sv('<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/>'),
    sino: sv('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    grade: sv('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 13.5v6M13.5 16.5h6"/>'),
    busca: sv('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>'),
    mais: sv('<path d="M12 5v14M5 12h14"/>', 2),
    tres: sv('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>', 2),
    relogio: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    alerta: sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5M12 16h.01"/>', 2),
    ok: sv('<path d="m5 12 5 5L20 7"/>', 2.4),
    xis: sv('<path d="M6 6l12 12M18 6 6 18"/>'),
    caminhao: sv('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>'),
    caixa: sv('<path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8"/>'),
    doc: sv('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>'),
    usuario: sv('<circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>'),
    unidade: sv('<path d="M4 20V8l8-4 8 4v12"/><path d="M9 20v-5h6v5M12 8v4M10 10h4"/>'),
    seta: sv('<path d="M5 12h14M13 6l6 6-6 6"/>', 2),
    volta: sv('<path d="M19 12H5M11 6l-6 6 6 6"/>', 2),
    menu: sv('<path d="M4 7h16M4 12h16M4 17h16"/>', 2),
    painel: sv('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 4v16"/>'),
    gota: sv('<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>'),
    estetoscopio: sv('<path d="M6 3v5a4 4 0 0 0 8 0V3M10 12v2a5 5 0 0 0 10 0v-1"/><circle cx="20" cy="11" r="2"/>'),
    filtro: sv('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    enviar: sv('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.2),
    cruz: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    csv: sv('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 13l5 5M14.5 13l-5 5"/>'),
    impressora: sv('<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M7 14h10v6H7z"/>')
  };
  const ICO_STATUS = { "Pendente": I.relogio, "Em separação": I.caixa, "Saiu para entrega": I.caminhao, "Entregue": I.ok, "Cancelada": I.xis };
  const COR_CAT = { insulina: ["#dbeeff", "#0a6ff0"], antihipertensivo: ["#ffe0ea", "#c2386b"], fralda: ["#efe9ff", "#5a3fc9"], outro: ["#ffe7d6", "#c2610f"] };
  const CORES_AV = ["#1287ff", "#14b8a6", "#6a4bd8", "#f08c2e", "#e2557a", "#3b5bdb", "#0ea5e9", "#22a06b"];

  // ---------- utilitários ----------
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const data = d => new Date(d).toLocaleDateString("pt-BR");
  const dataCurta = d => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const dataHora = d => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const num = (v, c) => Number(v).toLocaleString("pt-BR", { minimumFractionDigits: c || 0, maximumFractionDigits: c || 0 });
  const cor = id => { let h = 0; String(id).split("").forEach(ch => { h = (h * 31 + ch.charCodeAt(0)) | 0; }); return CORES_AV[Math.abs(h) % CORES_AV.length]; };
  const ini = txt => esc(String(txt).replace(/[^A-Za-zÀ-ú]/g, "").slice(0, 1).toUpperCase());
  const av = (letra, id, g) => `<span class="av${g ? " av--g" : ""}" style="--av:${cor(id)}" aria-hidden="true">${letra}</span>`;
  const st = s => `<span class="st st--${D.CLASSE[s]}">${esc(s)}</span>`;
  const relativo = d => { const m = Math.round((Date.now() - new Date(d)) / 6e4); if (m < 60) return "há " + Math.max(1, m) + " min"; const h = Math.round(m / 60); if (h < 24) return "há " + h + " h"; const dd = Math.round(h / 24); return dd === 1 ? "ontem" : "há " + dd + " dias"; };
  const anuncia = msg => { $("#anuncio").textContent = msg; };
  const toast = (msg, tipo) => { MedKiToast(msg, tipo); anuncia(msg); };
  const achar = id => D.db().notificacoes.filter(n => n.id === id)[0];
  const entregaEm = n => { const h = n.historico.filter(x => x.status === "Entregue").pop(); return h ? new Date(h.data) : null; };
  const diasEntrega = n => { const e = entregaEm(n); return e ? Math.max(0, (e - new Date(n.criadoEm)) / 864e5) : null; };
  const primeiroNome = () => usuario.nome.split(" ")[0];

  // ---------- sessão (RF01, RNF06) ----------
  usuario = D.sessao();
  if (!usuario) { location.replace("entrar.html?destino=" + encodeURIComponent((location.hash || "#/").slice(1))); return; }
  let ultimoToque = 0, avisoAberto = false;
  ["click", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, () => { if (Date.now() - ultimoToque > 15000) { ultimoToque = Date.now(); D.tocarSessao(); } }, { passive: true }));
  setInterval(() => {
    const s = JSON.parse(localStorage.getItem("medki-sessao") || "null"); if (!s) { location.replace("entrar.html"); return; }
    const resta = 30 * 60000 - (Date.now() - s.ultimoUso), el = $("#sessao-resta");
    if (el) el.textContent = "Sessão: " + Math.max(0, Math.ceil(resta / 60000)) + " min";
    if (resta <= 0) { D.sair(); location.replace("entrar.html?expirou=1"); }
    else if (resta < 2 * 60000 && !avisoAberto) {
      avisoAberto = true;
      modal(`<h2 id="modal-t">Sua sessão vai terminar</h2><p class="sub" style="margin-top:10px">Por segurança, a sessão termina após 30 minutos sem uso. Deseja continuar conectado?</p><div class="modal__acoes"><button class="btn-p" type="button" id="m-sair">Sair</button><button class="btn-p btn-p--azul" type="button" id="m-fica">Continuar conectado</button></div>`, box => {
        $("#m-fica", box).addEventListener("click", () => { D.tocarSessao(); avisoAberto = false; fechaModal(); toast("Sessão prolongada por mais 30 minutos.", "ok"); });
        $("#m-sair", box).addEventListener("click", sair);
      });
    }
  }, 10000);
  function sair() { D.sair(); location.href = "../figma/index.html"; }

  // ---------- modal ----------
  let focoAntes = null;
  function modal(html, aoAbrir) { focoAntes = document.activeElement; const m = $("#modal"); $("#modal-corpo").innerHTML = html; m.hidden = false; const f = $("input, select, textarea, button:not(.modal__fechar)", m); if (f) f.focus(); if (aoAbrir) aoAbrir($("#modal-corpo")); }
  function fechaModal() { $("#modal").hidden = true; avisoAberto = false; if (focoAntes && focoAntes.focus) focoAntes.focus(); }
  document.addEventListener("click", e => { if (e.target.closest("[data-fecha-modal]")) fechaModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#modal").hidden) fechaModal(); fechaPops(); fechaLado(); } });

  // ---------- navegação lateral (pílula deslizante) ----------
  function itensNav() {
    const vis = D.visiveis(usuario), abertos = vis.filter(D.emAberto).length, atrasos = vis.filter(n => D.emAberto(n) && D.emAtraso(n)).length;
    if (usuario.perfil === "farmacia") return [
      ["Operação", [["#/", "inicio", "Início", I.casa], ["#/fila", "fila", "Fila de prioridade", I.lista, atrasos, true], ["#/avisos", "avisos", "Fluxo de entregas", I.quadro, abertos]]],
      ["Unidade", [["#/pacientes", "pacientes", "Pacientes", I.pacientes], ["#/indicadores", "indicadores", "Indicadores", I.relatorio]]]
    ].concat(usuario.responsavel ? [["Gestão", [["#/contas", "contas", "Contas da unidade", I.equipe], ["#/prazos", "prazos", "Prazos", I.relogio]]]] : []);
    if (usuario.perfil === "acs") return [
      ["Acompanhamento", [["#/", "inicio", "Início", I.casa], ["#/avisos", "avisos", "Avisos da microárea", I.quadro, abertos], ["#/historico", "historico", "Histórico", I.relatorio]]],
      ["Ações", [["#/falta/nova", "falta", "Avisar falta", I.assist], ["#/vincular", "vincular", "Vincular familiar", I.vincular]]],
      ["Cuidado", [["#/pacientes", "pacientes", "Pacientes", I.pacientes]]]
    ];
    return [
      ["Acompanhamento", [["#/", "inicio", "Início", I.casa], ["#/avisos", "avisos", "Meus avisos", I.quadro, abertos], ["#/historico", "historico", "Histórico", I.relatorio]]],
      ["Ações", [["#/falta/nova", "falta", "Avisar falta", I.assist]]],
      ["Cuidado", [["#/pacientes", "pacientes", "Pacientes", I.pacientes]]]
    ];
  }
  function montaLado() {
    const u = D.db().unidade;
    lado.innerHTML = `<div class="lado__topo"><a class="lado__logo" href="../figma/index.html" aria-label="MedKi — site">MedKi</a><button class="lado__btn" type="button" id="lado-fecha" aria-label="Fechar menu">${I.painel}</button></div>
      <div class="lado__unidade"><b>${esc(u.nome.split("·")[0].trim())}</b>${esc((u.nome.split("·")[1] || "").trim())}</div>
      <nav class="lado__nav" id="lado-nav" aria-label="Seções do painel"><span class="lado__pilula" id="pilula" aria-hidden="true"></span>
      ${itensNav().map(g => `<p class="lado__grupo">${g[0]}</p>` + g[1].map(it => `<a class="lado__item" href="${it[0]}" data-rota="${it[1]}">${it[3]}<span>${it[2]}</span>${it[4] ? `<span class="lado__conta${it[5] ? " lado__conta--alerta" : ""}">${it[4]}</span>` : ""}</a>`).join("")).join("")}
      </nav>
      <div class="lado__fim">
        <a class="lado__item" href="../figma/index.html">${I.grade}<span>Ir para o site</span></a>
        <a class="lado__item" href="ajuda.html">${I.ajuda}<span>Ajuda</span></a>
        <button class="lado__item" type="button" id="btn-sair">${I.sair}<span>Sair</span></button>
        <p class="lado__sessao" id="sessao-resta">Sessão: 30 min</p>
      </div>`;
    $("#btn-sair").addEventListener("click", sair);
    $("#lado-fecha").addEventListener("click", fechaLado);
    lado.addEventListener("click", e => { if (e.target.closest(".lado__item[href]")) fechaLado(); });
  }
  let pilulaPronta = false;
  function marcaLado(rota) {
    const nav = $("#lado-nav"); if (!nav) return;
    $$(".lado__item", nav).forEach(a => { const on = a.dataset.rota === rota; a.classList.toggle("is-on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    const on = $(".lado__item.is-on", nav), p = $("#pilula");
    if (!on) { p.style.opacity = "0"; return; }
    if (!pilulaPronta) { p.style.transition = "none"; }
    p.style.opacity = "1"; p.style.height = on.offsetHeight + "px"; p.style.transform = `translateY(${on.offsetTop}px)`;
    if (!pilulaPronta) { void p.offsetWidth; p.style.transition = ""; pilulaPronta = true; }
  }
  function abreLado() { lado.classList.add("is-aberto"); $("#lado-fundo").hidden = false; }
  function fechaLado() { lado.classList.remove("is-aberto"); const f = $("#lado-fundo"); if (f) f.hidden = true; }
  $("#lado-fundo").addEventListener("click", fechaLado);

  // ---------- barra superior ----------
  function montaBarra() {
    const acao = usuario.perfil === "farmacia" ? `<a class="btn-escuro" href="#/fila">${I.lista}<span class="txt">Abrir fila</span></a>` : `<a class="btn-escuro" href="#/falta/nova">${I.mais}<span class="txt">Avisar falta</span></a>`;
    barra.innerHTML = `<button class="ico-btn barra__menu" type="button" id="abre-lado" aria-label="Abrir menu">${I.menu}</button>
      <div class="barra__titulo"><h1 class="titulo-pg" id="titulo-pg"></h1><p class="barra__sub" id="sub-pg"></p></div>
      <label class="busca-app" id="busca">${I.busca}<span class="sr-only">Buscar aviso</span><input id="busca-inp" type="search" placeholder="Buscar aviso" autocomplete="off"><kbd>Ctrl K</kbd></label>
      <a class="ico-btn ico-btn--site" href="../figma/index.html" aria-label="Ir para o site" title="Ir para o site">${I.grade}</a>
      <div class="ancora"><button class="ico-btn" type="button" id="btn-sino" aria-label="Atualizações" aria-expanded="false">${I.sino}<span class="pontinho" id="sino-ponto" hidden></span></button></div>
      ${acao}
      <div class="ancora"><button class="avatar-eu" type="button" id="btn-eu" aria-label="Sua conta" aria-expanded="false">${ini(usuario.nome)}</button></div>`;
    $("#abre-lado").addEventListener("click", abreLado);
    // busca de avisos (Ctrl+K)
    const inp = $("#busca-inp"), box = $("#busca");
    const pinta = () => {
      const q = inp.value.trim().toLowerCase(); let r = $(".busca-res", box); if (r) r.remove(); if (!q) return;
      const res = D.visiveis(usuario).filter(n => { const p = D.paciente(n.pacienteId); return (n.insumo + " " + n.id + " " + p.id + " " + p.iniciais).toLowerCase().indexOf(q) >= 0; }).slice(0, 6);
      box.insertAdjacentHTML("beforeend", `<div class="busca-res" role="listbox">${res.length ? res.map((n, i) => `<a href="#/aviso/${n.id}" class="${i === 0 ? "is-foco" : ""}">${esc(n.insumo)}<small>${n.id} · ${esc(D.paciente(n.pacienteId).iniciais)} · ${esc(n.status)}</small></a>`).join("") : "<p>Nenhum aviso encontrado.</p>"}</div>`);
    };
    inp.addEventListener("input", pinta);
    inp.addEventListener("keydown", e => { if (e.key === "Enter") { const a = $(".busca-res a", box); if (a) { location.hash = a.getAttribute("href"); inp.value = ""; pinta(); inp.blur(); } } });
    box.addEventListener("click", e => { if (e.target.closest(".busca-res a")) { inp.value = ""; setTimeout(pinta, 0); } });
    document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inp.focus(); } });
    // atualizações
    $("#btn-sino").addEventListener("click", e => { e.stopPropagation(); alternaPop($("#btn-sino"), popSino); });
    $("#btn-eu").addEventListener("click", e => { e.stopPropagation(); alternaPop($("#btn-eu"), () => `<div class="pop__perfil"><b>${esc(usuario.nome)}</b>${esc(PERFIL[usuario.perfil])}${usuario.perfil === "acs" ? " · microárea " + esc(usuario.microarea) : ""}${usuario.responsavel ? " · responsável" : ""}<br>${esc(usuario.email)}</div><a class="pop__item" href="ajuda.html"><span class="tarefa__ico">${I.ajuda}</span><span>Ajuda<small>Guias e perguntas frequentes</small></span></a><a class="pop__item" href="#" id="pop-sair"><span class="tarefa__ico">${I.sair}</span><span>Sair<small>Encerrar a sessão</small></span></a>`); const s = $("#pop-sair"); if (s) s.addEventListener("click", ev => { ev.preventDefault(); sair(); }); });
    document.addEventListener("click", e => { if (!e.target.closest(".pop")) fechaPops(); if (!e.target.closest("#busca")) { const r = $(".busca-res"); if (r) r.remove(); } });
  }
  function eventos() {
    const ev = [];
    D.visiveis(usuario).forEach(n => n.historico.forEach(h => ev.push({ n, h })));
    return ev.sort((a, b) => new Date(b.h.data) - new Date(a.h.data));
  }
  function popSino() {
    const ev = eventos().filter(x => x.h.usuario !== usuario.id && Date.now() - new Date(x.h.data) < 7 * 864e5).slice(0, 6);
    return `<h3>Atualizações</h3>` + (ev.length ? ev.map(x => `<a class="pop__item" href="#/aviso/${x.n.id}"><span class="tarefa__ico">${ICO_STATUS[x.h.status] || I.relogio}</span><span>${esc(x.n.insumo)} · ${esc(x.h.status)}<small>${esc(D.paciente(x.n.pacienteId).iniciais)} · ${x.n.id} · ${relativo(x.h.data)}</small></span></a>`).join("") : `<p class="pop__vazio">Nenhuma atualização nos últimos 7 dias.</p>`);
  }
  function alternaPop(btn, conteudo) {
    const aberto = btn.getAttribute("aria-expanded") === "true"; fechaPops(); if (aberto) return;
    btn.setAttribute("aria-expanded", "true"); btn.parentNode.insertAdjacentHTML("beforeend", `<div class="pop">${conteudo()}</div>`);
  }
  function fechaPops() { $$(".pop").forEach(p => p.remove()); $$("#btn-sino, #btn-eu").forEach(b => b.setAttribute("aria-expanded", "false")); }
  function atualizaSino() { const p = $("#sino-ponto"); if (p) p.hidden = !eventos().some(x => x.h.usuario !== usuario.id && Date.now() - new Date(x.h.data) < 3 * 864e5); }

  let tituloAtual = "";
  function trocaTitulo(txt, sub) {
    const h = $("#titulo-pg"); $("#sub-pg").textContent = sub || "";
    if (txt === tituloAtual) return; tituloAtual = txt;
    const velho = h.querySelector("span:not(.t-sai)"), novo = document.createElement("span");
    novo.textContent = txt; novo.className = velho ? "t-entra" : ""; h.setAttribute("aria-label", txt);
    if (velho) { velho.className = "t-sai"; setTimeout(() => velho.remove(), 460); }
    h.appendChild(novo);
  }

  // ---------- animações de entrada (stagger com desfoque, barras, anéis e contadores) ----------
  function animaEntrada(raiz) {
    if (!reduz) $$("[data-a]", raiz).forEach((el, i) => { el.style.setProperty("--i", Math.min(i, 16)); el.classList.remove("a-entra"); void el.offsetWidth; el.classList.add("a-entra"); });
    const espera = reduz ? 0 : 320;
    setTimeout(() => {
      $$("[data-h]", raiz).forEach(b => { b.style.height = b.dataset.h; });
      $$("[data-w]", raiz).forEach(b => { b.style.width = b.dataset.w; });
      $$("[data-anel]", raiz).forEach(c => { c.style.strokeDashoffset = c.dataset.anel; });
      $$(".bolhas", raiz).forEach(b => b.classList.add("is-pronto"));
    }, espera);
    $$("[data-num]", raiz).forEach(el => {
      const alvo = parseFloat(el.dataset.num), c = +(el.dataset.casas || 0), suf = el.dataset.suf || "";
      if (reduz) { el.textContent = num(alvo, c) + suf; return; }
      let t0 = null; const passo = t => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 4); el.textContent = num(alvo * e, c) + suf; if (p < 1) requestAnimationFrame(passo); };
      el.textContent = num(0, c) + suf; setTimeout(() => requestAnimationFrame(passo), espera);
    });
  }

  // ---------- peças reutilizáveis ----------
  const kpis = itens => `<section class="card kpis" data-a="topo" aria-label="Resumo">${itens.map(k => `<div class="kpi"><span class="ico-q">${k[0]}</span><div class="kpi__txt"><small>${k[1]}</small><b><span data-num="${k[2]}" data-casas="${k[3] || 0}">${num(k[2], k[3] || 0)}</span>${k[4] ? `<em>${k[4]}</em>` : ""}</b></div>${k[5] ? `<span class="chip-s chip-s--${k[5][1]}">${k[5][0]}</span>` : ""}</div>`).join("")}</section>`;
  const cab = (ico, titulo, extra, link, escuro) => `<div class="card__cab"><span class="ico-q${escuro ? " ico-q--claro" : ""}">${ico}</span><h2>${titulo}</h2>${extra || ""}${link ? `<a class="card__mais" href="${link}" aria-label="Ver mais: ${titulo}">${I.tres}</a>` : ""}</div>`;
  function notaPrio(n) {
    const p = D.prioridade(n), nv = D.nivel(p.total), cls = { "Muito alta": "muito", "Alta": "alta", "Média": "media", "Normal": "normal" }[nv];
    return `<span class="prio-nota prio-nota--${cls}" title="Prioridade: ${p.peso} (insumo) + ${p.dias} (dias) + ${p.extra} (5+ remédios)"><b>${p.total}</b><small>${nv}</small></span>`;
  }
  const trilha = n => { if (n.status === "Cancelada") return ""; const i = D.STATUS.indexOf(n.status); return `<div class="trilha" aria-label="Etapa ${i + 1} de 4">${D.STATUS.map((s, k) => `<span class="${k <= i ? "is-on" : ""}${k <= i && i === 3 ? " is-fim" : ""}" title="${s}"></span>`).join("")}</div>`; };
  function botaoAvancar(n, bloco) {
    const nx = D.proximo(n); if (!nx || usuario.perfil !== "farmacia") return "";
    return `<button class="btn-p btn-p--azul${bloco ? " btn-p--bloco" : ""}" type="button" data-avancar="${n.id}">${({ "Em separação": "Iniciar separação", "Saiu para entrega": "Saiu para entrega", "Entregue": "Confirmar entrega" })[nx]}</button>`;
  }
  function acoesAviso(n, compacto) {
    let h = botaoAvancar(n, compacto);
    if (usuario.perfil === "farmacia" && n.status === "Saiu para entrega") h += `<button class="btn-p" type="button" data-sem-sucesso="${n.id}">Sem sucesso</button>`;
    if (D.podeCancelar(n, usuario)) h += `<button class="btn-p btn-p--perigo" type="button" data-cancelar="${n.id}">${usuario.perfil === "farmacia" ? "Cancelar" : "Cancelar aviso"}</button>`;
    return h;
  }

  // ações (ligadas uma única vez na tela)
  tela.addEventListener("click", e => {
    let b = e.target.closest("[data-avancar]");
    if (b) { e.preventDefault(); const n = achar(b.dataset.avancar), r = D.avancar(n, usuario); if (r.erro) toast(r.erro, "erro"); else { toast("Status atualizado: " + n.status + ".", "ok"); recarrega(); } return; }
    b = e.target.closest("[data-sem-sucesso]"); if (b) { e.preventDefault(); semSucesso(achar(b.dataset.semSucesso)); return; }
    b = e.target.closest("[data-cancelar]"); if (b) { e.preventDefault(); cancelar(achar(b.dataset.cancelar)); }
  });
  function semSucesso(n) {
    modal(`<h2 id="modal-t">Tentativa sem sucesso</h2><p class="sub" style="margin-top:10px">O aviso volta para <b>Pendente</b> e retorna à fila com a prioridade mantida.</p><div class="campo" style="margin-top:16px"><label for="m-nota">O que aconteceu? (opcional)</label><input class="inp" id="m-nota" placeholder="Ex.: ninguém em casa"></div><div class="modal__acoes"><button class="btn-p" type="button" data-fecha-modal>Voltar</button><button class="btn-p btn-p--azul" type="button" id="m-ok">Registrar tentativa</button></div>`, box => {
      $("#m-ok", box).addEventListener("click", () => { const r = D.semSucesso(n, usuario, $("#m-nota", box).value.trim()); fechaModal(); if (r.erro) toast(r.erro, "erro"); else { toast("Tentativa registrada. O aviso voltou para a fila.", "ok"); recarrega(); } });
    });
  }
  function cancelar(n) {
    const obriga = usuario.perfil === "farmacia";
    modal(`<h2 id="modal-t">Cancelar aviso</h2><p class="sub" style="margin-top:10px">${esc(n.insumo)} · paciente ${esc(n.pacienteId)}. Um aviso cancelado não pode ser reaberto; se faltar de novo, será preciso um novo aviso.</p><div class="campo" style="margin-top:16px"><label for="m-motivo">Motivo${obriga ? " (obrigatório)" : " (opcional)"}</label><textarea class="inp" id="m-motivo" placeholder="${obriga ? "Ex.: medicamento substituído pela equipe médica" : "Ex.: o remédio chegou por outro meio"}"></textarea></div><div class="modal__acoes"><button class="btn-p" type="button" data-fecha-modal>Manter aviso</button><button class="btn-p btn-p--escuro" type="button" id="m-ok">Cancelar aviso</button></div>`, box => {
      $("#m-ok", box).addEventListener("click", () => { const r = D.cancelar(n, usuario, $("#m-motivo", box).value); if (r.erro) { const c = $("#m-motivo", box).closest(".campo"); c.classList.add("erro"); if (!$(".msg-erro", c)) c.insertAdjacentHTML("beforeend", `<span class="msg-erro">${esc(r.erro)}</span>`); $("#m-motivo", box).focus(); return; } fechaModal(); toast("Aviso cancelado.", "ok"); recarrega(); });
    });
  }

  // ---------- telas ----------
  const R = {};

  // Início (dashboard)
  R.inicio = () => {
    const vis = D.visiveis(usuario), abertos = D.fila(vis.filter(D.emAberto)), atras = abertos.filter(n => D.emAtraso(n));
    const ent = vis.filter(n => n.status === "Entregue"), tempos = ent.map(diasEntrega).filter(x => x != null);
    const media = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0, noPrazo = tempos.filter(x => x <= 7).length, pct = tempos.length ? Math.round(noPrazo / tempos.length * 100) : 0;
    const pacs = D.pacientesDe(usuario).length, farm = usuario.perfil === "farmacia";
    let h = kpis([
      [I.doc, farm ? "Avisos na fila" : "Avisos em aberto", abertos.length, 0, abertos.length === 1 ? " aviso" : " avisos", atras.length ? [atras.length + " em atraso", "alerta"] : ["em dia", "ok"]],
      [I.relogio, "Tempo médio até a entrega", media, 1, " dias", [media <= 7 ? "no prazo" : "acima de 7 dias", media <= 7 ? "ok" : "aviso"]],
      [I.caminhao, "Entregas no prazo", pct, 0, "%/100", ["meta 7 dias", "info"]],
      [I.pacientes, farm ? "Pacientes na unidade" : "Pacientes", pacs, 0, farm ? "" : "/" + pacs, [farm ? "cadastrados" : usuario.perfil === "acs" ? "na microárea" : "vinculados", "info"]]
    ]);
    // tabela de avisos (como "Live Occupancy")
    const lista = abertos.concat(vis.filter(n => !D.emAberto(n)).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))).slice(0, 6);
    const cont = s => abertos.filter(n => n.status === s).length;
    const resumo = [cont("Pendente") + " pendente(s)", cont("Em separação") + " em separação", cont("Saiu para entrega") + " a caminho"].join(", ");
    h += `<div class="grade-dash-1"><section class="card" data-a>${cab(I.quadro, farm ? "Avisos mais urgentes" : "Avisos em andamento", `<span class="chip-n">${abertos.length}</span><small>${resumo}</small>`, farm ? "#/fila" : "#/avisos")}
      <div class="tab-wrap"><table class="tab-app"><thead><tr><th>Paciente</th><th>Insumo</th><th class="ocultar-m">Registrado por</th><th>Status</th><th>Protocolo</th></tr></thead><tbody>
      ${lista.length ? lista.map(n => { const p = D.paciente(n.pacienteId), por = D.usuario(n.criadoPor) || { nome: "—" }; return `<tr data-a="linha"><td><a class="cel-pessoa" href="#/aviso/${n.id}">${av(ini(p.iniciais), p.id)}<span>${esc(p.iniciais)}<small>${p.id}</small></span></a></td><td>${esc(n.insumo)}</td><td class="ocultar-m"><span class="cel-pessoa" style="font-weight:400">${av(ini(por.nome), por.id || "x")}${esc(por.nome.split(" ")[0])}</span></td><td>${st(n.status)}${D.emAtraso(n) ? ' <span class="st st--atraso">Em atraso</span>' : ""}</td><td class="mono">${n.id}</td></tr>`; }).join("") : `<tr><td colspan="5"><div class="vazio"><b>Nenhum aviso por aqui</b>Quando um remédio de uso contínuo faltar, use “Avisar falta”.</div></td></tr>`}
      </tbody></table></div></section>`;
    // gráfico de entregas por mês (como "Peak Activity")
    const meses = []; for (let k = 5; k >= 0; k--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); meses.push(d); }
    const porMes = meses.map(m => ent.filter(n => { const e = entregaEm(n); return e && e.getMonth() === m.getMonth() && e.getFullYear() === m.getFullYear(); }).length);
    const max = Math.max(1, ...porMes), topo = Math.max(4, Math.ceil(max / 2) * 2), imax = porMes.indexOf(Math.max(...porMes));
    h += `<section class="card" data-a>${cab(I.relogio, "Entregas por mês", "", farm ? "#/indicadores" : "#/historico")}
      <div class="mini-stats"><div class="mini-stat"><b>2 dias úteis</b><small>1ª resposta</small></div><div class="mini-stat"><b>7 dias</b><small>prazo de entrega</small></div><div class="mini-stat"><b>${num(media, 1)} dias</b><small>média ${farm ? "da unidade" : "das suas"}</small></div></div>
      <div class="barras-v"><div class="barras-v__eixo"><span>${topo}</span><span>${topo / 2}</span><span>0</span></div><div class="barras-v__area">
      ${meses.map((m, i) => `<div class="barras-v__col"><div class="barras-v__barra${i === imax && porMes[i] ? " is-alto" : ""}" data-h="${Math.max(6, porMes[i] / topo * 100)}%" title="${porMes[i]} entrega(s)"></div><span>${m.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>`).join("")}
      </div></div>
      <div class="faixa-grad"><span data-w="${pct}%"></span></div><div class="faixa-grad__leg"><span>Fora do prazo</span><span>${pct}% no prazo</span></div></section></div>`;
    // calendário, bolhas e atualizações
    h += `<div class="grade-dash-2">${calendario(vis)}${bolhas(vis)}${atualizacoes()}</div>`;
    tela.innerHTML = h;
  };

  function calendario(vis) {
    const hoje = new Date(), ano = hoje.getFullYear(), mes = hoje.getMonth(), dias = new Date(ano, mes + 1, 0).getDate(), ini0 = new Date(ano, mes, 1).getDay();
    const chave = d => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
    const abertos = {}, entregues = {};
    vis.forEach(n => { const c = new Date(n.criadoEm); abertos[chave(c)] = (abertos[chave(c)] || 0) + 1; const e = entregaEm(n); if (e) entregues[chave(e)] = 1; });
    let cel = ["D", "S", "T", "Q", "Q", "S", "S"].map(d => `<span class="cal__dia-s">${d}</span>`).join("");
    for (let i = 0; i < ini0; i++) cel += `<span class="cal__d cal__d--vazio"></span>`;
    for (let d = 1; d <= dias; d++) {
      const dt = new Date(ano, mes, d), k = chave(dt), w = dt.getDay(), passado = d < hoje.getDate();
      let cls = "cal__d", txt = d, tit = "";
      if (d === hoje.getDate()) { cls += " cal__d--hoje"; tit = "Hoje"; }
      else if (!passado) cls += " cal__d--futuro";
      else if (entregues[k]) { cls += " cal__d--ok"; txt = I.ok; tit = "Entrega realizada"; }
      else if (abertos[k]) { cls += " cal__d--aviso"; tit = abertos[k] + " aviso(s) registrado(s)"; }
      else if (w === 0 || w === 6) { cls += " cal__d--fds"; tit = "Fim de semana: não conta no prazo de dias úteis"; }
      cel += `<span class="${cls}"${tit ? ` title="${tit}"` : ""}>${txt}</span>`;
    }
    const nomeMes = hoje.toLocaleDateString("pt-BR", { month: "long" });
    return `<section class="card card--escuro" data-a>${cab(I.calendario, nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1) + " de " + ano, "", null, true)}<div class="cal" aria-label="Calendário do mês">${cel}</div>
      <div class="cal__leg"><span><i style="background:rgba(255,255,255,.5)"></i>Aviso</span><span><i style="background:rgba(255,255,255,.25)"></i>Entrega</span><span><i style="background:var(--azul)"></i>Hoje</span></div></section>`;
  }
  function bolhas(vis) {
    const tot = vis.length || 1, cats = Object.keys(D.CATEGORIAS).map(k => [k, vis.filter(n => n.categoria === k).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
    const pos = [["2%", "8%"], ["56%", "0%"], ["40%", "60%"], ["80%", "52%"]];
    return `<section class="card" data-a>${cab(I.gota, "Avisos por insumo", "", usuario.perfil === "farmacia" ? "#/indicadores" : "#/historico")}<div class="bolhas" role="img" aria-label="${cats.map(c => D.CATEGORIAS[c[0]].nome + " " + Math.round(c[1] / tot * 100) + "%").join(", ")}">
      ${cats.map((c, i) => { const p = Math.round(c[1] / tot * 100), s = Math.max(34, Math.round(Math.sqrt(p / 100) * 160)), co = COR_CAT[c[0]]; return `<span class="bolha" style="left:${pos[i][0]};top:${pos[i][1]};width:${s}px;height:${s}px;background:${co[0]};color:${co[1]};font-size:${s > 80 ? "1.15rem" : ".72rem"};transition-delay:${i * 120}ms">${p}%</span>`; }).join("")}
      </div><div class="leg-pilulas">${cats.map(c => `<span><i style="background:${COR_CAT[c[0]][1]}"></i>${D.CATEGORIAS[c[0]].nome}</span>`).join("")}</div></section>`;
  }
  function atualizacoes() {
    const ev = eventos().slice(0, 5);
    return `<section class="card" data-a>${cab(I.sino, "Atualizações", `<span class="chip-n">${ev.length}</span>`, usuario.perfil === "farmacia" ? "#/fila" : "#/avisos")}<div class="tarefas">
      ${ev.length ? ev.map(x => { const urg = D.emAberto(x.n) && D.emAtraso(x.n); return `<div class="tarefa"><span class="tarefa__ico">${ICO_STATUS[x.h.status] || I.relogio}</span><div><b>${esc(x.n.insumo)} · ${esc(x.h.status)}</b><small>${esc(D.paciente(x.n.pacienteId).iniciais)} · ${x.n.id} · ${relativo(x.h.data)}</small></div><a class="btn-p${urg ? " btn-p--escuro" : ""}" href="#/aviso/${x.n.id}">${urg ? (usuario.perfil === "farmacia" ? "Atender" : "Acompanhar") : "Ver"}</a></div>`; }).join("") : `<div class="vazio">Nenhuma atualização ainda.</div>`}
      </div></section>`;
  }

  // Quadro de avisos (como "Patient Flow")
  const foco = { grupo: "", cat: "", marca: "" };
  R.avisos = () => {
    const farm = usuario.perfil === "farmacia", vis = D.visiveis(usuario), abertos = D.fila(vis.filter(D.emAberto));
    const ent30 = vis.filter(n => n.status === "Entregue" && Date.now() - entregaEm(n) < 30 * 864e5).sort((a, b) => entregaEm(b) - entregaEm(a));
    const t30 = ent30.map(diasEntrega), media30 = t30.length ? t30.reduce((a, b) => a + b, 0) / t30.length : 0, ok30 = t30.filter(x => x <= 7).length, pct30 = t30.length ? Math.round(ok30 / t30.length * 100) : 0;
    const atras = abertos.filter(n => D.emAtraso(n)), semana = abertos.filter(n => Date.now() - new Date(n.criadoEm) < 7 * 864e5).length;
    const diasMed = abertos.length ? abertos.reduce((a, n) => a + D.diasSem(n), 0) / abertos.length : 0;
    let h = kpis([
      [I.doc, "Em aberto agora", abertos.length, 0, abertos.length === 1 ? " aviso" : " avisos", ["+" + semana + " nesta semana", "info"]],
      [I.relogio, "Média de dias sem o insumo", diasMed, 1, " dias", [diasMed <= 7 ? "dentro do prazo" : "acima do prazo", diasMed <= 7 ? "ok" : "aviso"]],
      [I.alerta, "Em atraso", atras.length, 0, "", atras.length ? ["prazo vencido", "alerta"] : ["nenhum", "ok"]],
      [I.caminhao, "Entregues em 30 dias", ent30.length, 0, "", [pct30 + "% no prazo", "ok"]]
    ]);
    const grupos = farm ? Array.from(new Set(abertos.map(n => D.paciente(n.pacienteId).microarea))).sort().map(a => ["area:" + a, "Microárea " + a]) : D.pacientesDe(usuario).map(p => ["pac:" + p.id, p.iniciais + " · " + p.id]);
    const conta = f => abertos.filter(f).length;
    h += `<div class="filtros-chip" data-a role="group" aria-label="Filtrar por ${farm ? "microárea" : "paciente"}"><button class="fchip${!foco.grupo ? " is-on" : ""}" type="button" data-grupo="">Todos</button>${grupos.map(g => `<button class="fchip${foco.grupo === g[0] ? " is-on" : ""}" type="button" data-grupo="${g[0]}">${esc(g[1])}</button>`).join("")}<span class="filtros-sep"></span>
      <label class="sr-only" for="f-cat">Insumo</label><select class="filtro-sel" id="f-cat"><option value="">Insumo: todos</option>${Object.keys(D.CATEGORIAS).map(k => `<option value="${k}"${foco.cat === k ? " selected" : ""}>${D.CATEGORIAS[k].nome}</option>`).join("")}</select>
      <span class="mostrando" id="mostrando"></span></div>
      <div class="filtros-chip" data-a role="group" aria-label="Destacar avisos">${[["atraso", "Em atraso", conta(n => D.emAtraso(n))], ["alta", "Prioridade alta", conta(n => D.prioridade(n).total >= 8)], ["Pendente", "Pendente", conta(n => n.status === "Pendente")], ["Em separação", "Em separação", conta(n => n.status === "Em separação")], ["Saiu para entrega", "Saiu para entrega", conta(n => n.status === "Saiu para entrega")]].map(m => `<button class="fchip fchip--linha${foco.marca === m[0] ? " is-on" : ""}" type="button" data-marca="${m[0]}">${m[1]} <span class="chip-n">${m[2]}</span></button>`).join("")}</div>`;
    const colunas = [["Pendente", "resposta em 2 dias úteis"], ["Em separação", "em preparo"], ["Saiu para entrega", "a caminho"]];
    h += `<div class="quadro">` + colunas.map(c => { const itens = abertos.filter(n => n.status === c[0]); return `<section class="coluna" data-a aria-label="${c[0]}"><div class="coluna__cab"><h3>${c[0]}</h3><span class="chip-n">${itens.length}</span><small>${c[1]}</small></div>${itens.length ? itens.map(cartaoQuadro).join("") : `<p class="coluna__vazio">Nenhum aviso nesta etapa.</p>`}${c[0] === "Pendente" && !farm ? `<a class="coluna__add" href="#/falta/nova">+ Avisar falta</a>` : ""}</section>`; }).join("") +
      `<section class="coluna coluna--fim" data-a aria-label="Entregues"><div class="coluna__cab"><h3>Entregues</h3><span class="chip-n">${ent30.length}</span><small>últimos 30 dias</small></div>
      <div class="resumo-col"><h4>Até agora</h4><p>Entregues <b>${ent30.length}</b></p><p>No prazo de 7 dias <b>${ok30}</b></p><p>Tempo médio <b>${num(media30, 1)} dias</b></p><div class="progresso"><span data-w="${pct30}%"></span></div><p style="font-size:.76rem">${pct30}% entregues no prazo</p></div>
      ${ent30.slice(0, 3).map(n => { const p = D.paciente(n.pacienteId), d = diasEntrega(n); return `<a class="cartao-av" href="#/aviso/${n.id}" data-pac="${p.id}" data-area="${p.microarea}" data-cat="${n.categoria}"><div class="cartao-av__topo">${av(ini(p.iniciais), p.id)}<div><b>${esc(n.insumo)}</b><small>${esc(p.iniciais)} · ${p.id}</small></div></div><div class="cartao-av__meta"><span>${dataCurta(entregaEm(n))}</span><span class="tempo ${d <= 7 ? "tempo--ok" : ""}">${I.relogio}${num(d, 0)} d</span></div></a>`; }).join("")}</section></div>`;
    tela.innerHTML = h;
    aplicaFoco();
    tela.querySelectorAll("[data-grupo]").forEach(b => b.addEventListener("click", () => { foco.grupo = b.dataset.grupo; $$("[data-grupo]", tela).forEach(x => x.classList.toggle("is-on", x === b)); aplicaFoco(); }));
    tela.querySelectorAll("[data-marca]").forEach(b => b.addEventListener("click", () => { foco.marca = foco.marca === b.dataset.marca ? "" : b.dataset.marca; $$("[data-marca]", tela).forEach(x => x.classList.toggle("is-on", x.dataset.marca === foco.marca)); aplicaFoco(); }));
    $("#f-cat").addEventListener("change", e => { foco.cat = e.target.value; aplicaFoco(); });
  };
  function cartaoQuadro(n) {
    const p = D.paciente(n.pacienteId), atr = D.emAtraso(n), dias = D.diasSem(n), pr = D.prioridade(n);
    const nota = atr ? `<div class="nota-alerta">${I.alerta}<span>${n.status === "Pendente" ? "Sem resposta da farmácia no prazo de 2 dias úteis." : "Passou do prazo de 7 dias para a entrega."} ${usuario.perfil === "farmacia" ? "Priorize este aviso." : "A farmácia já foi alertada."}</span></div>` : (n.tentativas ? `<div class="nota-alerta">${I.alerta}<span>${n.tentativas} tentativa(s) de entrega sem sucesso.</span></div>` : "");
    let acoes = acoesAviso(n, true);
    if (!acoes && n.status === "Saiu para entrega") acoes = `<a class="btn-p btn-p--azul btn-p--bloco" href="#/aviso/${n.id}">Acompanhar entrega</a>`;
    return `<article class="cartao-av" data-id="${n.id}" data-pac="${p.id}" data-area="${p.microarea}" data-cat="${n.categoria}" data-status="${n.status}" data-atraso="${atr ? 1 : 0}" data-alta="${pr.total >= 8 ? 1 : 0}">
      <div class="cartao-av__topo">${av(ini(p.iniciais), p.id)}<a href="#/aviso/${n.id}"><b>${esc(n.insumo)}</b><small>${esc(p.iniciais)} · ${p.id}${usuario.perfil === "farmacia" ? " · microárea " + esc(p.microarea) : ""}</small></a></div>
      <div class="cartao-av__meta"><span class="mono">${n.id}</span><span class="tempo${atr ? " tempo--alerta" : ""}" title="Dias sem o insumo">${I.relogio}${dias} d</span><span title="Prioridade">prioridade ${pr.total}</span></div>
      ${nota}${acoes ? `<div class="cartao-av__acoes">${acoes}</div>` : ""}</article>`;
  }
  function aplicaFoco() {
    const cards = $$(".cartao-av[data-pac]", tela); let vis = 0;
    cards.forEach(c => {
      const g = foco.grupo, okG = !g || (g.indexOf("pac:") === 0 ? c.dataset.pac === g.slice(4) : c.dataset.area === g.slice(5));
      const okC = !foco.cat || c.dataset.cat === foco.cat;
      const m = foco.marca, okM = !m || (m === "atraso" ? c.dataset.atraso === "1" : m === "alta" ? c.dataset.alta === "1" : c.dataset.status === m);
      const ok = okG && okC && okM; c.classList.toggle("is-apagado", !ok); if (ok && c.dataset.id) vis++;
    });
    const tot = cards.filter(c => c.dataset.id).length, el = $("#mostrando"); if (el) el.textContent = `Mostrando ${vis} de ${tot} avisos`;
  }

  // Fila de prioridade (farmácia, RF08/RF09)
  const filtro = { status: "", categoria: "", microarea: "", atraso: false };
  R.fila = () => {
    if (usuario.perfil !== "farmacia") { location.hash = "#/"; return; }
    const areas = Object.keys(D.db().pacientes.reduce((o, p) => { o[p.microarea] = 1; return o; }, {})).sort();
    const todos = D.fila(D.visiveis(usuario).filter(D.emAberto));
    const lista = todos.filter(n => { const p = D.paciente(n.pacienteId); return (!filtro.status || n.status === filtro.status) && (!filtro.categoria || n.categoria === filtro.categoria) && (!filtro.microarea || p.microarea === filtro.microarea) && (!filtro.atraso || D.emAtraso(n)); });
    tela.innerHTML = `<form class="filtros-chip" id="filtros" data-a aria-label="Filtrar a fila" onsubmit="return false">
        <label class="sr-only" for="f-st">Status</label><select class="filtro-sel" id="f-st"><option value="">Status: todos em aberto</option>${D.STATUS.slice(0, 3).map(s => `<option${filtro.status === s ? " selected" : ""}>${s}</option>`).join("")}</select>
        <label class="sr-only" for="f-cat2">Insumo</label><select class="filtro-sel" id="f-cat2"><option value="">Insumo: todos</option>${Object.keys(D.CATEGORIAS).map(k => `<option value="${k}"${filtro.categoria === k ? " selected" : ""}>${D.CATEGORIAS[k].nome}</option>`).join("")}</select>
        <label class="sr-only" for="f-area">Microárea</label><select class="filtro-sel" id="f-area"><option value="">Microárea: todas</option>${areas.map(a => `<option value="${a}"${filtro.microarea === a ? " selected" : ""}>Microárea ${a}</option>`).join("")}</select>
        <button class="fchip fchip--linha${filtro.atraso ? " is-on" : ""}" type="button" id="f-atr" aria-pressed="${filtro.atraso}">Só em atraso <span class="chip-n">${todos.filter(n => D.emAtraso(n)).length}</span></button>
        <span class="mostrando" aria-live="polite">${lista.length} de ${todos.length} avisos</span></form>
      <section class="card" data-a style="margin-top:14px">${cab(I.lista, "Fila por prioridade", `<span class="chip-n">${lista.length}</span><small>recalculada todo dia · empate: o mais antigo primeiro</small>`)}
      <div class="tab-wrap"><table class="tab-app"><thead><tr><th>Prioridade</th><th>Insumo</th><th>Paciente</th><th class="ocultar-m">Sem o insumo</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${lista.length ? lista.map(n => { const p = D.paciente(n.pacienteId), atr = D.emAtraso(n); return `<tr class="fila-linha" data-a="linha"><td>${notaPrio(n)}</td><td><a href="#/aviso/${n.id}"><b style="font-weight:600">${esc(n.insumo)}</b><br><span class="mono">${n.id}</span></a></td><td><span class="cel-pessoa">${av(ini(p.iniciais), p.id)}<span>${esc(p.iniciais)}<small>${p.id} · microárea ${esc(p.microarea)}</small></span></span></td><td class="ocultar-m"><span class="tempo${atr ? " tempo--alerta" : ""}">${I.relogio}${D.diasSem(n)} dias</span></td><td>${st(n.status)}${atr ? ' <span class="st st--atraso">Em atraso</span>' : ""}${n.tentativas ? `<br><small style="color:var(--ap-txt3)">${n.tentativas} tentativa(s) sem sucesso</small>` : ""}</td><td><div class="cartao-av__acoes">${acoesAviso(n)}</div></td></tr>`; }).join("") : `<tr><td colspan="6"><div class="vazio"><b>Nenhum aviso com esses filtros</b>Tente outros filtros.</div></td></tr>`}
      </tbody></table></div></section>`;
    $("#filtros").addEventListener("change", () => { filtro.status = $("#f-st").value; filtro.categoria = $("#f-cat2").value; filtro.microarea = $("#f-area").value; R.fila(); });
    $("#f-atr").addEventListener("click", () => { filtro.atraso = !filtro.atraso; R.fila(); });
  };

  // Avisar falta: tela de entrada (como o chat do vídeo) e passos (RF05, RF06, RNF03, RNF08)
  const chaveRasc = () => "medki-rascunho-" + usuario.id;
  R.falta = sub => {
    if (usuario.perfil === "farmacia") { location.hash = "#/fila"; return; }
    const pacs = D.pacientesDe(usuario);
    if (!pacs.length) { tela.innerHTML = `<section class="card" data-a><div class="vazio"><b>Nenhum paciente vinculado</b>${usuario.perfil === "acs" ? 'Cadastre um paciente da sua microárea primeiro. <a class="link-btn" href="#/pacientes/novo">Cadastrar paciente</a>' : "Peça ao <b>Agente Comunitário de Saúde</b> da sua microárea para vincular você ao paciente."}</div></section>`; return; }
    if (sub === "passo") return passos(pacs);
    const rasc = JSON.parse(localStorage.getItem(chaveRasc()) || "null");
    const abertos = D.visiveis(usuario).filter(D.emAberto);
    const meds = []; pacs.forEach(p => p.medicamentos.forEach(m => { if (!abertos.some(n => n.pacienteId === p.id && n.insumo.toLowerCase() === m.nome.toLowerCase())) meds.push({ p, m }); }));
    meds.sort((a, b) => D.CATEGORIAS[b.m.categoria].peso - D.CATEGORIAS[a.m.categoria].peso);
    const vistos = {}, sug = []; meds.forEach(x => { if (sug.length < 3 && !vistos[x.m.categoria]) { vistos[x.m.categoria] = 1; sug.push(x); } }); meds.forEach(x => { if (sug.length < 3 && sug.indexOf(x) < 0) sug.push(x); });
    const icoCat = { insulina: I.gota, antihipertensivo: I.estetoscopio, fralda: I.caixa, outro: I.farmacia };
    const hora = new Date().getHours(), ola = (hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite") + ", " + primeiroNome();
    tela.innerHTML = `<div class="assist"><h2 class="assist__ola" id="ola" aria-label="${esc(ola)}"><span id="ola-txt"></span><span class="cursor" aria-hidden="true"></span></h2>
      <p class="assist__sub" data-a>O que faltou hoje? Escolha abaixo ou escreva com suas palavras.</p>
      ${rasc && rasc.insumo ? `<p class="assist__sub" data-a><a class="link-btn" href="#/falta/passo">Continuar o aviso que você começou (${esc(rasc.insumo === "__outro" ? rasc.outro || "outro insumo" : rasc.insumo)})</a></p>` : ""}
      <div class="assist__grade">${sug.map((x, i) => `<button class="sug" type="button" data-a data-sug="${i}"><span class="sug__ico">${icoCat[x.m.categoria]}</span><span><b>${esc(x.m.nome)}</b><small>${esc(x.p.iniciais)} · ${x.p.id}</small></span></button>`).join("")}<button class="sug" type="button" data-a data-sug="outro"><span class="sug__ico">${I.mais}</span><span><b>Outro remédio ou insumo</b><small>Escolher paciente e item</small></span></button></div>
      <form class="assist__caixa" id="assist-form" data-a><label class="sr-only" for="assist-txt">Descreva o que faltou</label><textarea id="assist-txt" placeholder="Pergunte ou descreva o que faltou. Ex.: acabou a insulina da M. S."></textarea><div class="assist__acoes"><a href="#/falta/passo" aria-label="Escolher na lista" title="Escolher na lista">${I.mais}</a><button class="enviar" type="submit" aria-label="Continuar">${I.enviar}</button></div></form>
      <div class="assist__brilho" aria-hidden="true"></div></div>`;
    // digitação da saudação
    const alvo = $("#ola-txt"); let k = 0;
    if (reduz) alvo.textContent = ola; else setTimeout(function digita() { alvo.textContent = ola.slice(0, ++k); if (k < ola.length) setTimeout(digita, 42 + Math.random() * 40); }, 280);
    const comeca = (p, m) => {
      const dup = D.abertaPara(p.id, m.nome); if (dup) return mostraDuplicada(dup);
      localStorage.setItem(chaveRasc(), JSON.stringify({ passo: 2, pacienteId: p.id, insumo: m.nome, categoria: m.categoria, outro: "", dataFalta: hojeISO(), observacao: "" })); location.hash = "#/falta/passo";
    };
    $$("[data-sug]", tela).forEach(b => b.addEventListener("click", () => {
      if (b.dataset.sug === "outro") { localStorage.setItem(chaveRasc(), JSON.stringify({ passo: 1, pacienteId: pacs.length === 1 ? pacs[0].id : "", insumo: "", categoria: "", outro: "", dataFalta: hojeISO(), observacao: "" })); location.hash = "#/falta/passo"; return; }
      const x = sug[+b.dataset.sug]; comeca(x.p, x.m);
    }));
    $("#assist-form").addEventListener("submit", e => {
      e.preventDefault(); const txt = $("#assist-txt").value.trim(); if (!txt) { $("#assist-txt").focus(); return; }
      const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), t = norm(txt);
      let achou = null; pacs.forEach(p => p.medicamentos.forEach(m => { const chave = norm(m.nome).split(" ")[0]; if (!achou && chave.length > 3 && t.indexOf(chave) >= 0 && (pacs.length === 1 || t.indexOf(norm(p.iniciais).replace(/[^a-z]/g, "").slice(0, 1)) >= 0 || pacs.filter(q => q.medicamentos.some(mm => norm(mm.nome).split(" ")[0] === chave)).length === 1)) achou = { p, m }; }));
      if (achou) return comeca(achou.p, achou.m);
      localStorage.setItem(chaveRasc(), JSON.stringify({ passo: 1, pacienteId: pacs.length === 1 ? pacs[0].id : "", insumo: pacs.length === 1 ? "__outro" : "", categoria: "outro", outro: txt.slice(0, 60), dataFalta: hojeISO(), observacao: "" })); location.hash = "#/falta/passo";
    });
    $("#assist-txt").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#assist-form").requestSubmit(); } });
  };
  function mostraDuplicada(n) {
    modal(`<h2 id="modal-t">Já existe um aviso em aberto</h2><p class="sub" style="margin-top:10px">Para este paciente e este insumo já há um aviso <b>${esc(n.status)}</b> desde ${data(n.criadoEm)}. Não é preciso avisar de novo: acompanhe por ele.</p><div class="modal__acoes"><button class="btn-p" type="button" data-fecha-modal>Voltar</button><a class="btn-p btn-p--azul" href="#/aviso/${n.id}" id="m-ver">Ver aviso existente</a></div>`, box => { $("#m-ver", box).addEventListener("click", () => { localStorage.removeItem(chaveRasc()); fechaModal(); }); });
  }
  function passos(pacs) {
    let r = JSON.parse(localStorage.getItem(chaveRasc()) || "null") || { passo: 1, pacienteId: pacs.length === 1 ? pacs[0].id : "", insumo: "", categoria: "", outro: "", dataFalta: hojeISO(), observacao: "" };
    const guarda = () => localStorage.setItem(chaveRasc(), JSON.stringify(r));
    function pinta(anima) {
      const nomes = ["Paciente e insumo", "Quando acabou", "Confirmar"], p = D.paciente(r.pacienteId);
      let h = `<div class="passo-card"><div class="linha-cab" data-a><div class="passos-seg" aria-label="Etapas">${nomes.map((nm, i) => `<span class="${r.passo === i + 1 ? "is-on" : r.passo > i + 1 ? "is-feito" : ""}"${r.passo === i + 1 ? ' aria-current="step"' : ""}>${r.passo > i + 1 ? "✓" : i + 1} · ${nm}</span>`).join("")}</div><a class="btn-p" href="#/falta/nova">${I.volta}Voltar ao início</a></div>
        ${!navigator.onLine ? '<div class="offline" role="status" style="margin-top:14px">Você está sem conexão. Pode continuar preenchendo: enviaremos quando a internet voltar.</div>' : ""}
        <form class="card" id="wiz" novalidate data-a style="margin-top:14px">`;
      if (r.passo === 1) {
        h += `<fieldset style="border:0;padding:0;margin:0"><legend class="rot">Para qual paciente?</legend><div class="opcoes">${pacs.map(x => `<label class="opcao"><input type="radio" name="pac" value="${x.id}"${x.id === r.pacienteId ? " checked" : ""}><span class="opcao__box"><b>${esc(x.iniciais)} · ${x.id}</b><small>Microárea ${esc(x.microarea)} · ${x.medicamentos.length} remédio(s) de uso contínuo</small></span></label>`).join("")}</div></fieldset>`;
        if (p) h += `<fieldset style="border:0;padding:0;margin:22px 0 0"><legend class="rot">Qual remédio ou insumo está em falta?</legend><div class="opcoes">${p.medicamentos.map(m => `<label class="opcao"><input type="radio" name="ins" value="${esc(m.nome)}" data-cat="${m.categoria}"${m.nome === r.insumo ? " checked" : ""}><span class="opcao__box"><b>${esc(m.nome)}</b><small>${esc(D.CATEGORIAS[m.categoria].nome)}</small></span></label>`).join("")}<label class="opcao"><input type="radio" name="ins" value="__outro"${r.insumo === "__outro" ? " checked" : ""}><span class="opcao__box"><b>Outro insumo</b><small>Não está na lista</small></span></label></div></fieldset>` +
          (r.insumo === "__outro" ? `<div class="duas-col" style="margin-top:14px"><div class="campo"><label for="w-outro">Nome do insumo</label><input class="inp" id="w-outro" value="${esc(r.outro)}"></div><div class="campo"><label for="w-cat">Categoria</label><select class="inp" id="w-cat">${Object.keys(D.CATEGORIAS).map(k => `<option value="${k}"${r.categoria === k ? " selected" : ""}>${D.CATEGORIAS[k].nome}</option>`).join("")}</select></div></div>` : "");
      } else if (r.passo === 2) {
        h += `<div class="campo" style="max-width:320px"><label for="w-data">Em que dia o insumo acabou ou deixou de ser entregue?</label><input class="inp" type="date" id="w-data" max="${hojeISO()}" value="${esc(r.dataFalta)}"><small>Se não lembrar o dia exato, informe uma data aproximada.</small></div><div class="campo" style="margin-top:16px"><label for="w-obs">Observação (opcional)</label><textarea class="inp" id="w-obs" maxlength="300" placeholder="Ex.: a entrega de terça não chegou">${esc(r.observacao)}</textarea><small>Não escreva nome completo, CPF, endereço ou diagnóstico.</small></div>`;
      } else {
        const cat = r.insumo === "__outro" ? r.categoria : (p.medicamentos.filter(m => m.nome === r.insumo)[0] || {}).categoria, pr = D.prioridade({ pacienteId: p.id, categoria: cat || "outro", dataFalta: r.dataFalta, status: "Pendente", historico: [] });
        h += `<h2 style="font-size:1.15rem;font-weight:600">Confira antes de enviar</h2><dl class="revisao" style="margin-top:16px"><dt>Paciente</dt><dd>${esc(p.iniciais)} · ${p.id}</dd><dt>Insumo em falta</dt><dd>${esc(r.insumo === "__outro" ? r.outro : r.insumo)}</dd><dt>Categoria</dt><dd>${esc(D.CATEGORIAS[cat || "outro"].nome)}</dd><dt>Sem o insumo desde</dt><dd>${data(r.dataFalta + "T12:00:00")}</dd><dt>Observação</dt><dd>${r.observacao ? esc(r.observacao) : "—"}</dd><dt>Prioridade estimada</dt><dd>${pr.total} pontos (${D.nivel(pr.total)})</dd></dl><p class="sub" style="margin-top:14px;font-size:.88rem">A farmácia deve responder em até 2 dias úteis e entregar em até 7 dias.</p>`;
      }
      h += `<div class="wizard__nav">${r.passo > 1 ? `<button class="btn-p" type="button" id="w-volta">${I.volta}Voltar</button>` : '<a class="btn-p" href="#/falta/nova">Cancelar</a>'}<button class="btn-p btn-p--azul" type="submit">${r.passo < 3 ? "Continuar" : "Enviar aviso"} ${I.seta}</button></div></form></div>`;
      tela.innerHTML = h; if (anima) animaEntrada(tela);
      const f = $("#wiz");
      f.addEventListener("change", e => { if (e.target.name === "pac") { r.pacienteId = e.target.value; r.insumo = ""; guarda(); pinta(); } else if (e.target.name === "ins") { r.insumo = e.target.value; r.categoria = e.target.dataset.cat || r.categoria || "outro"; guarda(); pinta(); } });
      f.addEventListener("input", () => { if ($("#w-outro")) r.outro = $("#w-outro").value; if ($("#w-cat")) r.categoria = $("#w-cat").value; if ($("#w-data")) r.dataFalta = $("#w-data").value; if ($("#w-obs")) r.observacao = $("#w-obs").value; guarda(); });
      if ($("#w-volta")) $("#w-volta").addEventListener("click", () => { r.passo--; guarda(); pinta(true); });
      f.addEventListener("submit", e => {
        e.preventDefault();
        if (r.passo === 1) {
          if (!r.pacienteId) return toast("Escolha o paciente.", "erro");
          if (!r.insumo) return toast("Escolha o remédio ou insumo em falta.", "erro");
          if (r.insumo === "__outro" && !(r.outro || "").trim()) { $("#w-outro").focus(); return toast("Informe o nome do insumo.", "erro"); }
          const dup = D.abertaPara(r.pacienteId, r.insumo === "__outro" ? r.outro : r.insumo); if (dup) return mostraDuplicada(dup);
          r.passo = 2; guarda(); pinta(true); return;
        }
        if (r.passo === 2) {
          if (!r.dataFalta) { $("#w-data").focus(); return toast("Informe a data.", "erro"); }
          if (r.dataFalta > hojeISO()) { $("#w-data").focus(); return toast("A data não pode ser no futuro.", "erro"); }
          r.passo = 3; guarda(); pinta(true); return;
        }
        enviar();
      });
      const foco = $("#wiz input:checked, #wiz input, #wiz textarea"); if (foco && r.passo > 1) foco.focus({ preventScroll: true });
    }
    function enviar() {
      if (!navigator.onLine) { toast("Sem conexão. Seu aviso está salvo e será enviado quando a internet voltar.", "erro"); r.pendenteEnvio = true; guarda(); return; }
      const p = D.paciente(r.pacienteId), cat = r.insumo === "__outro" ? r.categoria : (p.medicamentos.filter(m => m.nome === r.insumo)[0] || {}).categoria;
      const res = D.registrar({ pacienteId: r.pacienteId, insumo: r.insumo === "__outro" ? r.outro : r.insumo, categoria: cat || "outro", dataFalta: r.dataFalta, observacao: r.observacao }, usuario);
      if (res.duplicada) return mostraDuplicada(res.duplicada);
      if (res.erro) return toast(res.erro, "erro");
      localStorage.removeItem(chaveRasc()); const n = res.ok, pr = D.prioridade(n);
      tela.innerHTML = `<div class="passo-card"><section class="card sucesso" data-a><span class="sucesso__icone">${I.ok}</span><h2>Aviso enviado à farmácia</h2><p class="sub" style="margin-top:8px">Protocolo <b>${n.id}</b> · prioridade ${pr.total} (${D.nivel(pr.total)}).</p><p class="sub">Você acompanha cada etapa por aqui. Primeira resposta em até 2 dias úteis.</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px"><a class="btn-p btn-p--azul" href="#/aviso/${n.id}">Acompanhar aviso</a><a class="btn-p" href="#/avisos">Ver meus avisos</a></div></section></div>`;
      animaEntrada(tela); montaLado(); marcaLado("falta"); anuncia("Aviso enviado. Protocolo " + n.id);
    }
    window.addEventListener("online", function on() { window.removeEventListener("online", on); const x = JSON.parse(localStorage.getItem(chaveRasc()) || "null"); if (x && x.pendenteEnvio && location.hash.indexOf("#/falta/passo") === 0) { r = x; delete r.pendenteEnvio; enviar(); } else if (location.hash.indexOf("#/falta/passo") === 0) pinta(); });
    window.addEventListener("offline", () => { if (location.hash.indexOf("#/falta/passo") === 0) pinta(); }, { once: true });
    pinta();
  }

  // Detalhe do aviso
  R.aviso = id => {
    const n = achar(id);
    if (!n || D.visiveis(usuario).indexOf(n) < 0) { tela.innerHTML = `<section class="card" data-a><div class="vazio"><b>Aviso não encontrado</b>Você só vê avisos dos pacientes aos quais tem acesso. <a class="link-btn" href="#/">Voltar</a></div></section>`; return { titulo: "Aviso" }; }
    const p = D.paciente(n.pacienteId), pr = D.prioridade(n), acoes = D.emAberto(n) ? acoesAviso(n) : "";
    tela.innerHTML = `<div data-a><a class="btn-p" href="#/${usuario.perfil === "farmacia" ? "fila" : "avisos"}">${I.volta}Voltar</a></div>
      <div class="grade-lado"><section class="card" data-a>${cab(ICO_STATUS[n.status] || I.doc, "Situação", `${st(n.status)}${D.emAtraso(n) ? ' <span class="st st--atraso">Em atraso</span>' : ""}`)}${trilha(n)}
        <dl class="revisao" style="margin-top:18px"><dt>Paciente</dt><dd><span class="cel-pessoa">${av(ini(p.iniciais), p.id)}${esc(p.iniciais)} · ${p.id} · microárea ${esc(p.microarea)}</span></dd><dt>Categoria</dt><dd>${esc(D.CATEGORIAS[n.categoria].nome)}</dd><dt>Sem o insumo desde</dt><dd>${data(n.dataFalta + "T12:00:00")}${D.emAberto(n) ? ` (${D.diasSem(n)} dias)` : ""}</dd><dt>Aberto em</dt><dd>${dataHora(n.criadoEm)}</dd><dt>Registrado por</dt><dd>${esc((D.usuario(n.criadoPor) || {}).nome || "—")}</dd><dt>Observação</dt><dd>${n.observacao ? esc(n.observacao) : "—"}</dd>
        ${D.emAberto(n) ? `<dt>Prioridade</dt><dd>${pr.total} pontos: ${pr.peso} do insumo + ${pr.dias} dia(s) + ${pr.extra} (5+ remédios)</dd>` : ""}${n.tentativas ? `<dt>Tentativas sem sucesso</dt><dd>${n.tentativas}</dd>` : ""}${n.motivoCancelamento ? `<dt>Motivo do cancelamento</dt><dd>${esc(n.motivoCancelamento)}</dd>` : ""}</dl>
        ${acoes ? `<div class="cartao-av__acoes" style="margin-top:18px">${acoes}</div>` : ""}</section>
        <section class="card" data-a>${cab(I.relogio, "Histórico", `<small>não pode ser alterado</small>`)}<ol class="linha-tempo">${n.historico.slice().reverse().map(h => `<li data-a="linha"><div>${st(h.status)}<b>${esc(h.nota || "Status atualizado")}</b><small>${dataHora(h.data)} · ${esc((D.usuario(h.usuario) || {}).nome || "Sistema")}</small></div></li>`).join("")}</ol></section></div>`;
    return { titulo: n.insumo, sub: `Protocolo ${n.id} · paciente ${p.id} (${p.iniciais})` };
  };

  // Pacientes (como "Scheduling")
  R.pacientes = (sub, q) => {
    if (sub === "novo") return R.novoPaciente();
    const pacs = D.pacientesDe(usuario), vis = D.visiveis(usuario), aba = (q || {}).v === "remedios" ? "remedios" : "lista";
    const caminho = vis.filter(n => n.status === "Saiu para entrega")[0], atrasado = vis.filter(n => D.emAberto(n) && D.emAtraso(n))[0];
    let h = `<div class="linha-cab" data-a><nav class="seg-tabs" aria-label="Visualização"><a href="#/pacientes" class="${aba === "lista" ? "is-on" : ""}">${I.pacientes}Pacientes <span class="chip-n">${pacs.length}</span></a><a href="#/pacientes?v=remedios" class="${aba === "remedios" ? "is-on" : ""}">${I.farmacia}Remédios</a></nav>
      ${usuario.perfil === "acs" ? `<div style="display:flex;gap:8px"><a class="btn-p" href="#/vincular">${I.vincular}Vincular familiar</a><a class="btn-p btn-p--escuro" href="#/pacientes/novo">${I.mais}Cadastrar paciente</a></div>` : ""}</div>`;
    if (caminho) { const p = D.paciente(caminho.pacienteId), hs = caminho.historico.filter(x => x.status === "Saiu para entrega").pop(); h += `<div class="banner" data-a><span class="ico-q">${I.caminhao}</span><div><b>Entrega a caminho: ${esc(caminho.insumo)} para ${esc(p.iniciais)}</b><small>Saiu ${hs ? relativo(hs.data) : "hoje"} · protocolo ${caminho.id}. ${usuario.perfil === "farmacia" ? "Confirme a entrega quando o insumo chegar." : "Fique atento à campainha."}</small></div><div class="banner__acoes"><a class="btn-p btn-p--azul" href="#/aviso/${caminho.id}">Ver aviso</a></div></div>`; }
    else if (atrasado) { const p = D.paciente(atrasado.pacienteId); h += `<div class="banner banner--alerta" data-a><span class="ico-q">${I.alerta}</span><div><b>${esc(atrasado.insumo)} de ${esc(p.iniciais)} está em atraso</b><small>Protocolo ${atrasado.id}. A farmácia foi alertada e o aviso segue no topo da fila.</small></div><div class="banner__acoes"><a class="btn-p" href="#/aviso/${atrasado.id}">Ver aviso</a></div></div>`; }
    const titulo = usuario.perfil === "acs" ? "Pacientes da microárea " + esc(usuario.microarea) : usuario.perfil === "farmacia" ? "Pacientes da unidade" : "Seus pacientes";
    let tabela;
    if (aba === "lista") tabela = `<section class="card" data-a>${cab(I.pacientes, titulo, `<span class="chip-n">${pacs.length}</span><small>só código e iniciais (LGPD)</small>`)}<div class="tab-wrap"><table class="tab-app"><thead><tr><th>Paciente</th><th>Remédios de uso contínuo</th><th class="ocultar-m">Familiares</th><th>Em aberto</th><th class="ocultar-m">Último aviso</th><th>Situação</th></tr></thead><tbody>
      ${pacs.map(p => { const ns = D.db().notificacoes.filter(n => n.pacienteId === p.id), ab = ns.filter(D.emAberto), atr = ab.some(n => D.emAtraso(n)), ult = ns.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))[0]; return `<tr data-a="linha"><td><span class="cel-pessoa">${av(ini(p.iniciais), p.id, 1)}<span>${esc(p.iniciais)}<small>${p.id} · microárea ${esc(p.microarea)}</small></span></span></td><td>${p.medicamentos.length} item(ns)<br><small style="color:var(--ap-txt3)">${esc(p.medicamentos.slice(0, 2).map(m => m.nome).join(", "))}${p.medicamentos.length > 2 ? "…" : ""}</small></td><td class="ocultar-m">${esc(p.vinculos.map(v => (D.usuario(v) || {}).nome || "").join(", ") || "—")}</td><td>${ab.length || "—"}</td><td class="ocultar-m">${ult ? dataCurta(ult.criadoEm) : "—"}</td><td>${atr ? '<span class="st st--atraso">Em atraso</span>' : ab.length ? '<span class="st st--pendente">Com falta</span>' : '<span class="st st--entregue">Em dia</span>'}</td></tr>`; }).join("")}
      </tbody></table></div></section>`;
    else tabela = `<section class="card" data-a>${cab(I.farmacia, "Remédios e insumos de uso contínuo", `<small>peso na fila de prioridade</small>`)}<div class="tab-wrap"><table class="tab-app"><thead><tr><th>Remédio ou insumo</th><th>Categoria</th><th>Paciente</th><th>Peso</th><th class="ocultar-m">Último aviso</th></tr></thead><tbody>
      ${pacs.map(p => p.medicamentos.map(m => { const ult = D.db().notificacoes.filter(n => n.pacienteId === p.id && n.insumo === m.nome).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))[0]; return `<tr data-a="linha"><td><b style="font-weight:500">${esc(m.nome)}</b></td><td><span class="st" style="background:${COR_CAT[m.categoria][0]};color:${COR_CAT[m.categoria][1]}">${esc(D.CATEGORIAS[m.categoria].nome)}</span></td><td>${esc(p.iniciais)} · <span class="mono">${p.id}</span></td><td>+${D.CATEGORIAS[m.categoria].peso}</td><td class="ocultar-m">${ult ? dataCurta(ult.criadoEm) + " · " + esc(ult.status) : "—"}</td></tr>`; }).join("")).join("")}
      </tbody></table></div></section>`;
    const ent = vis.filter(n => n.status === "Entregue"), t = ent.map(diasEntrega), media = t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0, pct = t.length ? Math.round(t.filter(x => x <= 7).length / t.length * 100) : 0;
    const porCat = Object.keys(D.CATEGORIAS).map(k => [k, vis.filter(n => n.categoria === k).length]), tot = vis.length || 1;
    h += `<div class="grade-lado">${tabela}<div class="pilha"><section class="card" data-a><div class="card__cab"><h2>O que já foi entregue</h2></div><p class="grande"><span data-num="${ent.length}">${ent.length}</span> <small>entregas</small></p><div class="lista-num"><p>Avisos registrados <b>${vis.length}</b></p><p>Entregues <b>${ent.length}</b></p><p>Cancelados <b>${vis.filter(n => n.status === "Cancelada").length}</b></p><p>Tempo médio até a entrega <b>${num(media, 1)} dias</b></p></div><div class="caixa-ok">${I.ok}<span>${pct}% das entregas chegaram em até 7 dias, dentro do prazo do programa.</span></div></section>
      <section class="card" data-a><div class="card__cab"><h2>Por que faltou</h2></div><div class="barras-h">${porCat.map(c => `<div><p>${D.CATEGORIAS[c[0]].nome}<span>${Math.round(c[1] / tot * 100)}%</span></p><div class="barras-h__f"><span data-w="${c[1] / tot * 100}%" style="background:${COR_CAT[c[0]][1]}"></span></div></div>`).join("")}</div></section></div></div>
      <div class="info-azul" data-a><span class="ico-q">${I.alerta}</span><span><b>Por que só código e iniciais?</b>A Lei Geral de Proteção de Dados pede o mínimo necessário. A farmácia encontra o endereço no cadastro que a unidade de saúde já tem.</span></div>`;
    tela.innerHTML = h;
  };
  R.novoPaciente = () => {
    if (usuario.perfil !== "acs") { location.hash = "#/pacientes"; return; }
    const linha = i => `<div class="meds-linha" data-med><input class="inp" aria-label="Remédio ou insumo ${i + 1}" placeholder="Ex.: Losartana 50 mg"><select class="inp" aria-label="Categoria do item ${i + 1}">${Object.keys(D.CATEGORIAS).map(k => `<option value="${k}">${D.CATEGORIAS[k].nome}</option>`).join("")}</select><button class="btn-p" type="button" data-remove aria-label="Remover item">✕</button></div>`;
    tela.innerHTML = `<div data-a><a class="btn-p" href="#/pacientes">${I.volta}Pacientes</a></div>
      <form class="card passo-card" id="f-pac" novalidate data-a style="margin:14px 0 0">${cab(I.pacientes, "Dados do paciente", `<small>microárea ${esc(usuario.microarea)}</small>`)}
      <div class="duas-col" style="margin-top:14px"><div class="campo"><label for="p-cod">Código do paciente</label><input class="inp" id="p-cod" placeholder="P-0000" value="P-0${300 + D.db().pacientes.length}"><small>Use o código do cadastro da unidade.</small></div><div class="campo"><label for="p-ini">Iniciais do nome</label><input class="inp" id="p-ini" placeholder="M. S."></div></div>
      <fieldset style="border:0;padding:0;margin:20px 0 0"><legend class="rot">Remédios e insumos de uso contínuo (pode ficar vazio)</legend><div id="meds" style="display:grid;gap:8px">${linha(0)}${linha(1)}</div><button class="link-btn" type="button" id="add-med" style="margin-top:12px">+ Adicionar item</button></fieldset>
      <p class="sub" style="margin-top:12px;font-size:.84rem">Não informe nome completo, CPF, endereço ou diagnóstico.</p>
      <div id="p-erro" class="msg-erro" role="alert" style="margin-top:10px"></div><div class="wizard__nav"><a class="btn-p" href="#/pacientes">Cancelar</a><button class="btn-p btn-p--azul" type="submit">Salvar paciente</button></div></form>`;
    const meds = $("#meds"); let n = 2;
    $("#add-med").addEventListener("click", () => { meds.insertAdjacentHTML("beforeend", linha(n++)); $("[data-med]:last-child input", meds).focus(); });
    meds.addEventListener("click", e => { const b = e.target.closest("[data-remove]"); if (b && $$("[data-med]", meds).length > 1) b.parentNode.remove(); });
    $("#f-pac").addEventListener("submit", e => {
      e.preventDefault();
      const r = D.cadastrarPaciente({ id: $("#p-cod").value, iniciais: $("#p-ini").value, medicamentos: $$("[data-med]", meds).map(l => ({ nome: $("input", l).value, categoria: $("select", l).value })) }, usuario);
      if (r.erro) { $("#p-erro").textContent = r.erro; return; }
      toast("Paciente " + r.ok.id + " cadastrado.", "ok"); location.hash = "#/vincular?p=" + r.ok.id;
    });
    return { titulo: "Cadastrar paciente", sub: "Só código e iniciais, como pede a LGPD." };
  };

  // Vincular notificante (RF04)
  R.vincular = q => {
    if (usuario.perfil !== "acs") { location.hash = "#/"; return; }
    const pacs = D.pacientesDe(usuario), pre = (q || {}).p;
    tela.innerHTML = `<form class="card passo-card" id="f-vinc" novalidate data-a style="margin:0 auto">${cab(I.vincular, "Convidar familiar ou cuidador", `<small>a pessoa só verá os pacientes escolhidos</small>`)}
      <div class="campo" style="margin-top:14px"><label for="v-email">E-mail do familiar ou cuidador</label><input class="inp" id="v-email" type="email" placeholder="nome@exemplo.com"></div>
      <fieldset style="border:0;padding:0;margin:20px 0 0"><legend class="rot">Pacientes</legend><div class="opcoes">${pacs.map(p => `<label class="opcao"><input type="checkbox" name="vp" value="${p.id}"${p.id === pre ? " checked" : ""}><span class="opcao__box"><b>${esc(p.iniciais)} · ${p.id}</b><small>${p.vinculos.length ? p.vinculos.length + " vinculado(s)" : "Sem familiar vinculado"}</small></span></label>`).join("")}</div></fieldset>
      <div id="v-erro" class="msg-erro" role="alert" style="margin-top:12px"></div><div class="wizard__nav"><span></span><button class="btn-p btn-p--azul" type="submit">Gerar convite</button></div></form><div id="v-res"></div>`;
    $("#f-vinc").addEventListener("submit", e => {
      e.preventDefault(); $("#v-erro").textContent = "";
      const r = D.convidar($("#v-email").value, $$("input[name=vp]:checked").map(i => i.value), usuario);
      if (r.erro) { $("#v-erro").textContent = r.erro; return; }
      if (r.ok.vinculado) { toast(r.ok.vinculado.nome + " foi vinculado(a) aos pacientes.", "ok"); R.vincular(); return; }
      const link = location.href.split("app.html")[0] + "entrar.html?convite=" + r.ok.convite;
      $("#v-res").innerHTML = `<section class="card passo-card" style="margin-top:14px">${cab(I.ok, "Convite gerado", `<span class="chip-n">${r.ok.convite}</span>`)}<p class="sub" style="margin-top:8px;font-size:.9rem">Código <b>${r.ok.convite}</b>. Envie o link abaixo por e-mail ou mensagem. Com ele, a pessoa cria a conta.</p><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><input class="inp" readonly value="${esc(link)}" id="v-link" style="flex:1;min-width:240px" aria-label="Link do convite"><button class="btn-p btn-p--azul" type="button" id="v-copiar" style="height:44px">Copiar link</button></div><p class="sub" style="margin-top:10px;font-size:.8rem">Demonstração: o e-mail não é enviado de verdade.</p></section>`;
      animaEntrada($("#v-res"));
      $("#v-copiar").addEventListener("click", () => { const i = $("#v-link"); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.resolve(document.execCommand("copy"))).then(() => toast("Link copiado.", "ok")); });
    });
  };

  // Histórico / Indicadores (como "Reports"; RF15/RF16 na farmácia)
  let periodo = 90;
  R.relatorio = (q, farm) => {
    if (farm && usuario.perfil !== "farmacia") { location.hash = "#/"; return; }
    const aba = (q || {}).v === "todos" ? "todos" : "geral", base = farm ? "#/indicadores" : "#/historico";
    const ini0 = Date.now() - periodo * 864e5, vis = D.visiveis(usuario).filter(n => !farm || new Date(n.criadoEm) >= ini0);
    const ent = vis.filter(n => n.status === "Entregue"), t = ent.map(diasEntrega), ok = t.filter(x => x <= 7).length, pct = t.length ? Math.round(ok / t.length * 100) : 0;
    const C = 2 * Math.PI * 52;
    let h = `<div class="linha-cab" data-a><nav class="seg-tabs" aria-label="Visualização"><a href="${base}" class="${aba === "geral" ? "is-on" : ""}">${I.relatorio}Visão geral</a><a href="${base}?v=todos" class="${aba === "todos" ? "is-on" : ""}">${I.lista}Todos os avisos <span class="chip-n">${vis.length}</span></a></nav>
      ${farm ? `<div class="no-print" style="display:flex;gap:8px;flex-wrap:wrap"><label class="sr-only" for="i-per">Período</label><select class="filtro-sel" id="i-per"><option value="30"${periodo === 30 ? " selected" : ""}>Últimos 30 dias</option><option value="90"${periodo === 90 ? " selected" : ""}>Últimos 90 dias</option><option value="365"${periodo === 365 ? " selected" : ""}>Últimos 12 meses</option></select><button class="btn-p" type="button" id="i-csv">${I.csv}Exportar CSV</button><button class="btn-p btn-p--escuro" type="button" id="i-pdf">${I.impressora}Exportar PDF</button></div>` : ""}</div>`;
    if (aba === "todos") {
      const todos = vis.slice().sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
      h += `<section class="card" data-a style="margin-top:14px">${cab(I.lista, "Todos os avisos", `<span class="chip-n">${todos.length}</span>`)}<div class="tab-wrap"><table class="tab-app"><thead><tr><th>Insumo</th><th>Paciente</th><th class="ocultar-m">Aberto em</th><th>Status</th><th>Dias até a entrega</th><th class="ocultar-m">Registrado por</th></tr></thead><tbody>
        ${todos.map(n => { const p = D.paciente(n.pacienteId), d = diasEntrega(n); return `<tr data-a="linha"><td><a href="#/aviso/${n.id}"><b style="font-weight:500">${esc(n.insumo)}</b><br><span class="mono">${n.id}</span></a></td><td>${esc(p.iniciais)} · <span class="mono">${p.id}</span></td><td class="ocultar-m">${dataCurta(n.criadoEm)}</td><td>${st(n.status)}${D.emAtraso(n) ? ' <span class="st st--atraso">Em atraso</span>' : ""}</td><td>${d == null ? "—" : `<span class="tempo ${d <= 7 ? "tempo--ok" : ""}">${num(d, 0)} dias</span>`}</td><td class="ocultar-m">${esc((D.usuario(n.criadoPor) || {}).nome || "—")}</td></tr>`; }).join("")}
        </tbody></table></div></section>`;
    } else {
      const ultimas = ent.slice().sort((a, b) => entregaEm(b) - entregaEm(a)).slice(0, 5);
      const pacs = farm ? null : D.pacientesDe(usuario);
      const I2 = farm ? D.indicadores(periodo) : null;
      h += `<div class="grade-3c"><section class="card" data-a>${cab(I.relogio, "Entregas no prazo", `<small>até 7 dias</small>`)}
          <div class="anel"><svg viewBox="0 0 120 120"><circle class="fundo" cx="60" cy="60" r="52"/><circle class="cheio" cx="60" cy="60" r="52" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-anel="${C * (1 - pct / 100)}"/></svg><b><span data-num="${pct}">${pct}</span></b></div>
          <p class="anel-leg">${ok} de ${t.length} entregas em até 7 dias</p>
          <div class="duo"><div><small>Mais rápida</small><b>${t.length ? num(Math.min(...t), 0) : "—"} dias</b></div><div><small>Mais demorada</small><b>${t.length ? num(Math.max(...t), 0) : "—"} dias</b></div></div></section>
        <section class="card" data-a>${cab(I.caminhao, "Tempo de cada entrega", `<small>comparado ao prazo de 7 dias</small>`)}
          ${ultimas.length ? ultimas.map(n => { const d = diasEntrega(n), w = Math.min(100, d / 14 * 100); return `<div class="prazo-linha"><div><b>${esc(n.insumo)}</b><span class="mono">${n.id} · ${esc(D.paciente(n.pacienteId).iniciais)}</span></div><div class="prazo-trilho"><span class="${d > 7 ? "is-ruim" : ""}" data-w="${w}%"></span><i style="left:50%"></i></div>${d <= 7 ? '<span class="st st--entregue">No prazo</span>' : '<span class="st st--pendente">Atrasou</span>'}</div>`; }).join("") : `<div class="vazio">Nenhuma entrega ainda.</div>`}
          <p style="margin-top:8px;color:var(--ap-txt3);font-size:.74rem">A linha preta marca o prazo de 7 dias.</p></section>
        <section class="card" data-a>${farm ? `<div class="card__cab"><h2>Falhas por microárea</h2></div><div class="barras-h">${Object.keys(I2.porMicroarea).sort().map(a => { const v = I2.porMicroarea[a], mx = Math.max(1, ...Object.values(I2.porMicroarea)); return `<div><p>Microárea ${esc(a)}<span>${v}</span></p><div class="barras-h__f"><span data-w="${v / mx * 100}%"></span></div></div>`; }).join("")}</div><div class="lista-num" style="margin-top:16px"><p>Em atraso agora <b style="color:#c62f3c">${I2.atrasadas}</b></p><p>Tempo médio <b>${num(I2.mediaDias, 1)} dias</b></p><p>Cancelados <b>${I2.canceladas}</b></p></div>` :
          `<div class="card__cab"><h2>Situação dos pacientes</h2></div><div class="lista-num">${pacs.map(p => { const ns = vis.filter(n => n.pacienteId === p.id), ab = ns.filter(D.emAberto); return `<p><span class="cel-pessoa" style="color:#15171c">${av(ini(p.iniciais), p.id)}<span>${esc(p.iniciais)}<small>${ns.length} aviso(s) no total</small></span></span>${ab.length ? '<span class="st st--pendente">Com falta</span>' : '<span class="st st--entregue">Em dia</span>'}</p>`; }).join("")}</div>`}</section></div>`;
      // recorrência / avisos recentes + concluídos
      const porCat = Object.keys(D.CATEGORIAS).map(k => [k, ent.filter(n => n.categoria === k).length]), totE = ent.length || 1;
      let esquerda;
      if (farm) { const rec = Object.keys(I2.recorrencia).map(k => [k, I2.recorrencia[k]]).sort((a, b) => b[1] - a[1]); esquerda = `<section class="card" data-a>${cab(I.pacientes, "Recorrência por paciente", `<span class="chip-n">${rec.length}</span><small>últimos 90 dias</small>`)}<div class="tab-wrap"><table class="tab-app"><thead><tr><th>Paciente</th><th>Microárea</th><th>Avisos</th><th>Situação</th></tr></thead><tbody>${rec.map(x => { const p = D.paciente(x[0]) || {}; return `<tr data-a="linha"><td><span class="cel-pessoa">${av(ini(p.iniciais || "?"), x[0])}<span>${esc(p.iniciais)}<small>${x[0]}</small></span></span></td><td>${esc(p.microarea)}</td><td>${x[1]}</td><td>${x[1] >= 3 ? '<span class="st st--atraso">Recorrente</span>' : '<span class="st st--entregue">Ok</span>'}</td></tr>`; }).join("")}</tbody></table></div></section>`; }
      else { const rec = vis.slice().sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 5); esquerda = `<section class="card" data-a>${cab(I.lista, "Avisos recentes", `<span class="chip-n">${vis.length}</span>`, base + "?v=todos")}<div class="tab-wrap"><table class="tab-app"><thead><tr><th>Insumo</th><th>Paciente</th><th>Status</th><th>Dias até a entrega</th></tr></thead><tbody>${rec.map(n => { const d = diasEntrega(n); return `<tr data-a="linha"><td><a href="#/aviso/${n.id}"><b style="font-weight:500">${esc(n.insumo)}</b><br><span class="mono">${n.id}</span></a></td><td>${esc(D.paciente(n.pacienteId).iniciais)}</td><td>${st(n.status)}</td><td>${d == null ? "—" : num(d, 0) + " dias"}</td></tr>`; }).join("")}</tbody></table></div></section>`; }
      h += `<div class="grade-lado">${esquerda}<section class="card" data-a><div class="card__cab"><h2>Concluídos ${farm ? "no período" : "até hoje"}</h2></div><p class="grande"><span data-num="${ent.length}">${ent.length}</span> <small>entregas</small></p>
        <div class="seg-barra">${porCat.map(c => `<span data-w="${c[1] / totE * 100}%" style="background:${COR_CAT[c[0]][1]}"></span>`).join("")}</div>
        <div class="leg-lista">${porCat.map(c => `<p><i style="background:${COR_CAT[c[0]][1]}"></i>${D.CATEGORIAS[c[0]].nome}<b>${c[1]}</b></p>`).join("")}</div>
        <p style="margin-top:12px;color:var(--ap-txt3);font-size:.76rem">Cada entrega fica registrada com data, hora e responsável.</p></section></div>`;
      const top = porCat.slice().sort((a, b) => b[1] - a[1])[0];
      h += `<div class="info-azul" data-a><span class="ico-q">${I.relogio}</span><span><b>${top && top[1] ? D.CATEGORIAS[top[0]].nome + " responde por " + Math.round(top[1] / totE * 100) + "% das entregas." : "Ainda não há entregas suficientes para comparar."}</b>${farm ? "Use a fila de prioridade para atender primeiro quem está há mais tempo sem o insumo." : "Avisar já no primeiro dia sem o remédio ajuda a farmácia a priorizar e evita que o tratamento pare."}</span></div>`;
    }
    tela.innerHTML = h;
    if (farm) {
      $("#i-per").addEventListener("change", e => { periodo = +e.target.value; recarrega(); });
      $("#i-pdf").addEventListener("click", () => window.print());
      $("#i-csv").addEventListener("click", () => {
        const I3 = D.indicadores(periodo);
        const linhas = [["protocolo", "paciente", "microarea", "insumo", "categoria", "data_falta", "aberto_em", "status", "em_atraso", "prioridade"]].concat(I3.lista.map(n => { const p = D.paciente(n.pacienteId) || {}; return [n.id, n.pacienteId, p.microarea, n.insumo, D.CATEGORIAS[n.categoria].nome, n.dataFalta, n.criadoEm, n.status, D.emAtraso(n) ? "sim" : "nao", D.prioridade(n).total]; }));
        const csv = "﻿" + linhas.map(l => l.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "medki-indicadores-" + periodo + "dias.csv"; document.body.appendChild(a); a.click(); a.remove(); toast("Planilha CSV gerada.", "ok");
      });
    }
  };

  // Prazos da unidade (RN08): valem para os próximos avisos
  R.prazos = () => {
    if (!(usuario.perfil === "farmacia" && usuario.responsavel)) { location.hash = "#/"; return; }
    const u = D.db().unidade;
    tela.innerHTML = `<form class="card passo-card" id="f-prazos" novalidate data-a style="margin:0 auto">${cab(I.relogio, "Prazos de resposta")}
      <div class="duas-col" style="margin-top:14px"><div class="campo"><label for="pz-resp">Primeira resposta (dias úteis)</label><input class="inp" id="pz-resp" type="number" min="1" max="30" step="1" inputmode="numeric" value="${u.prazoRespostaUteis}"><small>Tempo para tirar o aviso de Pendente.</small></div>
      <div class="campo"><label for="pz-ent">Entrega (dias corridos)</label><input class="inp" id="pz-ent" type="number" min="1" max="60" step="1" inputmode="numeric" value="${u.prazoEntregaDias}"><small>Contados a partir da abertura do aviso.</small></div></div>
      <p class="sub" style="margin-top:12px;font-size:.84rem">Os novos prazos valem para os avisos registrados daqui em diante. Os avisos já abertos mantêm o prazo com que foram criados.</p>
      <div id="pz-erro" class="msg-erro" role="alert" style="margin-top:10px"></div><div class="wizard__nav"><span></span><button class="btn-p btn-p--azul" type="submit">Salvar prazos</button></div></form>`;
    $("#f-prazos").addEventListener("submit", e => {
      e.preventDefault();
      const r = D.salvarPrazos({ resposta: $("#pz-resp").value, entrega: $("#pz-ent").value }, usuario);
      if (r.erro) { $("#pz-erro").textContent = r.erro; return; }
      $("#pz-erro").textContent = ""; toast("Prazos salvos.", "ok");
    });
  };

  // Contas da unidade (RF02)
  R.contas = () => {
    if (!(usuario.perfil === "farmacia" && usuario.responsavel)) { location.hash = "#/"; return; }
    const contas = D.db().usuarios.filter(u => u.perfil !== "notificante");
    tela.innerHTML = `<div id="contas-box"><section class="card" data-a>${cab(I.equipe, "Contas do Agente Comunitário de Saúde e da farmácia", `<span class="chip-n">${contas.length}</span>`)}<div style="position:absolute;top:18px;right:18px"><button class="btn-p btn-p--escuro" type="button" id="c-nova">${I.mais}Nova conta</button></div>
      <div class="tab-wrap"><table class="tab-app"><thead><tr><th>Nome</th><th class="ocultar-m">E-mail</th><th>Perfil</th><th>Microárea</th><th>Situação</th><th></th></tr></thead><tbody>
      ${contas.map(u => `<tr data-a="linha"><td><span class="cel-pessoa">${av(ini(u.nome), u.id)}<span>${esc(u.nome)}${u.responsavel ? "<small>Responsável</small>" : ""}</span></span></td><td class="ocultar-m">${esc(u.email)}</td><td>${u.perfil === "acs" ? "<b>Agente Comunitário de Saúde</b>" : "Farmácia"}</td><td>${esc(u.microarea || "—")}</td><td>${u.ativo ? '<span class="st st--entregue">Ativa</span>' : '<span class="st st--cancelada">Desativada</span>'}</td><td style="white-space:nowrap">${u.id !== usuario.id ? `<button class="btn-p" type="button" data-editar="${u.id}">Editar</button> <button class="btn-p${u.ativo ? " btn-p--perigo" : ""}" type="button" data-alternar="${u.id}">${u.ativo ? "Desativar" : "Reativar"}</button>` : ""}</td></tr>`).join("")}
      </tbody></table></div><p style="margin-top:12px;color:var(--ap-txt3);font-size:.8rem">Contas novas recebem a senha provisória <b>medki123</b> (demonstração).</p></section></div>`;
    const form = u => {
      u = u || { perfil: "acs" };
      modal(`<h2 id="modal-t">${u.id ? "Editar conta" : "Nova conta"}</h2><form id="f-conta" novalidate style="display:grid;gap:14px;margin-top:16px"><div class="campo"><label for="ct-nome">Nome</label><input class="inp" id="ct-nome" value="${esc(u.nome || "")}"></div><div class="campo"><label for="ct-email">E-mail</label><input class="inp" id="ct-email" type="email" value="${esc(u.email || "")}"></div><div class="duas-col"><div class="campo"><label for="ct-perfil">Perfil</label><select class="inp" id="ct-perfil"><option value="acs"${u.perfil === "acs" ? " selected" : ""}>Agente Comunitário de Saúde</option><option value="farmacia"${u.perfil === "farmacia" ? " selected" : ""}>Farmácia</option></select></div><div class="campo"><label for="ct-area">Microárea (Agente Comunitário)</label><input class="inp" id="ct-area" maxlength="2" placeholder="03" value="${esc(u.microarea || "")}"></div></div><div id="ct-erro" class="msg-erro" role="alert"></div><div class="modal__acoes"><button class="btn-p" type="button" data-fecha-modal>Cancelar</button><button class="btn-p btn-p--azul" type="submit">Salvar</button></div></form>`, box => {
        $("#f-conta", box).addEventListener("submit", e => { e.preventDefault(); const r = D.salvarConta({ id: u.id, nome: $("#ct-nome", box).value, email: $("#ct-email", box).value, perfil: $("#ct-perfil", box).value, microarea: $("#ct-area", box).value.trim() }, usuario); if (r.erro) { $("#ct-erro", box).textContent = r.erro; return; } fechaModal(); toast("Conta salva.", "ok"); recarrega(); });
      });
    };
    $("#c-nova").addEventListener("click", () => form());
    $("#contas-box").addEventListener("click", e => {
      let b = e.target.closest("[data-editar]"); if (b) { form(D.usuario(b.dataset.editar)); return; }
      b = e.target.closest("[data-alternar]"); if (b) { const r = D.alternarConta(b.dataset.alternar, usuario); if (r.erro) toast(r.erro, "erro"); else { toast("Conta " + (r.ok.ativo ? "reativada" : "desativada") + ".", "ok"); recarrega(); } }
    });
  };

  // ---------- roteador com transição ----------
  function lerRota() {
    const h = (location.hash || "#/").slice(1), partes = h.split("?"), cam = partes[0].split("/").filter(Boolean), q = {};
    (partes[1] || "").split("&").forEach(kv => { if (kv) { const p = kv.split("="); q[p[0]] = decodeURIComponent(p[1] || ""); } });
    return { r: cam[0] || "inicio", sub: cam[1], q };
  }
  function cabecalho(r) {
    const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), farm = usuario.perfil === "farmacia";
    const T = {
      inicio: [hoje.charAt(0).toUpperCase() + hoje.slice(1), "Olá, " + primeiroNome() + ". " + (farm ? "Resumo da unidade e avisos mais urgentes." : usuario.perfil === "acs" ? "Avisos e pacientes da microárea " + usuario.microarea + "." : "Acompanhe os avisos dos pacientes que você cuida.")],
      avisos: [farm ? "Fluxo de entregas" : usuario.perfil === "acs" ? "Avisos da microárea" : "Meus avisos", farm ? "Avance cada aviso pelas etapas até a entrega." : "Cada aviso, etapa por etapa, até a entrega."],
      fila: ["Fila de prioridade", "Ordenada pela pontuação do RN05, recalculada todos os dias."],
      falta: ["Avisar falta", "Leva menos de um minuto, em até três passos."],
      pacientes: ["Pacientes", farm ? "Todos os pacientes da unidade (somente leitura)." : usuario.perfil === "acs" ? "Cadastre e acompanhe os pacientes da sua microárea." : "Os pacientes que você acompanha."],
      vincular: ["Vincular familiar", "Envie um convite por link para a família criar a conta."],
      historico: ["Histórico", "Tudo o que já foi avisado e entregue."],
      indicadores: ["Indicadores", "Tempo de resposta e falhas por insumo e microárea."],
      contas: ["Contas da unidade", "Cadastre, edite e desative contas do Agente Comunitário de Saúde e da farmácia."],
      prazos: ["Prazos", "Primeira resposta e entrega dos próximos avisos."]
    };
    return T[r] || ["Painel", ""];
  }
  function desenha(rota) {
    const { r, sub, q } = rota;
    let extra = null;
    if (r === "falta") extra = R.falta(sub); else if (r === "aviso") extra = R.aviso(sub); else if (r === "fila") extra = R.fila(); else if (r === "avisos") extra = R.avisos();
    else if (r === "pacientes") extra = R.pacientes(sub, q); else if (r === "vincular") extra = R.vincular(q); else if (r === "historico") extra = R.relatorio(q, false); else if (r === "indicadores") extra = R.relatorio(q, true); else if (r === "contas") extra = R.contas(); else if (r === "prazos") extra = R.prazos(); else extra = R.inicio();
    const c = cabecalho(r === "aviso" ? "aviso" : r);
    trocaTitulo((extra && extra.titulo) || c[0], (extra && extra.sub) || c[1]);
    document.title = "MedKi — " + ((extra && extra.titulo) || c[0]);
    marcaLado(r === "aviso" ? (usuario.perfil === "farmacia" ? "fila" : "avisos") : r === "pacientes" && sub === "novo" ? "pacientes" : r);
    animaEntrada(tela);
    atualizaSino();
  }
  let trocando = null;
  function render(primeira) {
    usuario = D.sessao(); if (!usuario) { location.replace("entrar.html"); return; }
    const rota = lerRota();
    if (primeira || reduz) { desenha(rota); return; }
    clearTimeout(trocando); tela.classList.add("is-saindo");
    trocando = setTimeout(() => { window.scrollTo(0, 0); desenha(rota); tela.classList.remove("is-saindo"); }, 210);
  }
  function recarrega() { montaLado(); pilulaPronta = false; desenha(lerRota()); }

  montaLado(); montaBarra(); render(true);
  window.addEventListener("hashchange", () => { fechaPops(); render(false); $("#app-main").focus({ preventScroll: true }); });
  window.addEventListener("resize", () => { const nav = $("#lado-nav"); if (nav) { pilulaPronta = false; marcaLado(lerRota().r === "aviso" ? (usuario.perfil === "farmacia" ? "fila" : "avisos") : lerRota().r); } });
})();
