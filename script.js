let latitude = 44.6;
let longitude = 33.5;

let currentAdviceFeedback = null;
let currentChoiceFeedback = null;

// Сопоставление weathercode → иконка
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

// Получаем прошлые записи для похожей температуры
function getPastOutfits(temp) {
  const history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  return history.filter(r => r.temperature != null && Math.abs(r.temperature - temp) <= 2);
}

// Формируем совет + история
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

// Загружаем погоду и показываем совет
function loadWeather() {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`)
    .then(response => response.json())
    .then(data => {
      let temperature = data.current_weather.temperature;
      let code = data.current_weather.weathercode;
      let icon = getWeatherIcon(code);

      // стандартный совет
      let baseAdvice = "";
      if (temperature < 0) {
        baseAdvice = "Холодно 🧥 — зимняя куртка, шарф и шапка.";
      } else if (temperature < 10) {
        baseAdvice = "Прохладно 🌬 — тёплая куртка или толстовка, джинсы.";
      } else if (temperature < 16) {
        baseAdvice = "Свежее 🍂 — лёгкая куртка или толстовка, джинсы.";
      } else if (temperature < 18) {
        baseAdvice = "16–17 °C 🌤 — лучше надеть куртку и джинсы, футболки с кофтой будет мало.";
      } else if (temperature < 20) {
        baseAdvice = "18–19 °C 🌞 — можно в футболке, но лёгкая куртка пригодится вечером.";
      } else {
        baseAdvice = "Жарко ☀️ — лёгкая одежда, вода и головной убор!";
      }

      // выводим погоду и совет
      document.getElementById("weather").innerText = `${temperature}°C — ${icon}`;
      document.getElementById("advice").innerText = showAdviceWithHistory(temperature, baseAdvice);

      // сохраняем текущую погоду для записи
      window.currentWeather = { temperature, icon, advice: baseAdvice };
    })
    .catch(error => {
      document.getElementById("weather").innerText = "Ошибка загрузки данных";
      console.error(error);
    });
}

// Оценка совета
document.getElementById("adviceGood").addEventListener("click", () => {
  currentAdviceFeedback = "Совет подошёл";
});
document.getElementById("adviceBad").addEventListener("click", () => {
  currentAdviceFeedback = "Совет не подошёл";
});

// Оценка выбора
document.querySelectorAll(".choiceBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentChoiceFeedback = btn.dataset.feedback;
  });
});

// Сохранение данных
function saveRecord() {
  let worn = document.getElementById("wornInput").value;
  if (!worn) {
    alert("Введите, что вы надели!");
    return;
  }

  let record = {
    date: new Date().toLocaleString(),
    city: "Севастополь",
    temperature: window.currentWeather?.temperature || null,
    weather: window.currentWeather?.icon || "",
    advice: window.currentWeather?.advice || "",
    adviceFeedback: currentAdviceFeedback,
    worn,
    choiceFeedback: currentChoiceFeedback
  };

    let history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  history.push(record);
  localStorage.setItem("clothingHistory", JSON.stringify(history));

  // сбрасываем временные переменные
  currentAdviceFeedback = null;
  currentChoiceFeedback = null;
  document.getElementById("wornInput").value = "";

  renderHistory();
  renderStats();
}

// Отображение истории
function renderHistory() {
  let history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");
  let container = document.getElementById("history");
  container.innerHTML = "";

  history.slice().reverse().forEach(item => {
    let div = document.createElement("div");
    div.innerHTML = `
      <b>${item.date}</b><br>
      🌡 ${item.temperature}°C ${item.weather}<br>
      💡 Совет: ${item.advice}<br>
      📝 Оценка совета: ${item.adviceFeedback || "—"}<br>
      👗 Надето: ${item.worn}<br>
      ✅ Оценка выбора: ${item.choiceFeedback || "—"}
    `;
    container.appendChild(div);
  });
}

// Подсчёт статистики
function renderStats() {
  let history = JSON.parse(localStorage.getItem("clothingHistory") || "[]");

  let stats = {
    adviceGood: 0,
    adviceBad: 0,
    choiceGood: 0,
    choiceCold: 0,
    choiceHot: 0,
    wornCount: {}
  };

  history.forEach(item => {
    // оценка совета
    if (item.adviceFeedback === "Совет подошёл") stats.adviceGood++;
    if (item.adviceFeedback === "Совет не подошёл") stats.adviceBad++;

    // оценка выбора
    if (item.choiceFeedback === "Подошло") stats.choiceGood++;
    if (item.choiceFeedback === "Холодно") stats.choiceCold++;
    if (item.choiceFeedback === "Жарко") stats.choiceHot++;

    // подсчёт одежды (только если подошло)
    if (item.choiceFeedback === "Подошло" && item.worn) {
      stats.wornCount[item.worn] = (stats.wornCount[item.worn] || 0) + 1;
    }
  });

  // топ-3 вещей
  let topWorn = Object.entries(stats.wornCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, c]) => `${w} (${c})`)
    .join(", ") || "—";

  // вывод
  let container = document.getElementById("stats");
  container.innerHTML = `
    📝 Советы: ${stats.adviceGood} совпали / ${stats.adviceBad} не совпали<br>
    ✅ Ваш выбор: ${stats.choiceGood} подошло / ${stats.choiceCold} холодно / ${stats.choiceHot} жарко<br>
    👗 Топ удачных вещей: ${topWorn}
  `;
}

// Инициализация
document.getElementById("saveBtn").addEventListener("click", saveRecord);
loadWeather();
renderHistory();
renderStats();
