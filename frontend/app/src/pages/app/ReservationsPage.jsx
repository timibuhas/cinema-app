import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, Check, Film, LayoutGrid, MapPin, Plus, Ticket, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SeatPicker from "@/components/SeatPicker";
import { reservationsApi, resolveImageUrl, screeningsApi, usersApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

function asUtc(value) {
  if (!value) return null;
  return typeof value === "string" && !/Z|[+-]\d{2}:\d{2}$/.test(value)
    ? new Date(value + "Z")
    : new Date(value);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

// ─── Reservation card ─────────────────────────────────────────────────────────
function ReservationCard({ group, screening, ownerLabel, isAdmin, onDelete, onEdit }) {
  const movie = screening?.movie;
  const hall = screening?.hall;
  const genres = movie?.genre
    ? movie.genre.split(",").map((g) => g.trim()).filter(Boolean)
    : [];
  const seatLabels = group.items.map((r) =>
    r.seat ? `${r.seat.row}${r.seat.number}` : r.seat_id?.slice(0, 8)
  );

  return (
    <div className="group flex overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-md transition-all duration-200 hover:border-border/80 hover:shadow-lg">
      {/* Poster */}
      <div className="relative w-20 shrink-0 overflow-hidden bg-muted md:w-28">
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
        {/* Seat count chip */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
            <Ticket className="h-2.5 w-2.5" />
            {seatLabels.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold leading-snug">{movie?.title || "Film"}</h3>
            {genres.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {genres.map((g) => (
                  <Badge key={g} variant="secondary" className="rounded-full px-2 py-0 text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {isAdmin && ownerLabel && (
            <Badge variant="outline" className="shrink-0 rounded-full text-xs">
              {ownerLabel}
            </Badge>
          )}
        </div>

        {/* Screening info strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-medium">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            {formatDate(screening?.start_time)}
          </span>
          {hall?.name && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {hall.name}
            </span>
          )}
        </div>

        {/* Seats row + actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Locuri:</span>
            {seatLabels.map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="rounded-full border-primary/35 bg-primary/8 px-2 font-mono text-xs text-primary"
              >
                {label}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-full"
              onClick={onEdit}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Modifică locul</span>
              <span className="sm:hidden">Modifică</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-500/90"
              onClick={onDelete}
            >
              <X className="h-3.5 w-3.5" />
              Anulează
            </Button>
          </div>
        </div>

        {/* Reserved at */}
        <p className="text-[10px] text-muted-foreground/50">
          Rezervat pe {formatDate(group.items[0]?.reserved_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const movieFilterId = searchParams.get("movie") || "";
  const screeningFilterId = searchParams.get("screening") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("created-desc");
  const [formOpen, setFormOpen] = useState(() => !!(movieFilterId || screeningFilterId));

  const [screenings, setScreenings] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [availableSeats, setAvailableSeats] = useState([]);

  const [form, setForm] = useState({ screening_id: "", seat_ids: [], user_id: "" });

  const screeningsById = useMemo(
    () => Object.fromEntries(screenings.map((s) => [s.id, s])),
    [screenings]
  );

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const effectiveMovieFilter = useMemo(() => {
    if (movieFilterId) return movieFilterId;
    if (screeningFilterId && screeningsById[screeningFilterId]) {
      return screeningsById[screeningFilterId].movie_id;
    }
    return "";
  }, [movieFilterId, screeningFilterId, screeningsById]);

  const filteredScreenings = useMemo(() => {
    let result = effectiveMovieFilter
      ? screenings.filter((s) => s.movie_id === effectiveMovieFilter)
      : screenings;
    if (!isAdmin) {
      result = result.filter((s) => new Date(s.start_time) >= new Date());
    }
    return result;
  }, [effectiveMovieFilter, screenings, isAdmin]);

  const selectedScreening = screeningsById[form.screening_id] || null;

  const selectedSeatLabels = useMemo(() => {
    const lookup = new Map(availableSeats.map((s) => [s.id, s]));
    return form.seat_ids
      .map((id) => lookup.get(id))
      .filter(Boolean)
      .map((s) => `${s.row}${s.number}`);
  }, [availableSeats, form.seat_ids]);

  const groupedReservations = useMemo(() => {
    const groups = new Map();
    reservations.forEach((r) => {
      const key = `${r.screening_id}:${r.user_id}`;
      if (!groups.has(key)) {
        groups.set(key, { key, screening_id: r.screening_id, user_id: r.user_id, user: r.user, items: [] });
      }
      groups.get(key).items.push(r);
    });
    return Array.from(groups.values());
  }, [reservations]);

  const filteredGroupedReservations = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? groupedReservations.filter((g) => {
          const s = screeningsById[g.screening_id];
          const title = s?.movie?.title?.toLowerCase() || "";
          const hall = s?.hall?.name?.toLowerCase() || "";
          const owner = g.user ? `${g.user.first_name} ${g.user.last_name}`.toLowerCase() : "";
          const seats = g.items.map((r) => (r.seat ? `${r.seat.row}${r.seat.number}` : "")).join(" ").toLowerCase();
          return title.includes(q) || hall.includes(q) || owner.includes(q) || seats.includes(q);
        })
      : groupedReservations;

    return [...filtered].sort((a, b) => {
      const sa = screeningsById[a.screening_id];
      const sb = screeningsById[b.screening_id];
      if (sortBy === "created-asc") return new Date(a.items[0].reserved_at) - new Date(b.items[0].reserved_at);
      if (sortBy === "movie-asc") return (sa?.movie?.title || "").localeCompare(sb?.movie?.title || "");
      if (sortBy === "start-asc") return new Date(sa?.start_time) - new Date(sb?.start_time);
      if (sortBy === "start-desc") return new Date(sb?.start_time) - new Date(sa?.start_time);
      return new Date(b.items[0].reserved_at) - new Date(a.items[0].reserved_at);
    });
  }, [groupedReservations, query, screeningsById, sortBy]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [screeningsData, reservationsData, usersData] = await Promise.all([
        screeningsApi.list(),
        isAdmin ? reservationsApi.listAll() : reservationsApi.listMine(),
        isAdmin ? usersApi.list() : Promise.resolve([]),
      ]);
      setScreenings(screeningsData);
      setReservations(reservationsData);
      setUsers(usersData);
      setForm((prev) => {
        const next = { ...prev };
        if (isAdmin && !next.user_id && usersData[0]) next.user_id = usersData[0].id;
        if (!next.screening_id) {
          if (screeningFilterId) {
            next.screening_id = screeningFilterId;
          } else {
            const future = isAdmin
              ? screeningsData
              : screeningsData.filter((s) => new Date(s.start_time) >= new Date());
            const fallback = movieFilterId
              ? future.find((s) => s.movie_id === movieFilterId)
              : future[0];
            if (fallback) next.screening_id = fallback.id;
          }
        }
        return next;
      });
    } catch (e) {
      setError(e.message || "Could not load reservations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [isAdmin]);

  useEffect(() => {
    if (screeningFilterId || !movieFilterId || !screenings.length) return;
    const current = screeningsById[form.screening_id];
    if (current?.movie_id === movieFilterId) return;
    const now = new Date();
    const first = screenings.find(
      (s) => s.movie_id === movieFilterId && (isAdmin || new Date(s.start_time) >= now)
    );
    if (!first) return;
    setForm((prev) => ({ ...prev, screening_id: first.id, seat_ids: [] }));
  }, [movieFilterId, screeningFilterId, screenings, screeningsById, form.screening_id, isAdmin]);

  useEffect(() => {
    let mounted = true;
    async function loadSeats() {
      if (!form.screening_id) { setAvailableSeats([]); return; }
      try {
        const seats = await screeningsApi.seats(form.screening_id);
        if (!mounted) return;
        setAvailableSeats(seats);
        const valid = new Set(seats.map((s) => s.id));
        setForm((prev) => ({ ...prev, seat_ids: prev.seat_ids.filter((id) => valid.has(id)) }));
      } catch {
        if (mounted) setAvailableSeats([]);
      }
    }
    loadSeats();
    return () => { mounted = false; };
  }, [form.screening_id]);

  function toggleSeat(seatId) {
    setForm((prev) => ({
      ...prev,
      seat_ids: prev.seat_ids.includes(seatId)
        ? prev.seat_ids.filter((id) => id !== seatId)
        : [...prev.seat_ids, seatId],
    }));
  }

  async function createReservation() {
    if (!form.screening_id || form.seat_ids.length === 0) {
      setFormError("Selectează o proiecție și cel puțin un loc.");
      return;
    }
    if (isAdmin && !form.user_id) {
      setFormError("Selectează un utilizator pentru rezervare.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (isAdmin) {
        await reservationsApi.createAdminBulk({ user_id: form.user_id, screening_id: form.screening_id, seat_ids: form.seat_ids });
      } else {
        await reservationsApi.createMineBulk({ screening_id: form.screening_id, seat_ids: form.seat_ids });
      }
      setForm((prev) => ({ ...prev, seat_ids: [] }));
      setFormOpen(false);
      await loadData();
      if (movieFilterId || screeningFilterId) navigate("/reservations", { replace: true });
    } catch (e) {
      setFormError(e.message || "Nu s-a putut crea rezervarea");
    } finally {
      setSaving(false);
    }
  }

  function handleFormOpenChange(open) {
    setFormOpen(open);
    if (!open) {
      if (movieFilterId) navigate("/movies");
      else if (screeningFilterId) navigate("/screenings");
    }
  }

  async function deleteGroup(ids) {
    try {
      await Promise.all(ids.map((id) => isAdmin ? reservationsApi.removeAdmin(id) : reservationsApi.removeMine(id)));
      await loadData();
    } catch (e) {
      setError(e.message || "Nu s-a putut șterge rezervarea");
    }
  }

  // ── Edit seats state ──────────────────────────────────────────────────────
  const [editGroup, setEditGroup] = useState(null);
  const [editSeats, setEditSeats] = useState([]);
  const [editSelectedIds, setEditSelectedIds] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function openEditDialog(group) {
    setEditGroup(group);
    setEditSeats([]);
    setEditSelectedIds([]);
    setEditError("");
    setEditLoading(true);
    try {
      const seats = await screeningsApi.seats(group.screening_id);
      const ownSeatIds = new Set(group.items.map((r) => r.seat_id));
      // Unmark user's own seats so they appear selectable
      setEditSeats(seats.map((s) => ({ ...s, occupied: s.occupied && !ownSeatIds.has(s.id) })));
      setEditSelectedIds(group.items.map((r) => r.seat_id));
    } catch (e) {
      setEditError(e.message || "Nu s-au putut încărca locurile");
    } finally {
      setEditLoading(false);
    }
  }

  function closeEditDialog() {
    setEditGroup(null);
    setEditSeats([]);
    setEditSelectedIds([]);
    setEditError("");
  }

  function toggleEditSeat(seatId) {
    setEditSelectedIds((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  }

  async function saveEditDialog() {
    if (!editGroup || editSelectedIds.length === 0) return;
    setEditSaving(true);
    setEditError("");
    try {
      await Promise.all(
        editGroup.items.map((r) =>
          isAdmin ? reservationsApi.removeAdmin(r.id) : reservationsApi.removeMine(r.id)
        )
      );
      if (isAdmin) {
        await reservationsApi.createAdminBulk({
          user_id: editGroup.user_id,
          screening_id: editGroup.screening_id,
          seat_ids: editSelectedIds,
          modified: true,
        });
      } else {
        await reservationsApi.createMineBulk({
          screening_id: editGroup.screening_id,
          seat_ids: editSelectedIds,
          modified: true,
        });
      }
      closeEditDialog();
      await loadData();
    } catch (e) {
      setEditError(e.message || "Nu s-a putut modifica rezervarea");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <PageFrame
      title="Rezervări"
      actions={
        <>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută film, sală, loc..."
            className="w-48"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">Cele mai noi</SelectItem>
              <SelectItem value="created-asc">Cele mai vechi</SelectItem>
              <SelectItem value="start-desc">Proiecție (desc)</SelectItem>
              <SelectItem value="start-asc">Proiecție (asc)</SelectItem>
              <SelectItem value="movie-asc">Film A-Z</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setFormError(""); setFormOpen(true); }} className="shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Rezervare nouă
          </Button>
        </>
      }
    >
      {/* ── Booking dialog ─────────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              Rezervare nouă
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-1 pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              {isAdmin ? (
                <div className="space-y-2">
                  <Label>Utilizator</Label>
                  <Select value={form.user_id} onValueChange={(v) => setForm((p) => ({ ...p, user_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Alege utilizator" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.first_name} {u.last_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rezervat pe numele</p>
                    <p className="text-sm font-semibold">{user?.first_name} {user?.last_name}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Proiecție</Label>
                <Select
                  value={form.screening_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, screening_id: v, seat_ids: [] }))}
                >
                  <SelectTrigger><SelectValue placeholder="Alege proiecția" /></SelectTrigger>
                  <SelectContent>
                    {filteredScreenings.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.movie?.title || "Film"} — {formatDate(s.start_time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected screening preview */}
            {selectedScreening && (
              <div className="flex gap-3 overflow-hidden rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {selectedScreening.movie?.image_url ? (
                    <img
                      src={resolveImageUrl(selectedScreening.movie.image_url)}
                      alt={selectedScreening.movie.title || "Movie"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{selectedScreening.movie?.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-primary" />
                      {formatDate(selectedScreening.start_time)}
                    </span>
                    {selectedScreening.hall?.name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-primary" />
                        {selectedScreening.hall.name}
                      </span>
                    )}
                  </div>
                  {selectedSeatLabels.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-muted-foreground">Locuri:</span>
                      {selectedSeatLabels.map((label) => (
                        <Badge
                          key={label}
                          className="rounded-full border-primary/30 bg-primary/10 px-2 font-mono text-xs text-primary"
                          variant="outline"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seat picker */}
            <div>
              <Label className="mb-2 block">Alege locuri</Label>
              <SeatPicker
                seats={availableSeats}
                selectedSeatIds={form.seat_ids}
                onToggleSeat={toggleSeat}
              />
            </div>

            {formError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}

            {/* Submit row */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={createReservation}
                disabled={saving || !form.screening_id || form.seat_ids.length === 0}
                className="gap-2 shadow-md"
              >
                <Ticket className="h-4 w-4" />
                {saving
                  ? "Se procesează..."
                  : form.seat_ids.length > 0
                  ? `Rezervă ${form.seat_ids.length} loc${form.seat_ids.length > 1 ? "uri" : ""}`
                  : "Rezervă"}
              </Button>

              {movieFilterId ? (
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link to="/movies">← Înapoi la filme</Link>
                </Button>
              ) : screeningFilterId ? (
                <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
                  <Link to="/screenings">← Înapoi la proiecții</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit seats dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!editGroup} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-border/50 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              Modifică locurile
              {editGroup && screeningsById[editGroup.screening_id]?.movie?.title && (
                <span className="font-normal text-muted-foreground">
                  — {screeningsById[editGroup.screening_id].movie.title}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto py-3">
            {/* Screening info strip */}
            {editGroup && screeningsById[editGroup.screening_id] && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-primary" />
                  {formatDate(screeningsById[editGroup.screening_id].start_time)}
                </span>
                {screeningsById[editGroup.screening_id].hall?.name && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {screeningsById[editGroup.screening_id].hall.name}
                  </span>
                )}
              </div>
            )}

            {/* Selected seats preview */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {editSelectedIds.length === 0
                  ? "Niciun loc selectat"
                  : `${editSelectedIds.length} loc${editSelectedIds.length > 1 ? "uri" : ""} selectat${editSelectedIds.length > 1 ? "e" : ""}:`}
              </span>
              {editSelectedIds.map((id) => {
                const seat = editSeats.find((s) => s.id === id);
                return seat ? (
                  <Badge key={id} variant="outline" className="rounded-full border-primary/35 bg-primary/8 font-mono text-xs text-primary">
                    {seat.row}{seat.number}
                  </Badge>
                ) : null;
              })}
            </div>

            {/* Seat map */}
            {editLoading ? (
              <LoadingCard message="Se încarcă harta sălii..." />
            ) : (
              <SeatPicker
                seats={editSeats}
                selectedSeatIds={editSelectedIds}
                onToggleSeat={toggleEditSeat}
              />
            )}

            {editError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editError}
              </p>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border/50 pt-4">
            <Button variant="outline" onClick={closeEditDialog} disabled={editSaving}>
              Anulează
            </Button>
            <Button
              onClick={saveEditDialog}
              disabled={editSaving || editSelectedIds.length === 0 || editLoading}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {editSaving
                ? "Se salvează..."
                : `Salvează ${editSelectedIds.length > 0 ? editSelectedIds.length + " loc" + (editSelectedIds.length > 1 ? "uri" : "") : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {error && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <LoadingCard message="Se încarcă rezervările..." />
      ) : filteredGroupedReservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Ticket className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {query ? "Nicio rezervare găsită" : "Nu ai rezervări încă"}
          </p>
          {!query && (
            <Button size="sm" onClick={() => setFormOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Rezervare nouă
            </Button>
          )}
        </div>
      ) : isAdmin ? (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Film</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Proiecție</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Sală</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Utilizator</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Locuri</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupedReservations.map((group, idx) => {
                    const screening = screeningsById[group.screening_id];
                    const ownerLabel = group.user
                      ? `${group.user.first_name} ${group.user.last_name}`
                      : usersById[group.user_id]
                      ? `${usersById[group.user_id].first_name} ${usersById[group.user_id].last_name}`
                      : group.user_id?.slice(0, 8);
                    const seatLabels = group.items.map((r) =>
                      r.seat ? `${r.seat.row}${r.seat.number}` : null
                    ).filter(Boolean);

                    return (
                      <tr
                        key={group.key}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 tabular-nums text-foreground/50">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {screening?.movie?.title || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-foreground">
                          {formatDate(screening?.start_time)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {screening?.hall?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-foreground">{ownerLabel || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {seatLabels.map((label) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className="rounded-full border-primary/35 bg-primary/8 font-mono text-xs text-primary"
                              >
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 rounded-full"
                              onClick={() => openEditDialog(group)}
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                              <span className="hidden lg:inline">Modifică</span>
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-500/90"
                              onClick={() => deleteGroup(group.items.map((r) => r.id))}
                            >
                              <X className="h-3.5 w-3.5" />
                              Anulează
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroupedReservations.map((group) => {
            const screening = screeningsById[group.screening_id];
            const ownerLabel = group.user
              ? `${group.user.first_name} ${group.user.last_name}`
              : usersById[group.user_id]
              ? `${usersById[group.user_id].first_name} ${usersById[group.user_id].last_name}`
              : group.user_id?.slice(0, 8);

            return (
              <ReservationCard
                key={group.key}
                group={group}
                screening={screening}
                ownerLabel={ownerLabel}
                isAdmin={isAdmin}
                onDelete={() => deleteGroup(group.items.map((r) => r.id))}
                onEdit={() => openEditDialog(group)}
              />
            );
          })}
        </div>
      )}
    </PageFrame>
  );
}
