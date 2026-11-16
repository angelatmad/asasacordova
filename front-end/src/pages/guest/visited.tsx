import { useState, useMemo } from "react";
import { Link } from "react-router";
import Navbar from "@/components/common/navbar";
import { destinations } from "@/lib/destinations";
import { getVisitedRecords, removeVisit } from "@/lib/user-data";

function VisitedPage() {
  const [visitedMap, setVisitedMap] = useState(() => getVisitedRecords());

  const visitedDestinations = useMemo(() => {
    return Object.keys(visitedMap)
      .map((slug) => {
        const dest = destinations.find((d) => d.slug === slug);
        const record = visitedMap[slug];
        return { dest, record };
      })
      .filter((item) => item.dest !== undefined);
  }, [visitedMap]);

  function handleRemove(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const updated = removeVisit(slug);
    setVisitedMap(updated);
  }

  const totalVisitsCount = Object.values(visitedMap).reduce((acc, curr) => acc + curr.count, 0);

  return (
    <main className="min-h-screen bg-[#FFFAF8]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#292929] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#E8A0A0]/15 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#C96B6B]/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#E8A0A0]/20 border border-[#E8A0A0]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF5F5] backdrop-blur-md">
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
              <p className="text-xs text-[#E8A0A0]">Places Explored</p>
              <p className="mt-1 font-display text-3xl font-bold">{visitedDestinations.length}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-4 backdrop-blur-md">
              <p className="text-xs text-[#E8A0A0]">Total Recorded Visits</p>
              <p className="mt-1 font-display text-3xl font-bold">{totalVisitsCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          {visitedDestinations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visitedDestinations.map(({ dest, record }) => {
                if (!dest) return null;
                return (
                  <div
                    key={dest.slug}
                    className="flex flex-col justify-between rounded-3xl border border-[#F1E5DF] bg-white p-7 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-[#FFF5F5] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C96B6B] border border-[#E8A0A0]/50">
                          {dest.category}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemove(dest.slug, e)}
                          className="text-xs font-semibold text-red-600 hover:text-red-800"
                        >
                          Remove Log
                        </button>
                      </div>

                      <h3 className="mt-4 font-display text-2xl font-semibold text-[#292929]">
                        {dest.name}
                      </h3>

                      <p className="mt-1 text-xs font-medium text-[#C96B6B]">
                        ✓ Visited {record.count} {record.count === 1 ? "time" : "times"}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-[#716767] line-clamp-2">
                        {dest.description}
                      </p>

                      <p className="mt-4 text-xs text-[#716767]">
                        Last logged on: {record.lastVisitedDate || "Recent"}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-[#F1E5DF] pt-5">
                      <Link
                        to={`/destinations/${dest.slug}`}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#C96B6B] hover:text-[#292929]"
                      >
                        View Details & Log Another Visit →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E8A0A0] bg-[#FFF5F5] px-6 py-20 text-center">
              <h3 className="font-display text-2xl font-semibold text-[#292929]">
                No visited places recorded yet
              </h3>
              <p className="mt-2 text-sm text-[#716767] max-w-md mx-auto">
                When visiting any Cordova destination, open its details page and click "Mark as Visited" to build your travel log.
              </p>
              <Link
                to="/destinations"
                className="mt-6 inline-flex rounded-full bg-[#C96B6B] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#292929] shadow-md"
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
