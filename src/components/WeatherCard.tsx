"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Snowflake,
  Sun,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { cn } from "@/lib/utils";

type WeatherData = {
  location: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  high: number;
  low: number;
  isDay: boolean;
};

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    relative_humidity_2m?: number;
    is_day?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

type GeocodingResponse = {
  results?: Array<{
    name: string;
    admin1?: string;
    country?: string;
    latitude: number;
    longitude: number;
  }>;
};

const conditionFor = (weatherCode: number, isDay: boolean) => {
  if (weatherCode === 0) return { label: isDay ? "Sonnig" : "Klare Nacht", icon: Sun, accent: "text-amber-300" };
  if ([1, 2].includes(weatherCode)) return { label: "Leicht bew\u00f6lkt", icon: CloudSun, accent: "text-cyan-200" };
  if (weatherCode === 3) return { label: "Bedeckt", icon: Cloud, accent: "text-slate-200" };
  if ([45, 48].includes(weatherCode)) return { label: "Neblig", icon: CloudFog, accent: "text-slate-200" };
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return { label: "Nieselregen", icon: CloudDrizzle, accent: "text-cyan-200" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return { label: "Regen", icon: CloudRain, accent: "text-cyan-200" };
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return { label: "Schnee", icon: Snowflake, accent: "text-cyan-100" };
  if ([95, 96, 99].includes(weatherCode)) return { label: "Gewitter", icon: CloudLightning, accent: "text-amber-200" };
  return { label: "Wetterdaten", icon: CloudSun, accent: "text-cyan-200" };
};

const roundedTemperature = (value: number) => `${Math.round(value)}\u00b0`;

export function WeatherCard({ city, country }: { city?: string; country?: string }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(city?.trim()));
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async (signal?: AbortSignal) => {
    const location = city?.trim();
    if (!location) {
      setWeather(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const geocodingUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geocodingUrl.searchParams.set("name", location);
      geocodingUrl.searchParams.set("count", "1");
      geocodingUrl.searchParams.set("language", "de");
      geocodingUrl.searchParams.set("format", "json");

      const geocodingResponse = await fetch(geocodingUrl, { signal });
      if (!geocodingResponse.ok) throw new Error("Der Standort konnte nicht geladen werden.");
      const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;
      const place = geocodingData.results?.[0];
      if (!place) throw new Error("Der Firmenstandort wurde nicht gefunden.");

      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.searchParams.set("latitude", String(place.latitude));
      forecastUrl.searchParams.set("longitude", String(place.longitude));
      forecastUrl.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day");
      forecastUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min");
      forecastUrl.searchParams.set("timezone", "auto");
      forecastUrl.searchParams.set("forecast_days", "1");

      const forecastResponse = await fetch(forecastUrl, { signal });
      if (!forecastResponse.ok) throw new Error("Die Wetterdaten konnten nicht geladen werden.");
      const forecastData = (await forecastResponse.json()) as WeatherResponse;
      const current = forecastData.current;
      if (typeof current?.temperature_2m !== "number") throw new Error("Unvollst\u00e4ndige Wetterdaten.");

      setWeather({
        location: [place.name, place.admin1 || place.country || country].filter(Boolean).join(", "),
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature ?? current.temperature_2m,
        weatherCode: current.weather_code ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        humidity: current.relative_humidity_2m ?? 0,
        high: forecastData.daily?.temperature_2m_max?.[0] ?? current.temperature_2m,
        low: forecastData.daily?.temperature_2m_min?.[0] ?? current.temperature_2m,
        isDay: current.is_day !== 0,
      });
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setWeather(null);
      setError(loadError instanceof Error ? loadError.message : "Die Wetterdaten konnten nicht geladen werden.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [city, country]);

  useEffect(() => {
    const controller = new AbortController();
    void loadWeather(controller.signal);
    return () => controller.abort();
  }, [loadWeather]);

  const presentation = conditionFor(weather?.weatherCode ?? 1, weather?.isDay ?? true);
  const ConditionIcon = presentation.icon;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-600 via-indigo-600 to-violet-700 p-5 text-white shadow-xl shadow-indigo-200/40 sm:p-7">
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 -bottom-24 h-72 w-72 rounded-full bg-fuchsia-400/25 blur-3xl" />
      <div className="pointer-events-none absolute right-[24%] top-8 h-20 w-20 rounded-full border border-white/10 bg-white/5" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100/90">
              <CloudSun className="h-4 w-4" />
              Wetter am Firmenstandort
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-white/75">
              <MapPin className="h-4 w-4" />
              {weather?.location || city?.trim() || "Firmenstandort noch nicht hinterlegt"}
            </div>
          </div>
          {city?.trim() && (
            <button
              type="button"
              onClick={() => void loadWeather()}
              disabled={isLoading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-wait"
              aria-label="Wetter aktualisieren"
              title="Wetter aktualisieren"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </button>
          )}
        </div>

        {!city?.trim() ? (
          <div className="mt-8 rounded-[1.5rem] border border-white/15 bg-slate-950/15 p-5 backdrop-blur-sm">
            <p className="text-xl font-black">Noch kein Firmenstandort hinterlegt</p>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-white/75">{"Erg\u00e4nzen Sie Ort und Land in den Stammdaten. Danach wird das lokale Wetter automatisch hier angezeigt."}</p>
          </div>
        ) : isLoading && !weather ? (
          <div className="mt-8 flex min-h-40 items-center gap-4 rounded-[1.5rem] border border-white/15 bg-slate-950/15 p-6 backdrop-blur-sm">
            <LoaderCircle className="h-7 w-7 animate-spin text-cyan-200" />
            <div><p className="text-lg font-black">Wetter wird geladen</p><p className="mt-1 text-sm font-semibold text-white/70">{"Aktuelle Daten f\u00fcr den Firmenstandort werden abgerufen."}</p></div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[1.5rem] border border-white/15 bg-slate-950/15 p-5 backdrop-blur-sm">
            <p className="text-lg font-black">{"Wetter derzeit nicht verf\u00fcgbar"}</p>
            <p className="mt-1 text-sm font-semibold text-white/70">{error}</p>
          </div>
        ) : weather ? (
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)] lg:items-end">
            <div className="flex items-end gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-lg backdrop-blur-sm sm:h-28 sm:w-28">
                <ConditionIcon className={cn("h-14 w-14", presentation.accent)} strokeWidth={1.7} />
              </div>
              <div>
                <p className="text-6xl font-black leading-none tracking-tight sm:text-7xl">{roundedTemperature(weather.temperature)}</p>
                <p className="mt-3 text-xl font-black">{presentation.label}</p>
                <p className="mt-1 text-sm font-semibold text-white/70">{"Gef\u00fchlt wie "}{roundedTemperature(weather.apparentTemperature)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <ThermometerSun className="h-5 w-5 text-amber-200" />
                <p className="mt-4 text-xs font-black uppercase tracking-wider text-white/55">Heute</p>
                <p className="mt-1 text-lg font-black">{roundedTemperature(weather.high)} <span className="text-white/50">/ {roundedTemperature(weather.low)}</span></p>
              </div>
              <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <Wind className="h-5 w-5 text-cyan-200" />
                <p className="mt-4 text-xs font-black uppercase tracking-wider text-white/55">Wind</p>
                <p className="mt-1 text-lg font-black">{Math.round(weather.windSpeed)} <span className="text-xs text-white/60">km/h</span></p>
              </div>
              <div className="rounded-[1.35rem] border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <Droplets className="h-5 w-5 text-sky-200" />
                <p className="mt-4 text-xs font-black uppercase tracking-wider text-white/55">Feuchte</p>
                <p className="mt-1 text-lg font-black">{Math.round(weather.humidity)}<span className="text-xs text-white/60"> %</span></p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
