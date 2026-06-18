import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Film, ImagePlus, Pencil, Plus, Star, Trash2, UploadCloud } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { moviesApi, resolveImageUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

function StarDisplay({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </div>
  );
}

const emptyMovie = {
  title: "",
  description: "",
  duration: "",
  image_url: "",
  banner_image_url: "",
  trailer_url: "",
  genre: "",
  director: "",
  actors: "",
  rating: "",
};

function MovieDialog({ trigger, initialValue, onSave }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialValue || emptyMovie);

  useEffect(() => {
    if (open) {
      setForm(initialValue || emptyMovie);
      setError("");
    }
  }, [initialValue, open]);

  function field(key) {
    return (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  }

  async function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setUploading(true);
    setError("");
    try {
      const result = await moviesApi.uploadImage(selected);
      setForm((p) => ({ ...p, image_url: result.image_url }));
    } catch (err) {
      setError(err.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleBannerChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setUploadingBanner(true);
    setError("");
    try {
      const result = await moviesApi.uploadBanner(selected);
      setForm((p) => ({ ...p, banner_image_url: result.image_url }));
    } catch (err) {
      setError(err.message || "Banner upload failed");
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleSave() {
    setSubmitting(true);
    setError("");
    try {
      await onSave({
        ...(initialValue?.id ? { id: initialValue.id } : {}),
        title: form.title,
        description: form.description,
        duration: Number(form.duration),
        image_url: form.image_url || null,
        banner_image_url: form.banner_image_url || null,
        trailer_url: form.trailer_url || null,
        genre: form.genre || null,
        director: form.director || null,
        actors: form.actors || null,
        rating: form.rating || null,
      });
      setOpen(false);
    } catch (saveError) {
      setError(saveError.message || "Could not save movie");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border/50 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Film className="h-5 w-5 text-primary" />
            {initialValue ? `Edit — ${initialValue.title}` : "Adaugă film"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="grid gap-6 md:grid-cols-[176px_1fr]">

            {/* ── Left: poster + banner ─────────────────────── */}
            <div className="space-y-4">
              {/* Poster */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Poster (2:3)</p>
                <label className="group relative block cursor-pointer">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-muted">
                    {form.image_url ? (
                      <img
                        src={resolveImageUrl(form.image_url)}
                        alt="Poster preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
                        <Film className="h-10 w-10" />
                        <span className="text-xs">Niciun poster</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      {uploading ? (
                        <span className="text-xs font-semibold text-white">Se încarcă...</span>
                      ) : (
                        <>
                          <UploadCloud className="h-7 w-7 text-white" />
                          <span className="text-xs font-semibold text-white">
                            {form.image_url ? "Change poster" : "Upload poster"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                </label>
                <Input
                  value={form.image_url || ""}
                  onChange={field("image_url")}
                  placeholder="sau introdu URL…"
                  className="h-8 text-xs"
                />
              </div>

              {/* Banner */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Banner Hero (16:9)</p>
                <label className="group relative block cursor-pointer">
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
                    {form.banner_image_url ? (
                      <img
                        src={resolveImageUrl(form.banner_image_url)}
                        alt="Banner preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/40">
                        <UploadCloud className="h-8 w-8" />
                        <span className="text-xs">Niciun banner</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-black/55 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      {uploadingBanner ? (
                        <span className="text-xs font-semibold text-white">Se încarcă...</span>
                      ) : (
                        <>
                          <UploadCloud className="h-7 w-7 text-white" />
                          <span className="text-xs font-semibold text-white">
                            {form.banner_image_url ? "Change banner" : "Upload banner"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleBannerChange}
                    disabled={uploadingBanner}
                  />
                </label>
                <Input
                  value={form.banner_image_url || ""}
                  onChange={field("banner_image_url")}
                  placeholder="Or paste URL…"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* ── Right: fields ─────────────────────────────── */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mv-title">Titlu</Label>
                <Input
                  id="mv-title"
                  value={form.title}
                  onChange={field("title")}
                  className="font-semibold"
                  placeholder="Titlul filmului"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mv-desc">Descriere</Label>
                <Textarea
                  id="mv-desc"
                  value={form.description}
                  onChange={field("description")}
                  rows={3}
                  placeholder="O scurtă descriere..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mv-dur">Durată (min)</Label>
                  <Input
                    id="mv-dur"
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={field("duration")}
                    placeholder="120"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mv-rating">Rating</Label>
                  <Input
                    id="mv-rating"
                    value={form.rating || ""}
                    onChange={field("rating")}
                    placeholder="PG-13, 8.5/10…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="mv-genre">Gen</Label>
                  <Input
                    id="mv-genre"
                    value={form.genre || ""}
                    onChange={field("genre")}
                    placeholder="Acțiune, Dramă…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mv-dir">Director</Label>
                  <Input
                    id="mv-dir"
                    value={form.director || ""}
                    onChange={field("director")}
                    placeholder="Numele directorului"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mv-actors">Actori</Label>
                <Textarea
                  id="mv-actors"
                  value={form.actors || ""}
                  onChange={field("actors")}
                  rows={2}
                  placeholder="Actor 1, Actor 2…"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mv-trailer">Trailer YouTube</Label>
                <Input
                  id="mv-trailer"
                  value={form.trailer_url || ""}
                  onChange={field("trailer_url")}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter className="shrink-0 border-t border-border/50 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Închide
          </Button>
          <Button onClick={handleSave} disabled={submitting} className="gap-2">
            <Check className="h-4 w-4" />
            {submitting ? "Se salvează..." : "Salvează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MoviesPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [movies, setMovies] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("title-asc");

  async function loadMovies() {
    setLoading(true);
    setError("");

    try {
      const data = await moviesApi.list();
      setMovies(data);
    } catch (loadError) {
      setError(loadError.message || "Could not load movies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovies();
  }, []);

  async function saveMovie(movie) {
    if (movie.id) {
      await moviesApi.update(movie.id, movie);
    } else {
      await moviesApi.create(movie);
    }
    await loadMovies();
  }

  async function deleteMovie(movieId) {
    await moviesApi.remove(movieId);
    await loadMovies();
  }

  const filteredMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = normalizedQuery
      ? movies.filter((movie) => {
          const title = movie.title?.toLowerCase() || "";
          const description = movie.description?.toLowerCase() || "";
          const genre = movie.genre?.toLowerCase() || "";
          const director = movie.director?.toLowerCase() || "";
          const actors = movie.actors?.toLowerCase() || "";
          return (
            title.includes(normalizedQuery) ||
            description.includes(normalizedQuery) ||
            genre.includes(normalizedQuery) ||
            director.includes(normalizedQuery) ||
            actors.includes(normalizedQuery)
          );
        })
      : movies;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title-desc": return b.title.localeCompare(a.title);
        case "duration-asc": return (a.duration || 0) - (b.duration || 0);
        case "duration-desc": return (b.duration || 0) - (a.duration || 0);
        default: return a.title.localeCompare(b.title);
      }
    });
  }, [movies, query, sortBy]);

  return (
    <PageFrame
      title="Filme"

      actions={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută filme"
            className="w-48"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title-asc">Titlu A-Z</SelectItem>
              <SelectItem value="title-desc">Titlu Z-A</SelectItem>
              <SelectItem value="duration-asc">Durată (cea mai scurtă)</SelectItem>
              <SelectItem value="duration-desc">Durată (cea mai lungă)</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin ? (
            <MovieDialog
              onSave={saveMovie}
              trigger={
                <Button className="shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  Adaugă film
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
        <LoadingCard message="Se încarcă filme..." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMovies.map((movie) => (
            <Card key={movie.id} className="flex flex-col overflow-hidden border-border/70 bg-card/92 pt-0 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              <Link to={`/movies/${movie.id}`} className="block">
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
                  {movie.image_url ? (
                    <img
                      src={resolveImageUrl(movie.image_url)}
                      alt={movie.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                      <ImagePlus className="h-5 w-5" />
                      Niciun poster
                    </div>
                  )}
                </div>
              </Link>

              <CardHeader className="space-y-1 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1 text-lg">
                    <Link to={`/movies/${movie.id}`} className="hover:underline">
                      {movie.title}
                    </Link>
                  </CardTitle>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    {movie.rating ? (
                      <Badge variant="outline" className="rounded-full">{movie.rating}</Badge>
                    ) : null}
                    <Badge variant="secondary" className="rounded-full">{movie.duration}m</Badge>
                  </div>
                </div>
                {movie.avg_rating != null ? (
                  <div className="flex items-center gap-1.5">
                    <StarDisplay rating={movie.avg_rating} />
                    <span className="text-xs font-semibold text-amber-500">{movie.avg_rating}</span>
                    <span className="text-xs text-muted-foreground">({movie.review_count})</span>
                  </div>
                ) : null}
                {movie.genre ? (
                  <p className="text-xs text-muted-foreground">{movie.genre}</p>
                ) : null}
                {movie.director ? (
                  <p className="text-xs text-muted-foreground">Regizor: {movie.director}</p>
                ) : null}
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">{movie.description}</p>

                {movie.actors ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    <span className="font-medium">Actori:</span> {movie.actors}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/screenings?movie=${movie.id}`}>Proiecții</Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/reservations?movie=${movie.id}`}>Rezervă</Link>
                  </Button>
                </div>

                {isAdmin ? (
                  <div className="flex gap-2">
                    <MovieDialog
                      initialValue={movie}
                      onSave={saveMovie}
                      trigger={
                        <Button size="sm" className="gap-1.5 rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-500/90">
                          <Pencil className="h-3.5 w-3.5" />
                          Modifică
                        </Button>
                      }
                    />
                    <Button size="sm" className="gap-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-500/90" onClick={() => deleteMovie(movie.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Șterge
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {filteredMovies.length === 0 ? (
            <Card className="border-border/70 bg-card/92 sm:col-span-2 xl:col-span-3">
              <CardContent className="p-6 text-sm text-muted-foreground">No movies found.</CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
