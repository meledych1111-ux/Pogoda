let latitude = 44.6;
let longitude = 33.5;

let currentAdviceFeedback = null;
let currentChoiceFeedback = null;

// Получаем иконку по коду погоды
function getWeatherIcon(code) {
  if ([0].includes(code)) return "☀️ Ясно";
  if ([1, 2, 3].includes(code)) return "⛅ Облачно";
  if ([45, 48].includes(code)) return "🌫 Туман";
  if ([51, 53, 55].includes(code)) return "🌦 Морось";
  if ([61, 63, 65].includes(code)) return "🌧 Дождь";
  if ([71, 73, 75].includes(code)) return "❄️ Снег";
  if ([95].includes(code)) return "⛈ Гроза";
  return "🌍 Неизвестно";
}

// История похожих температур
function getPastOutfits(temp) {
  const history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  return history.filter(r => r.temperature != null && Math.abs(r.temperature - temp) <= 2);
}

// Совет + история
function showAdviceWithHistory(temp, baseAdvice) {
  const past = getPastOutfits(temp);
  let text = baseAdvice;

  if (past.length > 0) {
    text += "\n\n👗 В похожую погоду вы надевали:";
    past.slice(-3).forEach(item => {
      text += `\n- ${item.worn} (${item.choiceFeedback || "—"})`;
    });
  }

  return text;
}

// Загрузка погоды и генерация совета
function loadWeather() {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relative_humidity_2m,wind_speed_10m`)
    .then(res => res.json())
    .then(data => {
      const temperature = data.current_weather.temperature;
      const windSpeed = data.current_weather.wind_speed;
      const humidity = data.hourly.relative_humidity_2m[0];
      const code = data.current_weather.weathercode;
      const icon = getWeatherIcon(code);

      let feelsLike = temperature;
      if (windSpeed > 15) feelsLike -= 2;

      let baseAdvice = "";
      if (humidity > 70 && temperature > 24) {
        baseAdvice = "Очень душно 💦 — лёгкая одежда, ткань не должна прилипать к телу.";
      } else if (feelsLike < 0) {
        baseAdvice = "Холодно 🧥 — зимняя куртка, шарф и шапка.";
      } else if (feelsLike < 10) {
        baseAdvice = "Прохладно 🌬 — тёплая куртка или толстовка, джинсы.";
      } else if (feelsLike < 16) {
        baseAdvice = "Свежее 🍂 — лёгкая куртка или толстовка, джинсы.";
      } else if (feelsLike < 18) {
        baseAdvice = "16–17 °C 🌤 — лучше надеть куртку и джинсы, футболки с кофтой будет мало.";
      } else if (feelsLike < 20) {
        baseAdvice = "18–19 °C 🌞 — можно в футболке, но лёгкая куртка пригодится вечером.";
      } else {
        baseAdvice = "Жарко ☀️ — лёгкая одежда, вода и головной убор!";
      }

      document.getElementById("weather").innerText = `${temperature}°C — ${icon}`;
      document.getElementById("advice").innerText = showAdviceWithHistory(feelsLike, baseAdvice);

      window.currentWeather = {
        temperature,
        feelsLike,
        windSpeed,
        humidity,
        icon,
        advice: baseAdvice
      };
    })
    .catch(err => {
      document.getElementById("weather").innerText = "Ошибка загрузки погоды";
      console.error(err);
    });
}

// Оценка совета
document.getElementById("adviceGood").onclick = () => currentAdviceFeedback = "Совет подошёл";
document.getElementById("adviceBad").onclick = () => currentAdviceFeedback = "Совет не подошёл";

// Оценка выбора
document.querySelectorAll(".choiceBtn").forEach(btn => {
  btn.onclick = () => currentChoiceFeedback = btn.dataset.feedback;
});

// Сохранение записи
function saveRecord() {
  const worn = document.getElementById("wornInput").value;
  if (!worn) return alert("Введите, что вы надели!");

  const record = {
    date: new Date().toLocaleString(),
    city: "Севастополь",
    temperature: window.currentWeather?.temperature || null,
    feelsLike: window.currentWeather?.feelsLike || null,
    windSpeed: window.currentWeather?.windSpeed || null,
    humidity: window.currentWeather?.humidity || null,
    weather: window.currentWeather?.icon || "",
    advice: window.currentWeather?.advice || "",
    adviceFeedback: currentAdviceFeedback,
    worn,
    choiceFeedback: currentChoiceFeedback
  };

  const history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  history.push(record);
  localStorage.setItem("clothingHistory", JSON.stringify(history));

  currentAdviceFeedback = null;
  currentChoiceFeedback = null;
  document.getElementById("wornInput").value = "";

  renderHistory();
  renderStats();
}

// Очистка истории
function clearHistory() {
  if (confirm("Удалить всю историю?")) {
    localStorage.removeItem("clothingHistory");
    renderHistory();
    renderStats();
  }
}

// История
function renderHistory() {
  const history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  const container = document.getElementById("history");
  container.innerHTML = "";

  history.slice().reverse().forEach(item => {
    const div = document.createElement("div");
    div.innerHTML = `
      <b>${item.date}</b><br>
      🌡 ${item.temperature}°C (ощущается как ${item.feelsLike}°C)<br>
      💨 Ветер: ${item.windSpeed} км/ч, 💧 Влажность: ${item.humidity}%<br>
      ${item.weather}<br>
      💡 Совет: ${item.advice}<br>
      📝 Оценка совета: ${item.adviceFeedback || "—"}<br>
      👗 Надето: ${item.worn}<br>
      ✅ Оценка выбора: ${item.choiceFeedback || "—"}
    `;
    container.appendChild(div);
  });
}

// Статистика
function renderStats() {
  const history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  const stats = {
    adviceGood: 0, adviceBad: 0,
    choiceGood: 0, choiceCold: 0, choiceHot: 0,
    wornCount: {}, tempSum: 0, humiditySum: 0, windSum: 0, count: 0
  };

  history.forEach(item => {
    if (item.adviceFeedback === "Совет подошёл") stats.adviceGood++;
    if (item.adviceFeedback === "Совет не подошёл") stats.adviceBad++;
    if (item.choiceFeedback === "Подошло") stats.choiceGood++;
    if (item.choiceFeedback === "Холодно") stats.choiceCold++;
    if (item.choiceFeedback === "Жарко") stats.choiceHot++;
    if (item.choiceFeedback === "Подошло" && item.worn)
      stats.wornCount[item.worn] = (stats.wornCount[item.worn] || 0) + 1;
    if (item.feelsLike != null) {
      stats.tempSum += item.feelsLike;
      stats.humiditySum += item.humidity || 0;
      stats.windSum += item.windSpeed || 0;
      stats.count++;
    }
  });

  const topWorn = Object.entries(stats.wornCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, c]) => `${w} (${c})`)
    .join(", ") || "—";

  const avgTemp = stats.count ? (stats.tempSum / stats.count).toFixed(1) : "—";
  const avgHumidity = stats.count ? (stats.humiditySum / stats.count).toFixed(0) : "—";
  const avgWind = stats.count ? (stats.windSum / stats.count).toFixed(1) : "—";

    document.getElementById("stats").innerHTML = `
    <div style="color:#0077cc">📝 <b>Советы:</b> ${stats.adviceGood} совпали / ${stats.adviceBad} не совпали</div>
    <div style="color:#28a745">✅ <b>Ваш выбор:</b> ${stats.choiceGood} подошло</div>
    <div style="color:#ff8800">🥶 <b>Холодно:</b> ${stats.choiceCold}</div>
    <div style="color:#e63946">🥵 <b>Жарко:</b> ${stats.choiceHot}</div>
    <div style="margin-top:10px"><b>👗 Топ удачных вещей:</b> ${topWorn}</div>
    <div style="margin-top:15px; color:#444"><b>📊 Средние условия:</b></div>
    <div style="color:#d63384">🌡 Температура (ощущается): ${avgTemp}°C</div>
    <div style="color:#0d6efd">💧 Влажность: ${avgHumidity}%</div>
    <div style="color:#20c997">💨 Ветер: ${avgWind} км/ч</div>
    <div style="margin-top:15px">
      <button onclick="clearHistory()" style="background:#dc3545; color:white; padding:16px 24px; border:none; border-radius:8px; font-size:1em; cursor:pointer">
        🧹 Очистить историю
      </button>
    </div>
  `;
}

// Инициализация
document.getElementById("saveBtn").addEventListener("click", saveRecord);
loadWeather();
renderHistory();
renderStats();
