import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "react-router";
import DestinationMap from "@/components/guest/destination-map";
import { destinations } from "@/lib/destinations";
import {
  getFavorites,
  toggleFavorite,
  getVisitedRecords,
  recordVisit,
  removeVisit,
} from "@/lib/user-data";

function DestinationDetailsPage() {
  const { slug } = useParams();

  const destination = destinations.find((item) => item.slug === slug);

  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());
  const [visitedMap, setVisitedMap] = useState(() => getVisitedRecords());
  const [reviews, setReviews] = useState<any[]>([]);
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

  useEffect(() => {
    if (slug) {
      fetchReviews();
    }
    setConfirmDeleteId(null);
    setEditingReviewId(null);
    setReplyingReviewId(null);
    setEditingReplyId(null);
    setConfirmDeleteReplyId(null);
    setReviewError("");
    setActionError("");
  }, [slug]);

  async function fetchReviews() {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/destinations/${slug}/reviews`, {
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
  }

  const isFavorited = slug ? favorites.includes(slug) : false;
  const visitRecord = slug ? visitedMap[slug] : undefined;
  const isVisited = !!visitRecord && visitRecord.count > 0;

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews]);

  if (!destination) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFAF8] px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
          Asa sa Cordova
        </p>
        <h1 className="mt-5 font-display text-3xl font-semibold text-[#292929]">
          Destination Not Found
        </h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-[#716767]">
          We couldn't find the destination you're looking for. It may not be available in our directory yet.
        </p>
        <Link
          to="/destinations"
          className="mt-7 rounded-full bg-[#C96B6B] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#292929]"
        >
          Back to Destinations
        </Link>
      </main>
    );
  }

  function handleToggleFavorite() {
    if (!slug) return;
    const updated = toggleFavorite(slug);
    setFavorites(updated);
  }

  function handleToggleVisited() {
    if (!slug) return;
    if (isVisited) {
      const updated = removeVisit(slug);
      setVisitedMap(updated);
    } else {
      const updated = recordVisit(slug);
      setVisitedMap(updated);
    }
  }

  function handleRecordAnotherVisit() {
    if (!slug) return;
    const updated = recordVisit(slug);
    setVisitedMap({ ...updated });
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReviewError("");

    if (!token) {
      setReviewError("You must be signed in to submit a review.");
      return;
    }

    if (!newComment.trim()) {
      setReviewError("Please write your review comment.");
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/destinations/${slug}/reviews`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/destination-reviews/${reviewId}`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/destination-reviews/${reviewId}`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/destination-reviews/${reviewId}/replies`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/destination-review-replies/${replyId}`, {
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
      const res = await fetch(`http://127.0.0.1:8000/api/destination-review-replies/${replyId}`, {
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
      <main className="min-h-screen bg-[#FFFAF8] text-[#292929]">
        {/* Hero Banner */}
        <section className="relative h-[65vh] min-h-[480px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#292929] via-transparent to-black/60 z-20" />
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
              <span>←</span>
              <span>Back to Destinations</span>
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-7xl px-6 pb-12 sm:px-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#C96B6B] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-md">
                {destination.category}
              </span>
              {isVisited && (
                <span className="rounded-full bg-emerald-600/90 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  ✓ Visited {visitRecord && visitRecord.count > 1 ? `(${visitRecord.count}x)` : ""}
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
                    ? "bg-[#C96B6B] text-white hover:bg-[#b05858]"
                    : "bg-white/20 text-white backdrop-blur-md hover:bg-white/30 border border-white/35"
                }`}
              >
                <span>{isFavorited ? "❤️" : "♡"}</span>
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
                <span>{isVisited ? "✓" : "+"}</span>
                <span>{isVisited ? "Marked as Visited" : "Mark as Visited"}</span>
              </button>

              {isVisited && (
                <button
                  type="button"
                  onClick={handleRecordAnotherVisit}
                  className="rounded-full bg-white/10 px-4 py-3 text-xs font-medium text-white backdrop-blur-md hover:bg-white/20 border border-white/20"
                >
                  + Record Another Visit
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Overview & Highlights */}
        <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
                Destination Overview
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
                About {destination.name}
              </h2>
              <p className="mt-5 text-base leading-7 text-[#716767]">
                {destination.overview}
              </p>

              <div className="mt-8">
                <h3 className="font-display text-xl font-semibold text-[#292929]">
                  Key Highlights
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {destination.highlights.map((highlight, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 rounded-2xl border border-[#F1E5DF] bg-white p-4 shadow-sm"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FCEBEC] text-xs font-bold text-[#C96B6B]">
                        ✓
                      </span>
                      <span className="text-sm font-medium text-[#292929]">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Facilities & Amenities */}
            <div className="rounded-3xl border border-[#F1E5DF] bg-white p-8 shadow-xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
                Amenities & Services
              </p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-[#292929]">
                Available Facilities
              </h3>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {destination.facilities.map((facility, index) => (
                  <span
                    key={index}
                    className="rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-2.5 text-xs font-semibold text-[#292929] shadow-sm"
                  >
                    {facility}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-t border-[#F1E5DF] pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#716767]">
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
        <section className="bg-white px-6 py-16 sm:px-10 lg:py-20 border-y border-[#F1E5DF]">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
              Quick Guide
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[#292929]">
              Essential Information
            </h2>
            <p className="mt-2 text-sm text-[#716767]">
              Check available schedule and visitor details before heading out.
            </p>

            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                label="Address / Location"
                value={destination.address}
                icon="⌖"
              />
              <InfoCard
                label="Opening Time"
                value={destination.openingHours}
                icon="◷"
              />
              <InfoCard
                label="Closing Time"
                value={destination.closingHours}
                icon="◷"
              />
              <InfoCard
                label="Operating Days"
                value={destination.operatingDays}
                icon="▦"
              />
              <InfoCard
                label={isRestaurant ? "Rates / Additional Fees" : "Entrance Fee"}
                value={destination.entranceFee}
                icon="₱"
              />
              <InfoCard
                label="Contact Number"
                value={destination.contactNumber}
                icon="☎"
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
              <div className="rounded-3xl border border-[#F1E5DF] bg-white px-6 py-12 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
                  Location Information
                </p>
                <h2 className="mt-4 font-display text-2xl font-semibold text-[#292929]">
                  Map Location Coming Soon
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#716767]">
                  The exact coordinates for this destination still need to be verified.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Photo Route Guide */}
        <section className="bg-white px-6 py-16 sm:px-10 lg:py-24 border-y border-[#F1E5DF]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#C96B6B]">
                Travel Navigation
              </p>
              <h2 className="font-display text-3xl font-semibold text-[#292929] sm:text-4xl">
                Photo Route Guide
              </h2>
              <p className="max-w-2xl text-sm text-[#716767] leading-relaxed">
                Follow this sequential photo guide with step-by-step road instructions and visual landmarks leading toward {destination.name}.
              </p>
            </div>

            {destination.routeSteps && destination.routeSteps.length > 0 ? (
              <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {destination.routeSteps.map((step) => (
                  <div
                    key={step.stepNumber}
                    className="flex flex-col overflow-hidden rounded-3xl border border-[#F1E5DF] bg-[#FFFAF8] shadow-sm transition hover:shadow-md"
                  >
                    {step.image && (
                      <div className="relative h-48 w-full overflow-hidden bg-[#292929]">
                        <img
                          src={step.image}
                          alt={`Step ${step.stepNumber}`}
                          className="h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                        />
                        <span className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#C96B6B] text-xs font-bold text-white shadow-md">
                          {step.stepNumber}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between p-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#C96B6B]">
                            Step {step.stepNumber}
                          </span>
                          <span className="text-xs text-[#716767]">• {step.landmark}</span>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-[#292929]">
                          {step.instruction}
                        </p>
                      </div>
                      {step.stepNumber < (destination.routeSteps?.length || 0) && (
                        <div className="mt-6 flex items-center justify-center text-[#C96B6B] text-lg font-bold">
                          ↓
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-[#F1E5DF] bg-[#FFFAF8] p-10 text-center">
                <p className="text-sm font-semibold text-[#292929]">Route photos coming soon</p>
                <p className="mt-2 text-xs text-[#716767]">
                  Detailed road and landmark photographs for this route are currently being updated and verified.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Ratings & Reviews Section */}
        <section className="bg-gradient-to-b from-[#292929] to-[#1e1e1e] px-6 py-16 text-white sm:px-10 lg:py-24 border-t-4 border-[#C96B6B]">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#C96B6B]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.25em] text-[#E8A0A0] border border-[#C96B6B]/30 mb-3">
                  <span>★</span> Visitor Feedback & Reviews
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-white">
                  Traveler Experiences
                </h2>
                <p className="mt-2 text-sm text-white/70 max-w-xl leading-relaxed">
                  Read authentic feedback or share your own personal experience visiting {destination.name}.
                </p>
              </div>

              {reviews.length > 0 && (
                <div className="flex items-center gap-5 rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-xl shadow-2xl">
                  <div className="text-center">
                    <p className="font-display text-5xl font-extrabold text-[#E8A0A0] tracking-tight">{averageRating}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/50">Average Rating</p>
                  </div>
                  <div className="border-l border-white/20 pl-5">
                    <div className="text-amber-400 text-lg tracking-widest">
                      {"★".repeat(Math.round(averageRating))}
                      {"☆".repeat(5 - Math.round(averageRating))}
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-white/95">Based on {reviews.length} traveler {reviews.length === 1 ? 'review' : 'reviews'}</p>
                  </div>
                </div>
              )}
            </div>

            {actionError && (
              <div className="mt-6 rounded-2xl bg-red-950/80 p-4 text-xs font-medium text-red-200 border border-red-500/40 shadow-lg flex items-center gap-3">
                <span className="text-red-400 text-base">⚠️</span>
                <span>{actionError}</span>
              </div>
            )}

            {/* Reviews List & Form Grid */}
            <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
              {/* Existing Reviews */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">
                    Traveler Reviews ({reviews.length})
                  </h3>
                  <span className="text-xs text-white/50 font-medium">Verified Community Feedback</span>
                </div>

                {reviews.length > 0 ? (
                  reviews.map((rev) => {
                    const isOwner = token && rev.user_id === currentUserId;
                    const canModify = token && (isOwner || isAdmin);
                    const isEditing = editingReviewId === rev.id;
                    const isReplying = replyingReviewId === rev.id;

                    return (
                      <div
                        key={rev.id}
                        className="group rounded-3xl border border-white/15 bg-white/[0.04] p-7 backdrop-blur-md space-y-5 transition duration-300 hover:border-[#C96B6B]/50 hover:bg-white/[0.07] shadow-xl"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C96B6B]/30 text-sm font-bold text-[#E8A0A0] border border-[#C96B6B]/40">
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
                            <span className="text-amber-400 text-base tracking-wider bg-black/30 px-3 py-1 rounded-full border border-white/10">
                              {"★".repeat(rev.rating)}
                              {"☆".repeat(5 - rev.rating)}
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
                                  className="text-xs text-[#E8A0A0] hover:text-white font-semibold transition bg-white/5 px-2.5 py-1 rounded-lg border border-white/10"
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
                                className="w-full rounded-xl border border-white/20 bg-[#1e1e1e] px-4 py-2.5 text-xs font-medium text-white outline-none focus:border-[#C96B6B]"
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
                                className="w-full rounded-xl border border-white/20 bg-black/30 p-3.5 text-xs text-white outline-none focus:border-[#C96B6B]"
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => handleEditReviewSubmit(rev.id)}
                                className="rounded-xl bg-[#C96B6B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#b05858] shadow-md"
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
                          <div className="mt-5 space-y-3.5 pl-5 sm:pl-7 border-l-2 border-[#C96B6B]/40">
                            {rev.replies.map((reply: any) => {
                              const isReplyOwner = token && reply.user_id === currentUserId;
                              const canModifyReply = token && (isReplyOwner || isAdmin);
                              const isEditingReply = editingReplyId === reply.id;

                              return (
                                <div key={reply.id} className="rounded-2xl bg-black/30 p-4.5 border border-white/10 shadow-inner space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C96B6B]/20 text-[10px] font-bold text-[#E8A0A0]">
                                        ↳
                                      </span>
                                      <p className="text-xs font-bold text-[#E8A0A0] tracking-wide">
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
                                            className="text-[11px] text-[#E8A0A0] hover:text-white font-semibold transition"
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
                                        className="w-full rounded-xl border border-white/20 bg-black/40 p-3 text-xs text-white outline-none focus:border-[#C96B6B]"
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleEditReplySubmit(reply.id)}
                                          className="rounded-lg bg-[#C96B6B] px-3 py-1.5 text-[11px] font-bold text-white shadow"
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

                        {/* Reply Button & Form */}
                        {token && !isReplying && (
                          <button
                            type="button"
                            onClick={() => setReplyingReviewId(rev.id)}
                            className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#E8A0A0] hover:text-white transition bg-white/5 px-3 py-1.5 rounded-xl border border-white/10"
                          >
                            <span>💬</span> Reply to this review
                          </button>
                        )}

                        {isReplying && (
                          <div className="mt-4 rounded-2xl border border-white/20 bg-black/40 p-5 space-y-3.5 shadow-inner">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              rows={2.5}
                              placeholder="Write a helpful reply or follow-up..."
                              className="w-full rounded-xl border border-white/20 bg-black/50 p-3.5 text-xs text-white outline-none focus:border-[#C96B6B] placeholder:text-white/30"
                            />
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleReplySubmit(rev.id)}
                                className="rounded-xl bg-[#C96B6B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#b05858] shadow-md"
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
                    <p className="text-3xl">✨</p>
                    <p className="text-sm font-medium text-white">No visitor reviews yet for {destination.name}.</p>
                    <p className="text-xs text-white/50 max-w-sm mx-auto">Be the first traveler to share your experience, tips, and ratings with the community!</p>
                  </div>
                )}
              </div>

              {/* Submit Review Form */}
              <div className="rounded-3xl border border-white/15 bg-white/[0.07] p-8 backdrop-blur-xl shadow-2xl sticky top-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#C96B6B] text-xs font-bold text-white shadow">
                    ✍
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
                        className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3.5 text-sm font-semibold text-amber-400 outline-none focus:border-[#C96B6B] shadow-inner"
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
                        className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-[#C96B6B] placeholder:text-white/30 shadow-inner"
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
                      className="w-full rounded-2xl bg-[#C96B6B] py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[#292929] shadow-xl"
                    >
                      Submit Traveler Review
                    </button>
                  </form>
                ) : (
                  <div className="mt-6 rounded-2xl border border-white/20 bg-black/30 p-7 text-center space-y-4 shadow-inner">
                    <p className="text-xs text-white/80 leading-relaxed">You must be signed in to submit a review, rate destinations, and participate in discussions.</p>
                    <Link
                      to="/login"
                      className="inline-block rounded-2xl bg-[#C96B6B] px-6 py-3 text-xs font-bold text-white transition hover:bg-white hover:text-[#292929] shadow-md"
                    >
                      Sign In to Review
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Back to Destinations */}
        <section className="px-6 py-12 text-center sm:px-10">
          <Link
            to="/destinations"
            className="inline-flex items-center gap-3 rounded-full bg-[#C96B6B] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#292929]"
          >
            Explore More Destinations
            <span>→</span>
          </Link>
        </section>
      </main>
  );
}

type InfoCardProps = {
  label: string;
  value: string;
  icon: string;
};

function InfoCard({ label, value, icon }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-[#F1E5DF] bg-[#FFFAF8] p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCEBEC] text-lg text-[#C96B6B]">
        {icon}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#716767]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-[#292929]">
        {value}
      </p>
    </div>
  );
}

export default DestinationDetailsPage;
