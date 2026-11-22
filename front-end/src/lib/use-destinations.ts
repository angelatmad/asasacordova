import { useCallback, useEffect, useState } from "react";
import { fetchDestinations, type Destination } from "@/lib/destination-api";

// Shared hook for pages that need the destination directory.
// It calls destination-api, which handles caching and Laravel requests.
export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Incrementing this counter triggers a fresh, uncached fetch.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Ignore results if the component was closed while the request was running.
    let active = true;

    // First load uses the cache; a reload (version > 0) asks Laravel again.
    fetchDestinations(version > 0)
      .then((records) => {
        if (active) {
          setDestinations(records);
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setDestinations([]);
          setError(requestError instanceof Error ? requestError.message : "Unable to load destinations.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // Cleanup prevents old responses from overwriting a newer page's state.
    return () => {
      active = false;
    };
  }, [version]);

  // Call reload after admin changes or when the user wants refreshed data.
  const reload = useCallback(() => {
    setLoading(true);
    setVersion((current) => current + 1);
  }, []);

  return { destinations, loading, error, reload };
}
