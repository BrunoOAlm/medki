/* MedKi — entende um pedido escrito livremente ("acabou a insulina da M. S. ontem").
   Roda no navegador, sem serviço externo: regras sobre os pacientes e itens que a pessoa pode ver.
   Devolve o que conseguiu entender; o painel pergunta o que faltar e confirma antes de enviar (RNF03). */
(function (raiz) {
  "use strict";
  var DIA = 864e5;
  var SINONIMOS = {
    insulina: ["insulina", "caneta", "nph", "glargina", "diabetes", "glicose", "acucar"],
    antihipertensivo: ["pressao", "hipertens", "losartan", "enalapril", "captopril", "anlodipin", "atenolol", "hidroclorotiazid", "propranolol", "valsartan", "nifedipin", "metildopa"],
    fralda: ["fralda", "geriatric"]
  };
  var NUMEROS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quinze: 15 };
  var SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  // Palavras que encerram o nome de um item livre ("acabou a dipirona DA M. S. ONTEM")
  var FIM_NOME = "da|do|de|das|dos|para|pra|pro|ontem|hoje|anteontem|ha|faz|desde|na|no|e|que|semana|segunda|terca|quarta|quinta|sexta|sabado|domingo";

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9/. -]/g, " ").replace(/\s+/g, " ").trim(); }
  function iso(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  function categoriaDe(t) { for (var k in SINONIMOS) if (SINONIMOS[k].some(function (w) { return t.indexOf(w) >= 0; })) return k; return null; }

  function data(t, hoje) {
    var d = new Date(hoje); d.setHours(12, 0, 0, 0);
    var m, n, x;
    if (/\banteontem\b/.test(t)) return iso(new Date(d - 2 * DIA));
    if (/\bontem\b/.test(t)) return iso(new Date(d - DIA));
    if ((m = t.match(/\b(?:ha|faz|fazem)\s+(\d+|[a-z]+)\s+dias?\b/) || t.match(/\b(\d+|[a-z]+)\s+dias?\s+atras\b/))) {
      n = /^\d+$/.test(m[1]) ? +m[1] : NUMEROS[m[1]];
      if (n) return iso(new Date(d - n * DIA));
    }
    if (/\bsemana passada\b/.test(t)) return iso(new Date(d - 7 * DIA));
    if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
      var ano = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : d.getFullYear();
      x = new Date(ano, +m[2] - 1, +m[1], 12);
      if (!m[3] && x > d) x.setFullYear(ano - 1);  // "25/12" dito em janeiro é do ano anterior
      if (x.getDate() === +m[1] && x <= d) return iso(x);
    }
    for (var i = 0; i < 7; i++) if (new RegExp("\\b" + SEMANA[i] + "(?:-feira)?\\b").test(t)) return iso(new Date(d - ((d.getDay() - i + 7) % 7) * DIA));
    if (/\bhoje\b/.test(t)) return iso(d);
    return null;
  }

  function pacientesCitados(txt, t, pacs) {
    return pacs.filter(function (p) {
      var cod = norm(p.id), num = cod.replace(/\D/g, "").replace(/^0+/, "");
      var letras = p.iniciais.replace(/[^A-Za-zÀ-ú]/g, "").split("");
      // Iniciais: em maiúsculas ("MS", "M. S.") ou em minúsculas com ponto ("m.s."), para "já" não virar "J. A."
      var maius = new RegExp("(^|[^A-Za-zÀ-ú])" + letras.map(function (l) { return l.toUpperCase(); }).join("\\.?\\s*") + "\\.?(?![A-Za-zÀ-ú])");
      var comPonto = new RegExp("(^|[^a-z])" + letras.map(function (l) { return norm(l); }).join("\\.\\s*") + "\\.?(?![a-z])");
      return t.indexOf(cod) >= 0 || (num.length >= 2 && new RegExp("(^|[^0-9])0*" + num + "(?![0-9])").test(t)) || maius.test(txt) || comPonto.test(t);
    });
  }

  // Itens das listas de uso contínuo citados pelo nome (mesmo incompleto: "losartan", "a insulina nph")
  function itensCitados(t, pacs) {
    var achados = [];
    pacs.forEach(function (p) {
      p.medicamentos.forEach(function (m) {
        var palavras = norm(m.nome).split(" "), principal = palavras[0];
        // Nomes curtos ("AAS") só como palavra inteira; os demais aceitam o começo do nome ("losartan")
        if (principal.length < 4 ? !new RegExp("(^|[^a-z0-9])" + principal + "(?![a-z0-9])").test(t) : t.indexOf(principal.slice(0, Math.max(4, principal.length - 2))) < 0) return;
        var pontos = 1 + palavras.slice(1).filter(function (w) { return w.length >= 2 && new RegExp("(^|[^a-z0-9])" + w.replace(/[.\/]/g, "\\$&") + "(?![a-z0-9])").test(t); }).length;
        achados.push({ paciente: p.id, insumo: m.nome, categoria: m.categoria, pontos: pontos });
      });
    });
    return achados;
  }

  function nomeLivre(t) {
    var m = t.match(new RegExp("(?:acabou|acabaram|acabando|faltou|faltando|falta|sem|nao chegou|nao veio|nao entregaram|preciso de|precisa de|precisamos de)\\s+(?:o |a |os |as |de |do |da |mais |um |uma )?(.+?)(?=\\s+(?:" + FIM_NOME + ")\\b|[.,!?;]|$)"));
    var nome = m ? m[1].replace(/^(o|a|os|as)\s+/, "").trim() : "";
    return nome && nome.length >= 3 && !/^(remedio|medicamento|insumo|coisa)s?$/.test(nome) ? nome.charAt(0).toUpperCase() + nome.slice(1) : "";
  }

  /* pacs: [{ id, iniciais, medicamentos: [{ nome, categoria }] }]
     Retorna { paciente, insumo, categoria, novo, dataFalta, dataDita, opcoesItem, opcoesPaciente } com o que conseguiu entender. */
  function interpretar(txt, pacs, hoje, ja) {
    var t = norm(txt), r = Object.assign({ paciente: "", insumo: "", categoria: "", novo: false }, ja || {});
    var citados = pacientesCitados(txt, t, pacs);
    if (!r.paciente && citados.length === 1) r.paciente = citados[0].id;
    var base = r.paciente ? pacs.filter(function (p) { return p.id === r.paciente; }) : (citados.length ? citados : pacs);
    if (!r.insumo) {
      var itens = itensCitados(t, base), melhor = Math.max.apply(null, itens.map(function (x) { return x.pontos; }).concat(0));
      itens = itens.filter(function (x) { return x.pontos === melhor; });
      var cat = categoriaDe(t);
      if (!itens.length && cat) base.forEach(function (p) { p.medicamentos.forEach(function (m) { if (m.categoria === cat) itens.push({ paciente: p.id, insumo: m.nome, categoria: m.categoria }); }); });
      if (itens.length === 1) { r.paciente = itens[0].paciente; r.insumo = itens[0].insumo; r.categoria = itens[0].categoria; r.novo = false; }
      else if (itens.length > 1) r.opcoesItem = itens;
      else {
        var livre = nomeLivre(t);
        if (livre) { r.insumo = livre; r.novo = true; r.categoria = cat || ""; }
        else if (cat) { r.categoria = cat; }
      }
    }
    if (!r.paciente && !r.opcoesItem) {
      if (base.length === 1) r.paciente = base[0].id; else r.opcoesPaciente = base.map(function (p) { return p.id; });
    }
    var d = data(t, hoje || new Date());
    if (d) { r.dataFalta = d; r.dataDita = true; } else if (!r.dataFalta) { r.dataFalta = iso(new Date(hoje || new Date())); r.dataDita = false; }
    return r;
  }

  var api = { interpretar: interpretar, data: data, norm: norm };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else raiz.MedKiInterpreta = api;
})(this);
