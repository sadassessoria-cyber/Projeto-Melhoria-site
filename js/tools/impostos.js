/*
 * Tabelas e cálculos tributários usados pelas ferramentas da SAD.
 * Vigência: 2026. Revise estes valores sempre que houver reajuste
 * (salário mínimo, tabela do INSS, IRRF ou mudanças no Simples Nacional).
 */
(function () {
  "use strict";

  var T = {
    ANO: 2026,
    SALARIO_MINIMO: 1621.0,

    /* INSS do empregado — tabela progressiva 2026 (teto R$ 8.475,55) */
    INSS_FAIXAS: [
      [1621.0, 0.075],
      [2902.84, 0.09],
      [4354.27, 0.12],
      [8475.55, 0.14]
    ],

    /* IRRF mensal — tabela vigente desde maio/2025 */
    IRRF_FAIXAS: [
      [2428.8, 0, 0],
      [2826.65, 0.075, 182.16],
      [3751.05, 0.15, 394.16],
      [4664.68, 0.225, 675.49],
      [Infinity, 0.275, 908.73]
    ],
    IRRF_DEPENDENTE: 189.59,
    IRRF_DESCONTO_SIMPLIFICADO: 607.2,
    /* Lei 15.270/2025: redução do IRRF a partir de 2026 (isenção até R$ 5.000) */
    IRRF_REDUCAO_ATE: 5000,
    IRRF_REDUCAO_MAX: 312.89,
    IRRF_REDUCAO_FAIXA_FIM: 7350,
    IRRF_REDUCAO_A: 978.62,
    IRRF_REDUCAO_B: 0.133145,

    FGTS: 0.08,
    INSS_PRO_LABORE: 0.11,
    FATOR_R_MINIMO: 0.28,

    /* Simples Nacional — [limite da receita bruta em 12 meses, alíquota nominal, parcela a deduzir] */
    SIMPLES: {
      I: [[180000, 0.04, 0], [360000, 0.073, 5940], [720000, 0.095, 13860], [1800000, 0.107, 22500], [3600000, 0.143, 87300], [4800000, 0.19, 378000]],
      II: [[180000, 0.045, 0], [360000, 0.078, 5940], [720000, 0.10, 13860], [1800000, 0.112, 22500], [3600000, 0.147, 85500], [4800000, 0.30, 720000]],
      III: [[180000, 0.06, 0], [360000, 0.112, 9360], [720000, 0.135, 17640], [1800000, 0.16, 35640], [3600000, 0.21, 125640], [4800000, 0.33, 648000]],
      V: [[180000, 0.155, 0], [360000, 0.18, 4500], [720000, 0.195, 9900], [1800000, 0.205, 17100], [3600000, 0.23, 62100], [4800000, 0.305, 540000]]
    },
    SIMPLES_LIMITE: 4800000
  };

  function round2(v) { return Math.round(v * 100) / 100; }

  function inss(salario) {
    var total = 0, anterior = 0;
    for (var i = 0; i < T.INSS_FAIXAS.length; i++) {
      var teto = T.INSS_FAIXAS[i][0], aliq = T.INSS_FAIXAS[i][1];
      if (salario <= anterior) break;
      total += (Math.min(salario, teto) - anterior) * aliq;
      anterior = teto;
    }
    return round2(total);
  }

  /* IRRF mensal. rendimento = valor bruto tributável; deducoes = INSS + dependentes etc. */
  function irrf(rendimento, deducoesLegais) {
    var base = rendimento - Math.max(deducoesLegais, T.IRRF_DESCONTO_SIMPLIFICADO);
    if (base <= 0) return 0;
    var imposto = 0;
    for (var i = 0; i < T.IRRF_FAIXAS.length; i++) {
      if (base <= T.IRRF_FAIXAS[i][0]) {
        imposto = base * T.IRRF_FAIXAS[i][1] - T.IRRF_FAIXAS[i][2];
        break;
      }
    }
    imposto = Math.max(0, imposto);
    var reducao = 0;
    if (rendimento <= T.IRRF_REDUCAO_ATE) reducao = T.IRRF_REDUCAO_MAX;
    else if (rendimento <= T.IRRF_REDUCAO_FAIXA_FIM) reducao = T.IRRF_REDUCAO_A - T.IRRF_REDUCAO_B * rendimento;
    return round2(Math.max(0, imposto - Math.max(0, reducao)));
  }

  function faixaSimples(anexo, rbt12) {
    var tab = T.SIMPLES[anexo];
    for (var i = 0; i < tab.length; i++) if (rbt12 <= tab[i][0]) return { indice: i + 1, nominal: tab[i][1], deducao: tab[i][2] };
    var u = tab[tab.length - 1];
    return { indice: tab.length, nominal: u[1], deducao: u[2], excedeu: true };
  }

  /* Alíquota efetiva do Simples: (RBT12 × nominal − dedução) ÷ RBT12 */
  function aliquotaSimples(anexo, rbt12) {
    if (rbt12 <= 0) return T.SIMPLES[anexo][0][1];
    var f = faixaSimples(anexo, rbt12);
    return Math.max(0, (rbt12 * f.nominal - f.deducao) / rbt12);
  }

  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  function moeda(v) { return brl.format(isFinite(v) ? v : 0); }
  function pct(v, casas) { return (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas == null ? 2 : casas, maximumFractionDigits: casas == null ? 2 : casas }) + "%"; }

  /* Lê "R$ 1.234,56" / "1234,56" / "1234.56" como número */
  function lerNumero(txt) {
    if (typeof txt === "number") return txt;
    var s = String(txt || "").replace(/[^\d,.-]/g, "");
    if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  /* Máscara de moeda para inputs com [data-money] */
  function mascaraMoeda(root) {
    (root || document).querySelectorAll("input[data-money]").forEach(function (input) {
      input.setAttribute("inputmode", "numeric");
      input.addEventListener("input", function () {
        var digitos = input.value.replace(/\D/g, "").replace(/^0+/, "");
        if (!digitos) { input.value = ""; return; }
        input.value = brl.format(parseInt(digitos, 10) / 100);
      });
    });
  }

  window.SAD_IMPOSTOS = {
    T: T, inss: inss, irrf: irrf, aliquotaSimples: aliquotaSimples, faixaSimples: faixaSimples,
    moeda: moeda, pct: pct, lerNumero: lerNumero, mascaraMoeda: mascaraMoeda, round2: round2
  };
})();
