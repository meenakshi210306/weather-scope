const cityInput = document.getElementById('cityInput');
const searchForm = document.getElementById('searchForm');
const statusText = document.getElementById('statusText');
const locationName = document.getElementById('locationName');
const localTime = document.getElementById('localTime');
const currentTemp = document.getElementById('currentTemp');
const weatherDescription = document.getElementById('weatherDescription');
const weatherMeta = document.getElementById('weatherMeta');
const windSpeed = document.getElementById('windSpeed');
const humidity = document.getElementById('humidity');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const forecastList = document.getElementById('forecastList');

const weatherCodes = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Depositing rime fog'],
  [51, 'Light drizzle'],
  [53, 'Moderate drizzle'],
  [55, 'Dense drizzle'],
  [56, 'Freezing drizzle'],
  [57, 'Freezing drizzle'],
  [61, 'Slight rain'],
  [63, 'Moderate rain'],
  [65, 'Heavy rain'],
  [66, 'Freezing rain'],
  [67, 'Freezing rain'],
  [71, 'Slight snow fall'],
  [73, 'Moderate snow fall'],
  [75, 'Heavy snow fall'],
  [77, 'Snow grains'],
  [80, 'Rain showers'],
  [81, 'Rain showers'],
  [82, 'Violent rain showers'],
  [85, 'Snow showers'],
  [86, 'Snow showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with hail'],
  [99, 'Thunderstorm with hail']
]);

function codeToLabel(code) {
  return weatherCodes.get(code) ?? 'Unknown conditions';
}

function formatDay(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function formatLocalTime(timeString) {
  const date = new Date(timeString);
  return Number.isNaN(date.getTime())
    ? '--'
    : date.toLocaleString(undefined, {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? '#fecaca' : '';
}

function setMetric(element, value, suffix = '') {
  element.textContent = value === null || value === undefined || value === '' ? '--' : `${value}${suffix}`;
}

function renderForecast(days) {
  forecastList.innerHTML = '';

  days.forEach((day) => {
    const item = document.createElement('article');
    item.className = 'forecast-item';

    item.innerHTML = `
      <div>
        <div class="date">${formatDay(day.date)}</div>
        <div class="summary">${codeToLabel(day.weathercode)}</div>
      </div>
      <div class="range">${Math.round(day.temperature_2m_max)}° / ${Math.round(day.temperature_2m_min)}°</div>
    `;

    forecastList.appendChild(item);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function searchLocation(query) {
  const searchUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  searchUrl.searchParams.set('name', query);
  searchUrl.searchParams.set('count', '1');
  searchUrl.searchParams.set('language', 'en');
  searchUrl.searchParams.set('format', 'json');

  const data = await fetchJson(searchUrl.toString());
  return data.results?.[0] ?? null;
}

async function loadWeather(cityName) {
  const query = cityName.trim();
  if (!query) {
    setStatus('Enter a city name first.', true);
    return;
  }

  setStatus(`Searching for ${query}...`);

  try {
    const location = await searchLocation(query);
    if (!location) {
      throw new Error(`No matches found for ${query}`);
    }

    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
    forecastUrl.searchParams.set('latitude', location.latitude);
    forecastUrl.searchParams.set('longitude', location.longitude);
    forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility');
    forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
    forecastUrl.searchParams.set('timezone', location.timezone || 'auto');

    const weatherData = await fetchJson(forecastUrl.toString());
    const current = weatherData.current;
    const daily = weatherData.daily ?? {};

    locationName.textContent = [location.name, location.admin1, location.country].filter(Boolean).join(', ');
    localTime.textContent = formatLocalTime(current.time);
    currentTemp.textContent = Math.round(current.temperature_2m);
    weatherDescription.textContent = codeToLabel(current.weather_code);
    weatherMeta.textContent = `Feels like ${Math.round(current.apparent_temperature)}°C`;
    setMetric(windSpeed, Math.round(current.wind_speed_10m), ' km/h');
    setMetric(humidity, Math.round(current.relative_humidity_2m), '%');
    setMetric(pressure, Math.round(current.surface_pressure), ' hPa');
    setMetric(visibility, Math.round(current.visibility), ' m');

    const forecastDays = (daily.time || []).map((date, index) => ({
      date,
      weathercode: daily.weather_code?.[index],
      temperature_2m_max: daily.temperature_2m_max?.[index],
      temperature_2m_min: daily.temperature_2m_min?.[index]
    }));

    renderForecast(forecastDays.slice(0, 5));
    setStatus(`Showing weather for ${location.name}.`);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : 'Unable to load weather data.', true);
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  loadWeather(cityInput.value);
});

cityInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    cityInput.value = '';
  }
});

loadWeather('London');
