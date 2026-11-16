import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/common/navbar";
import { destinations, type Destination } from "@/lib/destinations";

type Coordinates = [number, number];
type TravelMode = "car" | "motorcycle" | "walking";

type RouteInfo = {
  distance: number;
  duration: number;
};

const categories = [
  "All",
  "Beach & Resort",
  "Restaurant",
  "Cafe",
  "Tourist Attractions",
  "Resort",
  "Hotel",
  "Beach",
  "Food Park",
  "Island",
  "Attraction",
  "Landmark",
];

function MapViewport({
  destinationCoordinates,
  currentLocation,
  routeCoordinates,
}: {
  destinationCoordinates: Coordinates | null;
  currentLocation: Coordinates | null;
  routeCoordinates: Coordinates[];
}) {
  const map = useMap();

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      map.fitBounds(routeCoordinates, {
        padding: [45, 45],
      });
    } else if (currentLocation && destinationCoordinates) {
      map.fitBounds([currentLocation, destinationCoordinates], {
        padding: [45, 45],
      });
    } else if (destinationCoordinates) {
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

function CentralMapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSlug = searchParams.get("slug");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [travelMode, setTravelMode] = useState<TravelMode>("car");
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [startingLabel, setStartingLabel] = useState("Cordova Town Center");
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [routeError, setRouteError] = useState("");

  const defaultStart: Coordinates = [10.255, 123.945];
  const effectiveStart: Coordinates = currentLocation || defaultStart;

  const verifiedDestinations = useMemo(() => {
    return destinations.filter(
      (item) =>
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
    );
  }, []);

  const activeDestination: Destination | null = useMemo(() => {
    if (!selectedSlug) return verifiedDestinations[0] || null;
    return destinations.find((d) => d.slug === selectedSlug) || null;
  }, [selectedSlug, verifiedDestinations]);

  const destinationCoordinates: Coordinates | null = useMemo(() => {
    return activeDestination &&
      typeof activeDestination.latitude === "number" &&
      typeof activeDestination.longitude === "number"
      ? [activeDestination.latitude, activeDestination.longitude]
      : null;
  }, [activeDestination]);

  const isIsland = activeDestination?.slug === "gilutongan-island";
  const isCclex = activeDestination?.slug === "ccl-expressway";
  const canCalculateRoute = destinationCoordinates !== null && !isIsland && !isCclex;

  const filteredDestinations = useMemo(() => {
    return verifiedDestinations.filter((destination) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        destination.name.toLowerCase().includes(searchValue) ||
        destination.category.toLowerCase().includes(searchValue) ||
        destination.description.toLowerCase().includes(searchValue) ||
        destination.address.toLowerCase().includes(searchValue);

      let matchesCategory = true;
      if (activeCategory === "Beach & Resort") {
        matchesCategory =
          destination.category === "Beach" ||
          destination.category === "Resort";
      } else if (activeCategory === "Tourist Attractions") {
        matchesCategory =
          destination.category === "Attraction" ||
          destination.category === "Island" ||
          destination.category === "Landmark";
      } else if (activeCategory !== "All") {
        matchesCategory = destination.category === activeCategory;
      }

      return matchesSearch && matchesCategory;
    });
  }, [verifiedDestinations, search, activeCategory]);

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError("Browser does not support geolocation.");
      return;
    }
    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
        setStartingLabel("My Current GPS Location");
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied.");
        } else {
          setLocationError("Unable to retrieve location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function resetStartLocation() {
    setCurrentLocation(null);
    setStartingLabel("Cordova Town Center");
    setRouteCoordinates([]);
    setRouteInfo(null);
  }

  // Calculate route between effectiveStart and destinationCoordinates
  useEffect(() => {
    if (!destinationCoordinates || !canCalculateRoute) {
      return;
    }

    const controller = new AbortController();

    async function fetchRoute() {
      setIsRouting(true);
      setRouteError("");
      setRouteCoordinates([]);
      setRouteInfo(null);

      try {
        const [startLat, startLng] = effectiveStart;
        const [endLat, endLng] = destinationCoordinates!;

        if (travelMode === "walking") {
          const req = {
            locations: [
              { lat: startLat, lon: startLng },
              { lat: endLat, lon: endLng },
            ],
            costing: "pedestrian",
            units: "kilometers",
          };
          const url =
            "https://valhalla1.openstreetmap.de/route?json=" +
            encodeURIComponent(JSON.stringify(req));

          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error("Walking route unavailable.");
          const data = await res.json();
          if (!data.trip?.legs?.length) throw new Error("No walking route found.");

          setRouteCoordinates(decodePolyline(data.trip.legs[0].shape));
          setRouteInfo({
            distance: data.trip.summary.length,
            duration: data.trip.summary.time / 60,
          });
        } else if (travelMode === "motorcycle") {
          const url =
            `https://routing.openstreetmap.de/routed-bike/route/v1/driving/` +
            `${startLng},${startLat};${endLng},${endLat}` +
            `?overview=full&geometries=geojson`;

          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error("Motorcycle route unavailable.");
          const data = await res.json();
          if (!data.routes?.length) throw new Error("No motorcycle route found.");

          const route = data.routes[0];
          setRouteCoordinates(
            route.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            )
          );
          setRouteInfo({
            distance: route.distance / 1000,
            duration: (route.duration / 60) * 0.9,
          });
        } else {
          const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${startLng},${startLat};${endLng},${endLat}` +
            `?overview=full&geometries=geojson`;

          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error("Driving route unavailable.");
          const data = await res.json();
          if (!data.routes?.length) throw new Error("No driving route found.");

          const route = data.routes[0];
          setRouteCoordinates(
            route.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            )
          );
          setRouteInfo({
            distance: route.distance / 1000,
            duration: route.duration / 60,
          });
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setRouteError("Unable to calculate route at this moment.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsRouting(false);
        }
      }
    }

    fetchRoute();
    return () => controller.abort();
  }, [effectiveStart, destinationCoordinates, canCalculateRoute, travelMode]);

  return (
    <main className="min-h-screen bg-[#F5F3ED]">
      <Navbar />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[#292929] px-6 pb-16 pt-36 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#C96B6B]/10 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#E8A0A0]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#E8A0A0]">
            Interactive Directory
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl lg:text-6xl">
            Central Navigation Map
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            Explore all registered destinations in Cordova on one interactive map. Search by name, filter by category, check travel times, and get directions.
          </p>
        </div>
      </section>

      {/* Map & Controls Section */}
      <section className="px-6 py-12 sm:px-10 lg:py-16">
        <div className="mx-auto max-w-7xl">
          {/* Search and Filters Bar */}
          <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="relative w-full">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search map destinations by name, category, or address..."
                className="w-full rounded-2xl border border-[#F1E5DF] bg-white py-4 pl-12 pr-5 text-sm text-[#292929] outline-none transition placeholder:text-slate-400 focus:border-[#C96B6B] focus:ring-2 focus:ring-[#C96B6B]/10"
              />
            </div>

            <div className="text-sm font-medium text-[#716767]">
              Showing <span className="font-bold text-[#292929]">{filteredDestinations.length}</span> of{" "}
              <span className="font-bold text-[#292929]">{verifiedDestinations.length}</span> mapped places
            </div>
          </div>

          {/* Category Pills */}
          <div className="mb-8 flex flex-wrap gap-2.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-5 py-2.5 text-xs font-semibold transition ${
                  activeCategory === cat
                    ? "bg-[#C96B6B] text-white shadow-md shadow-[#C96B6B]/10"
                    : "border border-[#F1E5DF] bg-white text-[#716767] hover:border-[#C96B6B] hover:text-[#C96B6B]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Main Layout: Map & Sidebar Controls (Side by Side on Desktop) */}
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
            {/* Map Container */}
            <div className="space-y-6">
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl">
                <MapContainer
                  center={destinationCoordinates || [10.255, 123.948]}
                  zoom={14}
                  scrollWheelZoom={true}
                  className="h-[520px] w-full sm:h-[680px]"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {destinationCoordinates && (
                    <MapViewport
                      destinationCoordinates={destinationCoordinates}
                      currentLocation={effectiveStart}
                      routeCoordinates={routeCoordinates}
                    />
                  )}

                  {filteredDestinations.map((dest) => {
                    if (typeof dest.latitude !== "number" || typeof dest.longitude !== "number") {
                      return null;
                    }
                    const isSelected = activeDestination?.slug === dest.slug;

                    return (
                      <CircleMarker
                        key={dest.slug}
                        center={[dest.latitude, dest.longitude]}
                        radius={isSelected ? 14 : 10}
                        pathOptions={{
                          color: "#FFFFFF",
                          weight: isSelected ? 4 : 2,
                          fillColor: isSelected ? "#D49B45" : "#C96B6B",
                          fillOpacity: 1,
                        }}
                        eventHandlers={{
                          click: () => setSearchParams({ slug: dest.slug }),
                        }}
                      >
                        <Popup>
                          <div className="min-w-[210px] p-1">
                            {dest.image && (
                              <img
                                src={dest.image}
                                alt={dest.name}
                                className="mb-3 h-28 w-full rounded-xl object-cover"
                              />
                            )}
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C96B6B]">
                              {dest.category}
                            </p>
                            <h3 className="font-display text-base font-semibold text-[#292929]">
                              {dest.name}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-[#716767] line-clamp-2">
                              {dest.description}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <Link
                                to={`/destinations/${dest.slug}`}
                                className="rounded-lg bg-[#C96B6B] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#292929]"
                              >
                                View Details
                              </Link>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  `${dest.name} ${dest.address}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#C96B6B] hover:underline"
                              >
                                Google Maps ↗
                              </a>
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}

                  {/* Starting Point Marker */}
                  <CircleMarker
                    center={effectiveStart}
                    radius={9}
                    pathOptions={{
                      color: "#FFFFFF",
                      weight: 3,
                      fillColor: currentLocation ? "#2563EB" : "#C96B6B",
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>Starting Point: {startingLabel}</Popup>
                  </CircleMarker>

                  {routeCoordinates.length > 1 && (
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{ color: "#C96B6B", weight: 5, opacity: 0.85 }}
                    />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Sidebar Controls & Route Summary */}
            <aside className="space-y-6">
              {/* Active Destination Card */}
              {activeDestination && (
                <div className="rounded-3xl border border-[#F1E5DF] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#FCEBEC] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#C96B6B]">
                      {activeDestination.category}
                    </span>
                    <Link
                      to={`/destinations/${activeDestination.slug}`}
                      className="text-xs font-semibold text-[#C96B6B] hover:underline"
                    >
                      View Full Details →
                    </Link>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-[#292929]">
                    {activeDestination.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#716767]">
                    {activeDestination.address}
                  </p>

                  <div className="mt-5 border-t border-[#F1E5DF] pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C96B6B]">
                      Travel Mode
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { value: "car", label: "🚗 Car" },
                        { value: "motorcycle", label: "🏍️ Moto" },
                        { value: "walking", label: "🚶 Walk" },
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => setTravelMode(mode.value as TravelMode)}
                          className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                            travelMode === mode.value
                              ? "border-[#C96B6B] bg-[#C96B6B] text-white"
                              : "border-[#F1E5DF] bg-[#FFFAF8] text-[#716767] hover:border-[#C96B6B]"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[#F1E5DF] pt-5">
                    <p className="text-xs font-semibold text-[#292929]">Starting Location</p>
                    <p className="mt-1 text-xs text-[#716767]">{startingLabel}</p>

                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                        className="rounded-xl bg-[#292929] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#C96B6B] disabled:opacity-60"
                      >
                        {isLocating ? "Detecting GPS..." : "◎ Use My Current Location"}
                      </button>

                      {currentLocation && (
                        <button
                          type="button"
                          onClick={resetStartLocation}
                          className="rounded-xl border border-[#F1E5DF] bg-white px-4 py-2 text-xs font-semibold text-[#716767] transition hover:bg-[#FFFAF8]"
                        >
                          Reset to Town Center
                        </button>
                      )}
                    </div>
                    {locationError && (
                      <p className="mt-2 text-xs text-red-600">{locationError}</p>
                    )}
                  </div>

                  {/* Route Summary Panel */}
                  <div className="mt-5 border-t border-[#F1E5DF] pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C96B6B]">
                      Route Summary
                    </p>

                    {isIsland && (
                      <p className="mt-2 text-xs leading-5 text-amber-700">
                        Gilutongan Island requires a boat transfer. Road routing cannot reach the island directly.
                      </p>
                    )}

                    {isCclex && (
                      <p className="mt-2 text-xs leading-5 text-amber-700">
                        CCLEX is an expressway landmark. Road routing is subject to toll regulations.
                      </p>
                    )}

                    {!isIsland && !isCclex && (
                      <div className="mt-3">
                        {isRouting ? (
                          <p className="text-xs text-[#716767]">Calculating route...</p>
                        ) : routeError ? (
                          <p className="text-xs text-red-600">{routeError}</p>
                        ) : routeInfo ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-[#FFFAF8] p-3 text-center border border-[#F1E5DF]">
                              <p className="text-[10px] uppercase font-semibold text-[#716767]">Est. Time</p>
                              <p className="mt-1 text-lg font-bold text-[#292929]">
                                {Math.max(1, Math.round(routeInfo.duration))} min
                              </p>
                            </div>
                            <div className="rounded-xl bg-[#FFFAF8] p-3 text-center border border-[#F1E5DF]">
                              <p className="text-[10px] uppercase font-semibold text-[#716767]">Distance</p>
                              <p className="mt-1 text-lg font-bold text-[#292929]">
                                {routeInfo.distance.toFixed(2)} km
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Destination Selector List */}
              <div className="rounded-3xl border border-[#F1E5DF] bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-semibold text-[#292929]">
                  All Mapped Places
                </h3>
                <p className="mt-1 text-xs text-[#716767]">
                  Select a destination to focus map & calculate route.
                </p>

                <div className="mt-4 max-h-[350px] space-y-2.5 overflow-y-auto pr-1">
                  {filteredDestinations.map((dest) => {
                    const isSelected = activeDestination?.slug === dest.slug;
                    return (
                      <button
                        key={dest.slug}
                        type="button"
                        onClick={() => setSearchParams({ slug: dest.slug })}
                        className={`w-full text-left rounded-2xl border p-3.5 transition ${
                          isSelected
                            ? "border-[#C96B6B] bg-[#FCEBEC]/50 shadow-sm"
                            : "border-[#F1E5DF] bg-[#FFFAF8]/50 hover:border-[#E8A0A0]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C96B6B]">
                            {dest.category}
                          </span>
                          {isSelected && (
                            <span className="rounded-full bg-[#C96B6B] px-2 py-0.5 text-[9px] font-semibold text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 font-display text-sm font-semibold text-[#292929]">
                          {dest.name}
                        </h4>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CentralMapPage;
