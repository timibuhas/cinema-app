import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SeatPicker from "@/components/SeatPicker";
import {
  reservationsApi,
  screeningsApi,
  usersApi,
  resolveImageUrl,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ReservationsPage() {
  const { isAdmin, user } = useAuth();
  const [searchParams] = useSearchParams();
  const movieFilterId = searchParams.get("movie") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [screenings, setScreenings] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [availableSeats, setAvailableSeats] = useState([]);

  const [form, setForm] = useState({
    screening_id: "",
    seat_ids: [],
    user_id: "",
  });

  const screeningsById = useMemo(
    () => Object.fromEntries(screenings.map((screening) => [screening.id, screening])),
    [screenings]
  );

  const usersById = useMemo(
    () => Object.fromEntries(users.map((entry) => [entry.id, entry])),
    [users]
  );

  const filteredScreenings = useMemo(() => {
    if (!movieFilterId) {
      return screenings;
    }

    return screenings.filter((screening) => screening.movie_id === movieFilterId);
  }, [movieFilterId, screenings]);

  const selectedScreening = screeningsById[form.screening_id] || null;

  const selectedSeatLabels = useMemo(() => {
    const seatLookup = new Map(availableSeats.map((seat) => [seat.id, seat]));
    return form.seat_ids
      .map((seatId) => seatLookup.get(seatId))
      .filter(Boolean)
      .map((seat) => `${seat.row}${seat.number}`);
  }, [availableSeats, form.seat_ids]);

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

      setForm((previous) => {
        const next = { ...previous };

        if (isAdmin && !next.user_id && usersData[0]) {
          next.user_id = usersData[0].id;
        }

        const fallbackScreening = movieFilterId
          ? screeningsData.find((entry) => entry.movie_id === movieFilterId)
          : screeningsData[0];

        if (!next.screening_id && fallbackScreening) {
          next.screening_id = fallbackScreening.id;
        }

        return next;
      });
    } catch (loadError) {
      setError(loadError.message || "Could not load reservations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    if (!movieFilterId || !screenings.length) {
      return;
    }

    const current = screeningsById[form.screening_id];
    if (current?.movie_id === movieFilterId) {
      return;
    }

    const firstMatch = screenings.find((screening) => screening.movie_id === movieFilterId);
    if (!firstMatch) {
      return;
    }

    setForm((previous) => ({ ...previous, screening_id: firstMatch.id, seat_ids: [] }));
  }, [movieFilterId, screenings, screeningsById, form.screening_id]);

  useEffect(() => {
    let mounted = true;

    async function loadSeats() {
      if (!form.screening_id) {
        setAvailableSeats([]);
        return;
      }

      try {
        const seats = await screeningsApi.seats(form.screening_id);
        if (!mounted) {
          return;
        }

        setAvailableSeats(seats);

        const validSeatIds = new Set(seats.map((seat) => seat.id));
        setForm((previous) => ({
          ...previous,
          seat_ids: previous.seat_ids.filter((seatId) => validSeatIds.has(seatId)),
        }));
      } catch (loadSeatsError) {
        if (mounted) {
          setAvailableSeats([]);
          setError(loadSeatsError.message || "Could not load available seats");
        }
      }
    }

    loadSeats();

    return () => {
      mounted = false;
    };
  }, [form.screening_id]);

  function toggleSeatSelection(seatId) {
    setForm((previous) => {
      if (previous.seat_ids.includes(seatId)) {
        return { ...previous, seat_ids: previous.seat_ids.filter((id) => id !== seatId) };
      }

      return { ...previous, seat_ids: [...previous.seat_ids, seatId] };
    });
  }

  async function createReservation() {
    if (!form.screening_id || form.seat_ids.length === 0) {
      setError("Select screening and at least one seat.");
      return;
    }

    if (isAdmin && !form.user_id) {
      setError("Select user for admin reservation.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (isAdmin) {
        await reservationsApi.createAdminBulk({
          user_id: form.user_id,
          screening_id: form.screening_id,
          seat_ids: form.seat_ids,
        });
      } else {
        await reservationsApi.createMineBulk({
          screening_id: form.screening_id,
          seat_ids: form.seat_ids,
        });
      }

      setForm((previous) => ({ ...previous, seat_ids: [] }));
      await loadData();
    } catch (saveError) {
      setError(saveError.message || "Could not create reservation");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReservation(reservationId) {
    try {
      if (isAdmin) {
        await reservationsApi.removeAdmin(reservationId);
      } else {
        await reservationsApi.removeMine(reservationId);
      }

      await loadData();
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete reservation");
    }
  }

  return (
    <PageFrame
      title="Reservations"
      description={
        isAdmin
          ? "Reserve one or many seats for any user."
          : "Select multiple seats and book them for your account."
      }
    >
      {error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingCard message="Loading reservations..." />
      ) : (
        <>
          <Card className="border-border/70 bg-card/92 shadow-md">
            <CardHeader>
              <CardTitle>Create reservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {isAdmin ? (
                  <div className="space-y-2">
                    <Label>User</Label>
                    <Select
                      value={form.user_id}
                      onValueChange={(value) => setForm((previous) => ({ ...previous, user_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((entry) => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.first_name} {entry.last_name} ({entry.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Reservation owner</p>
                    <p className="text-sm font-semibold">
                      {user?.first_name} {user?.last_name}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Screening</Label>
                  <Select
                    value={form.screening_id}
                    onValueChange={(value) =>
                      setForm((previous) => ({ ...previous, screening_id: value, seat_ids: [] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose screening" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredScreenings.map((screening) => (
                        <SelectItem key={screening.id} value={screening.id}>
                          {screening.movie?.title || "Movie"} - {formatDate(screening.start_time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedScreening ? (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/70 md:flex">
                  <div className="h-40 w-full bg-muted md:h-auto md:w-40">
                    {selectedScreening.movie?.image_url ? (
                      <img
                        src={resolveImageUrl(selectedScreening.movie.image_url)}
                        alt={selectedScreening.movie?.title || "Movie"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <p className="font-semibold">{selectedScreening.movie?.title || "Movie"}</p>
                    <p className="text-sm text-muted-foreground">Hall: {selectedScreening.hall?.name || "-"}</p>
                    <p className="text-sm text-muted-foreground">Starts: {formatDate(selectedScreening.start_time)}</p>
                    <p className="pt-1 text-xs text-primary">
                      Selected seats: {selectedSeatLabels.length ? selectedSeatLabels.join(", ") : "none"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div>
                <Label className="mb-2">Seats (multi-select)</Label>
                <SeatPicker
                  seats={availableSeats}
                  selectedSeatIds={form.seat_ids}
                  onToggleSeat={toggleSeatSelection}
                />
              </div>

              <Button
                onClick={createReservation}
                disabled={saving || !form.screening_id || form.seat_ids.length === 0}
                className="shadow-md"
              >
                <Plus className="mr-2 h-4 w-4" />
                {saving ? "Creating..." : `Create ${form.seat_ids.length} reservation(s)`}
              </Button>

              {movieFilterId ? (
                <Button asChild variant="link" className="px-0 text-primary">
                  <Link to="/movies">Back to all movies</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/92 shadow-md">
            <CardHeader>
              <CardTitle>{isAdmin ? "All reservations" : "My reservations"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reservations.map((reservation) => {
                const screening = screeningsById[reservation.screening_id];
                const seatLabel = reservation.seat
                  ? `${reservation.seat.row}${reservation.seat.number}`
                  : reservation.seat_id?.slice(0, 8);

                const ownerLabel = reservation.user
                  ? `${reservation.user.first_name} ${reservation.user.last_name}`
                  : usersById[reservation.user_id]
                  ? `${usersById[reservation.user_id].first_name} ${usersById[reservation.user_id].last_name}`
                  : reservation.user_id?.slice(0, 8);

                return (
                  <div
                    key={reservation.id}
                    className="overflow-hidden rounded-xl border border-border/70 bg-background/70 shadow-sm md:flex"
                  >
                    <div className="h-28 w-full bg-muted md:h-auto md:w-28">
                      {screening?.movie?.image_url ? (
                        <img
                          src={resolveImageUrl(screening.movie.image_url)}
                          alt={screening?.movie?.title || "Movie"}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{screening?.movie?.title || "Movie"}</p>
                        <p className="text-xs text-muted-foreground">Hall: {screening?.hall?.name || "-"}</p>
                        <p className="text-xs text-muted-foreground">Start: {formatDate(screening?.start_time)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isAdmin ? (
                          <Badge variant="secondary" className="rounded-full">{ownerLabel}</Badge>
                        ) : null}
                        <Badge className="rounded-full">Seat {seatLabel}</Badge>
                        <Badge variant="outline" className="rounded-full">
                          Created {formatDate(reservation.reserved_at)}
                        </Badge>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => deleteReservation(reservation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reservations available.</p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </PageFrame>
  );
}
