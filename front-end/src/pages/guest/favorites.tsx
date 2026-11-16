import { useState, useMemo } from "react";
import { Link } from "react-router";
import Navbar from "@/components/common/navbar";
import { destinations } from "@/lib/destinations";
import { getFavorites, toggleFavorite } from "@/lib/user-data";

function FavoritesPage() {
  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());

  const favoritedDestinations = useMemo(() => {
    return destinations.filter((d) => favorites.includes(d.slug));
  }, [favorites]);

  function handleToggle(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleFavorite(slug);
    setFavorites(updated);
  }

  return (
    <main className="min-h-screen bg-[#FFFAF8]">
      <Navbar />

      <section className="relative overflow-hidden bg-[#292929] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#E8A0A0]/15 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#C96B6B]/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#E8A0A0]/20 border border-[#E8A0A0]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF5F5] backdrop-blur-md">
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
          {favoritedDestinations.length > 0 ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {favoritedDestinations.map((destination) => (
                <Link
                  key={destination.slug}
                  to={`/destinations/${destination.slug}`}
                  className="group relative block min-w-0"
                >
                  <article className="relative h-[340px] overflow-hidden rounded-3xl bg-[#FFFAF8] border border-[#F1E5DF] shadow-md transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl sm:h-[370px]">
                    {destination.image ? (
                      <img
                        src={destination.image}
                        alt={destination.name}
                        className="absolute inset-0 h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-x-0 top-0 h-48 flex items-center justify-center bg-gradient-to-br from-[#E8A0A0]/30 to-[#F1E5DF]">
                        <span className="font-display text-5xl font-semibold text-[#292929]/20">
                          {destination.name.charAt(0)}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    <span className="absolute left-4 top-4 z-10 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#292929] backdrop-blur-md shadow-sm">
                      {destination.category}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleToggle(destination.slug, e)}
                      className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF5F5] text-red-600 border border-[#E8A0A0] backdrop-blur-md transition shadow-sm hover:scale-110"
                      aria-label="Remove from favorites"
                    >
                      ❤️
                    </button>

                    <div className="absolute inset-x-0 bottom-0 top-48 bg-[#FFFAF8] p-4.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-base font-semibold leading-snug text-[#292929] line-clamp-1">
                            {destination.name}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[#C96B6B]">
                            <span className="text-amber-500">★★★★★</span>
                            <span>(5.0)</span>
                          </div>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#716767]">
                          {destination.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F1E5DF]">
                        <span className="text-xs font-semibold text-[#C96B6B] transition-all group-hover:translate-x-1 flex items-center gap-1.5">
                          View Details <span aria-hidden="true">→</span>
                        </span>
                        <span className="text-[11px] text-[#716767]">Cordova, Cebu</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E8A0A0] bg-[#FFF5F5] px-6 py-20 text-center">
              <h3 className="font-display text-2xl font-semibold text-[#292929]">
                No favorite destinations yet
              </h3>
              <p className="mt-2 text-sm text-[#716767] max-w-md mx-auto">
                Browse our destinations and tap the heart icon on any destination card or detail page to save it to your favorites.
              </p>
              <Link
                to="/destinations"
                className="mt-6 inline-flex rounded-full bg-[#C96B6B] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#292929] shadow-md"
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
