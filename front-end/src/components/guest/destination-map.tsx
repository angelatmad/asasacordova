import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { destinations } from "@/lib/destinations";

type Coordinates = [number, number];
type TravelMode = "car" | "motorcycle" | "walking";

type RouteInfo = {
  distance: number;
  duration: number;
};

function MapViewport({
  destinationCoordinates,
  currentLocation,
  routeCoordinates,
}: {
  destinationCoordinates: Coordinates;
  currentLocation: Coordinates | null;
  routeCoordinates: Coordinates[];
}) {
  const map = useMap();

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

function decodePolyline(encoded: string): Coordinates[] {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([latitude / 1e6, longitude / 1e6]);
  }

  return coordinates;
}

function DestinationMap() {
  const { slug } = useParams();

  const destination = destinations.find((item) => item.slug === slug);

  const [travelMode, setTravelMode] = useState<TravelMode>("car");
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [startingAddressLabel, setStartingAddressLabel] = useState("Cordova Town Center (Default)");
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [routeError, setRouteError] = useState("");

  const defaultStartingPoint: Coordinates = [10.255, 123.945]; // Cordova center approx

  const effectiveStartLocation: Coordinates = currentLocation || defaultStartingPoint;

  const destinationCoordinates: Coordinates | null = useMemo(() => {
    return destination &&
      typeof destination.latitude === "number" &&
      typeof destination.longitude === "number" &&
      Number.isFinite(destination.latitude) &&
      Number.isFinite(destination.longitude)
      ? [destination.latitude, destination.longitude]
      : null;
  }, [destination]);

  const hasCoordinates = destinationCoordinates !== null;
  const isIsland = destination?.slug === "gilutongan-island";
  const isCclex = destination?.slug === "ccl-expressway";
  const canCalculateRoute = hasCoordinates && !isIsland && !isCclex;

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location services.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation([
          position.coords.latitude,
          position.coords.longitude,
        ]);
        setStartingAddressLabel("My Current GPS Location");
        setIsLocating(false);
      },
      (error) => {
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
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function resetToDefaultStart() {
    setCurrentLocation(null);
    setStartingAddressLabel("Cordova Town Center (Default)");
    setRouteCoordinates([]);
    setRouteInfo(null);
  }

  useEffect(() => {
    if (!destinationCoordinates || !canCalculateRoute) {
      return;
    }

    const controller = new AbortController();

    async function calculateRoute() {
      setIsRouting(true);
      setRouteError("");
      setRouteCoordinates([]);
      setRouteInfo(null);

      try {
        const [startLat, startLng] = effectiveStartLocation;
        const [endLat, endLng] = destinationCoordinates!;

        if (travelMode === "walking") {
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

          const response = await fetch(url, { signal: controller.signal });

          if (!response.ok) {
            throw new Error("Walking route is unavailable.");
          }

          const data = await response.json();

          if (!data.trip?.legs?.length) {
            throw new Error("No walking route was found.");
          }

          setRouteCoordinates(decodePolyline(data.trip.legs[0].shape));
          setRouteInfo({
            distance: data.trip.summary.length,
            duration: data.trip.summary.time / 60,
          });
        } else if (travelMode === "motorcycle") {
          // Using OSRM bike profile for motorcycle / bicycle path routing
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
              ([longitude, latitude]: [number, number]) => [
                latitude,
                longitude,
              ]
            )
          );
          setRouteInfo({
            distance: route.distance / 1000,
            duration: (route.duration / 60) * 0.9, // slightly quicker nimble estimate for motorcycle
          });
        } else {
          // Car driving profile
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
              ([longitude, latitude]: [number, number]) => [
                latitude,
                longitude,
              ]
            )
          );
          setRouteInfo({
            distance: route.distance / 1000,
            duration: route.duration / 60,
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setRouteError(
            "We couldn't calculate this route right now. Please try again later."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRouting(false);
        }
      }
    }

    calculateRoute();

    return () => controller.abort();
  }, [effectiveStartLocation, destinationCoordinates, canCalculateRoute, travelMode]);

  if (!destination) {
    return (
      <section className="rounded-2xl border border-[#F1E5DF] bg-white p-6">
        <h2 className="text-xl font-semibold text-[#292929]">
          Destination Not Found
        </h2>
        <p className="mt-2 text-sm text-[#716767]">
          We couldn't find the destination for this map.
        </p>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
          Explore the Location
        </p>
        <h2 className="mt-4 font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
          Find This Destination: {destination.name}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#716767]">
          View the exact location, switch travel modes, and check estimated travel times from your starting point.
        </p>
      </div>

      {!destinationCoordinates ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-[#292929]">
            Map Location Not Available Yet
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#716767]">
            The map location for {destination.name} is still being verified. We'll add its map pin once confirmed.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
          {/* Map & Controls Container (Left on Desktop, Top on Mobile) */}
          <div className="space-y-6">
            {/* Interactive Map */}
            <div className="overflow-hidden rounded-3xl border border-[#F1E5DF] shadow-xl">
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

                <MapViewport
                  destinationCoordinates={destinationCoordinates}
                  currentLocation={effectiveStartLocation}
                  routeCoordinates={routeCoordinates}
                />

                {/* Destination Marker */}
                <CircleMarker
                  center={destinationCoordinates}
                  radius={12}
                  pathOptions={{
                    color: "#FFFFFF",
                    weight: 3,
                    fillColor: "#C96B6B",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#C96B6B]">
                        {destination.category}
                      </p>
                      <h3 className="mt-1 font-semibold text-[#292929]">
                        {destination.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#716767]">
                        {destination.address}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>

                {/* Starting Point Marker */}
                <CircleMarker
                  center={effectiveStartLocation}
                  radius={10}
                  pathOptions={{
                    color: "#FFFFFF",
                    weight: 3,
                    fillColor: currentLocation ? "#2563EB" : "#C96B6B",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <p className="text-xs font-bold text-[#C96B6B]">Starting Point</p>
                      <p className="mt-1 text-xs text-[#716767]">{startingAddressLabel}</p>
                    </div>
                  </Popup>
                </CircleMarker>

                {routeCoordinates.length > 1 && (
                  <Polyline
                    positions={routeCoordinates}
                    pathOptions={{
                      color: "#C96B6B",
                      weight: 5,
                      opacity: 0.85,
                    }}
                  />
                )}
              </MapContainer>
            </div>


          </div>

          {/* Route Information Panel & Controls (Right on Desktop, Bottom on Mobile) */}
          <div className="space-y-6">
            {/* Travel Mode Selector */}
            <div className="rounded-3xl border border-[#F1E5DF] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C96B6B]">
                Navigation Controls
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#292929]">
                Select Travel Mode
              </h3>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  { value: "car", label: "🚗 Car" },
                  { value: "motorcycle", label: "🏍️ Moto" },
                  { value: "walking", label: "🚶 Walk" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setTravelMode(mode.value as TravelMode)}
                    className={`rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                      travelMode === mode.value
                        ? "border-[#C96B6B] bg-[#C96B6B] text-white shadow-md"
                        : "border-[#F1E5DF] bg-[#FFFAF8] text-[#716767] hover:border-[#C96B6B]"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Starting Location Actions */}
              <div className="mt-6 border-t border-[#F1E5DF] pt-5">
                <p className="text-xs font-semibold text-[#292929]">Starting Location</p>
                <p className="mt-1 text-xs text-[#716767]">{startingAddressLabel}</p>

                <div className="mt-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLocating}
                    className="w-full rounded-xl bg-[#292929] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#C96B6B] disabled:opacity-60"
                  >
                    {isLocating ? "Detecting GPS..." : "◎ Use My Current Location"}
                  </button>

                  {currentLocation && (
                    <button
                      type="button"
                      onClick={resetToDefaultStart}
                      className="w-full rounded-xl border border-[#F1E5DF] bg-white px-4 py-2.5 text-xs font-semibold text-[#716767] transition hover:bg-[#FFFAF8]"
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

            {/* Route Information Panel */}
            <div className="rounded-3xl border border-[#F1E5DF] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C96B6B]">
                Route Summary
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-[#292929]">
                Trip Information
              </h3>

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
                  <div className="flex items-center justify-between border-b border-[#F1E5DF] pb-3">
                    <span className="text-xs text-[#716767]">Mode</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C96B6B]">
                      {travelMode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-[#F1E5DF] pb-3">
                    <span className="text-xs text-[#716767]">Status</span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {isRouting ? "Calculating route..." : routeError ? "Routing unavailable" : "Ready"}
                    </span>
                  </div>

                  {routeError && (
                    <p className="text-xs text-red-600">{routeError}</p>
                  )}

                  {routeInfo && !isRouting && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-2xl bg-[#FFFAF8] p-4 text-center border border-[#F1E5DF]">
                        <p className="text-[10px] uppercase font-semibold text-[#716767]">Est. Time</p>
                        <p className="mt-1 text-xl font-bold text-[#292929]">
                          {Math.max(1, Math.round(routeInfo.duration))} min
                        </p>
                        <p className="mt-0.5 text-[9px] text-[#716767]">Estimate only</p>
                      </div>

                      <div className="rounded-2xl bg-[#FFFAF8] p-4 text-center border border-[#F1E5DF]">
                        <p className="text-[10px] uppercase font-semibold text-[#716767]">Distance</p>
                        <p className="mt-1 text-xl font-bold text-[#292929]">
                          {routeInfo.distance.toFixed(2)} km
                        </p>
                        <p className="mt-0.5 text-[9px] text-[#716767]">Road distance</p>
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

      <p className="mt-6 text-xs leading-5 text-[#716767]">
        Map data © OpenStreetMap contributors. Route estimates are provided by public routing services (OSRM & Valhalla) and may differ from actual traffic conditions.
      </p>
    </section>
  );
}

export default DestinationMap;
