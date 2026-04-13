import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Pencil, Plus, Trash2, UploadCloud } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { moviesApi, resolveImageUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

const emptyMovie = {
  title: "",
  description: "",
  duration: "",
  image_url: "",
};

function MovieDialog({ trigger, initialValue, onSave }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState(initialValue || emptyMovie);

  useEffect(() => {
    if (open) {
      setForm(initialValue || emptyMovie);
      setFile(null);
      setError("");
    }
  }, [initialValue, open]);

  async function handleUpload() {
    if (!file) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const result = await moviesApi.uploadImage(file);
      setForm((previous) => ({ ...previous, image_url: result.image_url }));
    } catch (uploadError) {
      setError(uploadError.message || "Image upload failed");
    } finally {
      setUploading(false);
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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initialValue ? "Edit movie" : "Add movie"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="movie-title">Title</Label>
            <Input
              id="movie-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="movie-description">Description</Label>
            <Textarea
              id="movie-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="movie-duration">Duration (minutes)</Label>
              <Input
                id="movie-duration"
                type="number"
                min={1}
                value={form.duration}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, duration: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="movie-image">Poster URL (optional)</Label>
              <Input
                id="movie-image"
                value={form.image_url || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, image_url: event.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="movie-file">Upload image from your computer</Label>
                <Input
                  id="movie-file"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                {uploading ? "Uploading..." : "Upload image"}
              </Button>
            </div>

            {form.image_url ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-border/70 bg-card">
                <img
                  src={resolveImageUrl(form.image_url)}
                  alt="Movie preview"
                  className="h-44 w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting ? "Saving..." : "Save movie"}
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
    if (!normalizedQuery) {
      return movies;
    }

    return movies.filter((movie) => {
      const title = movie.title?.toLowerCase() || "";
      const description = movie.description?.toLowerCase() || "";
      return title.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }, [movies, query]);

  return (
    <PageFrame
      title="Movies"
      description={
        isAdmin
          ? "Create, update and organize your movie catalog."
          : "Choose a movie and continue to reservation."
      }
      actions={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies"
            className="w-56"
          />
          {isAdmin ? (
            <MovieDialog
              onSave={saveMovie}
              trigger={
                <Button className="shadow-md">
                  <Plus className="mr-2 h-4 w-4" />
                  Add movie
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
        <LoadingCard message="Loading movies..." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMovies.map((movie) => (
            <Card key={movie.id} className="overflow-hidden border-border/70 bg-card/92 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              <div className="aspect-[4/5] w-full bg-muted">
                {movie.image_url ? (
                  <img
                    src={resolveImageUrl(movie.image_url)}
                    alt={movie.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                    No poster provided
                  </div>
                )}
              </div>

              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="line-clamp-1 text-lg">{movie.title}</CardTitle>
                  <Badge variant="secondary" className="rounded-full">{movie.duration}m</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="line-clamp-3 text-sm text-muted-foreground">{movie.description}</p>

                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/screenings?movie=${movie.id}`}>View screenings</Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/reservations?movie=${movie.id}`}>Reserve</Link>
                  </Button>

                  {isAdmin ? (
                    <>
                      <MovieDialog
                        initialValue={movie}
                        onSave={saveMovie}
                        trigger={
                          <Button variant="outline" size="icon-sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button variant="destructive" size="icon-sm" onClick={() => deleteMovie(movie.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
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
