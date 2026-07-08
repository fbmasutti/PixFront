/*
  pix-widget.js
  ------------------------------------------------------------------
  Widget "Pague quanto puder" via Pix, embutível com uma única tag:

    <script src="https://SEU-DOMINIO/pix-widget.js"
      data-pix-key="38168776000198"
      data-name="FABRICIO BERALDO MASUTTI"
      data-city="SAO PAULO"
      data-presets="5,10,20,50"
      data-txid="***">
    </script>

  Todos os data-* são opcionais (caem nos valores DEFAULT abaixo se
  omitidos). Usa Shadow DOM, então o CSS daqui não vaza pra página
  host nem sofre interferência do CSS da página host.

  Requisitos da página host: precisa permitir <script> externo
  (essa é a limitação real — CMS que bloqueia <script> não vai
  funcionar com nenhuma versão em JS, só com QR estático).
  ------------------------------------------------------------------
*/
(function () {
  "use strict";

  var DEFAULTS = {
    pixKey: "38168776000198",
    name: "FABRICIO BERALDO MASUTTI",
    city: "SAO PAULO",
    presets: "5,10,20,50",
    txid: "***"
  };

  var currentScript = document.currentScript;
  if (!currentScript) return;

  var cfg = {
    pixKey: currentScript.getAttribute("data-pix-key") || DEFAULTS.pixKey,
    name: currentScript.getAttribute("data-name") || DEFAULTS.name,
    city: currentScript.getAttribute("data-city") || DEFAULTS.city,
    presets: (currentScript.getAttribute("data-presets") || DEFAULTS.presets)
      .split(",").map(function (v) { return parseFloat(v.trim()); }).filter(Boolean),
    txid: currentScript.getAttribute("data-txid") || DEFAULTS.txid
  };

  // --- monta um container logo após a tag <script> ---
  var mount = document.createElement("div");
  currentScript.parentNode.insertBefore(mount, currentScript.nextSibling);
  var shadow = mount.attachShadow({ mode: "open" });

  var STYLE = `
    :host{ all:initial; }
    *{ box-sizing:border-box; }
    .board{
      width:100%; max-width:380px; margin:0 auto;
      background:#141414; border:1px solid #2b2b2b; border-radius:14px;
      padding:22px 20px 20px; color:#f5f5f4;
      font-family:system-ui,-apple-system,sans-serif;
    }
    .eyebrow{
      font-family:ui-monospace,monospace; font-size:11px; letter-spacing:.14em;
      text-transform:uppercase; color:#8f8f8c; display:flex; align-items:center;
      gap:8px; margin-bottom:6px;
    }
    .eyebrow .dot{ width:6px; height:6px; border-radius:50%; background:#f5f5f4; }
    h1{ font-size:19px; margin:0 0 4px; font-weight:600; }
    .sub{ font-size:13px; color:#8f8f8c; margin:0 0 18px; line-height:1.4; }
    .amounts{ display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:10px; }
    .chip{
      font-family:ui-monospace,monospace; font-size:13px; padding:10px 4px;
      border-radius:9px; border:1px solid #2b2b2b; background:#0b0b0b; color:#f5f5f4;
      cursor:pointer;
    }
    .chip.active{ border-color:#fff; background:#fff; color:#0b0b0b; }
    .custom-row{ display:flex; gap:8px; margin-bottom:10px; }
    .prefix{
      display:flex; align-items:center; padding:0 10px; border-radius:9px;
      border:1px solid #2b2b2b; background:#0b0b0b; font-family:ui-monospace,monospace;
      color:#8f8f8c; font-size:13px;
    }
    input[type="number"]{
      flex:1; min-width:0; background:#0b0b0b; border:1px solid #2b2b2b;
      border-radius:9px; color:#f5f5f4; padding:0 10px;
      font-family:ui-monospace,monospace; font-size:14px; height:38px;
    }
    label.free{
      display:flex; align-items:center; gap:8px; font-size:12.5px; color:#8f8f8c;
      margin-bottom:16px; cursor:pointer;
    }
    .go-btn{
      width:100%; padding:14px 12px; border-radius:999px; border:1px solid #fff;
      background:#fff; color:#0b0b0b; font-weight:700; font-size:14.5px; cursor:pointer;
    }
    .go-btn:disabled{ opacity:.5; cursor:not-allowed; }
    .error{ color:#c9c9c6; font-size:12.5px; margin-top:8px; min-height:16px; }
    .result{ margin-top:18px; padding-top:16px; border-top:1px dashed #2b2b2b; display:none; text-align:center; }
    .result.show{ display:block; }
    .amount-label{ font-family:ui-monospace,monospace; font-size:12px; color:#8f8f8c; margin-bottom:10px; }
    .amount-label b{ color:#f5f5f4; }
    .qr-wrap{ display:inline-block; padding:10px; background:#fff; border-radius:10px; line-height:0; }
    .code-box{ margin-top:12px; display:flex; gap:6px; }
    textarea{
      flex:1; resize:none; height:52px; font-family:ui-monospace,monospace; font-size:10.5px;
      background:#0b0b0b; color:#8f8f8c; border:1px solid #2b2b2b; border-radius:9px; padding:8px;
    }
    .copy-btn{
      flex-shrink:0; width:52px; border-radius:9px; border:1px solid #2b2b2b; background:#0b0b0b;
      color:#f5f5f4; font-family:ui-monospace,monospace; font-size:11px; cursor:pointer;
    }
    .foot{ margin-top:14px; font-size:10.5px; color:#8f8f8c; text-align:center; line-height:1.5; }
  `;

  shadow.innerHTML = `
    <style>${STYLE}</style>
    <div class="board">
      <div class="eyebrow"><span class="dot"></span>PIX · APOIO DIRETO</div>
      <h1>Pague quanto puder</h1>
      <p class="sub">Escolha um valor (ou digite o seu) e gere o código Pix na hora. Cai direto na chave, sem intermediário.</p>
      <div class="amounts" id="amounts"></div>
      <div class="custom-row">
        <span class="prefix">R$</span>
        <input type="number" id="customAmount" min="1" step="1" placeholder="outro valor">
      </div>
      <label class="free"><input type="checkbox" id="openAmount"> Deixar em aberto — quem paga escolhe o valor no app do banco</label>
      <button class="go-btn" id="generateBtn">Gerar código Pix</button>
      <div class="error" id="errorMsg"></div>
      <div class="result" id="result">
        <div class="amount-label" id="amountLabel"></div>
        <div class="qr-wrap" id="qrcode"></div>
        <div class="code-box">
          <textarea id="pixCode" readonly></textarea>
          <button class="copy-btn" id="copyBtn">copiar</button>
        </div>
      </div>
      <div class="foot">Pix Copia e Cola gerado localmente, no seu navegador — nenhum dado passa por servidor.</div>
    </div>
  `;

  var $ = function (sel) { return shadow.querySelector(sel); };

  var amountsEl = $("#amounts");
  var selectedAmount = null;
  var chipButtons = [];

  cfg.presets.forEach(function (v) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = "R$ " + v;
    btn.addEventListener("click", function () {
      selectedAmount = v;
      $("#customAmount").value = "";
      $("#openAmount").checked = false;
      chipButtons.forEach(function (c) { c.classList.remove("active"); });
      btn.classList.add("active");
    });
    amountsEl.appendChild(btn);
    chipButtons.push(btn);
  });

  $("#customAmount").addEventListener("input", function () {
    selectedAmount = null;
    chipButtons.forEach(function (c) { c.classList.remove("active"); });
  });

  $("#openAmount").addEventListener("change", function (e) {
    if (e.target.checked) {
      selectedAmount = null;
      $("#customAmount").value = "";
      chipButtons.forEach(function (c) { c.classList.remove("active"); });
    }
  });

  // --- BR Code (Pix Copia e Cola) ---
  function normalize(str, maxLen) {
    var noAccents = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var cleaned = noAccents.replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase().trim();
    return cleaned.substring(0, maxLen) || "-";
  }

  function tlv(id, value) {
    var len = String(value.length).padStart(2, "0");
    return id + len + value;
  }

  function crc16(payload) {
    var crc = 0xFFFF;
    for (var i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (var b = 0; b < 8; b++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function buildPixPayload(opts) {
    var name = normalize(opts.name, 25);
    var city = normalize(opts.city, 15);
    var id = (opts.txid || "***").replace(/[^a-zA-Z0-9]/g, "").substring(0, 25) || "***";

    var merchantAccountInfo = tlv("00", "br.gov.bcb.pix") + tlv("01", opts.pixKey.trim());

    var payload = tlv("00", "01") + tlv("01", opts.amount ? "12" : "11") +
      tlv("26", merchantAccountInfo) + tlv("52", "0000") + tlv("53", "986");

    if (opts.amount) payload += tlv("54", opts.amount.toFixed(2));

    payload += tlv("58", "BR") + tlv("59", name) + tlv("60", city) + tlv("62", tlv("05", id));

    var withCrcId = payload + "6304";
    return withCrcId + crc16(withCrcId);
  }

  // --- carrega QRCode.js sob demanda (uma vez só, mesmo com vários widgets na página) ---
  function loadQrLib(callback) {
    if (window.QRCode) return callback();
    if (window.__pixWidgetQrLoading) {
      window.__pixWidgetQrCallbacks.push(callback);
      return;
    }
    window.__pixWidgetQrLoading = true;
    window.__pixWidgetQrCallbacks = [callback];
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = function () {
      window.__pixWidgetQrCallbacks.forEach(function (cb) { cb(); });
    };
    document.head.appendChild(s);
  }

  $("#generateBtn").addEventListener("click", function () {
    var errorEl = $("#errorMsg");
    errorEl.textContent = "";

    var openAmount = $("#openAmount").checked;
    var customVal = parseFloat($("#customAmount").value);
    var amount = null;

    if (!openAmount) {
      amount = selectedAmount || (customVal > 0 ? customVal : null);
      if (!amount) {
        errorEl.textContent = 'Escolha um valor, digite um valor ou marque "deixar em aberto".';
        return;
      }
    }

    var code = buildPixPayload({
      pixKey: cfg.pixKey, name: cfg.name, city: cfg.city, amount: amount, txid: cfg.txid
    });

    $("#amountLabel").innerHTML = amount
      ? "Valor: <b>R$ " + amount.toFixed(2).replace(".", ",") + "</b>"
      : "Valor: <b>em aberto</b> — digite no app do banco";

    loadQrLib(function () {
      var qrWrap = $("#qrcode");
      qrWrap.innerHTML = "";
      new window.QRCode(qrWrap, {
        text: code, width: 200, height: 200,
        colorDark: "#0b0b0b", colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.M
      });
      $("#pixCode").value = code;
      $("#result").classList.add("show");
    });
  });

  $("#copyBtn").addEventListener("click", function (e) {
    var codeEl = $("#pixCode");
    if (!codeEl.value) return;
    var done = function () {
      e.target.textContent = "copiado!";
      setTimeout(function () { e.target.textContent = "copiar"; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codeEl.value).then(done).catch(function () {
        codeEl.select(); document.execCommand("copy"); done();
      });
    } else {
      codeEl.select(); document.execCommand("copy"); done();
    }
  });
})();
