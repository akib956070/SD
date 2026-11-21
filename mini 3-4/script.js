const $ = (id) => document.getElementById(id);
let city = null;
let days = [];
let selectedDate = null;
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

function getIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 67 || (code >= 80 && code <= 82)) return "🌧️";
  if (code <= 86) return "❄️";
  return "⛈️";
}

const messageStyles = {
  loading: "text-center p-3 mb-4 rounded-md bg-blue-100 text-blue-800",
  error: "text-center p-3 mb-4 rounded-md bg-red-100 text-red-700",
  empty: "text-center p-3 mb-4 rounded-md bg-yellow-100 text-yellow-800",
  "": "hidden"
};

function showMessage(type, text) {
  $("message").className = messageStyles[type];
  $("message").textContent = text;
}

async function searchCity(name) {
  showMessage("loading", "Searching for " + name + "...");
  try {
    const response = await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(name));
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      showMessage("empty", 'No city found for "' + name + '".');
      return;
    }
    const p = data.results[0];
    getWeather({ name: p.name, country: p.country || "", latitude: p.latitude, longitude: p.longitude });
  } catch (error) {
    showMessage("error", "Something went wrong. Check your internet and try again.");
  }
}

async function getWeather(newCity) {
  showMessage("loading", "Loading weather for " + newCity.name + "...");
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + newCity.latitude +
    "&longitude=" + newCity.longitude +
    "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=auto&forecast_days=5";
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Bad response");
    const data = await response.json();
    const now = data.current;

    city = newCity;
    selectedDate = null;
    $("filter-select").value = "all";
    days = data.daily.time.map((date, i) => ({
      date: date,
      code: data.daily.weather_code[i],
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      rain: data.daily.precipitation_probability_max[i]
    }));

    $("city-name").textContent = city.name + (city.country ? ", " + city.country : "");
    $("condition").textContent = "Current weather";
    $("icon").textContent = getIcon(now.weather_code);
    $("temp").textContent = Math.round(now.temperature_2m) + "°C";
    $("humidity").textContent = now.relative_humidity_2m + "%";
    $("wind").textContent = now.wind_speed_10m + " km/h";

    localStorage.setItem("lastCity", JSON.stringify(city));
    showMessage("", "");
    $("weather-section").classList.remove("hidden");
    showForecast();
  } catch (error) {
    showMessage("error", "Could not load the weather. Please try again.");
  }
}

function showForecast() {
  const filter = $("filter-select").value;
  const shown = days.filter((day) => {
    if (filter === "rainy") return day.rain >= 50;
    if (filter === "dry") return day.rain < 50;
    return true;
  });

  $("forecast-list").innerHTML = shown.length ? "" : '<p class="col-span-full text-center text-slate-500 py-4">No days match this filter.</p>';

  shown.forEach((day) => {
    const card = document.createElement("button");
    card.className = "rounded-md p-3 text-center border-2 hover:bg-blue-100 " +
      (day.date === selectedDate ? "border-blue-800 bg-blue-100" : "border-transparent bg-slate-50");
    card.innerHTML = '<div class="text-sm font-bold">' + day.date.slice(5) + '</div><div class="text-3xl my-1">' +
      getIcon(day.code) + '</div><div class="text-sm">' + day.max + "° / " + day.min + "°</div>";
    card.addEventListener("click", () => {
      selectedDate = day.date;
      showForecast();
    });
    $("forecast-list").appendChild(card);
  });

  const picked = days.find((day) => day.date === selectedDate);
  $("day-details").classList.toggle("hidden", !picked);
  if (picked) {
    $("day-details").innerHTML = "<h3 class='font-bold mb-1'>" + picked.date + "</h3><p>High: " + picked.max +
      "°C | Low: " + picked.min + "°C</p><p>Chance of rain: " + picked.rain + "%</p>";
  }
}

function showFavorites() {
  $("favorites-list").innerHTML = favorites.length ? "" : '<p class="text-sm text-slate-500">No saved cities yet.</p>';
  favorites.forEach((fav) => {
    const button = document.createElement("button");
    button.className = "bg-blue-100 text-blue-800 text-sm px-3 py-2 rounded-md hover:bg-blue-200";
    button.textContent = fav.name;
    button.addEventListener("click", () => getWeather(fav));
    $("favorites-list").appendChild(button);
  });
}

$("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("city-input").value.trim();
  if (name === "") {
    showMessage("error", "Please type a city name first.");
  } else {
    searchCity(name);
  }
});

$("fav-btn").addEventListener("click", () => {
  if (!city) return;
  const alreadySaved = favorites.some((fav) => fav.name === city.name && fav.country === city.country);
  if (!alreadySaved) {
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    showFavorites();
  }
});

$("filter-select").addEventListener("change", showForecast);

showFavorites();
const lastCity = JSON.parse(localStorage.getItem("lastCity"));
if (lastCity) {
  getWeather(lastCity);
} else {
  showMessage("empty", "Search for a city to see the weather.");
}
