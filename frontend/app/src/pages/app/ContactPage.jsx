import { useState } from "react";
import { CheckCircle2, Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactApi } from "@/lib/api";
import PageFrame from "@/pages/app/PageFrame";

const INFO_ITEMS = [
  { icon: Mail, label: "Email", value: "contact@cinemaapp.ro" },
  { icon: Phone, label: "Telefon", value: "+40 700 000 000" },
  { icon: MapPin, label: "Adresă", value: "București, România" },
];

const EMPTY_FORM = { name: "", email: "", subject: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError("Completează toate câmpurile.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await contactApi.send(form);
      setSent(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || "A apărut o eroare. Încearcă din nou.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageFrame title="Contact">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
        {/* Info panel */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ai întrebări sau sugestii? Scrie-ne și îți vom răspunde în cel mai
            scurt timp.
          </p>
          <div className="space-y-3">
            {INFO_ITEMS.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/70 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="border-border/50 bg-card/70 shadow-md">
          <CardContent className="p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-500">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Mesaj trimis!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Îți vom răspunde în cel mai scurt timp.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSent(false)}>
                  Trimite alt mesaj
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Nume</Label>
                    <Input
                      id="contact-name"
                      placeholder="Numele tău"
                      value={form.name}
                      onChange={set("name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      placeholder="email@exemplu.ro"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-subject">Subiect</Label>
                  <Input
                    id="contact-subject"
                    placeholder="Subiectul mesajului"
                    value={form.subject}
                    onChange={set("subject")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">Mesaj</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="Scrie mesajul tău aici..."
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" disabled={submitting} className="w-full gap-2 shadow-md">
                  <Send className="h-4 w-4" />
                  {submitting ? "Se trimite..." : "Trimite mesajul"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </PageFrame>
  );
}
