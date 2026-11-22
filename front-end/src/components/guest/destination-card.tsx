import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowRight, Heart, Star } from "lucide-react";
import { loadFavorites, updateFavorite } from "@/lib/user-data-api";
import { getRatingSummary } from "@/lib/destination-api";

// Props are the values the parent page gives this card for one destination.
type DestinationCardProps = {
  slug: string;
  name: string;
  category: string;
  image?: string;
  description: string;
  reviewsCount: number;
  averageRating: number;
};

// One clickable card that links to the destination's detail page.
function DestinationCard({
  slug,
  name,
  category,
  image,
  description,
  reviewsCount,
  averageRating,
}: DestinationCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // State holds the slugs the visitor favorited; changing it re-renders the heart.
  const [favorites, setFavorites] = useState<string[]>([]);
  // Derived value, not extra state: check the list instead of storing a second copy.
  const isFavorited = favorites.includes(slug);
  const token = localStorage.getItem("asc_token");

  // Only signed-in users have server favorites; guests keep the empty initial state.
  useEffect(() => {
    if (!token) return;

    loadFavorites().then(setFavorites).catch((error) => console.error(error));
  }, [token]);

  // Ratings come from Laravel's review totals, not from sample data.
  const { count, average, hasReviews } = getRatingSummary({
    reviewsCount,
    averageRating,
  });

  // Heart action: stop the Link behind it from opening the details page.
  // updateFavorite calls Laravel with the auth token when signed in, otherwise
  // it changes localStorage; the returned list becomes the new state.
  async function handleFavoriteClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Favorites are member-only; guests go to login and return to this page.
    if (!token) {
      navigate("/login", { state: { from: location } });
      return;
    }

    setFavorites(await updateFavorite(slug, !isFavorited));
  }

  return (
    // The whole card is a route link; the slug in the URL identifies this place.
    <Link
      to={`/destinations/${slug}`}
      className="group relative block min-w-0 cursor-pointer"
      aria-label={`View details for ${name}`}
    >
      <article className="relative h-[380px] overflow-hidden rounded-3xl bg-[#FAF6F5] border border-[#EBD5D3] shadow-md transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl sm:h-[410px]">
        {/* If no photo exists, show the first letter so the card still looks complete. */}
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="absolute inset-0 h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-x-0 top-0 h-48 flex items-center justify-center bg-gradient-to-br from-[#800020]/20 to-[#EBD5D3]">
            <span className="font-display text-5xl font-semibold text-[#58111A]/20">
              {name.charAt(0)}
            </span>
            <span className="absolute bottom-4 text-[11px] uppercase tracking-widest text-[#7A585B]">
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
              ? "bg-[#FFF0F2] text-[#800020] border border-[#EBD5D3]"
              : "bg-white/90 text-[#292929] hover:bg-[#FFF0F2] hover:text-[#800020]"
          }`}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={18}
            strokeWidth={2}
            fill={isFavorited ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>

        <div className="absolute inset-x-0 bottom-0 top-48 bg-[#FAF6F5] p-4.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold leading-snug text-[#58111A] line-clamp-1">
                {name}
              </h3>
              {hasReviews ? (
                <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-[#800020]">
                  <span
                    className="inline-flex items-center text-amber-500"
                    aria-label={`Average rating ${average} out of 5 from ${count} review${count === 1 ? "" : "s"}`}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={16}
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
              {description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#EBD5D3]">
            <span className="text-xs font-semibold text-[#800020] transition-all group-hover:translate-x-1 flex items-center gap-1.5">
              View Details <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="text-[11px] text-[#7A585B]">Cordova, Cebu</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default DestinationCard;
