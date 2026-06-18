import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usersApi } from "@/lib/api";
import PageFrame from "@/pages/app/PageFrame";
import LoadingCard from "@/pages/app/LoadingCard";

const emptyUser = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "user",
  password: "",
};

function UserDialog({ trigger, initialValue, onSave }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyUser);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialValue) {
      setForm({
        first_name: initialValue.first_name || "",
        last_name: initialValue.last_name || "",
        email: initialValue.email || "",
        phone: initialValue.phone || "",
        role: initialValue.role || "user",
        password: "",
      });
      return;
    }

    setForm(emptyUser);
  }, [initialValue, open]);

  async function handleSave() {
    setSubmitting(true);

    try {
      const payload = {
        ...(initialValue?.id ? { id: initialValue.id } : {}),
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      };

      await onSave(payload);
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
          <DialogTitle>{initialValue ? "Modifică utilizator" : "Crează utilizator"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="user-first-name">Prenume</Label>
            <Input
              id="user-first-name"
              value={form.first_name}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-last-name">Nume</Label>
            <Input
              id="user-last-name"
              value={form.last_name}
              onChange={(event) => setForm((prev) => ({ ...prev, last_name: event.target.value }))}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-phone">Telefon</Label>
            <Input
              id="user-phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">user</SelectItem>
                <SelectItem value="admin">admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="user-password">Parolă {initialValue ? "(opțional)" : ""}</Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required={!initialValue}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Se salvează..." : "Salvează"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? users.filter((u) => {
          const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
          return (
            fullName.includes(normalizedQuery) ||
            u.email?.toLowerCase().includes(normalizedQuery) ||
            u.phone?.toLowerCase().includes(normalizedQuery)
          );
        })
      : users;

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name-desc":
          return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
        case "email":
          return (a.email || "").localeCompare(b.email || "");
        case "role":
          return (a.role || "").localeCompare(b.role || "");
        default:
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      }
    });
  }, [users, query, sortBy]);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      setUsers(await usersApi.list());
    } catch (loadError) {
      setError(loadError.message || "Nu s-au putut încărca utilizatorii.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function saveUser(userPayload) {
    if (userPayload.id) {
      const { id, ...payload } = userPayload;
      await usersApi.update(id, payload);
    } else {
      await usersApi.create(userPayload);
    }

    await loadUsers();
  }

  async function removeUser(userId) {
    await usersApi.remove(userId);
    await loadUsers();
  }

  return (
    <PageFrame
      title="Utilizatori"
      description="Gestionarea conturilor (doar admin)."
      actions={
        <>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Caută utilizator"
            className="w-40"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Nume A-Z</SelectItem>
              <SelectItem value="name-desc">Nume Z-A</SelectItem>
              <SelectItem value="email">Email A-Z</SelectItem>
              <SelectItem value="role">Rol</SelectItem>
            </SelectContent>
          </Select>
          <UserDialog
            onSave={saveUser}
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Utilizator nou
              </Button>
            }
          />
        </>
      }
    >
      {error ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {loading ? (
        <LoadingCard message="Loading users..." />
      ) : (
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nume</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Telefon</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rol</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Niciun utilizator găsit.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user, idx) => (
                      <tr
                        key={user.id}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 tabular-nums text-foreground/50">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {user.first_name} {user.last_name}
                        </td>
                        <td className="px-4 py-3 text-foreground">{user.email}</td>
                        <td className="px-4 py-3 text-foreground">{user.phone || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className="rounded-full"
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <UserDialog
                              initialValue={user}
                              onSave={saveUser}
                              trigger={
                                <Button size="sm" className="gap-1.5 rounded-full bg-amber-500 text-white shadow-sm hover:bg-amber-500/90">
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline">Modifică</span>
                                </Button>
                              }
                            />
                            <Button
                              size="sm"
                              className="gap-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-500/90"
                              onClick={() => removeUser(user.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="hidden lg:inline">Șterge</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageFrame>
  );
}
