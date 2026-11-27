/* MedKi — dados de demonstração e regras de negócio (RN01–RN09 do documento RemédioEmCasa-Alerta).
   Tudo fica salvo no localStorage do navegador; nada é enviado para a internet. */
(function () {
  "use strict";
  var CHAVE = "medki-db", VERSAO = 3;
  var DIA = 864e5;

  var CATEGORIAS = { insulina: { nome: "Insulina", peso: 5 }, antihipertensivo: { nome: "Anti-hipertensivo", peso: 3 }, fralda: { nome: "Fralda geriátrica", peso: 2 }, outro: { nome: "Outro", peso: 1 } };
  var STATUS = ["Pendente", "Em separação", "Saiu para entrega", "Entregue"];
  var CLASSE = { "Pendente": "pendente", "Em separação": "separacao", "Saiu para entrega": "saiu", "Entregue": "entregue", "Cancelada": "cancelada" };

  // Hash simples só para a demonstração (num servidor real seria bcrypt/argon2 — RNF05)
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return "h" + (h >>> 0).toString(36); }
  function iso(d) { return new Date(d).toISOString(); }
  function diasAtras(n, hora) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(hora == null ? 9 : hora, 15, 0, 0); return d; }
  function soData(d) { return iso(d).slice(0, 10); }
  // Nome comparável: Unicode NFKC, minúsculas e espaços repetidos reduzidos (RN04/RF06)
  function normaliza(s) { return String(s || "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(); }

  function semente() {
    var u = [
      { id: "U1", nome: "Paula Ribeiro", email: "paula@unidade.exemplo", perfil: "farmacia", responsavel: true, ativo: true, senha: hash("medki123") },
      { id: "U2", nome: "Rafael Costa", email: "rafael@unidade.exemplo", perfil: "farmacia", responsavel: false, ativo: true, senha: hash("medki123") },
      { id: "U3", nome: "Joana Lima", email: "joana@unidade.exemplo", perfil: "acs", microarea: "01", ativo: true, senha: hash("medki123") },
      { id: "U4", nome: "Marcos Silva", email: "marcos@unidade.exemplo", perfil: "acs", microarea: "02", ativo: true, senha: hash("medki123") },
      { id: "U5", nome: "Ana Souza", email: "ana@familia.exemplo", perfil: "notificante", ativo: true, senha: hash("medki123") },
      { id: "U6", nome: "Carlos Mendes", email: "carlos@familia.exemplo", perfil: "notificante", ativo: true, senha: hash("medki123") }
    ];
    var m = function (nome, cat) { return { nome: nome, categoria: cat }; };
    var p = [
      { id: "P-0142", iniciais: "M. S.", microarea: "01", vinculos: ["U5"], criadoPor: "U3", medicamentos: [m("Insulina NPH 100 UI/mL", "insulina"), m("Losartana 50 mg", "antihipertensivo"), m("Metformina 850 mg", "outro"), m("Sinvastatina 20 mg", "outro"), m("AAS 100 mg", "outro")] },
      { id: "P-0157", iniciais: "J. A.", microarea: "01", vinculos: ["U5"], criadoPor: "U3", medicamentos: [m("Enalapril 10 mg", "antihipertensivo"), m("Fralda geriátrica G", "fralda")] },
      { id: "P-0203", iniciais: "R. C.", microarea: "02", vinculos: ["U6"], criadoPor: "U4", medicamentos: [m("Insulina Regular 100 UI/mL", "insulina"), m("Hidroclorotiazida 25 mg", "antihipertensivo"), m("Glibenclamida 5 mg", "outro")] },
      { id: "P-0219", iniciais: "L. F.", microarea: "02", vinculos: ["U6"], criadoPor: "U4", medicamentos: [m("Fralda geriátrica M", "fralda"), m("Atenolol 50 mg", "antihipertensivo"), m("Captopril 25 mg", "antihipertensivo"), m("Omeprazol 20 mg", "outro"), m("Furosemida 40 mg", "outro"), m("Sinvastatina 20 mg", "outro")] },
      { id: "P-0230", iniciais: "E. P.", microarea: "01", vinculos: [], criadoPor: "U3", medicamentos: [m("Losartana 50 mg", "antihipertensivo"), m("Anlodipino 5 mg", "antihipertensivo")] },
      { id: "P-0248", iniciais: "T. R.", microarea: "02", vinculos: [], criadoPor: "U4", medicamentos: [m("Insulina NPH 100 UI/mL", "insulina"), m("Fralda geriátrica G", "fralda")] }
    ];
    var n = [], seq = 0;
    function hist(status, quando, quem, nota) { return { status: status, data: iso(quando), usuario: quem, nota: nota || "" }; }
    function nova(pac, insumo, cat, faltaHa, abertoHa, por, passos, extra) {
      seq++; var aberto = diasAtras(abertoHa, 8 + (seq % 6)), h = [hist("Pendente", aberto, por, "Aviso registrado")], st = "Pendente", primeira = null;
      (passos || []).forEach(function (ps) { var q = new Date(aberto.getTime() + ps[1] * DIA); h.push(hist(ps[0], q, ps[2] || "U2", ps[3])); if (st === "Pendente" && ps[0] !== "Pendente" && !primeira) primeira = iso(q); st = ps[0]; });
      n.push(Object.assign({ id: "N-" + String(1000 + seq), pacienteId: pac, insumo: insumo, categoria: cat, dataFalta: soData(diasAtras(faltaHa)), observacao: "", criadoEm: iso(aberto), criadoPor: por, prazoRespostaUteis: 2, prazoEntregaDias: 7, status: st, historico: h, primeiraResposta: primeira, tentativas: 0, motivoCancelamento: "" }, extra || {}));
    }
    // Avisos em aberto
    nova("P-0142", "Insulina NPH 100 UI/mL", "insulina", 5, 4, "U5", [], { observacao: "A entrega de terça não chegou." });
    nova("P-0219", "Fralda geriátrica M", "fralda", 3, 3, "U6", [["Em separação", 1, "U2"]]);
    nova("P-0203", "Hidroclorotiazida 25 mg", "antihipertensivo", 2, 2, "U4", [["Em separação", .4, "U1"], ["Saiu para entrega", 1.2, "U2"]]);
    nova("P-0157", "Enalapril 10 mg", "antihipertensivo", 1, 0, "U5", []);
    nova("P-0230", "Anlodipino 5 mg", "antihipertensivo", 9, 8, "U3", [["Em separação", 1.5, "U2"]]);
    nova("P-0248", "Insulina NPH 100 UI/mL", "insulina", 2, 1, "U4", []);
    // Histórico para os indicadores (últimos 90 dias)
    var hist90 = [
      ["P-0142", "Insulina NPH 100 UI/mL", "insulina", 20, "U5", 4], ["P-0142", "Losartana 50 mg", "antihipertensivo", 46, "U5", 6], ["P-0142", "Insulina NPH 100 UI/mL", "insulina", 72, "U3", 3],
      ["P-0157", "Fralda geriátrica G", "fralda", 33, "U5", 9], ["P-0203", "Insulina Regular 100 UI/mL", "insulina", 25, "U6", 2], ["P-0203", "Glibenclamida 5 mg", "outro", 58, "U4", 8],
      ["P-0219", "Atenolol 50 mg", "antihipertensivo", 15, "U6", 5], ["P-0219", "Fralda geriátrica M", "fralda", 40, "U4", 7], ["P-0219", "Omeprazol 20 mg", "outro", 64, "U6", 4],
      ["P-0230", "Losartana 50 mg", "antihipertensivo", 28, "U3", 3], ["P-0248", "Fralda geriátrica G", "fralda", 50, "U4", 11], ["P-0248", "Insulina NPH 100 UI/mL", "insulina", 84, "U4", 2]
    ];
    hist90.forEach(function (x) { nova(x[0], x[1], x[2], x[3] + 1, x[3], x[4], [["Em separação", Math.min(1, x[5] / 3), "U2"], ["Saiu para entrega", x[5] - .4, "U2"], ["Entregue", x[5], "U2", "Entregue ao cuidador"]]); });
    nova("P-0157", "Enalapril 10 mg", "antihipertensivo", 37, 36, "U5", [["Cancelada", .5, "U5", "O remédio chegou por outro meio."]], { motivoCancelamento: "O remédio chegou por outro meio." });
    nova("P-0203", "Hidroclorotiazida 25 mg", "antihipertensivo", 62, 61, "U4", [["Em separação", 1, "U2"], ["Cancelada", 2, "U1", "Medicamento substituído pela equipe médica."]], { motivoCancelamento: "Medicamento substituído pela equipe médica." });
    return {
      versao: VERSAO,
      unidade: { nome: "Clínica da Família Exemplo · UBS Centro", prazoRespostaUteis: 2, prazoEntregaDias: 7 },
      usuarios: u, pacientes: p, notificacoes: n, convites: [], seq: seq + 1000
    };
  }

  var db;
  function carregar() {
    try { db = JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch (e) { db = null; }
    if (!db || db.versao !== VERSAO) { db = semente(); salvar(); }
    // Avisos sem prazo gravado recebem o prazo vigente, para uma mudança futura não valer para eles (RN08)
    db.notificacoes.forEach(function (n) { if (!n.prazoRespostaUteis) { n.prazoRespostaUteis = db.unidade.prazoRespostaUteis; n.prazoEntregaDias = db.unidade.prazoEntregaDias; } });
    return db;
  }
  function salvar() { localStorage.setItem(CHAVE, JSON.stringify(db)); }

  // ---------- datas e prazos (RN08) ----------
  function diasCorridos(a, b) { return Math.floor((new Date(b) - new Date(a)) / DIA); }
  function diasUteis(a, b) { var d = new Date(a), fim = new Date(b), n = 0; d.setHours(0, 0, 0, 0); var f = new Date(fim); f.setHours(0, 0, 0, 0); while (d < f) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n++; } return n; }
  function emAberto(n) { return n.status !== "Entregue" && n.status !== "Cancelada"; }
  function emAtraso(n, agora) {
    if (!emAberto(n)) return false; agora = agora || new Date();
    var resp = n.prazoRespostaUteis || db.unidade.prazoRespostaUteis, ent = n.prazoEntregaDias || db.unidade.prazoEntregaDias;
    if (!n.primeiraResposta && diasUteis(n.criadoEm, agora) > resp) return true;
    return diasCorridos(n.criadoEm, agora) > ent;
  }
  // ---------- prioridade (RN05) ----------
  function paciente(id) { return db.pacientes.filter(function (p) { return p.id === id; })[0]; }
  function usuario(id) { return db.usuarios.filter(function (u) { return u.id === id; })[0]; }
  function diasSem(n, ate) { var fim = ate || (emAberto(n) ? new Date() : new Date(n.historico[n.historico.length - 1].data)); return Math.max(0, diasCorridos(n.dataFalta + "T00:00:00", fim)); }
  // shortcut: "outro" conta como medicamento porque o item não tem marcação própria; o backend Django tem o campo é_medicamento
  function qtdMedicamentos(p) { var vistos = {}; (p ? p.medicamentos : []).forEach(function (m) { if (m.categoria !== "fralda") vistos[normaliza(m.nome)] = 1; }); return Object.keys(vistos).length; }
  function prioridade(n) {
    var p = paciente(n.pacienteId), peso = (CATEGORIAS[n.categoria] || CATEGORIAS.outro).peso, dias = diasSem(n), extra = qtdMedicamentos(p) >= 5 ? 2 : 0;
    return { total: peso + dias + extra, peso: peso, dias: dias, extra: extra };
  }
  function nivel(total) { return total >= 12 ? "Muito alta" : total >= 8 ? "Alta" : total >= 4 ? "Média" : "Normal"; }
  function fila(lista) {
    return lista.slice().sort(function (a, b) { var d = prioridade(b).total - prioridade(a).total; return d || new Date(a.criadoEm) - new Date(b.criadoEm); });
  }
  // ---------- visibilidade (RN09) ----------
  function visiveis(user) {
    return db.notificacoes.filter(function (n) {
      var p = paciente(n.pacienteId); if (!p) return false;
      if (user.perfil === "farmacia") return true;
      if (user.perfil === "acs") return p.microarea === user.microarea;
      return p.vinculos.indexOf(user.id) >= 0;
    });
  }
  function pacientesDe(user) {
    return db.pacientes.filter(function (p) { return user.perfil === "farmacia" ? true : user.perfil === "acs" ? p.microarea === user.microarea : p.vinculos.indexOf(user.id) >= 0; });
  }
  // ---------- registro (RN04, RF05, RF06) ----------
  function abertaPara(pacId, insumo) {
    var k = normaliza(insumo);
    return db.notificacoes.filter(function (n) { return n.pacienteId === pacId && normaliza(n.insumo) === k && emAberto(n); })[0] || null;
  }
  function registrar(dados, user) {
    var p = paciente(dados.pacienteId);
    if (!p) return { erro: "Escolha o paciente." };
    if (pacientesDe(user).indexOf(p) < 0) return { erro: "Você não tem vínculo com este paciente." };
    if (!dados.insumo || !dados.insumo.trim()) return { erro: "Informe o remédio ou insumo em falta." };
    if (!CATEGORIAS[dados.categoria]) return { erro: "Escolha a categoria do insumo." };
    if (!dados.dataFalta) return { erro: "Informe a data em que o insumo acabou." };
    if (new Date(dados.dataFalta + "T00:00:00") > new Date()) return { erro: "A data não pode ser no futuro." };
    var dup = abertaPara(p.id, dados.insumo); if (dup) return { duplicada: dup };
    db.seq++; var agora = iso(new Date());
    var n = { id: "N-" + db.seq, pacienteId: p.id, insumo: dados.insumo.trim(), categoria: dados.categoria, dataFalta: dados.dataFalta, observacao: (dados.observacao || "").trim().slice(0, 300), criadoEm: agora, criadoPor: user.id, prazoRespostaUteis: db.unidade.prazoRespostaUteis, prazoEntregaDias: db.unidade.prazoEntregaDias, status: "Pendente", historico: [{ status: "Pendente", data: agora, usuario: user.id, nota: "Aviso registrado" }], primeiraResposta: null, tentativas: 0, motivoCancelamento: "" };
    db.notificacoes.push(n); salvar(); return { ok: n };
  }
  // ---------- status (RN06, RN07, RF10–RF12) ----------
  function proximo(n) { var i = STATUS.indexOf(n.status); return i >= 0 && i < STATUS.length - 1 ? STATUS[i + 1] : null; }
  function avancar(n, user) {
    if (user.perfil !== "farmacia") return { erro: "Somente a farmácia altera o status." };
    var nx = proximo(n); if (!nx) return { erro: "Este aviso não pode avançar." };
    var agora = iso(new Date()); n.status = nx; if (!n.primeiraResposta) n.primeiraResposta = agora;
    n.historico.push({ status: nx, data: agora, usuario: user.id, nota: "" }); salvar(); return { ok: n };
  }
  function semSucesso(n, user, nota) {
    if (user.perfil !== "farmacia" || n.status !== "Saiu para entrega") return { erro: "Só é possível registrar tentativa sem sucesso para avisos que saíram para entrega." };
    n.status = "Pendente"; n.tentativas++; n.historico.push({ status: "Pendente", data: iso(new Date()), usuario: user.id, nota: "Tentativa de entrega sem sucesso" + (nota ? ": " + nota : "") }); salvar(); return { ok: n };
  }
  function podeCancelar(n, user) {
    if (user.perfil === "farmacia") return n.status === "Pendente" || n.status === "Em separação";
    if (user.perfil === "notificante") return n.status === "Pendente" && n.criadoPor === user.id;
    return false;
  }
  function cancelar(n, user, motivo) {
    if (!podeCancelar(n, user)) return { erro: "Este aviso não pode ser cancelado agora." };
    if (user.perfil === "farmacia" && !(motivo || "").trim()) return { erro: "Informe o motivo do cancelamento." };
    n.status = "Cancelada"; n.motivoCancelamento = (motivo || "").trim(); n.historico.push({ status: "Cancelada", data: iso(new Date()), usuario: user.id, nota: n.motivoCancelamento || "Cancelado por quem avisou" }); salvar(); return { ok: n };
  }
  // ---------- pacientes, vínculos e contas (RF02–RF04) ----------
  function cadastrarPaciente(dados, user) {
    if (user.perfil !== "acs") return { erro: "Somente o Agente Comunitário de Saúde cadastra pacientes." };
    var cod = (dados.id || "").trim().toUpperCase();
    if (!/^P-\d{4}$/.test(cod)) return { erro: "O código deve seguir o formato P-0000." };
    if (paciente(cod)) return { erro: "Já existe um paciente com este código." };
    var ini = (dados.iniciais || "").trim().toUpperCase(); if (!/^([A-ZÀ-Ú]\.\s?){1,4}$/.test(ini)) return { erro: "Informe só as iniciais, por exemplo: M. S." };
    var meds = (dados.medicamentos || []).filter(function (x) { return x.nome && x.nome.trim(); });
    var p = { id: cod, iniciais: ini, microarea: user.microarea, vinculos: [], criadoPor: user.id, medicamentos: meds.map(function (x) { return { nome: x.nome.trim(), categoria: CATEGORIAS[x.categoria] ? x.categoria : "outro" }; }) };
    db.pacientes.push(p); salvar(); return { ok: p };
  }
  function convidar(email, pacIds, user) {
    if (user.perfil !== "acs") return { erro: "Somente o Agente Comunitário de Saúde vincula familiares." };
    email = (email || "").trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };
    if (!pacIds.length) return { erro: "Escolha pelo menos um paciente." };
    var existe = db.usuarios.filter(function (u) { return u.email === email; })[0];
    if (existe && existe.perfil !== "notificante") return { erro: "Este e-mail pertence a uma conta da unidade." };
    if (existe) { pacIds.forEach(function (id) { var p = paciente(id); if (p.vinculos.indexOf(existe.id) < 0) p.vinculos.push(existe.id); }); salvar(); return { ok: { vinculado: existe } }; }
    var cod = Math.random().toString(36).slice(2, 10).toUpperCase(); db.convites.push({ codigo: cod, email: email, pacientes: pacIds, por: user.id, data: iso(new Date()) }); salvar();
    return { ok: { convite: cod } };
  }
  function aceitarConvite(cod, nome, senha) {
    var c = db.convites.filter(function (x) { return x.codigo === cod; })[0]; if (!c) return { erro: "Convite não encontrado ou já usado." };
    if ((nome || "").trim().length < 2) return { erro: "Informe seu nome." }; if ((senha || "").length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
    var u = { id: "U" + (db.usuarios.length + 1) + Date.now().toString(36).slice(-3), nome: nome.trim(), email: c.email, perfil: "notificante", ativo: true, senha: hash(senha) };
    db.usuarios.push(u); c.pacientes.forEach(function (id) { var p = paciente(id); if (p) p.vinculos.push(u.id); }); db.convites = db.convites.filter(function (x) { return x !== c; }); salvar(); return { ok: u };
  }
  function salvarConta(dados, user) {
    if (!(user.perfil === "farmacia" && user.responsavel)) return { erro: "Somente o farmacêutico responsável gerencia contas." };
    var email = (dados.email || "").trim().toLowerCase();
    if ((dados.nome || "").trim().length < 2) return { erro: "Informe o nome." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };
    if (dados.perfil !== "acs" && dados.perfil !== "farmacia") return { erro: "Escolha o perfil: Agente Comunitário de Saúde ou Farmácia." };
    if (dados.perfil === "acs" && !/^\d{2}$/.test(dados.microarea || "")) return { erro: "Informe a microárea com 2 dígitos." };
    var outro = db.usuarios.filter(function (u) { return u.email === email && u.id !== dados.id; })[0]; if (outro) return { erro: "Já existe uma conta com este e-mail." };
    var u = dados.id ? usuario(dados.id) : null;
    if (!u) { u = { id: "U" + (db.usuarios.length + 1) + Date.now().toString(36).slice(-3), ativo: true, senha: hash("medki123"), responsavel: false }; db.usuarios.push(u); }
    u.nome = dados.nome.trim(); u.email = email; u.perfil = dados.perfil; u.microarea = dados.perfil === "acs" ? dados.microarea : undefined; salvar(); return { ok: u };
  }
  function salvarPrazos(dados, user) {
    if (!(user.perfil === "farmacia" && user.responsavel)) return { erro: "Somente o farmacêutico responsável ajusta os prazos." };
    var r = +dados.resposta, e = +dados.entrega;
    if (!(r >= 1 && r <= 30 && r % 1 === 0)) return { erro: "A primeira resposta deve ficar entre 1 e 30 dias úteis." };
    if (!(e >= 1 && e <= 60 && e % 1 === 0)) return { erro: "A entrega deve ficar entre 1 e 60 dias corridos." };
    db.unidade.prazoRespostaUteis = r; db.unidade.prazoEntregaDias = e; salvar(); return { ok: db.unidade };
  }
  function alternarConta(id, user) { var u = usuario(id); if (!u || !user.responsavel || u.id === user.id) return { erro: "Não é possível alterar esta conta." }; u.ativo = !u.ativo; salvar(); return { ok: u }; }
  // ---------- autenticação (RF01) e sessão (RNF06) ----------
  function entrar(email, senha) {
    var u = db.usuarios.filter(function (x) { return x.email === (email || "").trim().toLowerCase(); })[0];
    if (!u || u.senha !== hash(senha || "")) return { erro: "E-mail ou senha incorretos." };
    if (!u.ativo) return { erro: "Esta conta está desativada. Fale com a farmácia da unidade." };
    localStorage.setItem("medki-sessao", JSON.stringify({ id: u.id, ultimoUso: Date.now() })); return { ok: u };
  }
  function sessao() { try { var s = JSON.parse(localStorage.getItem("medki-sessao") || "null"); if (!s) return null; if (Date.now() - s.ultimoUso > 30 * 60000) { sair(); return null; } var u = usuario(s.id); return u && u.ativo ? u : null; } catch (e) { return null; } }
  function tocarSessao() { var s = JSON.parse(localStorage.getItem("medki-sessao") || "null"); if (s) { s.ultimoUso = Date.now(); localStorage.setItem("medki-sessao", JSON.stringify(s)); } }
  function sair() { localStorage.removeItem("medki-sessao"); }
  // ---------- indicadores (RF15) ----------
  function indicadores(dias) {
    var ini = new Date(Date.now() - dias * DIA), todas = db.notificacoes.filter(function (n) { return new Date(n.criadoEm) >= ini; });
    var entregues = todas.filter(function (n) { return n.status === "Entregue"; });
    var tempos = entregues.map(function (n) { var e = n.historico.filter(function (h) { return h.status === "Entregue"; }).pop(); return (new Date(e.data) - new Date(n.criadoEm)) / DIA; });
    var media = tempos.length ? tempos.reduce(function (a, b) { return a + b; }, 0) / tempos.length : 0;
    var ate7 = tempos.length ? tempos.filter(function (t) { return t <= db.unidade.prazoEntregaDias; }).length / tempos.length * 100 : 0;
    var porCat = {}, porArea = {}, porPac = {};
    todas.forEach(function (n) { var p = paciente(n.pacienteId) || {}; porCat[n.categoria] = (porCat[n.categoria] || 0) + 1; porArea[p.microarea] = (porArea[p.microarea] || 0) + 1; });
    var ini90 = new Date(Date.now() - 90 * DIA); db.notificacoes.forEach(function (n) { if (new Date(n.criadoEm) >= ini90) porPac[n.pacienteId] = (porPac[n.pacienteId] || 0) + 1; });
    return { total: todas.length, abertas: todas.filter(emAberto).length, atrasadas: todas.filter(function (n) { return emAtraso(n); }).length, entregues: entregues.length, canceladas: todas.filter(function (n) { return n.status === "Cancelada"; }).length, mediaDias: media, pctAte7: ate7, porCategoria: porCat, porMicroarea: porArea, recorrencia: porPac, lista: todas };
  }

  carregar();
  window.MedKiDB = {
    db: function () { return db; }, salvar: salvar, reiniciar: function () { db = semente(); salvar(); },
    CATEGORIAS: CATEGORIAS, STATUS: STATUS, CLASSE: CLASSE,
    paciente: paciente, usuario: usuario, prioridade: prioridade, nivel: nivel, fila: fila, emAtraso: emAtraso, emAberto: emAberto, diasSem: diasSem,
    visiveis: visiveis, pacientesDe: pacientesDe, abertaPara: abertaPara, registrar: registrar, proximo: proximo, avancar: avancar, semSucesso: semSucesso,
    podeCancelar: podeCancelar, cancelar: cancelar, cadastrarPaciente: cadastrarPaciente, convidar: convidar, aceitarConvite: aceitarConvite,
    salvarConta: salvarConta, salvarPrazos: salvarPrazos, alternarConta: alternarConta, normaliza: normaliza, qtdMedicamentos: qtdMedicamentos, entrar: entrar, sessao: sessao, tocarSessao: tocarSessao, sair: sair, indicadores: indicadores
  };
})();
