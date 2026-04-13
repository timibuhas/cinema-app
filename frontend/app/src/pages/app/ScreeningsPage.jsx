import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarPlus, Pencil, Trash2 } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hallsApi, moviesApi, screeningsApi, resolveImageUrl } from "@/lib/api";
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

function toInputDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function ScreeningDialog({ trigger, movies, halls, initialValue, onSave }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ movie_id: "", hall_id: "", start_time: "" });

  useEffect(() => {
    if (!open) {
      return;
    }

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
            <Select value={form.movie_id} onValueChange={(value) => setForm((prev) => ({ ...prev, movie_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose movie" />
              </SelectTrigger>
              <SelectContent>
                {movies.map((movie) => (
                  <SelectItem key={movie.id} value={movie.id}>{movie.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Hall</Label>
            <Select value={form.hall_id} onValueChange={(value) => setForm((prev) => ({ ...prev, hall_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose hall" />
              </SelectTrigger>
              <SelectContent>
                {halls.map((hall) => (
                  <SelectItem key={hall.id} value={hall.id}>{hall.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-time">Start time</Label>
            <Input
              id="start-time"
              type="datetime-local"
              value={form.start_time}
              onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
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
    } catch (loadError) {
      setError(loadError.message || "Could not load screenings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveScreening(screening) {
    if (screening.id) {
      await screeningsApi.update(screening.id, screening);
    } else {
      await screeningsApi.create(screening);
    }

    await loadData();
  }

  async function removeScreening(screeningId) {
    await screeningsApi.remove(screeningId);
    await loadData();
  }

  const filteredScreenings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return screenings.filter((screening) => {
      if (movieFilterId && screening.movie_id !== movieFilterId) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const movieTitle = screening.movie?.title?.toLowerCase() || "";
      const hallName = screening.hall?.name?.toLowerCase() || "";
      return movieTitle.includes(normalizedQuery) || hallName.includes(normalizedQuery);
    });
  }, [movieFilterId, query, screenings]);

  return (
    <PageFrame
      title="Screenings"
      description={
        isAdmin
          ? "Create, update and delete screening slots."
          : "Choose a session and continue to reservation."
      }
      actions={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movie or hall"
            className="w-56"
          />

          {isAdmin ? (
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
          ) : null}
        </>
      }
    >
      {error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingCard message="Loading screenings..." />
      ) : (
        <div className="space-y-3">
          {filteredScreenings.map((screening) => (
            <Card key={screening.id} className="overflow-hidden border-border/70 bg-card/92 shadow-md">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-12 overflow-hidden rounded-md bg-muted">
                    {screening.movie?.image_url ? (
                      <img
                        src={resolveImageUrl(screening.movie.image_url)}
                        alt={screening.movie?.title || "Movie"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <CardTitle className="text-base">{screening.movie?.title || "Unknown movie"}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Hall: {screening.hall?.name || "-"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">{formatDate(screening.start_time)}</Badge>

                  <Button asChild variant="outline" size="sm">
                    <Link to={`/reservations?movie=${screening.movie_id}`}>Reserve seats</Link>
                  </Button>

                  {isAdmin ? (
                    <>
                      <ScreeningDialog
                        movies={movies}
                        halls={halls}
                        initialValue={screening}
                        onSave={saveScreening}
                        trigger={
                          <Button variant="outline" size="icon-sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />

                      <Button variant="destructive" size="icon-sm" onClick={() => removeScreening(screening.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredScreenings.length === 0 ? (
            <Card className="border-border/70 bg-card/92">
              <CardContent className="p-6 text-sm text-muted-foreground">No screenings matched.</CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
