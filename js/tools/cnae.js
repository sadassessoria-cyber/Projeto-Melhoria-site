(function () {
  "use strict";

  var DATA = window.CNAE_DATA || [];
  var input = document.getElementById("cnaeQuery");
  var list = document.getElementById("cnaeList");
  var meta = document.getElementById("cnaeMeta");
  var more = document.getElementById("cnaeMore");
  var chips = document.querySelectorAll("#cnaeChips .chip");
  var PAGE = 20;
  var resultados = [], mostrados = 0, termos = [];

  function norm(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }

  /* Índice normalizado: [código só dígitos, descrição, atividades, tudo junto] */
  var index = DATA.map(function (c) {
    var desc = norm(c[1]);
    var atv = norm(c[5].join(" | "));
    return { digitos: c[0].replace(/\D/g, ""), desc: desc, atv: atv, tudo: desc + " | " + atv + " | " + norm(c[6].join(" ")) + " | " + norm(c[4]) };
  });

  /* Destaca os termos buscados sem depender de acentos */
  function marcar(texto) {
    if (!termos.length) return esc(texto);
    var normChars = [], mapa = [];
    for (var i = 0; i < texto.length; i++) {
      var n = norm(texto[i]);
      for (var k = 0; k < n.length; k++) { normChars.push(n[k]); mapa.push(i); }
    }
    var alvo = normChars.join(""), marcado = new Array(texto.length);
    termos.forEach(function (t) {
      var pos = alvo.indexOf(t);
      while (pos > -1) {
        for (var j = pos; j < pos + t.length; j++) marcado[mapa[j]] = true;
        pos = alvo.indexOf(t, pos + t.length);
      }
    });
    var out = "", aberto = false;
    for (var x = 0; x < texto.length; x++) {
      if (marcado[x] && !aberto) { out += "<mark>"; aberto = true; }
      if (!marcado[x] && aberto) { out += "</mark>"; aberto = false; }
      out += esc(texto[x]);
    }
    return out + (aberto ? "</mark>" : "");
  }

  function buscar(q) {
    var nq = norm(q).trim();
    var soDigitos = nq.replace(/[\s./-]/g, "");
    termos = nq.split(/\s+/).filter(function (t) { return t.length > 1; });
    if (!nq) { resultados = []; termos = []; render(true); return; }

    var codigoBusca = /^\d{2,7}$/.test(soDigitos);
    resultados = [];
    for (var i = 0; i < index.length; i++) {
      var it = index[i], score = 0;
      if (codigoBusca) {
        if (it.digitos.indexOf(soDigitos) === 0) score = 1000 - it.digitos.length;
        else continue;
      } else {
        var ok = true;
        for (var t = 0; t < termos.length; t++) if (it.tudo.indexOf(termos[t]) === -1) { ok = false; break; }
        if (!ok || !termos.length) continue;
        if (it.desc.indexOf(nq) > -1) score += 200;
        termos.forEach(function (tt) {
          if (it.desc.indexOf(tt) > -1) score += 30;
          if (it.atv.indexOf(tt) > -1) score += 10;
          /* atividade que começa pelo termo (ex.: "Dentistas; atividades de") é o melhor sinal */
          if (it.atv.indexOf(tt) === 0 || it.atv.indexOf("| " + tt) > -1) score += 40;
        });
      }
      resultados.push({ i: i, score: score });
    }
    if (codigoBusca) termos = [];
    resultados.sort(function (a, b) { return b.score - a.score || a.i - b.i; });
    render(true);
  }

  function item(c) {
    var atividades = c[5].slice(0, 30).map(function (a) { return "<li>" + marcar(a) + "</li>"; }).join("");
    var extra = c[5].length > 30 ? "<li>… e mais " + (c[5].length - 30) + " atividades</li>" : "";
    var compreende = c[6].map(function (a) { return "<li>" + marcar(a) + "</li>"; }).join("");
    var msg = encodeURIComponent("Olá! Consultei a CNAE " + c[0] + " (" + c[1] + ") no site e quero saber o enquadramento e os impostos para a minha empresa.");
    return '<details class="cnae-item"><summary><span class="cnae-code">' + c[0] + '</span><span class="cnae-title">' + marcar(c[1]) +
      "<small>Seção " + c[2] + " · " + esc(c[3]) + "</small></span>" + '<span class="faq-icon" aria-hidden="true"></span></summary><div class="cnae-body">' +
      "<p><strong>Divisão:</strong> " + esc(c[4]) + "</p>" +
      (compreende ? "<h5>Esta classe compreende</h5><ul>" + compreende + "</ul>" : "") +
      (atividades ? "<h5>Atividades incluídas neste código</h5><ul>" + atividades + extra + "</ul>" : "") +
      '<a class="btn btn-primary btn-sm" href="https://wa.me/551124023899?text=' + msg + '" target="_blank" rel="noopener"><svg width="16" height="16"><use href="#i-wa"/></svg> Consultar anexo e impostos com a SAD</a>' +
      "</div></details>";
  }

  function render(reset) {
    if (reset) { list.innerHTML = ""; mostrados = 0; }
    if (!input.value.trim()) {
      meta.textContent = DATA.length.toLocaleString("pt-BR") + " códigos disponíveis. Digite uma atividade ou escolha uma categoria.";
      more.hidden = true;
      return;
    }
    if (!resultados.length) {
      meta.textContent = "Nenhuma CNAE encontrada. Tente outra palavra, um sinônimo ou apenas parte do código.";
      more.hidden = true;
      return;
    }
    var fim = Math.min(resultados.length, mostrados + PAGE);
    var html = "";
    for (var i = mostrados; i < fim; i++) html += item(DATA[resultados[i].i]);
    list.insertAdjacentHTML("beforeend", html);
    mostrados = fim;
    meta.textContent = resultados.length.toLocaleString("pt-BR") + (resultados.length === 1 ? " CNAE encontrada" : " CNAEs encontradas") + (resultados.length > mostrados ? " — mostrando " + mostrados : "");
    more.hidden = mostrados >= resultados.length;
  }

  var timer;
  input.addEventListener("input", function () {
    chips.forEach(function (c) { c.classList.toggle("active", c.getAttribute("data-q") === input.value); });
    clearTimeout(timer);
    timer = setTimeout(function () {
      buscar(input.value);
      try { history.replaceState(null, "", input.value ? "?q=" + encodeURIComponent(input.value) : location.pathname); } catch (e) {}
    }, 180);
  });
  more.addEventListener("click", function () { render(false); });
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      input.value = chip.getAttribute("data-q");
      input.dispatchEvent(new Event("input"));
      input.focus();
    });
  });

  var inicial = new URLSearchParams(location.search).get("q");
  if (inicial) { input.value = inicial; buscar(inicial); }
  else render(true);
})();
