import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  Clock,
  CornerDownRight,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
  Plus,
  Share2,
  Sparkles,
  Star,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import DestinationMap from "@/components/guest/destination-map";

import {
  API_BASE_URL,
  fetchDestinationBySlug,
  type Destination,
} from "@/lib/destination-api";

import type { VisitRecord } from "@/lib/user-data";
import {
  addVisit,
  loadFavorites,
  loadVisited,
  removeVisit,
  updateFavorite,
} from "@/lib/user-data-api";

// Replies are nested inside reviews, so they need their own shape.
type ReviewReply = {
  id: number;
  user_id?: number;
  reply: string;
  created_at: string;
  user?: { name?: string };
};

// Describes the review data returned by the API.
type ReviewRecord = {
  id: number;
  user_id?: number;
  rating: number;
  comment: string;
  created_at: string;
  user?: { name?: string };
  replies?: ReviewReply[];
};

function DestinationDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // This page loads one destination from the API instead of a local list.
  const [destination, setDestination] = useState<Destination | null>(null);
  // Loading and error states give feedback while the request runs.
  const [loadingDestination, setLoadingDestination] = useState(true);
  const [destinationError, setDestinationError] = useState("");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [visitedMap, setVisitedMap] = useState<Record<string, VisitRecord>>({});
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [actionError, setActionError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");

  // Reply states
  const [replyingReviewId, setReplyingReviewId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [confirmDeleteReplyId, setConfirmDeleteReplyId] = useState<number | null>(null);

  const token = localStorage.getItem("asc_token");
  const storedEmail = localStorage.getItem("asc_user_email") || "";
  const isAdmin = storedEmail.includes("admin") || storedEmail === "admin@asasa-cordova.ph" || localStorage.getItem("asc_is_admin") === "true";
  const currentUserId = Number(localStorage.getItem("asc_user_id") || "0");

  // Account-only actions send guests to login and remember this detail page.
  function requireLogin(): boolean {
    if (token) return true;
    navigate("/login", { state: { from: location } });
    return false;
  }

  // useCallback keeps this request function stable until the slug changes.
  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/destinations/${slug}/reviews`, {
        headers: {
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  }, [slug]);

  // Saved places and visits belong to signed-in users; guests keep empty state.
  useEffect(() => {
    if (!token) return;

    loadFavorites().then(setFavorites).catch((error) => console.error(error));
    loadVisited().then(setVisitedMap).catch((error) => console.error(error));
  }, [token]);

  // active stops an older request from overwriting a newer destination.
  useEffect(() => {
    let active = true;

    const request = slug ? fetchDestinationBySlug(slug) : Promise.resolve(null);

    request
      .then((record) => {
        if (!active) return;
        setDestination(record);
        setDestinationError("");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setDestination(null);
        setDestinationError(
          requestError instanceof Error ? requestError.message : "Unable to load this destination."
        );
      })
      .finally(() => {
        if (active) setLoadingDestination(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  // Reload reviews when the slug changes and clear any open edit/delete forms.
  useEffect(() => {
    let active = true;

    if (slug) {
      fetch(`${API_BASE_URL}/api/destinations/${slug}/reviews`, {
        headers: { Accept: "application/json" },
      })
        .then((res) => (res.ok ? res.json() : Promise.resolve([])))
        .then((data: ReviewRecord[]) => {
          if (active) setReviews(data);
        })
        .catch((err) => console.error("Failed to fetch reviews", err));
    }

    const resetTimer = window.setTimeout(() => {
      setConfirmDeleteId(null);
      setEditingReviewId(null);
      setReplyingReviewId(null);
      setEditingReplyId(null);
      setConfirmDeleteReplyId(null);
      setReviewError("");
      setActionError("");
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(resetTimer);
    };
  }, [slug]);

  const isFavorited = slug ? favorites.includes(slug) : false;
  const visitRecord = slug ? visitedMap[slug] : undefined;
  const isVisited = !!visitRecord && visitRecord.count > 0;

  // Adds only real database ratings and divides by the number of reviews.
  const reviewCount = reviews.length;
  const averageRating = useMemo(() => {
    if (reviewCount === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / reviewCount).toFixed(1));
  }, [reviews, reviewCount]);

  // Show a simple skeleton while the destination request finishes.
  if (loadingDestination) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAF6F5] px-6 text-center">
        <Link
          to="/destinations"
          className="inline-flex items-center gap-2 rounded-full bg-[#800020] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#58111A]"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
          Back to Destinations
        </Link>
        <div className="mt-10 h-8 w-48 animate-pulse rounded bg-[#F2DCDA]" />
        <div className="mt-6 h-96 w-full max-w-4xl animate-pulse rounded-3xl bg-white" />
      </main>
    );
  }

  // Different message for a failed request versus a missing destination.
  if (!destination) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FAF6F5] px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
          Asa sa Cordova
        </p>
        <h1 className="mt-5 font-display text-3xl font-semibold text-[#58111A]">
          {destinationError ? "Destination Unavailable" : "Destination Not Found"}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#7A585B]">
          {destinationError ||
            "We couldn't find the destination you're looking for. It may not be available in our directory yet."}
        </p>
        <Link
          to="/destinations"
          className="mt-7 rounded-full bg-[#800020] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#58111A]"
        >
          Back to Destinations
        </Link>
      </main>
    );
  }

  async function handleToggleFavorite() {
    if (!slug || !requireLogin()) return;
    // The API returns the updated list, so replace local state with it.
    setFavorites(await updateFavorite(slug, !isFavorited));
  }

  async function handleToggleVisited() {
    if (!slug || !requireLogin()) return;
    // Adds or removes a visit depending on the current visited state.
    setVisitedMap(isVisited ? await removeVisit(slug) : await addVisit(slug));
  }

  async function handleRecordAnotherVisit() {
    if (!slug || !requireLogin()) return;
    // Adds one more visit even when the place is already marked visited.
    setVisitedMap({ ...(await addVisit(slug)) });
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewError("");

    if (!requireLogin()) return;

    if (!newComment.trim()) {
      setReviewError("Please write your review comment.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/destinations/${slug}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: newRating,
          comment: newComment,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review.");
      }

      setNewComment("");
      setNewRating(5);
      fetchReviews();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to submit review.");
    }
  }

  async function handleEditReviewSubmit(reviewId: number) {
    setActionError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/destination-reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to update review.");
      }

      setEditingReviewId(null);
      fetchReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update review.");
    }
  }

  async function handleDeleteReview(reviewId: number) {
    setActionError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/destination-reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Forbidden or failed to delete review.");
      }

      setConfirmDeleteId(null);
      fetchReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete review.");
    }
  }

  async function handleReplySubmit(reviewId: number) {
    setActionError("");
    if (!replyContent.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/destination-reviews/${reviewId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: replyContent }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to post reply.");
      }

      setReplyingReviewId(null);
      setReplyContent("");
      fetchReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to post reply.");
    }
  }

  async function handleEditReplySubmit(replyId: number) {
    setActionError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/destination-review-replies/${replyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply: editReplyContent }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to update reply.");
      }

      setEditingReplyId(null);
      fetchReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update reply.");
    }
  }

  async function handleDeleteReply(replyId: number) {
    setActionError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/destination-review-replies/${replyId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Forbidden or failed to delete reply.");
      }

      setConfirmDeleteReplyId(null);
      fetchReviews();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete reply.");
    }
  }

  const isRestaurant = destination.category === "Restaurant" || destination.category === "Food Park";
  const hasCoordinates = typeof destination.latitude === "number" && typeof destination.longitude === "number";

  return (
      <main className="min-h-screen bg-[#FAF6F5] text-[#292929]">
        {/* Hero Banner */}
        <section className="relative h-[65vh] min-h-[480px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#58111A] via-transparent to-black/60 z-20" />
          {destination.image && (
            <img
              src={destination.image}
              alt={destination.name}
              className="absolute inset-0 h-full w-full object-cover object-center scale-105 animate-fade-in"
            />
          )}

          <div className="absolute inset-x-0 top-0 z-40 mx-auto max-w-7xl px-6 pt-24 sm:px-10">
            <Link
              to="/destinations"
              className="inline-flex items-center gap-2 rounded-full bg-black/40 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-black/60 border border-white/30 shadow-lg"
            >
              <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
              <span>Back to Destinations</span>
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-7xl px-6 pb-12 sm:px-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#800020] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-md">
                {destination.category}
              </span>
              {isVisited && (
                <span className="rounded-full bg-emerald-600/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  <Check size={14} strokeWidth={2} aria-hidden="true" /> Visited {visitRecord && visitRecord.count > 1 ? `(${visitRecord.count}x)` : ""}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-md">
              {destination.name}
            </h1>

            <p className="mt-3 max-w-2xl text-base text-white/90 leading-relaxed sm:text-lg">
              {destination.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition shadow-lg ${
                  isFavorited
                    ? "bg-[#800020] text-white hover:bg-[#58111A]"
                    : "bg-white/20 text-white backdrop-blur-md hover:bg-white/30 border border-white/35"
                }`}
              >
                <Heart
                  size={18}
                  strokeWidth={2}
                  fill={isFavorited ? "currentColor" : "none"}
                  aria-hidden="true"
                />
                <span>{isFavorited ? "Saved in Favorites" : "Save to Favorites"}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleVisited}
                className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition shadow-lg ${
                  isVisited
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-white/20 text-white backdrop-blur-md hover:bg-white/30 border border-white/35"
                }`}
              >
                {isVisited ? (
                  <Check size={18} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <Plus size={18} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{isVisited ? "Marked as Visited" : "Mark as Visited"}</span>
              </button>

              {isVisited && (
                <button
                  type="button"
                  onClick={handleRecordAnotherVisit}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-3 text-xs font-medium text-white backdrop-blur-md hover:bg-white/20 border border-white/20"
                >
                  <Plus size={18} strokeWidth={2} aria-hidden="true" />
                  <span>Record Another Visit</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Overview & Highlights */}
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
                Destination Overview
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
                About {destination.name}
              </h2>
              <p className="mt-5 text-base leading-7 text-[#7A585B]">
                {destination.overview}
              </p>

              <div className="mt-8">
                <h3 className="font-display text-xl font-semibold text-[#58111A]">
                  Key Highlights
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {destination.highlights.map((highlight, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 rounded-2xl border border-[#EBD5D3] bg-white p-4 shadow-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF0F2] text-[#800020]">
                        <Check size={14} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className="text-sm font-medium text-[#292929]">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Facilities & Amenities */}
            <div className="rounded-3xl border border-[#EBD5D3] bg-white p-8 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
                Amenities & Services
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-[#58111A]">
                Available Facilities
              </h3>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {destination.facilities.map((facility, index) => (
                  <span
                    key={index}
                    className="rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-2.5 text-xs font-semibold text-[#292929] shadow-sm"
                  >
                    {facility}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-t border-[#EBD5D3] pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A585B]">
                  Visitor Tip
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#292929]">
                  Check operating hours and guidelines prior to visiting to make the most of your trip around Cordova!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Essential Information */}
        <section className="bg-white px-6 py-16 sm:px-10 lg:py-20 border-y border-[#EBD5D3]">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
              Quick Guide
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#58111A]">
              Essential Information
            </h2>
            <p className="mt-2 text-sm text-[#7A585B]">
              Check available schedule and visitor details before heading out.
            </p>

            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="Address / Location"
                value={destination.address}
                icon={MapPin}
              />
              <InfoCard
                label="Opening Time"
                value={destination.openingHours}
                icon={Clock}
              />
              <InfoCard
                label="Closing Time"
                value={destination.closingHours}
                icon={Clock}
              />
              <InfoCard
                label="Operating Days"
                value={destination.operatingDays}
                icon={CalendarDays}
              />
              <InfoCard
                label={isRestaurant ? "Rates / Additional Fees" : "Entrance Fee"}
                value={destination.entranceFee}
                icon={Banknote}
              />
              <InfoCard
                label="Contact Number"
                value={destination.contactNumber}
                icon={Phone}
              />
              {/* Official links are optional; InfoCard handles missing or invalid URLs. */}
              <InfoCard
                label="Official Website"
                value={destination.websiteUrl}
                icon={Globe}
                href={destination.websiteUrl}
              />
              <InfoCard
                label="Official Social Page"
                value={destination.socialUrl}
                icon={Share2}
                href={destination.socialUrl}
              />
            </div>

            {destination.locationNote && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">Location note</p>
                <p className="mt-2 text-sm leading-6 text-amber-800">{destination.locationNote}</p>
              </div>
            )}
          </div>
        </section>

        {/* Interactive Map */}
        <section className="px-6 py-16 sm:px-10 lg:py-20">
          <div className="mx-auto max-w-7xl">
            {hasCoordinates ? (
              <DestinationMap />
            ) : (
              <div className="rounded-3xl border border-[#EBD5D3] bg-white px-6 py-12 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
                  Location Information
                </p>
                <h2 className="mt-4 font-display text-2xl font-semibold text-[#58111A]">
                  Map Location Coming Soon
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#7A585B]">
                  The exact coordinates for this destination still need to be verified.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Photo Route Guide */}
        <section className="bg-white px-6 py-16 sm:px-10 lg:py-24 border-y border-[#EBD5D3]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#800020]">
                Travel Navigation
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
                Photo Route Guide
              </h2>
              <p className="max-w-2xl text-sm text-[#7A585B] leading-relaxed">
                Follow this sequential photo guide with step-by-step road instructions and visual landmarks leading toward {destination.name}.
              </p>
            </div>

            {destination.routeSteps && destination.routeSteps.length > 0 ? (
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {destination.routeSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="flex flex-col overflow-hidden rounded-3xl border border-[#EBD5D3] bg-[#FAF6F5] shadow-sm transition hover:shadow-md"
                  >
                    {step.image && (
                      <div className="relative h-48 w-full overflow-hidden bg-[#58111A]">
                        <img
                          src={step.image}
                          alt={`Step ${step.stepNumber}`}
                          className="h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                        />
                        <span className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white shadow-md">
                          {step.stepNumber}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">
                            Step {step.stepNumber}
                          </span>
                          <span className="text-xs text-[#7A585B]">• {step.landmark}</span>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#292929]">
                          {step.instruction}
                        </p>
                      </div>
                      {step.stepNumber < (destination.routeSteps?.length || 0) && (
                        <div className="mt-6 flex items-center justify-center text-[#800020]">
                          <ArrowDown size={18} strokeWidth={2} aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-[#EBD5D3] bg-[#FAF6F5] p-10 text-center">
                <p className="text-sm font-semibold text-[#58111A]">Route photos coming soon</p>
                <p className="mt-2 text-xs text-[#7A585B]">
                  Detailed road and landmark photographs for this route are currently being updated and verified.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Ratings & Reviews Section */}
        <section className="bg-gradient-to-b from-[#800020] to-[#58111A] px-6 py-16 text-white sm:px-10 lg:py-24 border-t-4 border-[#800020]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#800020]/30 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#F2DCDA] border border-[#800020]/50 mb-3">
                  <Star size={14} strokeWidth={2} aria-hidden="true" /> Visitor Feedback & Reviews
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-white">
                  Traveler Experiences
                </h2>
                <p className="mt-2 text-sm text-white/70 max-w-xl leading-relaxed">
                  Read authentic feedback or share your own personal experience visiting {destination.name}.
                </p>
              </div>

              {reviewCount > 0 && (
                <div className="flex items-center gap-5 rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-xl shadow-2xl">
                  <div className="text-center">
                    <p className="font-display text-5xl font-extrabold text-[#F2DCDA] tracking-tight">{averageRating}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/50">Average Rating</p>
                  </div>
                  <div className="border-l border-white/20 pl-5">
                    <div
                      className="flex items-center text-amber-400"
                      aria-label={`Average rating ${averageRating} out of 5`}
                    >
                      {/* Five icons are drawn; filled ones match the rounded average. */}
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          size={14}
                          strokeWidth={2}
                          fill={index < Math.round(averageRating) ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-white/95">Based on {reviewCount} traveler {reviewCount === 1 ? 'review' : 'reviews'}</p>
                  </div>
                </div>
              )}
            </div>

            {actionError && (
              <div className="mt-6 rounded-2xl bg-red-950/80 p-4 text-xs font-medium text-red-200 border border-red-500/40 shadow-lg flex items-center gap-3">
                <TriangleAlert size={18} strokeWidth={2} aria-hidden="true" className="shrink-0 text-red-400" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Reviews List & Form Grid */}
            <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">
                    Traveler Reviews ({reviewCount})
                  </h3>
                  <span className="text-xs text-white/50 font-medium">Verified Community Feedback</span>
                </div>

                {reviewCount > 0 ? (
                  reviews.map((rev) => {
                    const isOwner = token && rev.user_id === currentUserId;
                    const canModify = token && (isOwner || isAdmin);
                    const isEditing = editingReviewId === rev.id;
                    const isReplying = replyingReviewId === rev.id;

                    return (
                      <div
                        key={rev.id}
                        className="group rounded-3xl border border-white/15 bg-white/[0.04] p-7 backdrop-blur-md space-y-5 transition duration-300 hover:border-[#800020]/60 hover:bg-white/[0.07] shadow-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#800020]/45 text-sm font-bold text-[#F2DCDA] border border-[#800020]/60">
                              {(rev.user?.name || "T").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-display font-bold text-white text-base tracking-wide">{rev.user?.name || "Traveler"}</p>
                              <p className="text-[11px] text-white/50 font-medium">
                                {new Date(rev.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className="inline-flex items-center text-amber-400 bg-black/30 px-3 py-1 rounded-full border border-white/10"
                              aria-label={`Rating ${rev.rating} out of 5`}
                            >
                              {Array.from({ length: 5 }, (_, index) => (
                                <Star
                                  key={index}
                                  size={14}
                                  strokeWidth={2}
                                  fill={index < rev.rating ? "currentColor" : "none"}
                                  aria-hidden="true"
                                />
                              ))}
                            </span>
                            {canModify && !isEditing && (
                              <div className="flex items-center gap-2.5 pl-2 border-l border-white/20">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingReviewId(rev.id);
                                    setEditRating(rev.rating);
                                    setEditComment(rev.comment);
                                  }}
                                  className="text-xs text-[#F2DCDA] hover:text-white font-semibold transition bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(rev.id)}
                                  className="text-xs text-red-400 hover:text-red-300 font-semibold transition bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-500/30"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="space-y-4 rounded-2xl border border-white/20 bg-black/40 p-5 shadow-inner">
                            <div>
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
                                Update Rating
                              </label>
                              <select
                                value={editRating}
                                onChange={(e) => setEditRating(Number(e.target.value))}
                                className="w-full rounded-xl border border-white/20 bg-[#1e1e1e] px-4 py-2.5 text-xs font-medium text-white outline-none focus:border-[#800020]"
                              >
                                <option value={5}>★★★★★ (5/5) - Excellent</option>
                                <option value={4}>★★★★☆ (4/5) - Very Good</option>
                                <option value={3}>★★★☆☆ (3/5) - Good</option>
                                <option value={2}>★★☆☆☆ (2/5) - Fair</option>
                                <option value={1}>★☆☆☆☆ (1/5) - Poor</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/70 mb-1.5">
                                Update Review Comment
                              </label>
                              <textarea
                                value={editComment}
                                onChange={(e) => setEditComment(e.target.value)}
                                rows={3}
                                className="w-full rounded-xl border border-white/20 bg-black/30 p-3.5 text-xs text-white outline-none focus:border-[#800020]"
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => handleEditReviewSubmit(rev.id)}
                                className="rounded-xl bg-[#800020] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#58111A] shadow-md"
                              >
                                Save Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingReviewId(null)}
                                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20 border border-white/15"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed text-white/90 bg-black/20 p-4 rounded-2xl border border-white/5">{rev.comment}</p>
                        )}

                        {confirmDeleteId === rev.id && (
                          <div className="rounded-2xl border border-red-500/40 bg-red-950/80 p-5 shadow-xl animate-fade-in">
                            <p className="text-xs font-bold text-red-200">
                              Are you sure you want to permanently delete this review?
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => handleDeleteReview(rev.id)}
                                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700 shadow-md"
                              >
                                Yes, Delete Review
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20 border border-white/20"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Replies Thread */}
                        {rev.replies && rev.replies.length > 0 && (
                          <div className="mt-5 space-y-3.5 pl-5 sm:pl-7 border-l-2 border-[#800020]">
                            {rev.replies.map((reply: ReviewReply) => {
                              const isReplyOwner = token && reply.user_id === currentUserId;
                              const canModifyReply = token && (isReplyOwner || isAdmin);
                              const isEditingReply = editingReplyId === reply.id;

                              return (
                                <div key={reply.id} className="rounded-2xl bg-black/30 p-4.5 border border-white/10 shadow-inner space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#800020]/30 text-[#F2DCDA]">
                                        <CornerDownRight size={14} strokeWidth={2} aria-hidden="true" />
                                      </span>
                                      <p className="text-xs font-bold text-[#F2DCDA] tracking-wide">
                                        {reply.user?.name || "Traveler"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <p className="text-[10px] text-white/40 font-medium">
                                        {new Date(reply.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </p>
                                      {canModifyReply && !isEditingReply && (
                                        <div className="flex items-center gap-2 pl-2 border-l border-white/15">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingReplyId(reply.id);
                                              setEditReplyContent(reply.reply);
                                            }}
                                            className="text-[11px] text-[#F2DCDA] hover:text-white font-semibold transition"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDeleteReplyId(reply.id)}
                                            className="text-[11px] text-red-400 hover:text-red-300 font-semibold transition"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {isEditingReply ? (
                                    <div className="mt-2 space-y-2.5">
                                      <textarea
                                        value={editReplyContent}
                                        onChange={(e) => setEditReplyContent(e.target.value)}
                                        rows={2}
                                        className="w-full rounded-xl border border-white/20 bg-black/40 p-3 text-xs text-white outline-none focus:border-[#800020]"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleEditReplySubmit(reply.id)}
                                          className="rounded-lg bg-[#800020] px-3 py-1.5 text-[11px] font-bold text-white shadow"
                                        >
                                          Save Reply
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingReplyId(null)}
                                          className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] text-white border border-white/15"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-white/85 leading-relaxed pl-8">{reply.reply}</p>
                                  )}

                                  {confirmDeleteReplyId === reply.id && (
                                    <div className="mt-3 rounded-xl border border-red-400/30 bg-red-950/80 p-3.5 shadow-md">
                                      <p className="text-[11px] font-bold text-red-200">Permanently delete this reply?</p>
                                      <div className="mt-2.5 flex items-center gap-2.5">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteReply(reply.id)}
                                          className="rounded-lg bg-red-600 px-3 py-1 text-[11px] font-bold text-white shadow"
                                        >
                                          Delete
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteReplyId(null)}
                                          className="rounded-lg bg-white/10 px-3 py-1 text-[11px] text-white border border-white/15"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {token && !isReplying && (
                          <button
                            type="button"
                            onClick={() => setReplyingReviewId(rev.id)}
                            className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#F2DCDA] hover:text-white transition bg-white/5 px-3 py-1.5 rounded-xl border border-white/10"
                          >
                            <MessageCircle size={18} strokeWidth={2} aria-hidden="true" /> Reply to this review
                          </button>
                        )}

                        {isReplying && (
                          <div className="mt-4 rounded-2xl border border-white/20 bg-black/40 p-5 space-y-3.5 shadow-inner">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={2.5}
                              placeholder="Write a helpful reply or follow-up..."
                              className="w-full rounded-xl border border-white/20 bg-black/50 p-3.5 text-xs text-white outline-none focus:border-[#800020] placeholder:text-white/30"
                            />
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleReplySubmit(rev.id)}
                                className="rounded-xl bg-[#800020] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#58111A] shadow-md"
                              >
                                Post Reply
                              </button>
                              <button
                                type="button"
                                onClick={() => setReplyingReviewId(null)}
                                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20 border border-white/15"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-10 text-center text-white/60 space-y-3 backdrop-blur-md">
                    <p className="flex justify-center">
                      <Sparkles size={20} strokeWidth={2} aria-hidden="true" />
                    </p>
                    <p className="text-sm font-medium text-white">No reviews yet for {destination.name}.</p>
                    <p className="text-xs text-white/50 max-w-sm mx-auto">Be the first traveler to share your experience, tips, and ratings with the community!</p>
                  </div>
                )}
              </div>

              {/* Submit Review Form */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-8 backdrop-blur-xl shadow-2xl sticky top-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#800020] text-white shadow">
                    <PenLine size={18} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">Write a Review</h3>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">Rate your visit and share your feedback to help future travelers.</p>

                {token ? (
                  <form onSubmit={handleReviewSubmit} className="mt-6 space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                        Rating (1 to 5 Stars)
                      </label>
                      <select
                        value={newRating}
                        onChange={(e) => setNewRating(Number(e.target.value))}
                        className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3.5 text-sm font-semibold text-amber-400 outline-none focus:border-[#800020] shadow-inner"
                      >
                        <option value={5}>★★★★★ (5/5) - Excellent Experience</option>
                        <option value={4}>★★★★☆ (4/5) - Very Good</option>
                        <option value={3}>★★★☆☆ (3/5) - Good / Average</option>
                        <option value={2}>★★☆☆☆ (2/5) - Fair</option>
                        <option value={1}>★☆☆☆☆ (1/5) - Poor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-2">
                        Your Review / Experience
                      </label>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-[#800020] placeholder:text-white/30 shadow-inner"
                        placeholder="Describe what you enjoyed most, tips for visiting, or what to expect..."
                        required
                      />
                    </div>

                    {reviewError && (
                      <div className="rounded-xl bg-red-950/80 p-3.5 text-xs text-red-200 border border-red-500/40 font-medium">
                        {reviewError}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-[#800020] py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[#58111A] shadow-xl"
                    >
                      Submit Traveler Review
                    </button>
                  </form>
                ) : (
                  <div className="mt-6 rounded-2xl border border-white/20 bg-black/30 p-7 text-center space-y-4 shadow-inner">
                    <p className="text-xs text-white/80 leading-relaxed">You must be signed in to submit a review, rate destinations, and participate in discussions.</p>
                    <Link
                      to="/login"
                      className="inline-block rounded-2xl bg-[#800020] px-6 py-3 text-xs font-bold text-white transition hover:bg-white hover:text-[#58111A] shadow-md"
                    >
                      Sign In to Review
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 text-center sm:px-10">
          <Link
            to="/destinations"
            className="inline-flex items-center gap-3 rounded-full bg-[#800020] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#58111A]"
          >
            Explore More Destinations
            <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
        </section>
      </main>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  href?: string;
};

// Only http(s) links become clickable; plain text stays as text.
function isUsableLink(value?: string): boolean {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function InfoCard({ label, value, icon: Icon, href }: InfoCardProps) {
  // Missing values get a friendly placeholder instead of a blank card.
  const displayValue = value || "Not yet available";
  const link = href && isUsableLink(href) ? href.trim() : null;

  return (
    <div className="rounded-2xl border border-[#EBD5D3] bg-[#FAF6F5] p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0F2] text-[#800020]">
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#7A585B]">
        {label}
      </p>
      {/* Valid links open in a new tab; other values render as plain text. */}
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-start gap-1.5 break-all text-sm font-medium leading-6 text-[#800020] underline decoration-[#EBD5D3] underline-offset-2 transition hover:text-[#58111A]"
        >
          <span>{displayValue}</span>
          <ExternalLink size={14} strokeWidth={2} aria-hidden="true" className="mt-1 shrink-0" />
        </a>
      ) : (
        <p className="mt-2 break-words text-sm font-medium leading-6 text-[#292929]">
          {displayValue}
        </p>
      )}
    </div>
  );
}

export default DestinationDetailsPage;
