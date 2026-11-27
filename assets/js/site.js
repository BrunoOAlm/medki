/* MedKi — script das páginas do site: navegação, rodapé, acessibilidade e animações */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduz = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ICONE = {
    cruz: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    capsula: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>'
  };
  window.MedKiIcone = ICONE;

  // raiz do site (funciona em file:// e em servidor): .../assets/js/site.js -> ...
  var RAIZ = ((document.currentScript && document.currentScript.src) || "").replace(/assets\/js\/site\.js.*$/, "");
  var P = function (c) { return RAIZ + "paginas/" + c; };
  window.MedKiRaiz = RAIZ;
  var LINKS = [[RAIZ + "figma/index.html", "Início", "inicio"], [P("como-funciona.html"), "Como funciona", "como"], [P("sobre.html"), "Sobre nós", "sobre"], [P("ajuda.html"), "Ajuda", "ajuda"], [P("contato.html"), "Contato", "contato"]];

  function nav(atual, fixa) {
    return '<div class="wrap nav__barra">' +
      '<a class="nav__logo" href="' + RAIZ + 'figma/index.html" aria-label="MedKi — página inicial">MedKi</a>' +
      '<nav aria-label="Principal"><ul class="nav__links">' + LINKS.map(function (l) { return '<li><a href="' + l[0] + '"' + (l[2] === atual ? ' aria-current="page"' : "") + ">" + l[1] + "</a></li>"; }).join("") + "</ul></nav>" +
      '<div class="nav__acoes"><a class="btn ' + (fixa ? "btn-azul" : "btn-vidro") + ' btn-sm btn-entrar-desk" href="' + P("entrar.html") + '">Entrar</a>' +
      '<button class="nav__menu" type="button" aria-label="Abrir menu" aria-expanded="false" data-abre-menu>' + ICONE.menu + "</button></div></div>";
  }

  function rodape() {
    return '<div class="wrap"><div class="rodape__grade">' +
      '<div><p class="rodape__logo">MedKi</p><p style="margin-top:14px;max-width:340px">Aviso de falta de remédios e insumos de uso contínuo, com acompanhamento de cada etapa. <b style="color:#fff">Gratuito para o paciente</b></p></div>' +
      '<div><h3>Navegação</h3><ul>' + LINKS.map(function (l) { return '<li><a href="' + l[0] + '">' + l[1] + "</a></li>"; }).join("") + "</ul></div>" +
      '<div><h3>Acesso</h3><ul><li><a href="' + P("entrar.html") + '">Entrar no MedKi</a></li><li><a href="' + P("entrar.html?criar=1") + '">Tenho um convite</a></li><li><a href="' + P("ajuda.html#perfis") + '">Guia para familiares</a></li><li><a href="' + P("ajuda.html#perfis") + '">Guia para o <b style="color:#fff">Agente Comunitário de Saúde</b></a></li></ul></div>' +
      '<div><h3>Atendimento</h3><ul><li><a href="' + P("contato.html") + '">Fale com a equipe</a></li><li><a href="' + P("ajuda.html") + '">Central de ajuda</a></li><li><a href="' + P("privacidade.html") + '">Privacidade (LGPD)</a></li></ul></div></div>' +
      '<div class="rodape__base"><span>© 2026 MedKi · Projeto acadêmico FAETERJ-Rio</span><span>Não substitui orientação médica. Em emergência, ligue 192.</span></div></div>';
  }

  function montar() {
    var atual = document.body.dataset.pagina || "";
    var topo = $("#nav");
    if (topo) {
      topo.className = "nav"; topo.innerHTML = nav(atual, false);
      var fixa = document.createElement("header"); fixa.className = "nav nav--fixa"; fixa.setAttribute("aria-hidden", "true"); fixa.innerHTML = nav(atual, true);
      $$("a, button", fixa).forEach(function (el) { el.setAttribute("tabindex", "-1"); });
      document.body.appendChild(fixa);
      var limite = 140;
      var aoRolar = function () { var on = window.scrollY > limite; fixa.classList.toggle("is-on", on); fixa.setAttribute("aria-hidden", String(!on)); $$("a, button", fixa).forEach(function (el) { if (on) el.removeAttribute("tabindex"); else el.setAttribute("tabindex", "-1"); }); };
      window.addEventListener("scroll", aoRolar, { passive: true }); aoRolar();
    }
    var rod = $("#rodape"); if (rod) { rod.className = "rodape"; rod.innerHTML = rodape(); }
    // gaveta do celular
    var g = document.createElement("div"); g.className = "gaveta"; g.id = "gaveta"; g.setAttribute("role", "dialog"); g.setAttribute("aria-modal", "true"); g.setAttribute("aria-label", "Menu");
    g.innerHTML = '<div class="gaveta__fundo" data-fecha-menu></div><div class="gaveta__painel"><button class="gaveta__fechar" type="button" aria-label="Fechar menu" data-fecha-menu>' + ICONE.fechar + "</button>" +
      '<p class="marca-txt" style="padding:10px 16px 6px;font-size:1.5rem;color:var(--marinho)">MedKi</p>' +
      LINKS.map(function (l) { return '<a href="' + l[0] + '">' + l[1] + "</a>"; }).join("") + '<a href="' + P("entrar.html") + '" style="margin-top:8px;background:var(--azul);color:#fff;text-align:center">Entrar</a></div>';
    document.body.appendChild(g);
    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-abre-menu]")) { g.classList.add("is-on"); $(".gaveta__fechar", g).focus(); }
      else if (e.target.closest("[data-fecha-menu]")) g.classList.remove("is-on");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") g.classList.remove("is-on"); });
    // o ajuste de tamanho de texto foi retirado: limpa preferência antiga
    try { localStorage.removeItem("medki-fonte"); } catch (e) {}
    document.documentElement.removeAttribute("data-fonte");
  }

  // Revelação ao rolar
  function revelar() {
    var els = $$(".rv, .rv-zoom");
    if (reduz || !("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      var entra = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      entra.forEach(function (el, i) { if (!el.style.getPropertyValue("--d")) el.style.setProperty("--d", Math.min(i, 6) * 90 + "ms"); el.classList.add("is-in"); io.unobserve(el); });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  // Contadores animados: <span data-conta="52.9" data-casas="1" data-sufixo="%">
  function contadores() {
    var els = $$("[data-conta]"); if (!els.length) return;
    var fmt = function (v, c) { return v.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }); };
    var roda = function (el) {
      var alvo = parseFloat(el.dataset.conta), c = +(el.dataset.casas || 0), suf = el.dataset.sufixo || "", t0 = null;
      if (reduz) { el.textContent = fmt(alvo, c) + suf; return; }
      var passo = function (t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1600); var e = 1 - Math.pow(1 - p, 4); el.textContent = fmt(alvo * e, c) + suf; if (p < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    };
    if (!("IntersectionObserver" in window)) { els.forEach(roda); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { roda(e.target); io.unobserve(e.target); } }); }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  // Perguntas frequentes (acordeão acessível)
  function faq() {
    $$(".faq__q").forEach(function (b) {
      b.addEventListener("click", function () {
        var aberto = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", String(!aberto));
        var r = document.getElementById(b.getAttribute("aria-controls"));
        r.style.maxHeight = aberto ? "0px" : r.scrollHeight + "px";
      });
    });
  }

  // Calculadora de prioridade (RN05)
  function calculadora() {
    var box = $("#calc"); if (!box) return;
    var pesos = { insulina: 5, antihipertensivo: 3, fralda: 2, outro: 1 };
    var nomes = { insulina: "Insulina", antihipertensivo: "Anti-hipertensivo", fralda: "Fralda geriátrica", outro: "Outro" };
    var pinta = function () {
      var cat = ($("input[name=calc-cat]:checked", box) || {}).value || "insulina";
      var dias = +$("#calc-dias", box).value, cinco = $("#calc-cinco", box).checked;
      var total = pesos[cat] + dias + (cinco ? 2 : 0);
      $("#calc-dias-v", box).textContent = dias + (dias === 1 ? " dia" : " dias");
      $("#calc-total", box).textContent = total;
      $("#calc-conta", box).innerHTML = "<span>" + nomes[cat] + " <b>+" + pesos[cat] + "</b></span><span>Dias sem o insumo <b>+" + dias + "</b></span><span>5 ou mais medicamentos <b>+" + (cinco ? 2 : 0) + "</b></span>";
      var nivel = total >= 12 ? ["Muito alta", "var(--vermelho)"] : total >= 8 ? ["Alta", "var(--ambar)"] : total >= 4 ? ["Média", "var(--azul-forte)"] : ["Normal", "var(--verde)"];
      var n = $("#calc-nivel", box); n.textContent = nivel[0]; n.style.color = nivel[1];
      $("#calc-barra", box).style.width = Math.min(100, total / 20 * 100) + "%";
      var pulso = $("#calc-total", box); pulso.classList.remove("pulsa"); void pulso.offsetWidth; pulso.classList.add("pulsa");
    };
    box.addEventListener("input", pinta); pinta();
  }

  // Ciclo de status animado (vitrine da landing)
  function ciclo() {
    var box = $("[data-ciclo]"); if (!box) return;
    var passos = $$(".ciclo__passo", box), i = 0;
    var vai = function () { passos.forEach(function (p, k) { p.classList.toggle("is-feito", k < i); p.classList.toggle("is-atual", k === i); }); var b = $(".ciclo__trilho-cheio", box); if (b) b.style.width = (i / (passos.length - 1)) * 100 + "%"; i = (i + 1) % passos.length; };
    vai(); if (!reduz) setInterval(vai, 2200);
  }

  // Parallax suave da mão da hero
  function parallax() {
    var el = $("[data-parallax]"); if (!el || reduz) return;
    var raf = 0;
    window.addEventListener("scroll", function () { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; var y = window.scrollY; if (y < 900) el.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0)"; }); }, { passive: true });
  }

  window.MedKiToast = function (msg, tipo) {
    var t = document.createElement("div"); t.className = "toast" + (tipo ? " toast--" + tipo : ""); t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.style.transition = "opacity .5s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 600); }, 3200);
  };

  document.addEventListener("DOMContentLoaded", function () { montar(); revelar(); contadores(); faq(); calculadora(); ciclo(); });
})();
