import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, CalendarDays, Clock, Film, Loader2, Play, Star, Trash2, User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { moviesApi, resolveImageUrl, reviewsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    let videoId = null;
    if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

// ─── Star display ─────────────────────────────────────────────────────────────
function StarDisplay({ rating, size = "sm" }) {
  const iconCls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${iconCls} ${
            s <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Star picker ──────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              s <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/25"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MovieDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [canReview, setCanReview] = useState(null); // null | CanReviewResponse
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    try {
      const [movieData, reviewsData] = await Promise.all([
        moviesApi.get(id),
        reviewsApi.listForMovie(id),
      ]);
      setMovie(movieData);
      setReviews(reviewsData);
      if (user) {
        try {
          const cr = await reviewsApi.canReview(id);
          setCanReview(cr);
        } catch {
          setCanReview(null);
        }
      }
    } catch {
      navigate("/movies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id, user?.id]);

  async function submitReview(e) {
    e.preventDefault();
    if (rating === 0) { setFormError("Selectează un număr de stele."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await reviewsApi.create({ movie_id: id, rating, comment: comment || null });
      setRating(0);
      setComment("");
      await load();
    } catch (err) {
      setFormError(err.message || "Nu s-a putut trimite recenzia.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteReview(reviewId) {
    try {
      await reviewsApi.remove(reviewId);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!movie) return null;

  const genres = movie.genre ? movie.genre.split(",").map((g) => g.trim()).filter(Boolean) : [];

  return (
    <div className="space-y-8">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        Înapoi
      </Button>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-xl">
        {/* Blurred backdrop */}
        {movie.image_url && (
          <div className="absolute inset-0 -z-10">
            <img
              src={resolveImageUrl(movie.image_url)}
              alt=""
              className="h-full w-full object-cover opacity-15 blur-2xl scale-110"
            />
          </div>
        )}

        <div className="flex flex-col gap-6 p-4 sm:p-6 md:flex-row md:p-8">
          {/* Poster */}
          <div className="relative mx-auto w-36 shrink-0 overflow-hidden rounded-2xl shadow-2xl sm:w-44 md:mx-0 md:w-48">
            {movie.image_url ? (
              <img
                src={resolveImageUrl(movie.image_url)}
                alt={movie.title}
                className="aspect-[2/3] w-full h-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center bg-muted">
                <Film className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-4">
            {/* Genres + age rating */}
            <div className="flex flex-wrap items-center gap-2">
              {genres.map((g) => (
                <Badge key={g} variant="secondary" className="rounded-full">{g}</Badge>
              ))}
              {movie.rating && (
                <Badge variant="outline" className="rounded-full">{movie.rating}</Badge>
              )}
            </div>

            <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">{movie.title}</h1>

            {/* Star rating */}
            {movie.avg_rating ? (
              <div className="flex items-center gap-2">
                <StarDisplay rating={movie.avg_rating} size="lg" />
                <span className="text-lg font-bold text-amber-500">{movie.avg_rating}</span>
                <span className="text-sm text-muted-foreground">
                  ({movie.review_count} {movie.review_count === 1 ? "recenzie" : "recenzii"})
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nicio recenzie încă.</p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {movie.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {movie.duration} min
                </span>
              )}
              {movie.director && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Regia: {movie.director}
                </span>
              )}
            </div>

            {movie.description && (
              <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                {movie.description}
              </p>
            )}

            {movie.actors && (
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Cast:</span> {movie.actors}
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <Link to={`/screenings?movie=${movie.id}`}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Vezi proiecții
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/screenings?movie=${movie.id}`}>Rezervă bilet</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer */}
      {getYouTubeEmbedUrl(movie.trailer_url) && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Play className="h-5 w-5 text-primary" />
            Trailer
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border/50 shadow-lg">
            <div className="relative aspect-video w-full">
              <iframe
                src={getYouTubeEmbedUrl(movie.trailer_url)}
                title={`Trailer — ${movie.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reviews section */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Review list */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            Recenzii{reviews.length > 0 && <span className="ml-2 text-base font-normal text-muted-foreground">({reviews.length})</span>}
          </h2>

          {reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-12 text-center">
              <Star className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nicio recenzie pentru acest film.</p>
              <p className="text-xs text-muted-foreground">Fii primul care lasă o recenzie!</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {review.user?.first_name?.[0]}{review.user?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {review.user ? `${review.user.first_name} ${review.user.last_name}` : "Utilizator"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("ro-RO", {
                          day: "numeric", month: "long", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarDisplay rating={review.rating} />
                    {user && review.user_id === user.id && (
                      <button
                        onClick={() => deleteReview(review.id)}
                        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Șterge recenzia"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{review.comment}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Write review / status */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Lasă o recenzie</h2>

          {!user ? (
            <Card className="border-border/50">
              <CardContent className="p-5 text-center">
                <Star className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                <p className="mb-3 text-sm text-muted-foreground">
                  Autentifică-te pentru a lăsa o recenzie.
                </p>
                <Button asChild size="sm"><Link to="/login">Autentifică-te</Link></Button>
              </CardContent>
            </Card>
          ) : canReview?.reason === "already_reviewed" ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-5">
                <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-400">
                  Ai lăsat deja o recenzie pentru acest film.
                </p>
                {canReview.existing_review && (
                  <div className="mt-2">
                    <StarDisplay rating={canReview.existing_review.rating} />
                    {canReview.existing_review.comment && (
                      <p className="mt-1 text-xs text-muted-foreground">{canReview.existing_review.comment}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : canReview?.reason === "no_reservation" ? (
            <Card className="border-border/50">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Poți lăsa o recenzie doar după ce ai rezervat și vizionat filmul.
                </p>
              </CardContent>
            </Card>
          ) : canReview?.reason === "screening_not_ended" ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-5 text-center">
                <Clock className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  Poți lăsa o recenzie după terminarea proiecției.
                </p>
              </CardContent>
            </Card>
          ) : canReview?.can_review ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="p-5">
                <form onSubmit={submitReview} className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Rating</p>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Comentariu (opțional)</p>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Spune-ne ce ai crezut despre film..."
                      rows={4}
                    />
                  </div>
                  {formError && (
                    <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {formError}
                    </p>
                  )}
                  <Button type="submit" disabled={submitting || rating === 0} className="w-full gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                    {submitting ? "Se trimite..." : "Trimite recenzia"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
