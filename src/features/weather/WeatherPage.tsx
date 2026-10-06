import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Moon,
  RefreshCw,
  Snowflake,
  Sun,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ApiError } from "../../api/errors";
import type { WeatherConditionCode, WeatherLocationSummary } from "./api";
import { useWeatherDetailQuery, useWeatherLocationsQuery } from "./queries";

type TemperatureUnit = "F" | "C";

function temperature(valueC: number, unit: TemperatureUnit): number {
  return unit === "F" ? valueC * 9 / 5 + 32 : valueC;
}

function formatTemperature(valueC: number, unit: TemperatureUnit): string {
  return `${Math.round(temperature(valueC, unit))}°${unit}`;
}

function formatTime(value: string, timezone: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(parsed);
}

function formatDateTime(value: string, timezone: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(parsed);
}

function formatForecastDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function locationLabel(location: WeatherLocationSummary): string {
  return `${location.city}, ${location.state}`;
}

function conditionIcon(code: WeatherConditionCode, isDay = true, size = 24) {
  const props = { size, strokeWidth: 1.8 };
  switch (code) {
    case "clear":
      return isDay ? <Sun {...props} /> : <Moon {...props} />;
    case "mostly_clear":
    case "partly_cloudy":
      return <CloudSun {...props} />;
    case "cloudy":
      return <Cloud {...props} />;
    case "fog":
      return <CloudFog {...props} />;
    case "drizzle":
    case "freezing_drizzle":
      return <CloudDrizzle {...props} />;
    case "rain":
    case "freezing_rain":
    case "rain_showers":
      return <CloudRain {...props} />;
    case "snow":
    case "snow_showers":
      return <CloudSnow {...props} />;
    case "snow_grains":
      return <Snowflake {...props} />;
    case "thunderstorm":
    case "thunderstorm_hail":
      return <CloudLightning {...props} />;
    default:
      return <CloudSun {...props} />;
  }
}

function weatherErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.kind === "unavailable") {
      const retry = error.retryAfterSeconds ? ` Retry in about ${error.retryAfterSeconds}s.` : "";
      return `Weather is temporarily unavailable.${retry}`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Unable to load weather data.";
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
          <Box minWidth={0}>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            <Typography variant="h4" fontWeight={850} mt={0.45} noWrap>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{detail}</Typography>
          </Box>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.2, bgcolor: "#FFF1F2", color: "primary.main", display: "grid", placeItems: "center", flexShrink: 0 }}>
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function WeatherPage() {
  const locations = useWeatherLocationsQuery();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [unit, setUnit] = useState<TemperatureUnit>("F");
  const detail = useWeatherDetailQuery(locationId);

  useEffect(() => {
    const available = locations.data?.data ?? [];
    if (!available.length) return;
    if (locationId && available.some((location) => location.id === locationId)) return;
    const primary = available.find((location) => location.primary) ?? available[0];
    setLocationId(primary.id);
  }, [locationId, locations.data]);

  const forecast = detail.data?.data;
  const selectedLocation = (locations.data?.data ?? []).find((item) => item.id === locationId);

  const hourlyChart = useMemo(() => {
    if (!forecast) return [];
    return forecast.hourly.map((item) => ({
      time: formatTime(item.at, forecast.location.timezone),
      temperature: Math.round(temperature(item.temperatureC, unit)),
      precipitation: Math.round(item.precipitationProbabilityPercent),
    }));
  }, [forecast, unit]);

  const refreshing = locations.isFetching || detail.isFetching;

  async function refresh() {
    await Promise.all([
      locations.refetch(),
      locationId ? detail.refetch() : Promise.resolve(),
    ]);
  }

  return (
    <Box className="modern-page">
      <Stack spacing={2.25}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "flex-end" }}>
          <Box>
            <Typography variant="overline" color="primary.main" fontWeight={800} sx={{ letterSpacing: ".12em" }}>
              Operations · Live data
            </Typography>
            <Typography variant="h4" fontWeight={850} sx={{ letterSpacing: "-.035em" }}>Weather</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 820 }}>
              Monitor the configured LA Z weather locations using the backend Weather V1 contract. Provider credentials and coordinates remain server-side; this panel only consumes normalized public forecast data.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={unit}
              onChange={(_, next: TemperatureUnit | null) => next && setUnit(next)}
              aria-label="Temperature unit"
            >
              <ToggleButton value="F">°F</ToggleButton>
              <ToggleButton value="C">°C</ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              disabled={refreshing}
              onClick={() => void refresh()}
              startIcon={refreshing ? <CircularProgress size={15} /> : <RefreshCw size={17} />}
            >
              Check now
            </Button>
          </Stack>
        </Stack>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
              <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 280 } }} disabled={locations.isLoading || !(locations.data?.data.length)}>
                <InputLabel id="weather-location-label">Location</InputLabel>
                <Select
                  labelId="weather-location-label"
                  label="Location"
                  value={locationId ?? ""}
                  onChange={(event) => setLocationId(String(event.target.value))}
                >
                  {(locations.data?.data ?? []).map((location) => (
                    <MenuItem key={location.id} value={location.id}>
                      {locationLabel(location)}{location.primary ? " · Primary" : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedLocation ? (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip size="small" icon={<MapPin size={14} />} label={`${selectedLocation.city}, ${selectedLocation.state}, ${selectedLocation.country}`} variant="outlined" />
                  <Chip size="small" label={selectedLocation.timezone} variant="outlined" />
                  {selectedLocation.primary ? <Chip size="small" color="primary" label="Primary" /> : null}
                </Stack>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        {locations.error ? <Alert severity="error">{weatherErrorMessage(locations.error)}</Alert> : null}
        {detail.error ? <Alert severity="error">{weatherErrorMessage(detail.error)}</Alert> : null}

        {forecast ? (
          <>
            {forecast.stale ? (
              <Alert severity="warning">
                The API is serving a bounded stale forecast because the upstream provider could not be refreshed. Last successful fetch: {formatDateTime(forecast.fetchedAt, forecast.location.timezone)}.
              </Alert>
            ) : null}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", xl: "repeat(4,minmax(0,1fr))" }, gap: 1.5 }}>
              <MetricCard
                label="Current temperature"
                value={formatTemperature(forecast.current.temperatureC, unit)}
                detail={`${forecast.current.conditionText} · ${forecast.current.isDay ? "Day" : "Night"}`}
                icon={conditionIcon(forecast.current.conditionCode, forecast.current.isDay, 21)}
              />
              <MetricCard
                label="Humidity"
                value={`${Math.round(forecast.current.humidityPercent)}%`}
                detail={`${forecast.current.precipitationMm.toFixed(1)} mm precipitation`}
                icon={<Droplets size={21} />}
              />
              <MetricCard
                label="Wind"
                value={`${Math.round(forecast.current.windKph)} km/h`}
                detail="Normalized backend value"
                icon={<Wind size={21} />}
              />
              <MetricCard
                label="Data state"
                value={forecast.stale ? "Stale" : "Fresh"}
                detail={`Fetched ${formatTime(forecast.fetchedAt, forecast.location.timezone)}`}
                icon={<RefreshCw size={21} />}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "minmax(0,1.05fr) minmax(0,1.95fr)" }, gap: 1.5 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
                <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
                  <Stack spacing={2.25}>
                    <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="flex-start">
                      <Box>
                        <Typography variant="overline" color="primary.main" fontWeight={800}>Now</Typography>
                        <Typography variant="h5" fontWeight={850}>{forecast.location.city}, {forecast.location.state}</Typography>
                        <Typography color="text.secondary" variant="body2">Observed {formatDateTime(forecast.observedAt, forecast.location.timezone)}</Typography>
                      </Box>
                      <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: "#FFF1F2", color: "primary.main", display: "grid", placeItems: "center" }}>
                        {conditionIcon(forecast.current.conditionCode, forecast.current.isDay, 34)}
                      </Box>
                    </Stack>

                    <Box>
                      <Typography sx={{ fontSize: { xs: 54, sm: 66 }, lineHeight: 1, fontWeight: 850, letterSpacing: "-.055em" }}>
                        {formatTemperature(forecast.current.temperatureC, unit)}
                      </Typography>
                      <Typography variant="h6" fontWeight={750} mt={1}>{forecast.current.conditionText}</Typography>
                    </Box>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">High</Typography>
                        <Typography fontWeight={800}>{formatTemperature(forecast.current.highC, unit)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Low</Typography>
                        <Typography fontWeight={800}>{formatTemperature(forecast.current.lowC, unit)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Rain</Typography>
                        <Typography fontWeight={800}>{forecast.current.precipitationMm.toFixed(1)} mm</Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 3, minWidth: 0 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Box>
                      <Typography variant="h6" fontWeight={850}>Next 24 hours</Typography>
                      <Typography variant="body2" color="text.secondary">Temperature and precipitation probability</Typography>
                    </Box>
                    <ThermometerSun size={21} />
                  </Stack>
                  <Box sx={{ width: "100%", height: 290 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={hourlyChart} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="time" minTickGap={22} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="temp" tick={{ fontSize: 11 }} width={42} unit={`°${unit}`} />
                        <YAxis yAxisId="rain" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} width={38} unit="%" />
                        <RechartsTooltip />
                        <Legend />
                        <Bar yAxisId="rain" dataKey="precipitation" name="Precipitation chance (%)" fill="#DCE8FF" radius={[4, 4, 0, 0]} />
                        <Area yAxisId="temp" type="monotone" dataKey="temperature" name={`Temperature (°${unit})`} stroke="#D30A12" fill="#FFF1F2" strokeWidth={2.5} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.75}>
                  <Box>
                    <Typography variant="h6" fontWeight={850}>5-day forecast</Typography>
                    <Typography variant="body2" color="text.secondary">Local dates for {forecast.location.timezone}</Typography>
                  </Box>
                  <CloudSun size={21} />
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))", lg: "repeat(5,minmax(0,1fr))" }, gap: 1.25 }}>
                  {forecast.daily.map((day) => (
                    <Box key={day.date} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5, p: 1.6, minWidth: 0 }}>
                      <Stack spacing={1.15}>
                        <Typography fontWeight={800}>{formatForecastDate(day.date)}</Typography>
                        <Box sx={{ color: "primary.main" }}>{conditionIcon(day.conditionCode, true, 27)}</Box>
                        <Typography variant="body2" fontWeight={700}>{day.conditionText}</Typography>
                        <Typography fontWeight={850}>{formatTemperature(day.highC, unit)} <Typography component="span" color="text.secondary" fontWeight={650}>/ {formatTemperature(day.lowC, unit)}</Typography></Typography>
                        <Stack direction="row" spacing={0.7} alignItems="center">
                          <CloudRain size={14} />
                          <Typography variant="caption">{Math.round(day.precipitationProbabilityPercent)}% · {day.precipitationMm.toFixed(1)} mm</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.7} alignItems="center">
                          <Wind size={14} />
                          <Typography variant="caption">{Math.round(day.windKph)} km/h max</Typography>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.25 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                  <Box>
                    <Typography fontWeight={850}>Source & freshness</Typography>
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      Observed {formatDateTime(forecast.observedAt, forecast.location.timezone)} · fetched {formatDateTime(forecast.fetchedAt, forecast.location.timezone)}. Weather V1 may serve bounded stale data during provider failures to protect availability and paid upstream usage.
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                    <Chip size="small" color={forecast.stale ? "warning" : "success"} label={forecast.stale ? "Stale fallback" : "Fresh API data"} />
                    <Chip size="small" variant="outlined" label="24 hourly" />
                    <Chip size="small" variant="outlined" label="5 daily" />
                  </Stack>
                </Stack>
                {forecast.attribution.length ? <Divider sx={{ my: 1.75 }} /> : null}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {forecast.attribution.map((item) => (
                    <Button key={`${item.text}-${item.url}`} component="a" href={item.url} target="_blank" rel="noreferrer" size="small" variant="text">
                      {item.text}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </>
        ) : null}

        {!forecast && !detail.error && (detail.isLoading || locations.isLoading) ? (
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ minHeight: 260, display: "grid", placeItems: "center" }}>
              <Stack spacing={1.5} alignItems="center">
                <CircularProgress size={30} />
                <Typography color="text.secondary">Loading Weather V1…</Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {!locations.isLoading && !locations.error && (locations.data?.data.length ?? 0) === 0 ? (
          <Alert severity="info">No weather locations are configured in this API environment.</Alert>
        ) : null}
      </Stack>
    </Box>
  );
}
