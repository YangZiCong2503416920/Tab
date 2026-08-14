import { state, commit } from '../state';
import { $, fetchWithTimeout } from '../core/utils';
import { toast } from '../core/toast';

const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WX_API = 'https://api.open-meteo.com/v1/forecast';

const WMO: Record<number, [string, string]> = {
  0: ['☀️', '晴'], 1: ['🌤️', '晴间多云'], 2: ['⛅', '局部多云'], 3: ['☁️', '阴'],
  45: ['🌫️', '雾'], 48: ['🌫️', '雾凇'],
  51: ['🌦️', '毛毛雨'], 53: ['🌦️', '毛毛雨'], 55: ['🌦️', '毛毛雨'],
  56: ['🌧️', '冻毛毛雨'], 57: ['🌧️', '冻毛毛雨'],
  61: ['🌧️', '小雨'], 63: ['🌧️', '中雨'], 65: ['🌧️', '大雨'],
  66: ['🌧️', '冻雨'], 67: ['🌧️', '冻雨'],
  71: ['❄️', '小雪'], 73: ['❄️', '中雪'], 75: ['❄️', '大雪'], 77: ['❄️', '雪粒'],
  80: ['🌦️', '阵雨'], 81: ['🌦️', '阵雨'], 82: ['⛈️', '强阵雨'],
  85: ['🌨️', '阵雪'], 86: ['🌨️', '阵雪'],
  95: ['⛈️', '雷阵雨'], 96: ['⛈️', '雷阵雨伴冰雹'], 99: ['⛈️', '雷阵雨伴冰雹']
};

export interface WeatherData {
  cityName: string;
  temp: number;
  code: number;
  humidity: number;
  wind: number;
}

export async function fetchWeatherFor(city: string): Promise<WeatherData> {
  const geoRes = await fetchWithTimeout(
    GEO_API + '?name=' + encodeURIComponent(city) + '&count=1&language=zh&format=json',
    8000,
    1
  );
  const geo = await geoRes.json();
  if (!geo.results || !geo.results.length) throw new Error('city not found: ' + city);
  const loc = geo.results[0];

  const wxRes = await fetchWithTimeout(
    WX_API +
      '?latitude=' + loc.latitude +
      '&longitude=' + loc.longitude +
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
      '&timezone=auto',
    8000,
    1
  );
  const wx = await wxRes.json();
  if (!wx.current) throw new Error('weather response missing current');
  return {
    cityName: (loc.name || city) + (loc.country_code ? ', ' + loc.country_code : ''),
    temp: Math.round(wx.current.temperature_2m),
    code: wx.current.weather_code,
    humidity: wx.current.relative_humidity_2m,
    wind: Math.round(wx.current.wind_speed_10m)
  };
}

export function wmoInfo(code: number): [string, string] {
  return WMO[code] || ['🌡️', '未知'];
}

export async function refreshWeather(): Promise<void> {
  const city = (state.settings.weatherCity || '').trim();
  if (!city) {
    if (!state.settings.weatherAutoTried) {
      state.settings.weatherAutoTried = true;
      commit();
      tryAutoLocate();
    } else {
      renderWeatherError();
    }
    return;
  }
  renderWeatherLoading();
  try {
    const data = await fetchWeatherFor(city);
    renderWeather(data);
  } catch (err) {
    console.warn('[weather]', err);
    renderWeatherError();
  }
}

function tryAutoLocate(): void {
  renderWeatherLoading();
  if (!navigator.geolocation) {
    renderWeatherError();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const res = await fetchWithTimeout(
          GEO_API + '?latitude=' + pos.coords.latitude + '&longitude=' + pos.coords.longitude + '&count=1&language=zh&format=json',
          8000,
          1
        );
        const geo = await res.json();
        const city = geo.results && geo.results[0] ? geo.results[0].name : '';
        if (city) {
          state.settings.weatherCity = city;
          commit();
        }
        const data = await fetchWeatherFor(city || pos.coords.latitude + ',' + pos.coords.longitude);
        renderWeather(data);
      } catch {
        renderWeatherError();
      }
    },
    () => renderWeatherError(),
    { timeout: 8000, maximumAge: 600000 }
  );
}

export function renderWeatherLoading(): void {
  const icon = $('#widget-weather-icon');
  const info = $('#widget-weather-info');
  if (icon) icon.textContent = '⏳';
  if (info) info.innerHTML = '<span class="weather-loading">加载中…</span>';
}

export function renderWeatherError(): void {
  const icon = $('#widget-weather-icon');
  const info = $('#widget-weather-info');
  if (icon) icon.textContent = '🌐';
  if (info) info.innerHTML = '<span class="weather-loading">设置城市后可显示</span>';
}

export function renderWeather(data: WeatherData): void {
  const [iconEmoji, label] = wmoInfo(data.code);
  const icon = $('#widget-weather-icon');
  const info = $('#widget-weather-info');
  if (icon) icon.textContent = iconEmoji;
  if (info) {
    info.innerHTML =
      '<span class="weather-temp">' + data.temp + '°C · ' + label + '</span>' +
      '<span class="weather-meta">' + data.cityName + ' · 湿度 ' + data.humidity + '% · 风 ' + data.wind + 'km/h</span>';
  }
}

export function saveWeatherCity(city: string): void {
  state.settings.weatherCity = city.trim();
  commit();
  void refreshWeather();
  toast(city.trim() ? '已保存城市：' + city.trim() : '将尝试自动定位', 'success', 2000);
}
