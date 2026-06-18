import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  MapPin,
  Play,
  Ticket,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  hallsApi,
  moviesApi,
  reservationsApi,
  resolveImageUrl,
  screeningsApi,
  usersApi,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import StatCard from "@/pages/app/StatCard";
import LoadingCard from "@/pages/app/LoadingCard";

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

function formatDayLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  if (day.getTime() === today.getTime()) return "Astăzi";
  if (day.getTime() === tomorrow.getTime()) return "Mâine";
  return date.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "short" });
}

// ─── Hero Banner ──────────────────────────────────────────────────────────────
function HeroBanner({ movies, screeningsByMovie }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (movies.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % movies.length), 7000);
    return () => clearInterval(id);
  }, [movies.length]);

  const featured = movies[idx];
  if (!featured) return null;

  const genres = featured.genre
    ? featured.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];
  const nextScreening = (screeningsByMovie.get(featured.id) || [])[0];

  return (
    <div className="relative -mx-4 mb-8 overflow-hidden rounded-none sm:mb-12 md:-mx-8 md:rounded-2xl">
      {/* Blurred backdrop */}
      <div className="absolute inset-0">
        {(featured.banner_image_url || featured.image_url) ? (
          <img
            key={featured.id}
            src={resolveImageUrl(featured.banner_image_url || featured.image_url)}
            alt={featured.title}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/40 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/60 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-[360px] items-end px-5 pb-10 sm:min-h-[480px] sm:px-8 sm:pb-14 md:min-h-[620px] md:px-14">
        <div className="w-full max-w-[85%] sm:max-w-sm md:max-w-xl">
          <div className="mb-2 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2">
            {genres.slice(0, 2).map((g) => (
              <Badge
                key={g}
                variant="secondary"
                className="rounded-full border-white/20 bg-white/15 text-white backdrop-blur-sm"
              >
                {g}
              </Badge>
            ))}
            {featured.rating && (
              <Badge className="rounded-full bg-amber-500/80 text-white">
                ★ {featured.rating}
              </Badge>
            )}
            {featured.duration && (
              <span className="hidden items-center gap-1 text-xs text-white/60 sm:flex">
                <Clock className="h-3 w-3" />
                {featured.duration} min
              </span>
            )}
          </div>

          <h1 className="mb-2 text-xl font-extrabold leading-tight text-white drop-shadow-lg sm:mb-3 sm:text-3xl md:text-5xl">
            {featured.title}
          </h1>

          {featured.description && (
            <p className="mb-4 hidden line-clamp-2 text-sm leading-relaxed text-white/70 sm:block sm:mb-6 md:text-base">
              {featured.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-white text-black shadow-xl hover:bg-white/90 sm:size-lg sm:gap-2"
            >
              <Link to={`/screenings?movie=${featured.id}`}>
                <Play className="h-3.5 w-3.5 fill-black sm:h-4 sm:w-4" />
                Rezervă bilete
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:size-lg"
            >
              <Link to="/movies">Toate filmele</Link>
            </Button>
          </div>

          {nextScreening && (
            <p className="mt-3 hidden text-xs text-white/50 sm:block">
              Următoarea proiecție:{" "}
              <span className="text-white/80">{formatDateTime(nextScreening.start_time)}</span>
              {nextScreening.hall?.name && <> · {nextScreening.hall.name}</>}
            </p>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      {movies.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 sm:bottom-5 sm:left-auto sm:right-6 sm:translate-x-0">
          {movies.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={[
                "rounded-full transition-all duration-300",
                i === idx ? "h-1.5 w-5 bg-white" : "h-1.5 w-1.5 bg-white/40 hover:bg-white/70",
              ].join(" ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Movie Card ───────────────────────────────────────────────────────────────
function MovieCard({ movie }) {
  return (
    <Link to={`/movies/${movie.id}`} className="block">
    <div className="group relative w-28 shrink-0 cursor-pointer sm:w-36 md:w-44">
      <div className="overflow-hidden rounded-xl shadow-md ring-0 transition-all duration-300 group-hover:scale-[1.05] group-hover:shadow-2xl group-hover:ring-2 group-hover:ring-primary/50">
        <div className="relative aspect-[2/3] bg-muted">
          {movie.image_url ? (
            <img
              src={resolveImageUrl(movie.image_url)}
              alt={movie.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Film className="h-10 w-10 text-muted-foreground/40" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <p className="mb-1 line-clamp-2 text-xs font-bold leading-tight text-white">
              {movie.title}
            </p>
            {movie.genre && (
              <p className="mb-2.5 line-clamp-1 text-[10px] text-white/60">{movie.genre}</p>
            )}
            <Button asChild size="sm" className="h-7 w-full text-xs">
              <Link to={`/screenings?movie=${movie.id}`}>
                {movie._hasScreenings ? "Rezervă" : "Detalii"}
              </Link>
            </Button>
          </div>

          {movie.rating && (
            <div className="absolute right-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-sm">
              ★ {movie.rating}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-center text-xs font-medium">{movie.title}</p>
    </div>
    </Link>
  );
}

// ─── Movie Carousel ───────────────────────────────────────────────────────────
function MovieCarousel({ movies }) {
  const ref = useRef(null);
  const scroll = (dir) => {
    const cardW = ref.current?.querySelector("a")?.offsetWidth || 160;
    ref.current?.scrollBy({ left: dir * (cardW + 8) * 3, behavior: "smooth" });
  };

  if (!movies.length) return (
    <p className="py-8 text-sm text-muted-foreground">Niciun film disponibil.</p>
  );

  return (
    <div className="relative">
      <button
        onClick={() => scroll(-1)}
        className="absolute -left-3 top-[40%] z-10 hidden -translate-y-1/2 rounded-full border border-border/70 bg-background/80 p-1.5 shadow-lg backdrop-blur transition hover:bg-muted sm:-left-4 sm:block sm:p-2 md:-left-5"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={ref}
        className="flex gap-2 overflow-x-auto scroll-smooth py-2 pl-1 pr-2 [scrollbar-width:none] sm:gap-3 sm:pr-4 [&::-webkit-scrollbar]:hidden"
      >
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>

      <button
        onClick={() => scroll(1)}
        className="absolute -right-3 top-[40%] z-10 hidden -translate-y-1/2 rounded-full border border-border/70 bg-background/80 p-1.5 shadow-lg backdrop-blur transition hover:bg-muted sm:-right-4 sm:block sm:p-2 md:-right-5"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Upcoming Screenings ──────────────────────────────────────────────────────
function UpcomingScreenings({ screenings, user }) {
  const grouped = useMemo(() => {
    const map = new Map();
    screenings.forEach((s) => {
      const day = new Date(s.start_time).toDateString();
      const arr = map.get(day) || [];
      arr.push(s);
      map.set(day, arr);
    });
    return [...map.entries()]
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(0, 3)
      .map(([, items]) => ({
        label: formatDayLabel(items[0].start_time),
        items: items.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
      }));
  }, [screenings]);

  if (!grouped.length) return (
    <p className="py-4 text-sm text-muted-foreground">Nicio proiecție programată.</p>
  );

  return (
    <div className="space-y-6">
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">{label}</h3>
          <div className="space-y-2">
            {items.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-3 transition hover:bg-card sm:px-4"
              >
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  {s.movie?.image_url ? (
                    <img
                      src={resolveImageUrl(s.movie.image_url)}
                      alt={s.movie.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.movie?.title || "—"}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(s.start_time)}
                    </span>
                    {s.hall?.name && (
                      <span className="hidden items-center gap-1 sm:flex">
                        <MapPin className="h-3 w-3" />
                        {s.hall.name}
                      </span>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
                  <Link to={user ? `/reservations?screening=${s.id}` : "/login"}>
                    Rezervă
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reservation Strip ────────────────────────────────────────────────────────
function ReservationStrip({ reservations }) {
  return (
    <div className="space-y-2">
      {reservations.map((group) => {
        const movie = group.screening?.movie;
        const hall = group.screening?.hall;
        const seatLabels = group.items
          .map((r) => r.seat ? `${r.seat.row}${r.seat.number}` : null)
          .filter(Boolean);
        return (
          <div
            key={group.key}
            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3 transition hover:bg-card"
          >
            <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
              {movie?.image_url ? (
                <img
                  src={resolveImageUrl(movie.image_url)}
                  alt={movie.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Ticket className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{movie?.title || "Film"}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDateTime(group.screening?.start_time)}
                </span>
                {hall?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {hall.name}
                  </span>
                )}
              </div>
            </div>
            {seatLabels.length > 0 && (
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {seatLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="rounded-full font-mono text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    movies: [],
    halls: [],
    screenings: [],
    users: [],
    reservations: [],
  });

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [movies, screenings, reservations, halls, users] = await Promise.all([
          moviesApi.list(),
          screeningsApi.list(),
          isAdmin
            ? reservationsApi.listAll()
            : user
            ? reservationsApi.listMine()
            : Promise.resolve([]),
          isAdmin ? hallsApi.list() : Promise.resolve([]),
          isAdmin ? usersApi.list() : Promise.resolve([]),
        ]);
        if (mounted) setData({ movies, screenings, reservations, halls, users });
      } catch (e) {
        if (mounted) setError(e.message || "Eroare la încărcare");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => { mounted = false; };
  }, [isAdmin, user?.id]);

  const screeningsByMovie = useMemo(() => {
    const now = new Date();
    const map = new Map();
    data.screenings
      .filter((s) => new Date(s.start_time) >= now)
      .forEach((s) => {
        const arr = map.get(s.movie_id) || [];
        arr.push(s);
        map.set(s.movie_id, arr);
      });
    map.forEach((v, k) =>
      map.set(k, [...v].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)))
    );
    return map;
  }, [data.screenings]);

  const moviesEnriched = useMemo(
    () => data.movies.map((m) => ({ ...m, _hasScreenings: screeningsByMovie.has(m.id) })),
    [data.movies, screeningsByMovie]
  );

  const upcomingScreenings = useMemo(() => {
    const now = new Date();
    return data.screenings
      .filter((s) => new Date(s.start_time) >= now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [data.screenings]);

  const recentReservations = useMemo(() => {
    const groups = new Map();
    data.reservations.forEach((r) => {
      const key = r.screening_id;
      if (!groups.has(key)) {
        groups.set(key, { key, screening: r.screening, items: [], latestAt: r.reserved_at });
      }
      const g = groups.get(key);
      g.items.push(r);
      if (new Date(r.reserved_at) > new Date(g.latestAt)) g.latestAt = r.reserved_at;
    });
    return [...groups.values()]
      .sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt))
      .slice(0, 3);
  }, [data.reservations]);

  if (loading) return <LoadingCard message="Se încarcă..." />;

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  // ── Admin dashboard ──────────────────────────────────────────────────────
  if (isAdmin) {
    const now = new Date();
    const adminScreenings = data.screenings
      .filter((s) => new Date(s.start_time) >= now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 8);

    return (
      <PageFrame
        title="Admin Dashboard"
        description={`Bun venit, ${user?.first_name} ${user?.last_name}.`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Film} label="Filme" value={data.movies.length} hint="Catalog" />
          <StatCard icon={CalendarDays} label="Proiecții" value={data.screenings.length} hint="Programate" />
          <StatCard icon={Ticket} label="Rezervări" value={data.reservations.length} hint="Toți utilizatorii" />
          <StatCard icon={Users} label="Utilizatori" value={data.users.length} hint="Conturi înregistrate" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-border/70 bg-card/90 shadow-md">
            <CardHeader><CardTitle>Proiecții viitoare</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {adminScreenings.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 p-3"
                >
                  <div>
                    <p className="font-medium">{s.movie?.title || "Film"}</p>
                    <p className="text-xs text-muted-foreground">Sală: {s.hall?.name || "-"}</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {formatDateTime(s.start_time)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-md">
            <CardHeader><CardTitle>Acțiuni rapide</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/movies">Gestionează filme</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/screenings">Gestionează proiecții</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/halls">Gestionează săli</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/users">Gestionează utilizatori</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageFrame>
    );
  }

  // ── User / Visitor dashboard ──────────────────────────────────────────────
  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero */}
      {moviesEnriched.length > 0 && (
        <HeroBanner movies={moviesEnriched} screeningsByMovie={screeningsByMovie} />
      )}

      {/* Now Showing */}
      <section>
        <div className="mb-4 flex items-end justify-between sm:mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Acum în cinematograf</h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/movies">Vezi toate →</Link>
          </Button>
        </div>
        <MovieCarousel movies={moviesEnriched} />
      </section>

      {/* Upcoming Screenings */}
      <section>
        <div className="mb-4 flex items-end justify-between sm:mb-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Proiecții în curând</h2>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/screenings">Toate proiecțiile →</Link>
          </Button>
        </div>
        <UpcomingScreenings screenings={upcomingScreenings} user={user} />
      </section>

      {/* My Reservations — logged-in users only */}
      {user && recentReservations.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between sm:mb-5">
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Rezervările mele</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Cele mai recente bilete</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/reservations">Vezi toate →</Link>
            </Button>
          </div>
          <ReservationStrip reservations={recentReservations} />
        </section>
      )}

      {/* CTA banner — guests only */}
      {!user && (
        <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-accent/8 to-primary/5 px-4 py-8 text-center sm:px-8 sm:py-10">
          <h2 className="mb-2 text-xl font-bold sm:text-2xl">Gata să rezervi?</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
            Creează un cont gratuit și rezervă-ți locul la filmele preferate în câteva secunde.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register">Creează cont</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/login">Autentifică-te</Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
