import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router";
import { Bike, Car, Footprints, LocateFixed } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDestinations } from "@/lib/use-destinations";

// Leaflet uses [latitude, longitude] pairs, so we reuse this shape everywhere.
type Coordinates = [number, number];
// Only these three transport options have buttons in the UI.
type TravelMode = "car" | "motorcycle" | "walking";

// API answers are converted to kilometers (distance) and minutes (duration).
type RouteInfo = {
  distance: number;
  duration: number;
};

// Invisible helper: it controls the map view but renders nothing on screen.
function MapViewport({
  destinationCoordinates,
  currentLocation,
  routeCoordinates,
}: {
  destinationCoordinates: Coordinates;
  currentLocation: Coordinates | null;
  routeCoordinates: Coordinates[];
}) {
  const map = useMap(); // Hook that gives us the Leaflet map object.

  // Re-center when inputs change: fit the route, or both pins, or just the place.
  // fitBounds picks a zoom level that keeps every given point on screen.
  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates, {
        padding: [45, 45],
      });
    } else if (currentLocation) {
      map.fitBounds([currentLocation, destinationCoordinates], {
        padding: [45, 45],
      });
    } else {
      map.setView(destinationCoordinates, 15);
    }
  }, [destinationCoordinates, currentLocation, routeCoordinates, map]);

  return null;
}

// Valhalla returns a compressed text path. Convert it to [lat, lng] points
// that Leaflet can draw as a line.
function decodePolyline(encoded: string): Coordinates[] {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    // Each character group stores a small change; add it to the running total.
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    // Odd bit means negative, so the value must be inverted.
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    // The API scales positions by 1,000,000 to store them as whole numbers.
    coordinates.push([latitude / 1e6, longitude / 1e6]);
  }

  return coordinates;
}

// Page section that shows the map pin, travel controls, and route summary.
function DestinationMap() {
  // The slug comes from the URL (/destinations/:slug) and picks this place.
  const { slug } = useParams();
  // Shared hook loads the destination list from cache or the API.
  const { destinations, loading } = useDestinations();

  // Match the URL slug to one record so we can use its saved coordinates.
  const destination = destinations.find((item) => item.slug === slug);

  // This state drives the UI: chosen transport, GPS start point, its label,
  // the drawn route line, and the distance/time shown to the visitor.
  const [travelMode, setTravelMode] = useState<TravelMode>("car");
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [startingAddressLabel, setStartingAddressLabel] = useState("Cordova Town Center (Default)");
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  // Loading flags show progress; error strings show friendly failure messages.
  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [routeError, setRouteError] = useState("");

  // Fallback start when GPS is not available: the town center.
  const defaultStartingPoint: Coordinates = [10.255, 123.945]; // Cordova center approx

  // Use the visitor's GPS if we have it, otherwise the default point.
  const effectiveStartLocation: Coordinates = currentLocation || defaultStartingPoint;

  // Only send valid numbers to Leaflet. useMemo repeats this check only when
  // the destination changes, not on every re-render.
  const destinationCoordinates: Coordinates | null = useMemo(() => {
    return destination &&
      typeof destination.latitude === "number" &&
      typeof destination.longitude === "number" &&
      Number.isFinite(destination.latitude) &&
      Number.isFinite(destination.longitude)
      ? [destination.latitude, destination.longitude]
      : null;
  }, [destination]);

  // An island needs a boat and CCLEX is a toll road, so normal road routing
  // cannot be calculated for them.
  const hasCoordinates = destinationCoordinates !== null;
  const isIsland = destination?.slug === "gilutongan-island";
  const isCclex = destination?.slug === "ccl-expressway";
  const canCalculateRoute = hasCoordinates && !isIsland && !isCclex;

  // User action: ask the browser for GPS and explain problems in plain language.
  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location services.");
      return;
    }

    // Show progress and clear any old message before asking.
    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Success: save [lat, lng] and update the label and loading flag.
        setCurrentLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
        setStartingAddressLabel("My Current GPS Location");
        setIsLocating(false);
      },
      (error) => {
        // Denied permission needs a different hint than a general GPS failure.
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location permission was denied. Please allow location access in your browser."
          );
        } else {
          setLocationError("We could not get your location. Please try again.");
        }
      },
      {
        // Ask for a fresh, accurate fix; do not reuse an old cached position.
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  // User action: clear GPS and the old route so the default town center is used.
  function resetToDefaultStart() {
    setCurrentLocation(null);
    setStartingAddressLabel("Cordova Town Center (Default)");
    setRouteCoordinates([]);
    setRouteInfo(null);
  }

  // Re-run whenever start point, destination, or travel mode changes.
  // The controller cancels the previous request so an old reply cannot
  // overwrite a newer route.
  useEffect(() => {
    if (!destinationCoordinates || !canCalculateRoute) {
      return;
    }

    const controller = new AbortController();

    async function calculateRoute() {
      // Clear old route and errors first so stale results are not displayed.
      setIsRouting(true);
      setRouteError("");
      setRouteCoordinates([]);
      setRouteInfo(null);

      try {
        // Split [lat, lng] pairs into named values for the API request.
        const [startLat, startLng] = effectiveStartLocation;
        const [endLat, endLng] = destinationCoordinates!;

        if (travelMode === "walking") {
          // Walking uses Valhalla. The request is JSON placed in the URL,
          // so encodeURIComponent keeps special characters safe.
          const request = {
            locations: [
              { lat: startLat, lon: startLng },
              { lat: endLat, lon: endLng },
            ],
            costing: "pedestrian",
            units: "kilometers",
          };

          const url =
            "https://valhalla1.openstreetmap.de/route?json=" +
            encodeURIComponent(JSON.stringify(request));

          // signal lets AbortController cancel this fetch if inputs change.
          const response = await fetch(url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error("Walking route is unavailable.");
          }

          const data = await response.json();

          if (!data.trip?.legs?.length) {
            throw new Error("No walking route was found.");
          }

          // The shape is compressed; decode it into points Leaflet can draw.
          setRouteCoordinates(decodePolyline(data.trip.legs[0].shape));
          setRouteInfo({
            distance: data.trip.summary.length,
            // Valhalla reports seconds; the card shows minutes.
            duration: data.trip.summary.time / 60,
          });
        } else if (travelMode === "motorcycle") {
          // OSRM expects "longitude,latitude" order. The bike profile is used
          // as a close public-route estimate for motorbikes.
          const url =
            `https://routing.openstreetmap.de/routed-bike/route/v1/driving/` +
            `${startLng},${startLat};${endLng},${endLat}` +
            `?overview=full&geometries=geojson`;

          const response = await fetch(url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error("Motorcycle route is unavailable.");
          }

          const data = await response.json();

          if (!data.routes?.length) {
            throw new Error("No motorcycle route was found.");
          }

          const route = data.routes[0];
          setRouteCoordinates(
            route.geometry.coordinates.map(
              // GeoJSON gives [lng, lat]; Leaflet wants [lat, lng].
              ([longitude, latitude]: [number, number]) => [
                latitude,
                longitude,
              ]
            )
          );
          setRouteInfo({
            // Meters -> km, seconds -> minutes; 0.9 adjusts for faster motorbikes.
            distance: route.distance / 1000,
            duration: (route.duration / 60) * 0.9,
          });
        } else {
          // Car routes use the public OSRM driving service.
          const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${startLng},${startLat};${endLng},${endLat}` +
            `?overview=full&geometries=geojson`;

          const response = await fetch(url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error("Driving route is unavailable.");
          }

          const data = await response.json();

          if (!data.routes?.length) {
            throw new Error("No road route was found.");
          }

          const route = data.routes[0];
          setRouteCoordinates(
            route.geometry.coordinates.map(
              // Same [lng, lat] -> [lat, lng] swap as the motorbike branch.
              ([longitude, latitude]: [number, number]) => [
                latitude,
                longitude,
              ]
            )
          );
          setRouteInfo({
            // Convert meters to km and seconds to minutes for the summary.
            distance: route.distance / 1000,
            duration: route.duration / 60,
          });
        }
      } catch (error) {
        // AbortError is expected when inputs change; only real errors show a message.
        if (error instanceof Error && error.name !== "AbortError") {
          setRouteError(
            "We couldn't calculate this route right now. Please try again later."
          );
        }
      } finally {
        // Stop the spinner unless this request was already cancelled.
        if (!controller.signal.aborted) {
          setIsRouting(false);
        }
      }
    }

    calculateRoute();

    // Cleanup before the next run: cancel the old fetch to avoid stale results.
    return () => controller.abort();
  }, [effectiveStartLocation, destinationCoordinates, canCalculateRoute, travelMode]);

  // While the list loads, show a shimmer placeholder instead of an empty map.
  if (loading) {
    return (
      <section className="rounded-2xl border border-[#EBD5D3] bg-white p-6">
        <div className="h-6 w-2/3 animate-pulse rounded bg-[#F2DCDA]" />
        <div className="mt-4 h-[450px] animate-pulse rounded-2xl bg-[#FAF6F5]" />
      </section>
    );
  }

  // A bad or unknown URL slug should show a message, not crash the page.
  if (!destination) {
    return (
      <section className="rounded-2xl border border-[#EBD5D3] bg-white p-6">
        <h2 className="text-xl font-semibold text-[#58111A]">
          Destination Not Found
        </h2>
        <p className="mt-2 text-sm text-[#7A585B]">
          We couldn't find the destination for this map.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
          Explore the Location
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
          Find This Destination: {destination.name}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#7A585B]">
          View the exact location, switch travel modes, and check estimated travel times from your starting point.
        </p>
      </div>

      {!destinationCoordinates ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-[#58111A]">
            Map Location Not Available Yet
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#7A585B]">
            The map location for {destination.name} is still being verified. We'll add its map pin once confirmed.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl border border-[#EBD5D3] shadow-xl">
              {/* MapContainer creates the map; TileLayer draws the street tiles. */}
              <MapContainer
                center={destinationCoordinates}
                zoom={15}
                scrollWheelZoom={true}
                className="h-[450px] w-full sm:h-[540px]"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Invisible helper keeps the view fitted when the route changes. */}
                <MapViewport
                  destinationCoordinates={destinationCoordinates}
                  currentLocation={effectiveStartLocation}
                  routeCoordinates={routeCoordinates}
                />

                {/* Maroon pin = destination; popup shows name and address. */}
                <CircleMarker
                  center={destinationCoordinates}
                  radius={12}
                  pathOptions={{
                    color: "#FFFFFF",
                    weight: 3,
                    fillColor: "#800020",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                        {destination.category}
                      </p>
                      <h3 className="mt-1 font-semibold text-[#58111A]">
                        {destination.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#7A585B]">
                        {destination.address}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>

                {/* Dark pin = starting point (GPS or default town center). */}
                <CircleMarker
                  center={effectiveStartLocation}
                  radius={10}
                  pathOptions={{
                    color: "#FFFFFF",
                    weight: 3,
                    fillColor: currentLocation ? "#800020" : "#58111A",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <p className="text-xs font-bold text-[#800020]">Starting Point</p>
                      <p className="mt-1 text-xs text-[#7A585B]">{startingAddressLabel}</p>
                    </div>
                  </Popup>
                </CircleMarker>

                {/* Draw the route only with at least two points; one point makes no line. */}
                {routeCoordinates.length > 1 && (
                  <Polyline
                    positions={routeCoordinates}
                    pathOptions={{
                      color: "#800020",
                      weight: 5,
                      opacity: 0.85,
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#EBD5D3] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#800020]">
                Navigation Controls
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#58111A]">
                Select Travel Mode
              </h3>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {/* Clicking a mode updates state; the route effect then fetches a new path. */}
                {[
                  { value: "car", label: "Car", icon: Car },
                  { value: "motorcycle", label: "Moto", icon: Bike },
                  { value: "walking", label: "Walk", icon: Footprints },
                ].map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setTravelMode(mode.value as TravelMode)}
                      className={`rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                        travelMode === mode.value
                          ? "border-[#800020] bg-[#800020] text-white shadow-md"
                          : "border-[#EBD5D3] bg-[#FAF6F5] text-[#7A585B] hover:border-[#800020]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon size={18} strokeWidth={2} aria-hidden="true" />
                        {mode.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-[#EBD5D3] pt-5">
                <p className="text-xs font-semibold text-[#58111A]">Starting Location</p>
                <p className="mt-1 text-xs text-[#7A585B]">{startingAddressLabel}</p>

                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="w-full rounded-xl bg-[#800020] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-60"
                  >
                    {isLocating ? (
                      "Detecting GPS..."
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <LocateFixed size={18} strokeWidth={2} aria-hidden="true" />
                        Use My Current Location
                      </span>
                    )}
                  </button>

                  {currentLocation && (
                    <button
                      type="button"
                      onClick={resetToDefaultStart}
                      className="w-full rounded-xl border border-[#EBD5D3] bg-white px-4 py-2.5 text-xs font-semibold text-[#7A585B] transition hover:bg-[#FAF6F5]"
                    >
                      Reset to Default Town Center
                    </button>
                  )}
                </div>

                {locationError && (
                  <p className="mt-3 text-xs text-red-600">{locationError}</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-[#EBD5D3] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#800020]">
                Route Summary
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#58111A]">
                Trip Information
              </h3>

              {/* Boat and expressway places cannot use normal road estimates. */}
              {isIsland && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-900">Island Destination Notice</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Gilutongan Island requires a boat transfer from Cordova ports. Standard road routing cannot be calculated directly onto the island.
                  </p>
                </div>
              )}

              {isCclex && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-900">Expressway Landmark Notice</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    CCLEX is a major toll expressway connecting Cebu City and Cordova. Direct road routes through the expressway toll gates are subject to traffic regulations.
                  </p>
                </div>
              )}

              {!isIsland && !isCclex && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EBD5D3] pb-3">
                    <span className="text-xs text-[#7A585B]">Mode</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
                      {travelMode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-[#EBD5D3] pb-3">
                    <span className="text-xs text-[#7A585B]">Status</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {isRouting ? "Calculating route..." : routeError ? "Routing unavailable" : "Ready"}
                    </span>
                  </div>

                  {routeError && (
                    <p className="text-xs text-red-600">{routeError}</p>
                  )}

                  {/* Show the finished estimate: minutes rounded to at least 1, km to 2 decimals. */}
                  {routeInfo && !isRouting && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-2xl bg-[#FAF6F5] p-4 text-center border border-[#EBD5D3]">
                        <p className="text-[10px] uppercase font-semibold text-[#7A585B]">Est. Time</p>
                        <p className="mt-1 text-xl font-bold text-[#58111A]">
                          {Math.max(1, Math.round(routeInfo.duration))} min
                        </p>
                        <p className="mt-0.5 text-[9px] text-[#7A585B]">Estimate only</p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF6F5] p-4 text-center border border-[#EBD5D3]">
                        <p className="text-[10px] uppercase font-semibold text-[#7A585B]">Distance</p>
                        <p className="mt-1 text-xl font-bold text-[#58111A]">
                          {routeInfo.distance.toFixed(2)} km
                        </p>
                        <p className="mt-0.5 text-[9px] text-[#7A585B]">Road distance</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {destination.locationNote && (
                <p className="mt-4 text-xs leading-5 text-amber-700">
                  Note: {destination.locationNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit the data providers and remind users estimates are not exact. */}
      <p className="mt-6 text-xs leading-5 text-[#7A585B]">
        Map data © OpenStreetMap contributors. Route estimates are provided by public routing services (OSRM & Valhalla) and may differ from actual traffic conditions.
      </p>
    </section>
  );
}

export default DestinationMap;
