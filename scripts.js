// 🔊 Áudio
const som = new Audio("./assets/conversor_moeda.mp3");
som.preload = "auto";
som.load();

// ===== Seletores (ajuste os seletores se seus IDs/classes forem diferentes) =====
const convertButton = document.querySelector(".convert-button");
const fromSelect    = document.getElementById("from-currency");
const toSelect      = document.getElementById("to-currency");
const inputEl       = document.querySelector(".input-currency");

const valueFromEl   = document.querySelector(".currency-value-to-convert");
const valueToEl     = document.querySelector(".currency-value");
const fromNameEl    = document.getElementById("from-name");
const toNameEl      = document.getElementById("currency-name");
const toImgEl       = document.querySelector(".currency-img");

// Locales p/ formatar
const locales = { BRL:"pt-BR", USD:"en-US", EUR:"de-DE", GBP:"en-GB", ARS:"es-AR" };
function formatCurrency(value, code){
  return new Intl.NumberFormat(locales[code] || "en-US", { style:"currency", currency:code }).format(value);
}

// UI helper
function updateLabelsAndImages(){
  const mapInfo = {
    BRL:{ name:"Real",            img:"./assets/square (2).png" },
    USD:{ name:"Dólar Americano", img:"./assets/usa (1).png" },
    EUR:{ name:"Euro",            img:"./assets/euro (1).png" },
    GBP:{ name:"Libra",           img:"./assets/libra.png" },
    ARS:{ name:"$AR Peso Argentino", img:"./assets/money-bag.png" }
  };
  const fromInfo = mapInfo[fromSelect.value] || mapInfo.BRL;
  const toInfo   = mapInfo[toSelect.value]   || mapInfo.USD;

  fromNameEl.textContent = fromInfo.name;
  toNameEl.textContent   = toInfo.name;

  const fromImgEl = document.querySelector(".currency-box img");
  if (fromImgEl) fromImgEl.src = fromInfo.img;
  if (toImgEl)   toImgEl.src   = toInfo.img;
}

// ===== Cotações dinâmicas com fallback =====
let ratesBRL = null;

// API #1 — exchangerate.host (sem chave)
async function fetchRatesHost(){
  const url = "https://api.exchangerate.host/latest?base=BRL&symbols=USD,EUR,GBP,ARS";
  const r = await fetch(url);
  if (!r.ok) throw new Error("exchangerate.host HTTP " + r.status);
  const data = await r.json();
  if (!data || !data.rates) throw new Error("exchangerate.host sem rates");
  return {
    BRL: 1,
    USD: data.rates.USD,
    EUR: data.rates.EUR,
    GBP: data.rates.GBP,
    ARS: data.rates.ARS
  };
}

// API #2 — AwesomeAPI (fallback BR)
async function fetchRatesAwesome(){
  const url = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL";
  const r = await fetch(url);
  if (!r.ok) throw new Error("awesomeapi HTTP " + r.status);
  const d = await r.json();
  return {
    BRL: 1,
    USD: Number(d.USDBRL.bid),
    EUR: Number(d.EURBRL.bid),
    GBP: Number(d.GBPBRL.bid),
    ARS: Number(d.ARSBRL.bid)
  };
}

// Inicialização robusta
async function initRates(){
  try {
    console.log("Buscando cotações na exchangerate.host…");
    ratesBRL = await fetchRatesHost();
    console.log("OK exchangerate.host:", ratesBRL);
  } catch (e1) {
    console.warn("Falha exchangerate.host:", e1?.message);
    try {
      console.log("Tentando fallback AwesomeAPI…");
      ratesBRL = await fetchRatesAwesome();
      console.log("OK AwesomeAPI:", ratesBRL);
    } catch (e2) {
      console.error("Falha AwesomeAPI:", e2?.message);
      // fallback final (estáticos) — evita travar a UI
      ratesBRL = { BRL:1, USD:5.2, EUR:6.2, GBP:7.3, ARS:0.05 };
      console.warn("Usando cotações padrão (estáticas):", ratesBRL);
    }
  }
}

// Conversão
function convertValues(){
  // se ainda não carregou, não faz nada
  if (!ratesBRL || !ratesBRL.USD) {
    console.warn("Cotações ainda não disponíveis");
    return;
  }
  const raw = (inputEl.value || "").trim();
  const amount = Number(raw.replace(/\./g,"").replace(",","."));
  if (isNaN(amount)) {
    valueFromEl.textContent = "—";
    valueToEl.textContent   = "—";
    return;
  }
  const from = fromSelect.value;
  const to   = toSelect.value;
  const emBRL      = amount * (ratesBRL[from] || 1);
  const convertido = emBRL / (ratesBRL[to]   || 1);

  valueFromEl.textContent = formatCurrency(amount, from);
  valueToEl.textContent   = formatCurrency(convertido, to);
}

// Eventos
fromSelect.addEventListener("change", () => { updateLabelsAndImages(); convertValues(); });
toSelect  .addEventListener("change", () => { updateLabelsAndImages(); convertValues(); });

convertButton.addEventListener("click", () => {
  // toca som no gesto do usuário
  try {
    som.currentTime = 0;
    const p = som.play();
    if (p && typeof p.then === "function") p.catch(() => {});
  } catch(e){ console.warn("Som bloqueado:", e); }
  convertValues();
});

// Boot
(async () => {
  updateLabelsAndImages();          // já mostra nomes/imagens
  await initRates();                // carrega cotações (com fallback)
  convertValues();                  // primeira renderização com taxa real
})();
