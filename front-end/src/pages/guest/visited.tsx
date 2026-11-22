import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/common/navbar";
import { useDestinations } from "@/lib/use-destinations";
import type { VisitRecord } from "@/lib/user-data";
import { loadVisited, removeVisit } from "@/lib/user-data-api";

function VisitedPage() {
  // Destinations and visit records load from separate APIs.
  const { destinations, loading } = useDestinations();
  const [visitedMap, setVisitedMap] = useState<Record<string, VisitRecord>>({});

  // Load visit records once when the page opens.
  useEffect(() => {
    loadVisited().then(setVisitedMap).catch((error) => console.error(error));
  }, []);

  // Match each saved slug with destination data, skipping deleted places.
  const visitedDestinations = useMemo(() => {
    return Object.keys(visitedMap)
      .map((slug) => {
        const dest = destinations.find((d) => d.slug === slug);
        const record = visitedMap[slug];
        return { dest, record };
      })
      .filter((item) => item.dest !== undefined);
  }, [destinations, visitedMap]);

  async function handleRemove(slug: string, e: React.MouseEvent) {
    // Prevent the card link from opening; remove the log through the API.
    e.preventDefault();
    e.stopPropagation();
    setVisitedMap(await removeVisit(slug));
  }

  // Adds all visit counts, so repeat visits are counted too.
  const totalVisitsCount = Object.values(visitedMap).reduce((acc, curr) => acc + curr.count, 0);

  return (
    <main className="min-h-screen bg-[#FAF6F5]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#58111A] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#800020]/30 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#800020]/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#800020]/40 border border-[#F2DCDA]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF0F2] backdrop-blur-md">
            Travel History & Log
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold sm:text-5xl lg:text-6xl text-white">
            My Visited Destinations
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            Track all the wonderful places you have explored across Cordova with recorded visit counts and dates.
          </p>

          <div className="mt-8 flex flex-wrap gap-6">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur-md">
              <p className="text-xs text-[#F2DCDA]">Places Explored</p>
              <p className="mt-1 font-display text-3xl font-bold">{visitedDestinations.length}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur-md">
              <p className="text-xs text-[#F2DCDA]">Total Recorded Visits</p>
              <p className="mt-1 font-display text-3xl font-bold">{totalVisitsCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          {/* Placeholder cards while the destination list loads. */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-3xl border border-[#EBD5D3] bg-white/70"
                />
              ))}
            </div>
          ) : visitedDestinations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visitedDestinations.map(({ dest, record }) => {
                if (!dest) return null;
                return (
                  <div
                    key={dest.slug}
                    className="flex flex-col justify-between rounded-3xl border border-[#EBD5D3] bg-white p-7 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-[#FFF0F2] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#800020] border border-[#EBD5D3]">
                          {dest.category}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemove(dest.slug, e)}
                          className="text-xs font-semibold text-[#800020] hover:text-[#58111A]"
                        >
                          Remove Log
                        </button>
                      </div>

                      <h3 className="mt-4 font-display text-2xl font-semibold text-[#58111A]">
                        {dest.name}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-[#800020]">
                        <Check size={14} strokeWidth={2} aria-hidden="true" /> Visited {record.count} {record.count === 1 ? "time" : "times"}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-[#7A585B] line-clamp-2">
                        {dest.description}
                      </p>

                      <p className="mt-4 text-xs text-[#7A585B]">
                        Last logged on: {record.lastVisitedDate || "Recent"}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-[#EBD5D3] pt-5">
                      <Link
                        to={`/destinations/${dest.slug}`}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#800020] hover:text-[#58111A]"
                      >
                        View Details & Log Another Visit <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#EBD5D3] bg-[#FFF0F2] px-6 py-20 text-center">
              <h3 className="font-display text-2xl font-semibold text-[#58111A]">
                No visited places recorded yet
              </h3>
              <p className="mt-2 text-sm text-[#7A585B] max-w-md mx-auto">
                When visiting any Cordova destination, open its details page and click "Mark as Visited" to build your travel log.
              </p>
              <Link
                to="/destinations"
                className="mt-6 inline-flex rounded-full bg-[#800020] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#58111A] shadow-md"
              >
                Browse Destinations
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default VisitedPage;
