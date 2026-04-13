import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";

const initialState = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  password: "",
};

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateForm(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await register(form);
      navigate("/login", { replace: true });
    } catch (submissionError) {
      setError(submissionError.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_hsl(var(--primary)/0.22),_transparent_40%),radial-gradient(circle_at_bottom_left,_hsl(var(--accent)/0.28),_transparent_44%)]" />

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <Card className="w-full border-border/70 bg-card/90 p-2 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <p className="text-sm text-muted-foreground">
              New accounts are created with role <span className="font-semibold text-foreground">user</span>.
            </p>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="first-name">First name</Label>
                <Input id="first-name" value={form.first_name} onChange={(e) => updateForm("first_name", e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input id="last-name" value={form.last_name} onChange={(e) => updateForm("last_name", e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} required />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} required />
              </div>

              {error ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                  {error}
                </p>
              ) : null}

              <div className="md:col-span-2">
                <Button type="submit" disabled={submitting} className="w-full shadow-md">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {submitting ? "Creating account..." : "Create account"}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground md:col-span-2">
                Already registered?{" "}
                <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/login">
                  Go to login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
