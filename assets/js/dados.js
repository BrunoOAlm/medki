/* MedKi — camada de dados do front. Os dados e as regras (RN01–RN09) ficam no servidor Django (/api/).
   Aqui só há uma cópia do que o usuário pode ver, atualizada a cada ação; as leituras são síncronas e as ações, assíncronas. */
(function () {
  "use strict";
  var DIA = 864e5;
  var CATEGORIAS = { insulina: { nome: "Insulina", peso: 5 }, antihipertensivo: { nome: "Anti-hipertensivo", peso: 3 }, fralda: { nome: "Fralda geriátrica", peso: 2 }, outro: { nome: "Outro", peso: 1 } };
  var STATUS = ["Pendente", "Em separação", "Saiu para entrega", "Entregue"];
  var CLASSE = { "Pendente": "pendente", "Em separação": "separacao", "Saiu para entrega": "saiu", "Entregue": "entregue", "Cancelada": "cancelada" };
  var SESSAO = "medki-sessao";
  var db = { unidade: { nome: "", prazoRespostaUteis: 2, prazoEntregaDias: 7 }, usuarios: [], pacientes: [], notificacoes: [] }, eu = null;

  // ---------- comunicação com o servidor ----------
  function cookie(nome) { var m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  function marcaUso() { if (eu) localStorage.setItem(SESSAO, JSON.stringify({ id: eu, ultimoUso: Date.now() })); }
  function semSessao() { eu = null; localStorage.removeItem(SESSAO); if (!/entrar\.html/.test(location.pathname)) location.replace("entrar.html?expirou=1"); }
  function pedir(metodo, url, corpo) {
    return fetch("/api/" + url, { method: metodo, credentials: "same-origin", headers: { "Content-Type": "application/json", "X-CSRFToken": cookie("csrftoken") }, body: corpo ? JSON.stringify(corpo) : undefined })
      .then(function (r) {
        if (r.status === 401 && url !== "entrar") { semSessao(); return { erro: "Sua sessão terminou. Entre novamente." }; }
        return r.json().catch(function () { return { erro: "Resposta inválida do servidor." }; });
      })
      .catch(function () { return { erro: "Sem conexão com o servidor. Tente de novo.", semConexao: true }; });
  }
  function carregar() {
    return pedir("GET", "estado").then(function (r) {
      if (r.erro) return r;
      eu = r.usuario || null;
      if (!eu) { localStorage.removeItem(SESSAO); return r; }
      db = { unidade: r.unidade, usuarios: r.usuarios, pacientes: r.pacientes, notificacoes: r.notificacoes };
      marcaUso(); return r;
    });
  }
  // Ação no servidor seguida de nova leitura, para a tela mostrar o estado confirmado pelo servidor
  function agir(url, corpo, depois) {
    return pedir("POST", url, corpo).then(function (r) {
      if (r.erro) return r;
      return carregar().then(function () { return depois ? depois(r) : { ok: r.ok }; });
    });
  }

  // ---------- leituras (mesmas funções de antes) ----------
  function paciente(id) { return db.pacientes.filter(function (p) { return p.id === id; })[0]; }
  function usuario(id) { return db.usuarios.filter(function (u) { return u.id === id; })[0]; }
  function aviso(id) { return db.notificacoes.filter(function (n) { return n.id === id; })[0]; }
  function emAberto(n) { return n.status !== "Entregue" && n.status !== "Cancelada"; }
  function emAtraso(n) { return !!n.atraso; }
  function diasSem(n) { return n.diasSem; }
  // Avisos salvos trazem a prioridade calculada pelo servidor; a estimativa local serve só para a tela de revisão (RN05)
  function prioridade(n) {
    if (n.prioridade) return n.prioridade;
    var peso = (CATEGORIAS[n.categoria] || CATEGORIAS.outro).peso, dias = Math.max(0, Math.floor((Date.now() - new Date(n.dataFalta + "T00:00:00")) / DIA)), extra = qtdMedicamentos(paciente(n.pacienteId)) >= 5 ? 2 : 0;
    return { total: peso + dias + extra, peso: peso, dias: dias, extra: extra };
  }
  function nivel(total) { return total >= 12 ? "Muito alta" : total >= 8 ? "Alta" : total >= 4 ? "Média" : "Normal"; }
  function fila(lista) { return lista.slice().sort(function (a, b) { return (b.prioridade.total - a.prioridade.total) || (new Date(a.criadoEm) - new Date(b.criadoEm)); }); }
  // O servidor já filtra por perfil, microárea e vínculo (RN09)
  function visiveis() { return db.notificacoes; }
  function pacientesDe() { return db.pacientes; }
  function normaliza(s) { return String(s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(); }
  function qtdMedicamentos(p) { var vistos = {}; (p ? p.medicamentos : []).forEach(function (m) { if (m.medicamento) vistos[normaliza(m.nome)] = 1; }); return Object.keys(vistos).length; }
  function abertaPara(pacId, insumo) { var k = normaliza(insumo); return db.notificacoes.filter(function (n) { return n.pacienteId === pacId && normaliza(n.insumo) === k && emAberto(n); })[0] || null; }
  function proximo(n) { var i = STATUS.indexOf(n.status); return i >= 0 && i < STATUS.length - 1 ? STATUS[i + 1] : null; }
  function podeCancelar(n, user) {
    if (user.perfil === "farmacia") return n.status === "Pendente" || n.status === "Em separação";
    if (user.perfil === "notificante") return n.status === "Pendente" && n.criadoPor === user.id;
    return false;
  }
  function sessao() { var u = eu && usuario(eu); return u && u.ativo ? u : null; }

  // ---------- indicadores (RF15), calculados sobre os avisos da unidade vindos do servidor ----------
  function indicadores(dias) {
    var ini = new Date(Date.now() - dias * DIA), todas = db.notificacoes.filter(function (n) { return new Date(n.criadoEm) >= ini; });
    var entregues = todas.filter(function (n) { return n.status === "Entregue"; });
    var tempos = entregues.map(function (n) { var e = n.historico.filter(function (h) { return h.status === "Entregue"; }).pop(); return (new Date(e.data) - new Date(n.criadoEm)) / DIA; });
    var media = tempos.length ? tempos.reduce(function (a, b) { return a + b; }, 0) / tempos.length : 0;
    var ate7 = tempos.length ? tempos.filter(function (t) { return t <= 7; }).length / tempos.length * 100 : 0;
    var porCat = {}, porArea = {}, porPac = {};
    todas.forEach(function (n) { var p = paciente(n.pacienteId) || {}; porCat[n.categoria] = (porCat[n.categoria] || 0) + 1; porArea[p.microarea] = (porArea[p.microarea] || 0) + 1; });
    var ini90 = new Date(Date.now() - 90 * DIA); db.notificacoes.forEach(function (n) { if (new Date(n.criadoEm) >= ini90) porPac[n.pacienteId] = (porPac[n.pacienteId] || 0) + 1; });
    return { total: todas.length, abertas: todas.filter(emAberto).length, atrasadas: todas.filter(emAtraso).length, entregues: entregues.length, canceladas: todas.filter(function (n) { return n.status === "Cancelada"; }).length, mediaDias: media, pctAte7: ate7, porCategoria: porCat, porMicroarea: porArea, recorrencia: porPac, lista: todas };
  }

  // ---------- ações (retornam Promise com { ok } ou { erro }) ----------
  function registrar(d) {
    return pedir("POST", "avisos", { pacienteId: d.pacienteId, insumo: d.insumo, categoria: d.categoria, dataFalta: d.dataFalta, observacao: d.observacao }).then(function (r) {
      if (r.erro) return r;
      return carregar().then(function () { return r.duplicada ? { duplicada: aviso(r.duplicada) } : { ok: aviso(r.ok) }; });
    });
  }
  function status(n, acao, motivo) { return agir("avisos/" + n.id + "/status", { acao: acao, motivo: motivo || "", esperado: n.status }, function (r) { return { ok: aviso(r.ok) }; }); }
  function avancar(n) { return status(n, "avancar"); }
  function semSucesso(n, user, nota) { return status(n, "sem_sucesso", nota); }
  function cancelar(n, user, motivo) { return status(n, "cancelar", motivo); }
  function cadastrarPaciente(d) { return agir("pacientes", d, function (r) { return { ok: paciente(r.ok) }; }); }
  function convidar(email, pacIds) { return pedir("POST", "convites", { email: email, pacientes: pacIds }); }
  function aceitarConvite(codigo, nome, senha) { return pedir("POST", "convites/aceitar", { codigo: codigo, nome: nome, senha: senha }).then(function (r) { return r.erro ? r : carregar().then(function () { return { ok: sessao() }; }); }); }
  function salvarConta(d) { return agir(d.id ? "contas/" + d.id : "contas", d, function (r) { return { ok: usuario(r.ok), senhaProvisoria: r.senhaProvisoria }; }); }
  function alternarConta(id) { return agir("contas/" + id + "/alternar", {}, function (r) { return { ok: usuario(r.ok) }; }); }
  function salvarPrazos(d) { return agir("prazos", { resposta: d.resposta, entrega: d.entrega }, function () { return { ok: db.unidade }; }); }
  function entrar(email, senha) { return pedir("POST", "entrar", { email: email, senha: senha }).then(function (r) { return r.erro ? r : carregar().then(function () { return { ok: sessao() }; }); }); }
  function sair() { localStorage.removeItem(SESSAO); eu = null; return pedir("POST", "sair"); }
  function tocarSessao() { marcaUso(); return pedir("POST", "sessao/renovar"); }

  window.MedKiDB = {
    db: function () { return db; }, carregar: carregar,
    CATEGORIAS: CATEGORIAS, STATUS: STATUS, CLASSE: CLASSE,
    paciente: paciente, usuario: usuario, prioridade: prioridade, nivel: nivel, fila: fila, emAtraso: emAtraso, emAberto: emAberto, diasSem: diasSem,
    visiveis: visiveis, pacientesDe: pacientesDe, abertaPara: abertaPara, registrar: registrar, proximo: proximo, avancar: avancar, semSucesso: semSucesso,
    podeCancelar: podeCancelar, cancelar: cancelar, cadastrarPaciente: cadastrarPaciente, convidar: convidar, aceitarConvite: aceitarConvite,
    salvarConta: salvarConta, salvarPrazos: salvarPrazos, alternarConta: alternarConta, normaliza: normaliza, qtdMedicamentos: qtdMedicamentos,
    entrar: entrar, sessao: sessao, tocarSessao: tocarSessao, sair: sair, indicadores: indicadores
  };
})();
