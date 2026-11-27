// Testes do interpretador de pedidos (assets/js/interpreta.js). Rode: node scripts/test_interpreta.js
const assert = require("assert");
const { interpretar } = require("../assets/js/interpreta.js");

const hoje = new Date(2026, 10, 27, 10); // sexta-feira, 27/11/2026
const ana = [
  { id: "P-0142", iniciais: "M. S.", medicamentos: [{ nome: "Insulina NPH 100 UI/mL", categoria: "insulina" }, { nome: "Losartana 50 mg", categoria: "antihipertensivo" }, { nome: "Metformina 850 mg", categoria: "outro" }, { nome: "AAS 100 mg", categoria: "outro" }] },
  { id: "P-0157", iniciais: "J. A.", medicamentos: [{ nome: "Enalapril 10 mg", categoria: "antihipertensivo" }, { nome: "Fralda geriátrica G", categoria: "fralda" }] }
];
const casos = [
  ["acabou a insulina da M. S.", { paciente: "P-0142", insumo: "Insulina NPH 100 UI/mL", categoria: "insulina", dataFalta: "2026-11-27", dataDita: false }],
  ["o remédio de pressão do 157 acabou ontem", { paciente: "P-0157", insumo: "Enalapril 10 mg", dataFalta: "2026-11-26" }],
  ["faltou fralda", { paciente: "P-0157", insumo: "Fralda geriátrica G", categoria: "fralda" }],
  ["a losartan não chegou há 3 dias", { paciente: "P-0142", insumo: "Losartana 50 mg", dataFalta: "2026-11-24", dataDita: true }],
  ["já acabou a insulina", { paciente: "P-0142" }],                       // "já" não é J. A.
  ["acabou a caneta de insulina na segunda", { insumo: "Insulina NPH 100 UI/mL", dataFalta: "2026-11-23" }],
  ["a metformina faltou dia 25/11", { insumo: "Metformina 850 mg", dataFalta: "2026-11-25" }],
  ["acabou a dipirona da MS ontem", { paciente: "P-0142", insumo: "Dipirona", novo: true, categoria: "", dataFalta: "2026-11-26" }],
  ["faz dois dias que acabou o remédio", { opcoesPaciente: ["P-0142", "P-0157"], insumo: "", dataFalta: "2026-11-25" }],
  ["preciso de remédio de pressão", { opcoesItem: [{ paciente: "P-0142", insumo: "Losartana 50 mg", categoria: "antihipertensivo" }, { paciente: "P-0157", insumo: "Enalapril 10 mg", categoria: "antihipertensivo" }] }],
  ["P-0142 sem AAS desde semana passada", { paciente: "P-0142", insumo: "AAS 100 mg", dataFalta: "2026-11-20" }],
];
let ok = 0;
for (const [texto, esperado] of casos) {
  const r = interpretar(texto, ana, hoje);
  for (const [k, v] of Object.entries(esperado)) {
    const obtido = k === "opcoesItem" && r[k] ? r[k].map(({ paciente, insumo, categoria }) => ({ paciente, insumo, categoria })) : r[k];
    assert.deepStrictEqual(obtido, v, `"${texto}" → ${k}: esperado ${JSON.stringify(v)}, veio ${JSON.stringify(obtido)}`);
  }
  ok++;
}
// Ajuste numa segunda mensagem: o que já foi entendido é mantido
const r1 = interpretar("acabou a dipirona", ana, hoje);
const r2 = interpretar("é da J. A.", ana, hoje, { insumo: r1.insumo, novo: r1.novo, categoria: r1.categoria });
assert.strictEqual(r2.paciente, "P-0157");
assert.strictEqual(r2.insumo, "Dipirona");
console.log(`interpreta: ${ok + 1} casos ok`);
