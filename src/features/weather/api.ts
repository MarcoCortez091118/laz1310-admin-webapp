import { apiRequest, type ApiResult } from "../../api/client";

export type WeatherConditionCode =
  | "clear"
  | "mostly_clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "freezing_drizzle"
  | "rain"
  | "freezing_rain"
  | "snow"
  | "snow_grains"
  | "rain_showers"
  | "snow_showers"
  | "thunderstorm"
  | "thunderstorm_hail"
  | "unknown";

export interface WeatherLocation {
  id: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
}

export interface WeatherLocationSummary extends WeatherLocation {
  primary: boolean;
}

interface WeatherConditions {
  conditionCode: WeatherConditionCode;
  conditionText: string;
}

export interface CurrentWeather extends WeatherConditions {
  temperatureC: number;
  highC: number;
  lowC: number;
  humidityPercent: number;
  windKph: number;
  precipitationMm: number;
  precipitationPeriodMinutes: number;
  isDay: boolean;
}

export interface HourlyWeather extends WeatherConditions {
  at: string;
  temperatureC: number;
  humidityPercent: number;
  windKph: number;
  precipitationMm: number;
  precipitationProbabilityPercent: number;
  isDay: boolean;
}

export interface DailyWeather extends WeatherConditions {
  date: string;
  highC: number;
  lowC: number;
  windKph: number;
  precipitationMm: number;
  precipitationProbabilityPercent: number;
}

export interface WeatherAttribution {
  text: string;
  url: string;
  licenseUrl: string;
}

export interface WeatherResponse {
  location: WeatherLocation;
  observedAt: string;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  attribution: WeatherAttribution[];
  fetchedAt: string;
  stale: boolean;
}

export const weatherQueryKeys = {
  locations: ["weather", "locations"] as const,
  detail: (locationId: string) => ["weather", "detail", locationId] as const,
};

export function getWeatherLocations(signal?: AbortSignal): Promise<ApiResult<WeatherLocationSummary[]>> {
  return apiRequest<WeatherLocationSummary[]>(
    "/api/v1/weather/locations",
    { method: "GET" },
    { signal },
  );
}

export function getWeather(locationId: string, signal?: AbortSignal): Promise<ApiResult<WeatherResponse>> {
  return apiRequest<WeatherResponse>(
    `/api/v1/weather/${encodeURIComponent(locationId)}`,
    { method: "GET" },
    { signal },
  );
}
