const PROFILES = {
  peter: {
    name: "Peter",
    route: "Nørholm – Aalborg SV",
    // Punkter langs ruten: Nørholm + Aalborg SV
    points: [
      {lat: 57.006, lon: 9.765},
      {lat: 57.005, lon: 9.874}
    ]
  },
  son: {
    name: "Din dreng",
    route: "Nørholm – Sønderholm",
    // Punkter langs ruten: Nørholm + Sønderholm
    points: [
      {lat: 57.006, lon: 9.765},
      {lat: 56.995, lon: 9.726}
    ]
  }
};

const MORNING = {start: 7.25, end: 8.25}; // ca. 07:15–08:15 i time-data
const HOME = {start: 13, end: 16};

let profileData = {};

function fmtDate() {
  const d = new Date();
  return d.toLocaleDateString("da-DK", {weekday:"long", day:"numeric", month:"long"});
}
document.getElementById("today").textContent = fmtDate();

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

async function fetchPoint(point) {
  const vars = [
    "temperature_2m","apparent_temperature","precipitation_probability",
    "precipitation","rain","snowfall","weather_code",
    "wind_speed_10m","wind_gusts_10m"
  ].join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}` +
    `&hourly=${vars}&timezone=Europe%2FCopenhagen&forecast_days=2&wind_speed_unit=kmh`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Vejrserveren svarede ikke");
  return r.json();
}

function hourlyRows(raw) {
  const h = raw.hourly;
  return h.time.map((time, i) => ({
    time,
    temperature: h.temperature_2m[i],
    feels: h.apparent_temperature[i],
    pop: h.precipitation_probability[i],
    precipitation: h.precipitation[i],
    rain: h.rain[i],
    snow: h.snowfall[i],
    code: h.weather_code[i],
    wind: h.wind_speed_10m[i],
    gust: h.wind_gusts_10m[i]
  }));
}

function selectWindow(rows, start, end) {
  const date = todayISO();
  return rows.filter(r => {
    if (!r.time.startsWith(date)) return false;
    const hour = Number(r.time.slice(11,13));
    return hour >= Math.floor(start) && hour <= Math.ceil(end);
  });
}

function avg(vals) {
  const a = vals.filter(v => Number.isFinite(v));
  return a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
}
function max(vals) {
  const a = vals.filter(v => Number.isFinite(v));
  return a.length ? Math.max(...a) : 0;
}
function min(vals) {
  const a = vals.filter(v => Number.isFinite(v));
  return a.length ? Math.min(...a) : 0;
}

function aggregate(windows) {
  const rows = windows.flat();
  return {
    temp: avg(rows.map(r=>r.temperature)),
    feels: avg(rows.map(r=>r.feels)),
    pop: max(rows.map(r=>r.pop)),
    precip: max(rows.map(r=>r.precipitation)),
    rain: max(rows.map(r=>r.rain)),
    snow: max(rows.map(r=>r.snow)),
    wind: max(rows.map(r=>r.wind)),
    gust: max(rows.map(r=>r.gust)),
    code: rows.sort((a,b)=>b.precipitation-a.precipitation)[0]?.code ?? 0
  };
}

function scoreWeather(w) {
  let score = 100;
  const reasons = [];

  if (w.rain >= 4 || w.precip >= 4) { score -= 35; reasons.push("kraftig regn"); }
  else if (w.rain >= 1.5 || w.precip >= 1.5) { score -= 23; reasons.push("regn"); }
  else if (w.rain >= .2 || w.precip >= .2 || w.pop >= 55) { score -= 12; reasons.push("risiko for regn"); }

  if (w.snow >= .2) { score -= 35; reasons.push("sne"); }

  if (w.wind >= 35) { score -= 33; reasons.push("meget vind"); }
  else if (w.wind >= 25) { score -= 21; reasons.push("frisk vind"); }
  else if (w.wind >= 18) { score -= 10; reasons.push("mærkbar vind"); }

  if (w.gust >= 55) { score -= 20; reasons.push("kraftige vindstød"); }
  else if (w.gust >= 40) { score -= 10; reasons.push("vindstød"); }

  if (w.feels <= 0) { score -= 18; reasons.push("frost/kulde"); }
  else if (w.feels <= 5) { score -= 10; reasons.push("koldt"); }
  else if (w.feels >= 28) { score -= 10; reasons.push("meget varmt"); }

  score = Math.max(0, Math.round(score));
  return {score, reasons};
}

function labelScore(score) {
  if (score >= 82) return {text:"Rigtig godt", icon:"🚲", cls:"good"};
  if (score >= 65) return {text:"Godt", icon:"👍", cls:"good"};
  if (score >= 45) return {text:"Okay", icon:"🙂", cls:"okay"};
  if (score >= 25) return {text:"Besværligt", icon:"⚠️", cls:"bad"};
  return {text:"Dårligt", icon:"🌧️", cls:"bad"};
}

function metric(label, value) {
  return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}
function renderWindow(id, w) {
  const el = document.getElementById(id);
  el.classList.remove("placeholder");
  el.innerHTML =
    metric("Temperatur", `${Math.round(w.temp)}°`) +
    metric("Føles som", `${Math.round(w.feels)}°`) +
    metric("Vind", `${Math.round(w.wind)} km/t`) +
    metric("Vindstød", `${Math.round(w.gust)} km/t`) +
    metric("Regn", `${w.precip.toFixed(1)} mm`) +
    metric("Regnrisiko", `${Math.round(w.pop)}%`) +
    metric("Sne", w.snow > 0 ? `${w.snow.toFixed(1)} cm` : "Ingen") +
    metric("Vurdering", labelScore(scoreWeather(w).score).text);
}

function renderProfile(key, morning, home) {
  profileData[key] = {morning, home};
  renderWindow(`${key}Morning`, morning);
  renderWindow(`${key}Home`, home);
  const combinedScore = Math.round((scoreWeather(morning).score + scoreWeather(home).score)/2);
  const label = labelScore(combinedScore);
  const badge = document.getElementById(`${key}Badge`);
  badge.textContent = `${label.icon} ${combinedScore}`;
  badge.className = `score-badge ${label.cls}`;
  return combinedScore;
}

function clothingFor(w) {
  const items = [];
  const t = w.feels;

  if (t <= 0) items.push("🧥 Varm vinterjakke eller varm cykeljakke", "🧤 Varme handsker", "🧣 Halsedisse", "🧢 Tynd hue under hjelmen", "👖 Varme lange bukser");
  else if (t <= 5) items.push("🧥 Varm cykeljakke", "🧤 Handsker", "👕 Langærmet lag inderst", "👖 Lange bukser");
  else if (t <= 10) items.push("🧥 Let vindjakke", "👕 Langærmet trøje", "👖 Lange bukser", "🧤 Tynde handsker hvis du fryser let");
  else if (t <= 15) items.push("🧥 Tynd vindjakke eller vest", "👕 T-shirt / tynd langærmet", "👖 Lange eller 3/4-bukser");
  else if (t <= 21) items.push("👕 T-shirt eller let cykeltrøje", "🩳 Shorts eller lette bukser", "🧥 Tynd vindvest til morgenstunden");
  else items.push("👕 Let T-shirt / cykeltrøje", "🩳 Shorts", "💧 Husk vand");

  if (w.precip >= .2 || w.pop >= 45) items.push("🌧️ Regnjakke", "🎒 Vandtæt overtræk/taske");
  if (w.precip >= 1.5) items.push("👖 Regnbukser");
  if (w.wind >= 22) items.push("💨 Vindtæt yderlag");
  if (w.snow > 0) items.push("❄️ Varme, vandafvisende sko og ekstra forsigtighed");
  if (w.temp >= 18) items.push("🧴 Solcreme ved sol/klart vejr");
  return [...new Set(items)];
}

function openClothes(key) {
  const d = profileData[key];
  if (!d) return;
  // Tager værste forhold fra morgen og hjemtur
  const all = {
    temp: Math.min(d.morning.temp, d.home.temp),
    feels: Math.min(d.morning.feels, d.home.feels),
    pop: Math.max(d.morning.pop, d.home.pop),
    precip: Math.max(d.morning.precip, d.home.precip),
    snow: Math.max(d.morning.snow, d.home.snow),
    wind: Math.max(d.morning.wind, d.home.wind)
  };
  document.getElementById("clothesTitle").textContent = `${PROFILES[key].name} – forslag til i dag`;
  document.getElementById("clothesWeather").textContent =
    `Føles som ca. ${Math.round(all.feels)}°, vind op til ${Math.round(all.wind)} km/t og ${Math.round(all.pop)}% regnrisiko i jeres cykeltider.`;
  document.getElementById("clothesContent").innerHTML =
    clothingFor(all).map(x=>`<div class="clothing-item">${x}</div>`).join("");
  document.getElementById("clothesDialog").showModal();
}

async function loadWeather() {
  const summary = document.getElementById("summary");
  document.getElementById("overallText").textContent = "Henter vejret…";
  document.getElementById("overallIcon").textContent = "⏳";
  try {
    const scores = [];
    for (const [key, profile] of Object.entries(PROFILES)) {
      const responses = await Promise.all(profile.points.map(fetchPoint));
      const windowsMorning = responses.map(x => selectWindow(hourlyRows(x), MORNING.start, MORNING.end));
      const windowsHome = responses.map(x => selectWindow(hourlyRows(x), HOME.start, HOME.end));
      const morning = aggregate(windowsMorning);
      const home = aggregate(windowsHome);
      scores.push(renderProfile(key, morning, home));
    }
    const overall = Math.round(avg(scores));
    const label = labelScore(overall);
    document.getElementById("overallIcon").textContent = label.icon;
    document.getElementById("overallText").textContent = `${label.text} cykelvejr · ${overall}/100`;

    const allTrips = Object.values(profileData).flatMap(x=>[x.morning,x.home]);
    const worstWind = max(allTrips.map(x=>x.wind));
    const worstRain = max(allTrips.map(x=>x.precip));
    const minFeels = min(allTrips.map(x=>x.feels));
    let details = `Føles som ned til ${Math.round(minFeels)}°. Vind op til ${Math.round(worstWind)} km/t.`;
    details += worstRain >= .2 ? ` Op til ${worstRain.toFixed(1)} mm nedbør i en af perioderne.` : " Ingen nævneværdig regn i cykeltiderne.";
    document.getElementById("summaryDetails").textContent = details;
    document.getElementById("updated").textContent =
      `Opdateret kl. ${new Date().toLocaleTimeString("da-DK",{hour:"2-digit",minute:"2-digit"})}`;
    summary.classList.remove("loading");
  } catch (err) {
    console.error(err);
    document.getElementById("overallIcon").textContent = "⚠️";
    document.getElementById("overallText").textContent = "Kunne ikke hente vejret";
    document.getElementById("summaryDetails").textContent =
      "Kontrollér internetforbindelsen og tryk på ↻ for at prøve igen.";
  }
}

document.querySelectorAll("[data-clothes]").forEach(btn =>
  btn.addEventListener("click", () => openClothes(btn.dataset.clothes))
);
document.getElementById("closeDialog").addEventListener("click", () =>
  document.getElementById("clothesDialog").close()
);
document.getElementById("refreshBtn").addEventListener("click", loadWeather);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

loadWeather();
setInterval(loadWeather, 15 * 60 * 1000);
