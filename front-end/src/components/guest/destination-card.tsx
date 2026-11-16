import { useState, useMemo } from "react";
import { Link } from "react-router";
import { getFavorites, toggleFavorite, getReviews } from "@/lib/user-data";

type DestinationCardProps = {
  slug: string;
  name: string;
  category: string;
  image?: string;
  description: string;
};

function DestinationCard({
  slug,
  name,
  category,
  image,
  description,
}: DestinationCardProps) {
  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());
  const isFavorited = favorites.includes(slug);

  const reviews = useMemo(() => getReviews(slug), [slug]);
  const latestReview = reviews[0];

  function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleFavorite(slug);
    setFavorites(updated);
  }

  return (
    <Link
      to={`/destinations/${slug}`}
      className="group relative block min-w-0 cursor-pointer"
      aria-label={`View details for ${name}`}
    >
      <article className="relative h-[380px] overflow-hidden rounded-3xl bg-[#FFFAF8] border border-[#F1E5DF] shadow-md transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl sm:h-[410px]">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-x-0 top-0 h-48 flex items-center justify-center bg-gradient-to-br from-[#E8A0A0]/30 to-[#F1E5DF]">
            <span className="font-display text-5xl font-semibold text-[#292929]/20">
              {name.charAt(0)}
            </span>
            <span className="absolute bottom-4 text-[11px] uppercase tracking-widest text-[#716767]">
              Photo Coming Soon
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <span className="absolute left-4 top-4 z-10 rounded-full border border-white/40 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#292929] backdrop-blur-md shadow-sm">
          {category}
        </span>

        <button
          type="button"
          onClick={handleFavoriteClick}
          className={`absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition shadow-sm ${
            isFavorited
              ? "bg-[#FFF5F5] text-[#C96B6B] border border-[#E8A0A0]"
              : "bg-white/90 text-[#292929] hover:bg-[#FFF5F5] hover:text-[#C96B6B]"
          }`}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorited ? "❤️" : "🤍"}
        </button>

        <div className="absolute inset-x-0 bottom-0 top-48 bg-[#FFFAF8] p-4.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold leading-snug text-[#292929] line-clamp-1">
                {name}
              </h3>
              <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[#C96B6B]">
                <span className="text-amber-500">★★★★★</span>
                <span>(5.0)</span>
              </div>
            </div>

            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#716767]">
              {description}
            </p>

            {/* Visitor Feedback Quote Preview */}
            {latestReview && (
              <div className="mt-2.5 rounded-2xl bg-[#FFF5F5] border border-[#E8A0A0]/40 p-2.5 text-[11px] text-[#292929]">
                <div className="flex items-center justify-between text-[10px] font-semibold text-[#C96B6B] mb-0.5">
                  <span>"{latestReview.authorName}"</span>
                  <span className="text-amber-500">{"★".repeat(latestReview.rating)}</span>
                </div>
                <p className="line-clamp-1 italic text-[#716767]">
                  "{latestReview.comment}"
                </p>
              </div>
            )}
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
  );
}

export default DestinationCard;
