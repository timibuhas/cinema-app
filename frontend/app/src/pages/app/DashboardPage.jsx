import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Film, Ticket, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hallsApi, moviesApi, reservationsApi, screeningsApi, usersApi, resolveImageUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import PageFrame from "@/pages/app/PageFrame";
import StatCard from "@/pages/app/StatCard";
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
          isAdmin ? reservationsApi.listAll() : reservationsApi.listMine(),
          isAdmin ? hallsApi.list() : Promise.resolve([]),
          isAdmin ? usersApi.list() : Promise.resolve([]),
        ]);

        if (!mounted) {
          return;
        }

        setData({ movies, screenings, reservations, halls, users });
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(loadError.message || "Failed to load dashboard data");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const upcomingScreenings = useMemo(() => {
    return [...data.screenings]
      .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
      .slice(0, 8);
  }, [data.screenings]);

  const screeningsByMovie = useMemo(() => {
    const map = new Map();

    data.screenings.forEach((screening) => {
      const current = map.get(screening.movie_id) || [];
      current.push(screening);
      map.set(screening.movie_id, current);
    });

    map.forEach((value, key) => {
      map.set(
        key,
        [...value].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      );
    });

    return map;
  }, [data.screenings]);

  const featuredMovies = useMemo(() => data.movies.slice(0, 8), [data.movies]);

  if (loading) {
    return <LoadingCard message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/10">
        <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <PageFrame
        title={`Hi, ${user?.first_name || "there"}`}
        description="Pick a movie and jump straight to reservation."
      >
        <Card className="overflow-hidden border-border/70 bg-gradient-to-r from-orange-100 via-amber-50 to-sky-100 shadow-lg">
          <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-600">Tonight at your cinema</p>
              <h2 className="text-2xl font-bold text-slate-900">Browse movies and reserve in one click</h2>
            </div>
            <Button asChild className="shadow-md">
              <Link to="/reservations">Open reservations</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredMovies.map((movie) => {
            const nextScreening = screeningsByMovie.get(movie.id)?.[0];
            return (
              <Card key={movie.id} className="overflow-hidden border-border/70 bg-card/90 shadow-lg transition hover:-translate-y-0.5">
                <div className="aspect-[4/5] w-full bg-muted">
                  {movie.image_url ? (
                    <img
                      src={resolveImageUrl(movie.image_url)}
                      alt={movie.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No poster
                    </div>
                  )}
                </div>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-tight">{movie.title}</p>
                    <Badge variant="secondary" className="rounded-full">
                      {movie.duration}m
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{movie.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {nextScreening ? `Next: ${formatDate(nextScreening.start_time)}` : "No screenings yet"}
                  </p>
                  <Button asChild className="w-full">
                    <Link to={`/reservations?movie=${movie.id}`}>Reserve this movie</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-border/70 bg-card/90 shadow-md">
          <CardHeader>
            <CardTitle>Upcoming screenings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingScreenings.map((screening) => (
              <div
                key={screening.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 p-3"
              >
                <p className="font-medium">{screening.movie?.title || "Movie"}</p>
                <Badge variant="outline" className="rounded-full">
                  {formatDate(screening.start_time)}
                </Badge>
              </div>
            ))}
            {upcomingScreenings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No screenings available.</p>
            ) : null}
          </CardContent>
        </Card>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      title="Admin Dashboard"
      description={`Signed in as ${user?.first_name} ${user?.last_name}.`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Film} label="Movies" value={data.movies.length} hint="Catalog entries" />
        <StatCard icon={CalendarDays} label="Screenings" value={data.screenings.length} hint="Scheduled slots" />
        <StatCard icon={Ticket} label="Reservations" value={data.reservations.length} hint="All users" />
        <StatCard icon={Users} label="Users" value={data.users.length} hint="Registered accounts" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="border-border/70 bg-card/90 shadow-md">
          <CardHeader>
            <CardTitle>Upcoming screenings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingScreenings.map((screening) => (
              <div
                key={screening.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 p-3"
              >
                <div>
                  <p className="font-medium">{screening.movie?.title || "Movie"}</p>
                  <p className="text-xs text-muted-foreground">Hall: {screening.hall?.name || "-"}</p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {formatDate(screening.start_time)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90 shadow-md">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/movies">Manage movies</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/screenings">Manage screenings</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/halls">Manage halls</Link></Button>
            <Button asChild variant="outline" className="w-full justify-start"><Link to="/users">Manage users</Link></Button>
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}
