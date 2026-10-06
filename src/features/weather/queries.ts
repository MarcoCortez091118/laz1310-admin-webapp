import { useQuery } from "@tanstack/react-query";
import { getWeather, getWeatherLocations, weatherQueryKeys } from "./api";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useWeatherLocationsQuery() {
  return useQuery({
    queryKey: weatherQueryKeys.locations,
    queryFn: ({ signal }) => getWeatherLocations(signal),
    retry: false,
    staleTime: FIVE_MINUTES,
    refetchOnWindowFocus: false,
  });
}

export function useWeatherDetailQuery(locationId: string | null) {
  return useQuery({
    queryKey: locationId ? weatherQueryKeys.detail(locationId) : ["weather", "detail", "none"],
    queryFn: ({ signal }) => getWeather(locationId ?? "", signal),
    enabled: Boolean(locationId),
    retry: false,
    staleTime: 60_000,
    refetchInterval: FIVE_MINUTES,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });
}
