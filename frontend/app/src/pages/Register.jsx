import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Mail, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const initialForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  password: "",
};

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Email verification state ──────────────────────────────────────────────
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "email") {
      setCodeSent(false);
      setVerified(false);
      setCode("");
      setVerifyError("");
    }
  }

  async function handleSendCode() {
    if (!form.email) return;
    setSending(true);
    setVerifyError("");
    try {
      await authApi.sendVerificationCode(form.email);
      setCodeSent(true);
    } catch (e) {
      setVerifyError(e.message || "Nu s-a putut trimite codul.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode() {
    if (!code || code.length !== 6) return;
    setVerifying(true);
    setVerifyError("");
    try {
      await authApi.checkVerificationCode(form.email, code);
      setVerified(true);
    } catch (e) {
      setVerifyError(e.message || "Cod incorect sau expirat.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!verified) {
      setError("Verifică adresa de email înainte de a crea contul.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/login", { replace: true });
    } catch (e) {
      setError(e.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-2xl items-center justify-center py-8">
      <Card className="w-full border-border/70 bg-card/90 p-2 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Creează cont</CardTitle>

        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            {/* First / Last name */}
            <div className="space-y-2">
              <Label htmlFor="first-name">Prenume</Label>
              <Input
                id="first-name"
                value={form.first_name}
                onChange={(e) => updateForm("first_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Nume</Label>
              <Input
                id="last-name"
                value={form.last_name}
                onChange={(e) => updateForm("last_name", e.target.value)}
                required
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
                required
              />
            </div>

            {/* Email + verification */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  required
                  className={verified ? "border-green-500 focus-visible:ring-green-400" : ""}
                />
                {verified ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/10 px-3 text-xs font-semibold text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verificat
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={!form.email || sending}
                    onClick={handleSendCode}
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Mail className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">{codeSent ? "Retrimite" : "Trimite cod"}</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Code input — shown after sending, hidden after verified */}
            {codeSent && !verified && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="verify-code">Cod de verificare</Label>
                <div className="flex gap-2">
                  <Input
                    id="verify-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="_ _ _ _ _ _"
                    className="max-w-[180px] text-center text-xl font-bold tracking-[0.5em]"
                    autoFocus
                  />
                  <Button
                    type="button"
                    disabled={code.length !== 6 || verifying}
                    onClick={handleVerifyCode}
                    className="gap-1.5"
                  >
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Verifică
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Codul a fost trimis la{" "}
                  <span className="font-medium text-foreground">{form.email}</span>.
                  Verifică și folderul Spam.
                </p>
              </div>
            )}

            {/* Verification error */}
            {verifyError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                {verifyError}
              </p>
            )}

            {/* Password */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                required
              />
            </div>

            {/* Submit error */}
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                {error}
              </p>
            )}

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={submitting || !verified}
                className="w-full shadow-md"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                {submitting ? "Se creează contul..." : "Creează cont"}
              </Button>
              {!verified && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Verifică adresa de email pentru a putea crea contul.
                </p>
              )}
            </div>

            <p className="text-center text-sm text-muted-foreground md:col-span-2">
              Ai deja cont?{" "}
              <Link
                className="font-semibold text-primary underline-offset-4 hover:underline"
                to="/login"
              >
                Autentifică-te
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
