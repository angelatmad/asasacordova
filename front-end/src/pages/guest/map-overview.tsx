import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowRight,
  Bike,
  Car,
  ExternalLink,
  Footprints,
  LocateFixed,
  Search,
} from "lucide-react";
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
import type { Destination } from "@/lib/destination-api";
import { useDestinations } from "@/lib/use-destinations";

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
  // Map pins use published destinations from the API.
  const { destinations, loading: loadingDestinations } = useDestinations();
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

  // Only places with real latitude and longitude can be shown on the map.
  const verifiedDestinations = useMemo(() => {
    return destinations.filter(
      (item) =>
        typeof item.latitude === "number" &&
        typeof item.longitude === "number" &&
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
    );
  }, [destinations]);

  // Recalculate when API data arrives or the URL slug changes.
  const activeDestination: Destination | null = useMemo(() => {
    if (!selectedSlug) return verifiedDestinations[0] || null;
    return destinations.find((d) => d.slug === selectedSlug) || null;
  }, [selectedSlug, destinations, verifiedDestinations]);

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
    <main className="min-h-screen bg-[#FAF6F5]">
      <Navbar />

      {/* Hero Header */}
      <section className="relative overflow-hidden bg-[#58111A] px-6 pb-16 pt-36 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#800020]/10 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#F2DCDA]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#F2DCDA]">
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
                <Search size={16} strokeWidth={2} aria-hidden="true" />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search map destinations by name, category, or address..."
                className="w-full rounded-2xl border border-[#EBD5D3] bg-white py-4 pl-12 pr-5 text-sm text-[#292929] outline-none transition placeholder:text-slate-400 focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/10"
              />
            </div>

            <div className="text-sm font-medium text-[#7A585B]">
              {/* Wait for destination data before showing the mapped-place count. */}
              {loadingDestinations ? (
                "Loading mapped places..."
              ) : (
                <>
                  Showing <span className="font-bold text-[#292929]">{filteredDestinations.length}</span> of{" "}
                  <span className="font-bold text-[#292929]">{verifiedDestinations.length}</span> mapped places
                </>
              )}
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
                    ? "bg-[#800020] text-white shadow-md shadow-[#800020]/10"
                    : "border border-[#EBD5D3] bg-white text-[#7A585B] hover:border-[#800020] hover:text-[#800020]"
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
                          fillColor: isSelected ? "#800020" : "#800020",
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
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                              {dest.category}
                            </p>
                            <h3 className="font-display text-base font-semibold text-[#58111A]">
                              {dest.name}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-[#7A585B] line-clamp-2">
                              {dest.description}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                              <Link
                                to={`/destinations/${dest.slug}`}
                                className="rounded-lg bg-[#800020] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#58111A]"
                              >
                                View Details
                              </Link>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                  `${dest.name} ${dest.address}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-[#800020] hover:underline"
                              >
                                <span className="inline-flex items-center gap-1">
                                  Google Maps
                                  <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
                                </span>
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
                      fillColor: currentLocation ? "#2563EB" : "#800020",
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>Starting Point: {startingLabel}</Popup>
                  </CircleMarker>

                  {routeCoordinates.length > 1 && (
                    <Polyline
                      positions={routeCoordinates}
                      pathOptions={{ color: "#800020", weight: 5, opacity: 0.85 }}
                    />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Sidebar Controls & Route Summary */}
            <aside className="space-y-6">
              {/* Active Destination Card */}
              {activeDestination && (
                <div className="rounded-3xl border border-[#EBD5D3] bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#FFF0F2] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                      {activeDestination.category}
                    </span>
                    <Link
                      to={`/destinations/${activeDestination.slug}`}
                      className="text-xs font-semibold text-[#800020] hover:underline"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        View Full Details
                        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                      </span>
                    </Link>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-[#58111A]">
                    {activeDestination.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#7A585B]">
                    {activeDestination.address}
                  </p>

                  <div className="mt-5 border-t border-[#EBD5D3] pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#800020]">
                      Travel Mode
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {/* Icons replace emojis, but the values sent to routing stay the same. */}
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
                            className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                              travelMode === mode.value
                                ? "border-[#800020] bg-[#800020] text-white"
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
                  </div>

                  <div className="mt-5 border-t border-[#EBD5D3] pt-5">
                    <p className="text-xs font-semibold text-[#58111A]">Starting Location</p>
                    <p className="mt-1 text-xs text-[#7A585B]">{startingLabel}</p>

                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                        className="rounded-xl bg-[#800020] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-60"
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
                          onClick={resetStartLocation}
                          className="rounded-xl border border-[#EBD5D3] bg-white px-4 py-2 text-xs font-semibold text-[#7A585B] transition hover:bg-[#FAF6F5]"
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
                  <div className="mt-5 border-t border-[#EBD5D3] pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#800020]">
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
                          <p className="text-xs text-[#7A585B]">Calculating route...</p>
                        ) : routeError ? (
                          <p className="text-xs text-red-600">{routeError}</p>
                        ) : routeInfo ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-[#FAF6F5] p-3 text-center border border-[#EBD5D3]">
                              <p className="text-[10px] uppercase font-semibold text-[#7A585B]">Est. Time</p>
                              <p className="mt-1 text-lg font-bold text-[#58111A]">
                                {Math.max(1, Math.round(routeInfo.duration))} min
                              </p>
                            </div>
                            <div className="rounded-xl bg-[#FAF6F5] p-3 text-center border border-[#EBD5D3]">
                              <p className="text-[10px] uppercase font-semibold text-[#7A585B]">Distance</p>
                              <p className="mt-1 text-lg font-bold text-[#58111A]">
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
              <div className="rounded-3xl border border-[#EBD5D3] bg-white p-6 shadow-sm">
                <h3 className="font-display text-lg font-semibold text-[#58111A]">
                  All Mapped Places
                </h3>
                <p className="mt-1 text-xs text-[#7A585B]">
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
                            ? "border-[#800020] bg-[#FFF0F2]/50 shadow-sm"
                            : "border-[#EBD5D3] bg-[#FAF6F5]/50 hover:border-[#EBD5D3]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                            {dest.category}
                          </span>
                          {isSelected && (
                            <span className="rounded-full bg-[#800020] px-2 py-0.5 text-[9px] font-semibold text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 font-display text-sm font-semibold text-[#58111A]">
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
