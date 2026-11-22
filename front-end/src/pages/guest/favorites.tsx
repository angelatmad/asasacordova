import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Heart, Star } from "lucide-react";
import Navbar from "@/components/common/navbar";
import { useDestinations } from "@/lib/use-destinations";
import { loadFavorites, updateFavorite } from "@/lib/user-data-api";
import { getRatingSummary } from "@/lib/destination-api";

function FavoritesPage() {
  // Destinations and saved slugs are loaded from separate APIs.
  const { destinations, loading } = useDestinations();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load the saved slugs once when the page opens.
  useEffect(() => {
    loadFavorites().then(setFavorites).catch((error) => console.error(error));
  }, []);

  // Keep only destinations whose slug is in the favorites list.
  const favoritedDestinations = useMemo(() => {
    return destinations.filter((d) => favorites.includes(d.slug));
  }, [destinations, favorites]);

  async function handleToggle(slug: string, e: React.MouseEvent) {
    // Stop the card link from opening details; send the toggle to the API.
    e.preventDefault();
    e.stopPropagation();
    setFavorites(await updateFavorite(slug, !favorites.includes(slug)));
  }

  return (
    <main className="min-h-screen bg-[#FAF6F5]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#58111A] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#800020]/30 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#800020]/30 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#800020]/40 border border-[#F2DCDA]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF0F2] backdrop-blur-md">
            Saved Places
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold sm:text-5xl lg:text-6xl text-white">
            My Favorite Destinations
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            Quickly access all the Cordova destinations you have bookmarked for your itinerary.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 sm:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          {/* Placeholder cards while destinations are loading. */}
          {loading ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="h-[340px] animate-pulse rounded-3xl border border-[#EBD5D3] bg-white/70 sm:h-[370px]"
                />
              ))}
            </div>
          ) : favoritedDestinations.length > 0 ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoritedDestinations.map((destination) => {
                // Saved cards reuse the same real rating totals as the directory.
                const { count, average, hasReviews } = getRatingSummary(destination);

                return (
                <Link
                  key={destination.slug}
                  to={`/destinations/${destination.slug}`}
                  className="group relative block min-w-0"
                >
                  <article className="relative h-[340px] overflow-hidden rounded-3xl bg-[#FAF6F5] border border-[#EBD5D3] shadow-md transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl sm:h-[370px]">
                    {destination.image ? (
                      <img
                        src={destination.image}
                        alt={destination.name}
                        className="absolute inset-0 h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-x-0 top-0 h-48 flex items-center justify-center bg-gradient-to-br from-[#F2DCDA]/30 to-[#EBD5D3]">
                        <span className="font-display text-5xl font-semibold text-[#58111A]/20">
                          {destination.name.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    <span className="absolute left-4 top-4 z-10 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#58111A] backdrop-blur-md shadow-sm">
                      {destination.category}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleToggle(destination.slug, e)}
                      className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0F2] text-[#800020] border border-[#EBD5D3] backdrop-blur-md transition shadow-sm hover:scale-110"
                      aria-label="Remove from favorites"
                    >
                      <Heart size={18} strokeWidth={2} fill="currentColor" aria-hidden="true" />
                    </button>

                    <div className="absolute inset-x-0 bottom-0 top-48 bg-[#FAF6F5] p-4.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-base font-semibold leading-snug text-[#58111A] line-clamp-1">
                            {destination.name}
                          </h3>
                          {hasReviews ? (
                            <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[#800020]">
                              <span
                                className="flex items-center text-amber-500"
                                aria-label={`Average rating ${average} out of 5 from ${count} review${count === 1 ? "" : "s"}`}
                              >
                                {Array.from({ length: 5 }, (_, index) => (
                                  <Star
                                    key={index}
                                    size={14}
                                    strokeWidth={2}
                                    fill={index < Math.round(average) ? "currentColor" : "none"}
                                    aria-hidden="true"
                                  />
                                ))}
                              </span>
                              <span>({average.toFixed(1)})</span>
                              <span className="text-[10px] font-medium text-[#7A585B]">({count})</span>
                            </div>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold text-[#7A585B]">
                              No reviews yet
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#7A585B]">
                          {destination.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#EBD5D3]">
                        <span className="text-xs font-semibold text-[#800020] transition-all group-hover:translate-x-1 flex items-center gap-1.5">
                          View Details <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className="text-[11px] text-[#7A585B]">Cordova, Cebu</span>
                      </div>
                    </div>
                  </article>
                </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#EBD5D3] bg-[#FFF0F2] px-6 py-20 text-center">
              <h3 className="font-display text-2xl font-semibold text-[#58111A]">
                No favorite destinations yet
              </h3>
              <p className="mt-2 text-sm text-[#7A585B] max-w-md mx-auto">
                Browse our destinations and tap the heart icon on any destination card or detail page to save it to your favorites.
              </p>
              <Link
                to="/destinations"
                className="mt-6 inline-flex rounded-full bg-[#800020] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#58111A] shadow-md"
              >
                Explore Destinations
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default FavoritesPage;
