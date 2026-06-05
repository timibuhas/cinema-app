import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarPlus, Clock, Film, MapPin, Pencil, Ticket, Trash2, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hallsApi, moviesApi, resolveImageUrl, screeningsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

// ─── Day selector ────────────────────────────────────────────────────────────
function DaySelector({ screenings, value, onChange }) {
  const days = useMemo(() => {
    const map = new Map();
    screenings.forEach((s) => {
      const day = new Date(s.start_time).toISOString().slice(0, 10);
      map.set(day, (map.get(day) || 0) + 1);
    });

    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date]) => {
        const d = new Date(`${date}T12:00:00`);
        const isToday = date === todayStr;
        const isTomorrow = date === tomorrowStr;
        const shortName = isToday
          ? "Astăzi"
          : isTomorrow
          ? "Mâine"
          : d.toLocaleDateString("ro-RO", { weekday: "short" }).replace(".", "");
        return {
          date,
          dayNum: d.getDate(),
          monthShort: d.toLocaleDateString("ro-RO", { month: "short" }).replace(".", ""),
          shortName,
          isToday,
        };
      });
  }, [screenings]);

  if (!days.length) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {days.map(({ date, dayNum, monthShort, shortName, isToday }) => {
        const selected = value === date;
        return (
          <button
            key={date}
            onClick={() => onChange(selected ? "" : date)}
            className={[
              "group relative shrink-0 flex flex-col items-center gap-0.5 rounded-2xl border px-4 py-3 text-center transition-all duration-200 focus:outline-none",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.04]"
                : "border-border/50 bg-card/70 text-foreground hover:border-primary/40 hover:bg-primary/6 hover:scale-[1.02]",
            ].join(" ")}
          >
            <span
              className={[
                "text-[10px] font-bold uppercase tracking-wider",
                selected ? "text-primary-foreground/80" : "text-muted-foreground",
              ].join(" ")}
            >
              {shortName}
            </span>
            <span className="text-2xl font-extrabold tabular-nums leading-none">
              {dayNum}
            </span>
            <span
              className={[
                "text-[10px] leading-none",
                selected ? "text-primary-foreground/70" : "text-muted-foreground",
              ].join(" ")}
            >
              {monthShort}
            </span>
            <span
              className={[
                "mt-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold tabular-nums",
                selected
                  ? "bg-white/20 text-white"
                  : "bg-primary/10 text-primary",
              ].join(" ")}
            >
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Screening dialog (admin CRUD) ───────────────────────────────────────────
function ScreeningDialog({ trigger, movies, halls, initialValue, onSave }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ movie_id: "", hall_id: "", start_time: "" });

  useEffect(() => {
    if (!open) return;
    setForm({
      movie_id: initialValue?.movie_id || initialValue?.movie?.id || "",
      hall_id: initialValue?.hall_id || initialValue?.hall?.id || "",
      start_time: toInputDate(initialValue?.start_time),
    });
  }, [initialValue, open]);

  async function handleSave() {
    setSubmitting(true);
    try {
      await onSave({
        ...(initialValue?.id ? { id: initialValue.id } : {}),
        movie_id: form.movie_id,
        hall_id: form.hall_id,
        start_time: new Date(form.start_time).toISOString(),
      });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit screening" : "Create screening"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>Movie</Label>
            <Select value={form.movie_id} onValueChange={(v) => setForm((p) => ({ ...p, movie_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Choose movie" /></SelectTrigger>
              <SelectContent>
                {movies.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hall</Label>
            <Select value={form.hall_id} onValueChange={(v) => setForm((p) => ({ ...p, hall_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Choose hall" /></SelectTrigger>
              <SelectContent>
                {halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-time">Start time</Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Date widget ──────────────────────────────────────────────────────────────
function DateWidget({ value, past }) {
  if (!value) return null;
  const d = new Date(value);
  const dayShort = d.toLocaleDateString("ro-RO", { weekday: "short" }).replace(".", "").toUpperCase();
  const time = d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });

  return (
    <div
      className={[
        "shrink-0 min-w-[68px] rounded-xl border px-3 py-2 text-center",
        past
          ? "border-border/30 bg-muted/20 text-muted-foreground"
          : "border-primary/25 bg-primary/8 text-primary",
      ].join(" ")}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{dayShort}</p>
      <p className="text-lg font-extrabold tabular-nums leading-tight">{time}</p>
      <p className="text-[10px] opacity-60">{dateStr}</p>
    </div>
  );
}

// ─── Screening card ───────────────────────────────────────────────────────────
function ScreeningCard({ screening, isAdmin, movies, halls, onSave, onRemove }) {
  const movie = screening.movie;
  const hall = screening.hall;
  const past = new Date(screening.start_time) < new Date();
  const genres = movie?.genre
    ? movie.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];

  return (
    <div
      className={[
        "group flex overflow-hidden rounded-2xl border bg-card/90 shadow-md transition-all duration-300",
        past
          ? "border-border/30 opacity-60"
          : "border-border/50 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl",
      ].join(" ")}
    >
      {/* Poster */}
      <div className="relative w-20 shrink-0 overflow-hidden bg-muted md:w-24">
        {movie?.image_url ? (
          <img
            src={resolveImageUrl(movie.image_url)}
            alt={movie.title || "Movie"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-8 w-8 text-muted-foreground/25" />
          </div>
        )}
        {movie?.rating && !past && (
          <div className="absolute left-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-sm">
            ★ {movie.rating}
          </div>
        )}
        {past && (
          <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-2">
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/70">
              Trecut
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Movie info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold leading-snug">
              {movie?.title || "Film necunoscut"}
            </h3>
            {genres.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {genres.map((g) => (
                  <Badge key={g} variant="secondary" className="rounded-full px-2 py-0 text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {movie?.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {movie.duration} min
                </span>
              )}
              {hall?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {hall.name}
                </span>
              )}
            </div>
          </div>

          {/* Date widget */}
          <DateWidget value={screening.start_time} past={past} />
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-end gap-2">
          {!past && (
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link to={`/reservations?screening=${screening.id}`}>
                <Ticket className="h-3.5 w-3.5" />
                Rezervă
              </Link>
            </Button>
          )}
          {isAdmin && (
            <>
              <ScreeningDialog
                movies={movies}
                halls={halls}
                initialValue={screening}
                onSave={onSave}
                trigger={
                  <Button size="sm" className="gap-1.5 rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-500/90">
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                }
              />
              <Button
                size="sm"
                className="gap-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-500/90"
                onClick={() => onRemove(screening.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ScreeningsPage() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const movieFilterId = searchParams.get("movie") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("time-asc");
  const [filterDate, setFilterDate] = useState("");
  const [filterGenre, setFilterGenre] = useState("all");
  const [filterHall, setFilterHall] = useState("all");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [moviesData, hallsData, screeningsData] = await Promise.all([
        moviesApi.list(),
        hallsApi.list(),
        screeningsApi.list(),
      ]);
      setMovies(moviesData);
      setHalls(hallsData);
      setScreenings(screeningsData);
    } catch (e) {
      setError(e.message || "Could not load screenings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function saveScreening(screening) {
    if (screening.id) await screeningsApi.update(screening.id, screening);
    else await screeningsApi.create(screening);
    await loadData();
  }

  async function removeScreening(id) {
    await screeningsApi.remove(id);
    await loadData();
  }

  const genres = useMemo(() => {
    const set = new Set(
      movies.flatMap((m) =>
        m.genre ? m.genre.split(",").map((g) => g.trim()).filter(Boolean) : []
      )
    );
    return [...set].sort();
  }, [movies]);

  const hasActiveFilters = filterDate || filterGenre !== "all" || filterHall !== "all";

  function clearFilters() {
    setFilterDate("");
    setFilterGenre("all");
    setFilterHall("all");
  }

  const visibleScreenings = useMemo(
    () =>
      isAdmin
        ? screenings
        : screenings.filter((s) => new Date(s.start_time) >= new Date()),
    [screenings, isAdmin]
  );

  const filteredScreenings = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = visibleScreenings.filter((s) => {
      if (movieFilterId && s.movie_id !== movieFilterId) return false;
      if (filterDate && new Date(s.start_time).toISOString().slice(0, 10) !== filterDate) return false;
      if (filterGenre !== "all") {
        const mg = s.movie?.genre ? s.movie.genre.split(",").map((g) => g.trim()) : [];
        if (!mg.includes(filterGenre)) return false;
      }
      if (filterHall !== "all" && s.hall_id !== filterHall) return false;
      if (!q) return true;
      return (
        (s.movie?.title?.toLowerCase() || "").includes(q) ||
        (s.hall?.name?.toLowerCase() || "").includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === "time-desc") return new Date(b.start_time) - new Date(a.start_time);
      if (sortBy === "movie-asc") return (a.movie?.title || "").localeCompare(b.movie?.title || "");
      return new Date(a.start_time) - new Date(b.start_time);
    });
  }, [movieFilterId, query, visibleScreenings, sortBy, filterDate, filterGenre, filterHall]);

  return (
    <PageFrame
      title="Proiecții"

      actions={
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută film sau sală..."
            className="w-48"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="time-asc">Cele mai vechi</SelectItem>
              <SelectItem value="time-desc">Cele mai noi</SelectItem>
              <SelectItem value="movie-asc">Film A-Z</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <ScreeningDialog
              movies={movies}
              halls={halls}
              onSave={saveScreening}
              trigger={
                <Button className="shadow-md">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  New screening
                </Button>
              }
            />
          )}
        </>
      }
    >
      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Filter section */}
      <div className="space-y-3 rounded-2xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm">
        {/* Day selector */}
        <DaySelector
          screenings={visibleScreenings}
          value={filterDate}
          onChange={setFilterDate}
        />

        {/* Divider — only if there are days to show */}
        {visibleScreenings.length > 0 && (
          <div className="h-px bg-border/40" />
        )}

        {/* Genre + hall + actions row */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterGenre} onValueChange={setFilterGenre}>
            <SelectTrigger className="h-8 w-36 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate genurile</SelectItem>
              {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterHall} onValueChange={setFilterHall}>
            <SelectTrigger className="h-8 w-36 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toate sălile</SelectItem>
              {halls.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Resetează
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {filteredScreenings.length} proiecț{filteredScreenings.length === 1 ? "ie" : "ii"}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingCard message="Se încarcă proiecțiile..." />
      ) : filteredScreenings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Film className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium">Nicio proiecție găsită</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">
              Resetează filtrele
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredScreenings.map((screening) => (
            <ScreeningCard
              key={screening.id}
              screening={screening}
              isAdmin={isAdmin}
              movies={movies}
              halls={halls}
              onSave={saveScreening}
              onRemove={removeScreening}
            />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
