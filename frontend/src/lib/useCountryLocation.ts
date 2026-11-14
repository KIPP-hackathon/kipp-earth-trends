import { useCallback, useEffect, useRef, useState } from "react";
import { brazilCountry, countryAt } from "./countries";
import type { CountrySelection } from "./countries";

export type CountryLocationStatus =
  "locating" | "detected" | "denied" | "unavailable";

type LocationResult = {
  country: CountrySelection;
  status: Exclude<CountryLocationStatus, "locating">;
};

// Share only an in-flight request, so React StrictMode does not prompt twice.
// No position is cached here: the promise resolves to country metadata only.
let pendingLocation: Promise<LocationResult> | null = null;

function locateCountry(): Promise<LocationResult> {
  if (pendingLocation) return pendingLocation;
  pendingLocation = new Promise<LocationResult>((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ country: brazilCountry, status: "unavailable" });
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Coordinates live only in this callback and the local geometry test.
          // Never persist, log, send to the API/LLM, or put them in a URL.
          void countryAt(
            position.coords.longitude,
            position.coords.latitude,
          ).then(
            (country) =>
              resolve({
                country: country ?? brazilCountry,
                status: country ? "detected" : "unavailable",
              }),
            () => resolve({ country: brazilCountry, status: "unavailable" }),
          );
        },
        (error) =>
          resolve({
            country: brazilCountry,
            status: error.code === 1 ? "denied" : "unavailable",
          }),
        { enableHighAccuracy: false, timeout: 8_000, maximumAge: 3_600_000 },
      );
    } catch {
      resolve({ country: brazilCountry, status: "unavailable" });
    }
  }).finally(() => {
    pendingLocation = null;
  });
  return pendingLocation;
}

/**
 * Request browser permission on entry; render Brazil while the request resolves.
 * Consumers must guard against applying a late result after manual selection.
 */
export function useCountryLocation() {
  const [country, setCountry] = useState(brazilCountry);
  const [status, setStatus] = useState<CountryLocationStatus>("locating");
  const mounted = useRef(false);
  const generation = useRef(0);

  const requestLocation = useCallback(() => {
    const request = ++generation.current;
    setStatus("locating");
    void locateCountry().then((result) => {
      if (!mounted.current || request !== generation.current) return;
      setCountry(result.country);
      setStatus(result.status);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    requestLocation();
    return () => {
      mounted.current = false;
      generation.current += 1;
    };
  }, [requestLocation]);

  return { country, status, requestLocation };
}
