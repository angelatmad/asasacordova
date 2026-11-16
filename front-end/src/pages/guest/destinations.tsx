import { useMemo, useState } from "react";
import Navbar from "@/components/common/navbar";
import DestinationCard from "@/components/guest/destination-card";
import { destinations } from "@/lib/destinations";

const categories = [
  "All",
  "Resort",
  "Hotel",
  "Beach",
  "Restaurant",
  "Food Park",
  "Island",
  "Attraction",
  "Landmark",
];

function DestinationsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredDestinations = useMemo(() => {
    return destinations.filter((destination) => {
      const searchValue = search.toLowerCase().trim();

      const matchesSearch =
        destination.name.toLowerCase().includes(searchValue) ||
        destination.category.toLowerCase().includes(searchValue) ||
        destination.description.toLowerCase().includes(searchValue);

      const matchesCategory =
        activeCategory === "All" ||
        destination.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [search, activeCategory]);

  return (
    <main className="min-h-screen bg-[#FFFAF8]">
      <Navbar />

      {/* Page Header */}
      <section className="relative overflow-hidden bg-[#292929] px-6 pb-20 pt-40 text-white sm:px-10">
        <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#E8A0A0]/15 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-[#C96B6B]/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <span className="rounded-full bg-[#E8A0A0]/20 border border-[#E8A0A0]/40 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-[#FFF5F5] backdrop-blur-md">
            Discover Cordova
          </span>

          <h1 className="mt-5 font-display text-4xl font-semibold sm:text-5xl lg:text-6xl text-white">
            Explore Destinations
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
            Discover premier resorts, beaches, restaurants, islands, attractions,
            and hidden spots around Cordova, Cebu.
          </p>
        </div>
      </section>

      {/* Destination Listing */}
      <section className="px-6 py-16 sm:px-10 lg:py-20">
        <div className="mx-auto max-w-7xl">
          {/* Search */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#292929] sm:text-3xl">
                Find Your Next Destination
              </h2>

              <p className="mt-2 text-sm text-[#716767]">
                Browse coastal spots, restaurants, and attractions.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search destinations..."
                className="w-full rounded-2xl border border-[#F1E5DF] bg-white py-3.5 pl-12 pr-5 text-sm text-[#292929] outline-none transition placeholder:text-slate-400 focus:border-[#C96B6B] focus:ring-2 focus:ring-[#C96B6B]/10 shadow-sm"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="mt-8 flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-6 py-2.5 text-sm font-semibold transition shadow-sm ${
                  activeCategory === category
                    ? "bg-[#C96B6B] text-white"
                    : "border border-[#F1E5DF] bg-white text-[#716767] hover:border-[#C96B6B] hover:text-[#C96B6B]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="mb-6 mt-10">
            <p className="text-sm text-[#716767]">
              Showing{" "}
              <span className="font-semibold text-[#292929]">
                {filteredDestinations.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-[#292929]">
                {destinations.length}
              </span>{" "}
              destinations
            </p>
          </div>

          {/* Destination Cards */}
          {filteredDestinations.length > 0 ? (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDestinations.map((destination) => (
                <DestinationCard
                  key={destination.slug}
                  {...destination}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E8A0A0] bg-[#FFF5F5] px-6 py-16 text-center">
              <h3 className="font-display text-xl font-semibold text-[#292929]">
                No destinations found
              </h3>

              <p className="mt-2 text-sm text-[#716767]">
                Try another search term or category filter.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All");
                }}
                className="mt-5 rounded-full bg-[#C96B6B] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#292929]"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default DestinationsPage;