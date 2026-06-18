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

  const from = location.state?.from;
  const targetRoute = from ? `${from.pathname}${from.search || ""}` : "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(targetRoute, { replace: true });
    } catch (submissionError) {
      setError(submissionError.message || "Autentificare eșuată.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-md items-center justify-center py-8">
      <Card className="w-full border-border/70 bg-card/95 shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl">Autentifică-te</CardTitle>
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
              <Label htmlFor="password">Parolă</Label>
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
              {submitting ? "Se conectează..." : "Autentifică-te"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Nu ai cont?{" "}
              <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/register">
                Creează-ți unul
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
