(function () {
  "use strict";

  var form = document.getElementById("invForm");
  var itemsEl = document.getElementById("invItems");
  var paper = document.getElementById("invPaper");
  var statusEl = document.getElementById("invStatus");
  var STORAGE_KEY = "sad-invoice-modelo";

  var L = {
    en: { title: "INVOICE", no: "Invoice no.", date: "Issue date", due: "Due date", from: "From", to: "Bill to", desc: "Description", qty: "Qty", unit: "Unit price", amount: "Amount", subtotal: "Subtotal", discount: "Discount", total: "Total", pay: "Payment instructions", notes: "Notes", incoterm: "Incoterm", place: "Place of service / shipment", taxid: "Tax ID", sign: "Authorized signature" },
    es: { title: "FACTURA", no: "Factura n.º", date: "Fecha de emisión", due: "Vencimiento", from: "Emisor", to: "Facturar a", desc: "Descripción", qty: "Cant.", unit: "Precio unit.", amount: "Importe", subtotal: "Subtotal", discount: "Descuento", total: "Total", pay: "Instrucciones de pago", notes: "Observaciones", incoterm: "Incoterm", place: "Lugar de prestación / envío", taxid: "ID fiscal", sign: "Firma autorizada" },
    pt: { title: "INVOICE", no: "Invoice nº", date: "Emissão", due: "Vencimento", from: "Emissor", to: "Cliente", desc: "Descrição", qty: "Qtd.", unit: "Valor unit.", amount: "Valor", subtotal: "Subtotal", discount: "Desconto", total: "Total", pay: "Instruções de pagamento", notes: "Observações", incoterm: "Incoterm", place: "Local da prestação / envio", taxid: "Tax ID", sign: "Assinatura" }
  };
  var LOCALE = { en: "en-US", es: "es-ES", pt: "pt-BR" };

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function num(v) {
    var s = String(v || "").replace(/[^\d,.-]/g, "");
    /* o último separador é o decimal: aceita "1.500,50" e "1,500.50" */
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function hoje(offsetDias) {
    var d = new Date();
    d.setDate(d.getDate() + (offsetDias || 0));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function addItem(dados) {
    dados = dados || {};
    var row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML =
      '<label class="field"><span>Descrição</span><input type="text" data-k="desc" placeholder="Software development services — May"></label>' +
      '<label class="field"><span>Qtd.</span><input type="text" data-k="qtd" inputmode="decimal" value="1"></label>' +
      '<label class="field"><span>Valor unit.</span><input type="text" data-k="valor" inputmode="decimal" placeholder="0.00"></label>' +
      '<button type="button" class="icon-btn" aria-label="Remover item">×</button>';
    row.querySelector('[data-k="desc"]').value = dados.desc || "";
    if (dados.qtd != null) row.querySelector('[data-k="qtd"]').value = dados.qtd;
    row.querySelector('[data-k="valor"]').value = dados.valor || "";
    row.querySelector(".icon-btn").addEventListener("click", function () {
      if (itemsEl.children.length > 1) row.remove();
      else row.querySelectorAll("input").forEach(function (i) { i.value = i.getAttribute("data-k") === "qtd" ? "1" : ""; });
      render();
    });
    itemsEl.appendChild(row);
  }

  function ler() {
    var f = form.elements, d = {};
    Array.prototype.forEach.call(f, function (el) { if (el.name) d[el.name] = el.value; });
    d.itens = Array.prototype.map.call(itemsEl.children, function (row) {
      return {
        desc: row.querySelector('[data-k="desc"]').value,
        qtd: row.querySelector('[data-k="qtd"]').value,
        valor: row.querySelector('[data-k="valor"]').value
      };
    });
    return d;
  }

  function preencher(d) {
    Object.keys(d).forEach(function (k) {
      if (k !== "itens" && form.elements[k]) form.elements[k].value = d[k];
    });
    itemsEl.innerHTML = "";
    (d.itens && d.itens.length ? d.itens : [{}]).forEach(addItem);
  }

  function formatarData(iso, idioma) {
    if (!iso) return "—";
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(LOCALE[idioma], { year: "numeric", month: "short", day: "2-digit" });
  }

  function render() {
    var d = ler(), t = L[d.idioma] || L.en;
    var fmt = new Intl.NumberFormat(LOCALE[d.idioma] || "en-US", { style: "currency", currency: d.moeda || "USD" });
    var subtotal = 0;
    var linhas = d.itens.map(function (it) {
      var q = num(it.qtd), v = num(it.valor), total = q * v;
      subtotal += total;
      if (!it.desc && !v) return "";
      return "<tr><td>" + esc(it.desc) + '</td><td class="num">' + q.toLocaleString(LOCALE[d.idioma]) + '</td><td class="num">' + fmt.format(v) + '</td><td class="num">' + fmt.format(total) + "</td></tr>";
    }).join("");
    var desconto = num(d.desconto);
    var total = Math.max(0, subtotal - desconto);

    function bloco(nome, doc, endereco, cidade, pais, email) {
      return "<p><strong>" + (esc(nome) || "—") + "</strong></p>" +
        (doc ? "<p>" + t.taxid + ": " + esc(doc) + "</p>" : "") +
        (endereco ? "<p>" + esc(endereco) + "</p>" : "") +
        (cidade || pais ? "<p>" + esc([cidade, pais].filter(Boolean).join(" — ")) + "</p>" : "") +
        (email ? "<p>" + esc(email) + "</p>" : "");
    }

    paper.innerHTML =
      '<div class="inv-top"><div><h2>' + t.title + "</h2>" + (d.emNome ? "<p>" + esc(d.emNome) + "</p>" : "") + '</div><div class="inv-meta">' +
      "<p><strong>" + t.no + "</strong> " + (esc(d.numero) || "—") + "</p>" +
      "<p><strong>" + t.date + ":</strong> " + formatarData(d.emissao, d.idioma) + "</p>" +
      (d.vencimento ? "<p><strong>" + t.due + ":</strong> " + formatarData(d.vencimento, d.idioma) + "</p>" : "") +
      "</div></div>" +
      '<div class="inv-parties"><div><div class="inv-label">' + t.from + "</div>" + bloco(d.emNome, d.emDoc, d.emEndereco, d.emCidade, d.emPais, d.emEmail) + "</div>" +
      '<div><div class="inv-label">' + t.to + "</div>" + bloco(d.clNome, d.clDoc, d.clEndereco, d.clCidade, d.clPais, d.clEmail) + "</div></div>" +
      '<table class="inv-paper-table"><thead><tr><th>' + t.desc + '</th><th class="num">' + t.qty + '</th><th class="num">' + t.unit + '</th><th class="num">' + t.amount + "</th></tr></thead><tbody>" +
      (linhas || '<tr><td colspan="4" style="color:#8a90ad">—</td></tr>') + "</tbody></table>" +
      '<div class="inv-total"><div><p><span>' + t.subtotal + "</span><span>" + fmt.format(subtotal) + "</span></p>" +
      (desconto ? "<p><span>" + t.discount + "</span><span>− " + fmt.format(desconto) + "</span></p>" : "") +
      '<p class="grand"><span>' + t.total + " (" + esc(d.moeda) + ")</span><span>" + fmt.format(total) + "</span></p></div></div>" +
      '<div class="inv-notes">' +
      (d.pagamento ? '<div><div class="inv-label">' + t.pay + '</div><p class="inv-pre">' + esc(d.pagamento) + "</p></div>" : "") +
      (d.obs || d.incoterm || d.local ? '<div><div class="inv-label">' + t.notes + "</div>" +
        (d.incoterm ? "<p><strong>" + t.incoterm + ":</strong> " + esc(d.incoterm) + "</p>" : "") +
        (d.local ? "<p><strong>" + t.place + ":</strong> " + esc(d.local) + "</p>" : "") +
        (d.obs ? '<p class="inv-pre">' + esc(d.obs) + "</p>" : "") + "</div>" : "") +
      "</div>" +
      '<div class="inv-sign">' + t.sign + (d.emNome ? " — " + esc(d.emNome) : "") + "</div>";
    return { dados: d, total: total };
  }

  function validar() {
    var d = ler();
    var obrigatorios = ["numero", "emissao", "emNome", "clNome", "clPais"];
    var ok = true;
    obrigatorios.forEach(function (n) {
      var vazio = !String(d[n] || "").trim();
      form.elements[n].closest(".field").classList.toggle("invalid", vazio);
      if (vazio) ok = false;
    });
    var temItem = d.itens.some(function (it) { return it.desc.trim() && num(it.valor) > 0; });
    if (!temItem) ok = false;
    document.getElementById("invError").hidden = ok;
    return ok;
  }

  function salvar(msg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ler()));
      statusEl.textContent = msg || "Modelo salvo neste navegador.";
    } catch (e) {
      statusEl.textContent = "Não foi possível salvar neste navegador.";
    }
  }

  document.getElementById("invAdd").addEventListener("click", function () { addItem(); render(); });
  form.addEventListener("input", render);
  form.addEventListener("change", render);

  document.getElementById("invPdf").addEventListener("click", function () {
    if (!validar()) return;
    var d = ler();
    var tituloOriginal = document.title;
    document.title = "Invoice-" + (d.numero || "").replace(/[^\w-]+/g, "") + "-" + (d.clNome || "").replace(/[^\w-]+/g, "");
    var area = document.createElement("div");
    area.id = "printArea";
    area.appendChild(paper.cloneNode(true)).removeAttribute("id");
    document.body.appendChild(area);
    document.body.classList.add("printing-invoice");
    window.print();
    document.body.classList.remove("printing-invoice");
    area.remove();
    document.title = tituloOriginal;
    salvar("Modelo salvo automaticamente para a próxima invoice.");
  });
  document.getElementById("invSave").addEventListener("click", function () { salvar(); });
  document.getElementById("invNew").addEventListener("click", function () {
    var n = form.elements.numero.value;
    var m = n.match(/^(.*?)(\d+)$/);
    form.elements.numero.value = m ? m[1] + String(+m[2] + 1).padStart(m[2].length, "0") : n;
    form.elements.emissao.value = hoje();
    form.elements.vencimento.value = hoje(30);
    itemsEl.innerHTML = "";
    addItem();
    render();
    statusEl.textContent = "Nova invoice criada com os dados do emissor e do cliente mantidos.";
  });

  var salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (e) { salvo = null; }
  if (salvo) {
    preencher(salvo);
    statusEl.textContent = "Modelo salvo carregado. Clique em \"Nova invoice\" para gerar a próxima numeração.";
  } else {
    form.elements.numero.value = "0001";
    form.elements.emissao.value = hoje();
    form.elements.vencimento.value = hoje(30);
    form.elements.emPais.value = "Brazil";
    addItem();
  }
  render();
})();
