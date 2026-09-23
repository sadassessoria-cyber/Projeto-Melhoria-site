(function () {
  "use strict";
  var I = window.SAD_IMPOSTOS, T = I.T, moeda = I.moeda;

  var form = document.getElementById("cltForm");
  I.mascaraMoeda(form);

  function liquidoFolha(bruto, dedDependentes) {
    var inss = I.inss(bruto);
    var ir = I.irrf(bruto, inss + dedDependentes);
    return { bruto: bruto, inss: inss, ir: ir, liquido: bruto - inss - ir };
  }

  function calcClt(salario, beneficios, dependentes) {
    var dep = dependentes * T.IRRF_DEPENDENTE;
    var mes = liquidoFolha(salario, dep);
    var ferias = liquidoFolha(salario * 4 / 3, dep);
    var decimo = liquidoFolha(salario, dep);
    var fgts = T.FGTS * (salario * 12 + salario / 3 + salario);
    var anual = mes.liquido * 11 + ferias.liquido + decimo.liquido + fgts + beneficios * 12;
    return { mes: mes, ferias: ferias, decimo: decimo, fgts: fgts, beneficios: beneficios, anual: anual, mensal: anual / 12 };
  }

  function calcPj(faturamento, usarFatorR, contabilidade, dependentes) {
    var anexo = usarFatorR ? "III" : "V";
    var proLabore = usarFatorR ? Math.max(T.SALARIO_MINIMO, faturamento * T.FATOR_R_MINIMO) : T.SALARIO_MINIMO;
    proLabore = Math.min(proLabore, faturamento);
    var aliquota = I.aliquotaSimples(anexo, faturamento * 12);
    var das = faturamento * aliquota;
    var tetoInss = T.INSS_FAIXAS[T.INSS_FAIXAS.length - 1][0];
    var inss = T.INSS_PRO_LABORE * Math.min(proLabore, tetoInss);
    var ir = I.irrf(proLabore, inss + dependentes * T.IRRF_DEPENDENTE);
    var liquido = faturamento - das - inss - ir - contabilidade;
    return { faturamento: faturamento, anexo: anexo, aliquota: aliquota, das: das, proLabore: proLabore, inss: inss, ir: ir, contabilidade: contabilidade, liquido: liquido };
  }

  /* Faturamento PJ necessário para igualar o pacote CLT (busca binária) */
  function empate(alvo, usarFatorR, contabilidade, dependentes) {
    var lo = 0, hi = Math.max(alvo * 4, 50000);
    for (var i = 0; i < 60; i++) {
      var mid = (lo + hi) / 2;
      if (calcPj(mid, usarFatorR, contabilidade, dependentes).liquido < alvo) lo = mid; else hi = mid;
    }
    return hi;
  }

  function row(label, valor, cls) {
    return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + label + "</span><b>" + valor + "</b></div>";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements;
    var salario = I.lerNumero(f.salario.value);
    var erro = document.getElementById("cltError");
    f.salario.closest(".field").classList.toggle("invalid", salario <= 0);
    erro.hidden = salario > 0;
    if (salario <= 0) return;

    var beneficios = I.lerNumero(f.beneficios.value);
    var dependentes = Math.max(0, parseInt(f.dependentes.value, 10) || 0);
    var contabilidade = I.lerNumero(f.contabilidade.value);
    var usarFatorR = f.fatorR.checked;
    var clt = calcClt(salario, beneficios, dependentes);
    var alvo = clt.mensal;
    var pjInformado = I.lerNumero(f.pj.value);
    var faturamentoEmpate = empate(alvo, usarFatorR, contabilidade, dependentes);
    var faturamento = pjInformado > 0 ? pjInformado : faturamentoEmpate;
    var pj = calcPj(faturamento, usarFatorR, contabilidade, dependentes);

    var verdict = document.getElementById("cltVerdict");
    var acimaClt = faturamentoEmpate / salario - 1;
    if (pjInformado > 0) {
      var dif = pj.liquido - alvo;
      verdict.innerHTML = dif >= 0
        ? "<strong>Como PJ você ganharia " + moeda(dif) + " a mais por mês</strong><span>Isso dá " + moeda(dif * 12) + " a mais por ano, já considerando 13º, férias, FGTS e benefícios que você deixaria de receber.</span>"
        : "<strong>A proposta PJ fica " + moeda(-dif) + " abaixo do CLT por mês</strong><span>Para empatar, o faturamento PJ precisaria ser de pelo menos " + moeda(faturamentoEmpate) + " por mês.</span>";
    } else {
      verdict.innerHTML = "<strong>Para valer a pena, fature pelo menos " + moeda(faturamentoEmpate) + " por mês como PJ</strong><span>Esse valor é " + I.pct(acimaClt, 0) + " maior que o seu salário bruto CLT e iguala tudo o que você recebe hoje, incluindo 13º, férias, FGTS e benefícios.</span>";
    }

    var cltMelhor = alvo > pj.liquido + 0.005;
    document.getElementById("colClt").className = "compare-col" + (cltMelhor ? " best" : "");
    document.getElementById("colPj").className = "compare-col" + (!cltMelhor ? " best" : "");

    document.getElementById("colClt").innerHTML =
      "<h4>CLT" + (cltMelhor ? '<span class="tag-best">Melhor opção</span>' : "") + "</h4><div class='rows'>" +
      row("Salário bruto", moeda(salario)) +
      row("INSS", "− " + moeda(clt.mes.inss), "neg") +
      row("Imposto de Renda", "− " + moeda(clt.mes.ir), "neg") +
      row("Salário líquido mensal", moeda(clt.mes.liquido)) +
      row("13º salário líquido (÷12)", moeda(clt.decimo.liquido / 12)) +
      row("Adicional de férias líquido (÷12)", moeda((clt.ferias.liquido - clt.mes.liquido) / 12)) +
      row("FGTS (÷12)", moeda(clt.fgts / 12)) +
      row("Benefícios", moeda(beneficios)) +
      row("Equivalente mensal", moeda(alvo), "total") +
      "</div>";

    document.getElementById("colPj").innerHTML =
      "<h4>PJ" + (!cltMelhor ? '<span class="tag-best">Melhor opção</span>' : "") + "</h4><div class='rows'>" +
      row(pjInformado > 0 ? "Faturamento mensal" : "Faturamento para empatar", moeda(faturamento)) +
      row("Simples Nacional — Anexo " + pj.anexo + " (" + I.pct(pj.aliquota) + ")", "− " + moeda(pj.das), "neg") +
      row("INSS sobre pró-labore de " + moeda(pj.proLabore), "− " + moeda(pj.inss), "neg") +
      row("IR sobre pró-labore", "− " + moeda(pj.ir), "neg") +
      row("Contabilidade", "− " + moeda(pj.contabilidade), "neg") +
      row("Líquido mensal", moeda(pj.liquido), "total") +
      "</div>";

    var res = document.getElementById("cltResult");
    res.hidden = false;
    res.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
