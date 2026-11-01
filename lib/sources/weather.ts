export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  uvIndex: number;
  precipitation: number;
}

export interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  precipProbability: number;
  weatherCode: number;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
}

const CURRENT_FIELDS = [
  "temperature_2m", "relative_humidity_2m", "apparent_temperature",
  "precipitation", "weather_code", "wind_speed_10m", "uv_index",
].join(",");

const DAILY_FIELDS = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "sunrise", "sunset", "uv_index_max", "precipitation_sum",
].join(",");

const HOURLY_FIELDS = ["temperature_2m", "precipitation_probability", "weather_code"].join(",");

export function buildWeatherUrl(lat: number, lon: number, timezone: string): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: CURRENT_FIELDS,
    daily: DAILY_FIELDS,
    hourly: HOURLY_FIELDS,
    timezone,
    forecast_days: "7",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

interface RawForecast {
  current: Record<string, number>;
  daily: Record<string, (number | string)[]>;
  hourly?: Record<string, (number | string | null)[]>;
}

export function parseWeather(json: unknown): WeatherData {
  const raw = json as RawForecast;
  const c = raw.current;
  const d = raw.daily;
  const daily: DailyForecast[] = (d.time as string[]).map((date, i) => ({
    date,
    weatherCode: d.weather_code[i] as number,
    tempMax: d.temperature_2m_max[i] as number,
    tempMin: d.temperature_2m_min[i] as number,
    sunrise: d.sunrise[i] as string,
    sunset: d.sunset[i] as string,
    uvIndexMax: d.uv_index_max[i] as number,
    precipitationSum: (d.precipitation_sum[i] as number | null) ?? 0,
  }));
  const h = raw.hourly;
  const hourly: HourlyForecast[] = Array.isArray(h?.time)
    ? (h.time as string[]).map((time, i) => ({
        time,
        temp: (h.temperature_2m?.[i] as number | null) ?? 0,
        precipProbability: (h.precipitation_probability?.[i] as number | null) ?? 0,
        weatherCode: (h.weather_code?.[i] as number | null) ?? 0,
      }))
    : [];
  return {
    current: {
      temperature: c.temperature_2m,
      apparentTemperature: c.apparent_temperature,
      weatherCode: c.weather_code,
      windSpeed: c.wind_speed_10m,
      humidity: c.relative_humidity_2m,
      uvIndex: c.uv_index,
      precipitation: c.precipitation,
    },
    daily,
    hourly,
  };
}

export async function fetchWeather(lat: number, lon: number, timezone: string, fetchImpl: typeof fetch = fetch): Promise<WeatherData> {
  const res = await fetchImpl(buildWeatherUrl(lat, lon, timezone));
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return parseWeather(await res.json());
}
