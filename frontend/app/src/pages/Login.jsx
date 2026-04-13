import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Film, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const targetRoute = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(targetRoute, { replace: true });
    } catch (submissionError) {
      setError(submissionError.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_hsl(var(--accent)/0.35),_transparent_42%),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.24),_transparent_38%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 rounded-3xl border border-border/70 bg-card/75 p-6 shadow-2xl backdrop-blur lg:grid-cols-[1.05fr_1fr] lg:p-10">
          <div className="hidden rounded-3xl border border-border/60 bg-gradient-to-br from-orange-100 via-amber-50 to-sky-100 p-8 text-slate-800 shadow-inner lg:block">
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">Cinema App</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">Book your perfect movie night.</h1>
            <p className="mt-4 max-w-md text-sm text-slate-600">
              Discover screenings, select your favorite seats, and manage your reservations in a clean,
              friendly experience.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 text-xs font-medium text-slate-700">
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">Fast seat booking</div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">Smart admin panel</div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">Movie galleries</div>
              <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm">Role-based access</div>
            </div>
          </div>

          <Card className="border-border/70 bg-card/95 shadow-xl">
            <CardHeader>
              <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Film className="h-3.5 w-3.5" />
                Welcome
              </div>
              <CardTitle className="text-3xl">Sign in</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>

                {error ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                ) : null}

                <Button className="w-full shadow-lg" type="submit" disabled={submitting}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {submitting ? "Signing in..." : "Sign in"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  No account yet?{" "}
                  <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/register">
                    Create one
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
