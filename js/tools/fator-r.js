(function () {
  "use strict";
  var I = window.SAD_IMPOSTOS, T = I.T, moeda = I.moeda;

  var form = document.getElementById("frForm");
  I.mascaraMoeda(form);

  function row(label, valor, cls) {
    return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + label + "</span><b>" + valor + "</b></div>";
  }
  function kpi(label, valor, cls) {
    return '<div class="kpi' + (cls ? " " + cls : "") + '"><span>' + label + "</span><strong>" + valor + "</strong></div>";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements;
    var receita = I.lerNumero(f.receita.value);
    var folha = I.lerNumero(f.folha.value);
    var ok = receita > 0 && folha >= 0 && f.folha.value.trim() !== "";
    f.receita.closest(".field").classList.toggle("invalid", receita <= 0);
    f.folha.closest(".field").classList.toggle("invalid", f.folha.value.trim() === "");
    document.getElementById("frError").hidden = ok;
    if (!ok) return;

    var meses = parseInt(f.meses.value, 10) || 12;
    var rbt12 = receita / meses * 12;
    var mes = I.lerNumero(f.mes.value) || receita / meses;
    var fatorR = folha / receita;
    var anexo = fatorR >= T.FATOR_R_MINIMO ? "III" : "V";
    var aliqIII = I.aliquotaSimples("III", rbt12);
    var aliqV = I.aliquotaSimples("V", rbt12);
    var dasIII = mes * aliqIII, dasV = mes * aliqV;
    var economia = dasV - dasIII;

    var verdict = document.getElementById("frVerdict");
    if (rbt12 > T.SIMPLES_LIMITE) {
      verdict.innerHTML = "<strong>Faturamento acima do limite do Simples Nacional</strong><span>Com receita anualizada de " + moeda(rbt12) + ", a empresa ultrapassa o teto de " + moeda(T.SIMPLES_LIMITE) + ". Fale com um contador sobre o Lucro Presumido ou Real.</span>";
    } else if (anexo === "III") {
      verdict.innerHTML = "<strong>Seu Fator R é " + I.pct(fatorR) + ": você paga pelo Anexo III</strong><span>Com isso, a economia estimada é de " + moeda(economia) + " neste mês, ou cerca de " + moeda(economia * 12) + " por ano, em comparação ao Anexo V.</span>";
    } else {
      var folhaNecessaria = T.FATOR_R_MINIMO * receita;
      var extraMes = (folhaNecessaria - folha) / meses;
      verdict.innerHTML = "<strong>Seu Fator R é " + I.pct(fatorR) + ": sua empresa fica no Anexo V</strong><span>Aumentando a folha (por exemplo, o pró-labore) em cerca de " + moeda(extraMes) + " por mês, você atingiria os 28% e poderia economizar até " + moeda(economia) + " de DAS por mês.</span>";
    }

    var escala = 0.5;
    document.getElementById("frMark").style.left = (T.FATOR_R_MINIMO / escala * 100) + "%";
    document.getElementById("frMeter").style.width = Math.min(100, fatorR / escala * 100) + "%";

    document.getElementById("frKpis").innerHTML =
      kpi("Fator R", I.pct(fatorR), anexo === "III" ? "good" : "") +
      kpi("Anexo aplicável", anexo, "gold") +
      kpi("DAS estimado no mês", moeda(anexo === "III" ? dasIII : dasV));

    var fIII = I.faixaSimples("III", rbt12), fV = I.faixaSimples("V", rbt12);
    document.getElementById("frIII").className = "compare-col" + (anexo === "III" ? " best" : "");
    document.getElementById("frV").className = "compare-col" + (anexo === "V" ? " best" : "");
    document.getElementById("frIII").innerHTML = "<h4>Anexo III" + (anexo === "III" ? '<span class="tag-best">Seu caso</span>' : "") + "</h4><div class='rows'>" +
      row("Faixa", fIII.indice + "ª") + row("Alíquota nominal", I.pct(fIII.nominal)) + row("Alíquota efetiva", I.pct(aliqIII)) +
      row("DAS do mês", moeda(dasIII), "total") + "</div>";
    document.getElementById("frV").innerHTML = "<h4>Anexo V" + (anexo === "V" ? '<span class="tag-best">Seu caso</span>' : "") + "</h4><div class='rows'>" +
      row("Faixa", fV.indice + "ª") + row("Alíquota nominal", I.pct(fV.nominal)) + row("Alíquota efetiva", I.pct(aliqV)) +
      row("DAS do mês", moeda(dasV), "total") + "</div>";

    var res = document.getElementById("frResult");
    res.hidden = false;
    res.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
