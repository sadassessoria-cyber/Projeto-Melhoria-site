(function () {
  "use strict";
  var I = window.SAD_IMPOSTOS, moeda = I.moeda;

  /* Premissas da simulação (ajuste aqui quando as alíquotas forem definidas) */
  var P = {
    REFERENCIA: 0.28,      // CBS + IBS combinados (estimativa)
    PIS_COFINS: 0.0365,    // Lucro Presumido, regime cumulativo
    ISS: 0.05,
    ICMS: 0.18,
    REDUCAO: { servicos: 0, regulamentada: 0.3, saude: 0.6, comercio: 0, industria: 0 },
    ANEXO: { servicos: "III", regulamentada: "III", saude: "III", comercio: "I", industria: "II" }
  };

  var form = document.getElementById("rtForm");
  I.mascaraMoeda(form);
  var steps = form.querySelectorAll(".q-step");
  var stepperItems = document.querySelectorAll("#rtStepper li");
  var prev = document.getElementById("rtPrev"), next = document.getElementById("rtNext");
  var erro = document.getElementById("rtError");
  var atual = 1;

  function mostrar(n) {
    atual = n;
    steps.forEach(function (s) { s.hidden = parseInt(s.getAttribute("data-step"), 10) !== n; });
    stepperItems.forEach(function (li, i) {
      li.className = i + 1 < n ? "done" : i + 1 === n ? "current" : "";
    });
    prev.hidden = n === 1;
    next.textContent = n === steps.length ? "Ver resultado" : "Próximo →";
    erro.hidden = true;
  }

  function valor(nome) {
    var el = form.querySelector('input[name="' + nome + '"]:checked');
    return el ? el.value : null;
  }

  function valido(n) {
    if (n === 1) return !!valor("empresa");
    if (n === 2) return !!valor("regime");
    if (n === 3) return !!valor("setor") && I.lerNumero(form.elements.faturamento.value) > 0;
    if (n === 4) return !!valor("clientes");
    return true;
  }

  next.addEventListener("click", function () {
    if (!valido(atual)) {
      erro.textContent = atual === 3 ? "Escolha a atividade e informe o faturamento." : "Escolha uma opção para continuar.";
      erro.hidden = false;
      return;
    }
    if (atual < steps.length) mostrar(atual + 1);
    else calcular();
  });
  prev.addEventListener("click", function () { if (atual > 1) mostrar(atual - 1); });
  document.getElementById("rtRestart").addEventListener("click", function () {
    document.getElementById("rtResult").hidden = true;
    document.querySelector(".step-nav").hidden = false;
    document.getElementById("rtStepper").hidden = false;
    mostrar(1);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function barra(label, v, max, cls) {
    var w = max > 0 ? Math.max(1.5, v / max * 100) : 0;
    return '<div class="bar-row"><span>' + label + '</span><div class="bar-track"><div class="bar-fill ' + (cls || "") + '" data-w="' + w + '"></div></div><b>' + moeda(v) + "</b></div>";
  }
  function row(label, v, cls) {
    return '<div class="row' + (cls ? " " + cls : "") + '"><span>' + label + "</span><b>" + v + "</b></div>";
  }

  function presumido(setor, fat, compras) {
    var servico = setor === "servicos" || setor === "regulamentada" || setor === "saude";
    var pisCofins = fat * P.PIS_COFINS;
    var local = servico ? fat * P.ISS : Math.max(0, (fat - fat * compras) * P.ICMS);
    var hoje = pisCofins + local;
    var aliq = P.REFERENCIA * (1 - P.REDUCAO[setor]);
    var debito = fat * aliq;
    var credito = fat * compras * P.REFERENCIA;
    var depois = Math.max(0, debito - credito);
    return { servico: servico, pisCofins: pisCofins, local: local, hoje: hoje, aliq: aliq, debito: debito, credito: credito, depois: depois };
  }

  function calcular() {
    var regime = valor("regime"), setor = valor("setor"), clientes = valor("clientes"), empresa = valor("empresa");
    var fat = I.lerNumero(form.elements.faturamento.value);
    var compras = parseFloat(form.elements.compras.value);
    var rbt12 = fat * 12;
    var html = "";

    var mostrarSimples = regime === "simples" || regime === "naosei";
    var mostrarPresumido = regime === "presumido" || regime === "naosei";
    if (mostrarSimples && rbt12 > I.T.SIMPLES_LIMITE) {
      html += '<div class="verdict"><strong>Faturamento acima do limite do Simples Nacional</strong><span>Com ' + moeda(rbt12) + " por ano, a empresa não pode optar pelo Simples. Mostramos o cenário do Lucro Presumido.</span></div>";
      mostrarSimples = false; mostrarPresumido = true;
    }

    var pr = presumido(setor, fat, compras);

    if (mostrarPresumido) {
      var dif = pr.depois - pr.hoje;
      var max = Math.max(pr.hoje, pr.depois);
      html += '<div class="verdict"><strong>' + (regime === "naosei" ? "Lucro Presumido: " : "") +
        (dif > 0 ? "tributos sobre consumo podem subir cerca de " + moeda(dif) + "/mês" : "tributos sobre consumo podem cair cerca de " + moeda(-dif) + "/mês") +
        "</strong><span>Comparação entre o sistema atual e o novo sistema completo (2033), para um faturamento de " + moeda(fat) + " por mês.</span></div>";
      html += '<div class="bars">' +
        barra("Hoje (PIS, Cofins, " + (pr.servico ? "ISS" : "ICMS") + ")", pr.hoje, max) +
        barra("A partir de 2033 (CBS + IBS)", pr.depois, max, "gold") + "</div>";
      html += '<div class="compare"><div class="compare-col"><h4>Hoje</h4><div class="rows">' +
        row("PIS e Cofins (3,65%)", moeda(pr.pisCofins)) +
        row(pr.servico ? "ISS (5%)" : "ICMS sobre a margem", moeda(pr.local)) +
        row("Total mensal", moeda(pr.hoje), "total") + "</div></div>" +
        '<div class="compare-col"><h4>Novo sistema</h4><div class="rows">' +
        row("CBS + IBS sobre vendas (" + I.pct(pr.aliq, 1) + ")", moeda(pr.debito)) +
        row("Crédito sobre compras", "− " + moeda(pr.credito), "neg") +
        row("Total mensal", moeda(pr.depois), "total") + "</div></div></div>";
    }

    if (mostrarSimples) {
      var anexo = P.ANEXO[setor];
      var aliqS = I.aliquotaSimples(anexo, rbt12);
      html += '<div class="verdict" style="margin-top:' + (mostrarPresumido ? "26px" : "0") + '"><strong>' + (regime === "naosei" ? "Simples Nacional: " : "") +
        "o seu DAS continua — cerca de " + moeda(fat * aliqS) + "/mês</strong><span>Pelo Anexo " + anexo + " (alíquota efetiva de " + I.pct(aliqS) + "), a guia única segue existindo. CBS e IBS passam a fazer parte do DAS no lugar de PIS, Cofins, ICMS e ISS.</span></div>";
    }

    var dicas = [];
    if (clientes === "b2b" || clientes === "ambos") {
      dicas.push(mostrarSimples
        ? "<li><strong>Vendas para empresas:</strong> seus clientes só poderão abater o crédito do imposto embutido no DAS, que é menor. A partir de 2027 será possível recolher CBS e IBS por fora do Simples para gerar crédito integral — vale simular com um contador se isso torna você mais competitivo.</li>"
        : "<li><strong>Vendas para empresas:</strong> seus clientes poderão abater integralmente a CBS e o IBS que você cobrar. Na prática, o aumento tende a ser neutro para eles, o que facilita o repasse no preço.</li>");
    }
    if (clientes === "b2c" || clientes === "ambos") {
      dicas.push("<li><strong>Vendas para consumidores finais:</strong> o consumidor não aproveita crédito, então o imposto passa a pesar diretamente no preço final. Revise sua precificação com antecedência.</li>");
    }
    if (P.REDUCAO[setor] > 0) {
      dicas.push("<li><strong>Alíquota reduzida:</strong> sua atividade tem redução de " + I.pct(P.REDUCAO[setor], 0) + " na CBS e no IBS, desde que cumpridos os requisitos da lei (como registro no conselho profissional).</li>");
    }
    if (!pr.servico) {
      dicas.push("<li><strong>Comércio e indústria:</strong> o fim da cumulatividade permite aproveitar crédito sobre praticamente tudo o que a empresa compra. Organizar as notas fiscais de entrada passa a valer dinheiro.</li>");
    }
    if (empresa === "nao") {
      dicas.push("<li><strong>Vai abrir empresa:</strong> a escolha do regime e do CNAE agora já deve considerar as regras da Reforma. A SAD pode simular os cenários antes da abertura.</li>");
    }
    if (dicas.length) html += '<div class="info-card" style="margin-top:22px"><h3>O que isso significa para você</h3><ul>' + dicas.join("") + "</ul></div>";

    document.getElementById("rtBody").innerHTML = html;
    document.querySelector(".step-nav").hidden = true;
    document.getElementById("rtStepper").hidden = true;
    steps.forEach(function (s) { s.hidden = true; });
    var res = document.getElementById("rtResult");
    res.hidden = false;
    requestAnimationFrame(function () {
      res.querySelectorAll(".bar-fill").forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
    });
    res.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  mostrar(1);
})();
