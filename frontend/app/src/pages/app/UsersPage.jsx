import { useEffect, useState } from "react";
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
          <DialogTitle>{initialValue ? "Edit user" : "Create user"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="user-first-name">First name</Label>
            <Input
              id="user-first-name"
              value={form.first_name}
              onChange={(event) => setForm((prev) => ({ ...prev, first_name: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-last-name">Last name</Label>
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
            <Label htmlFor="user-phone">Phone</Label>
            <Input
              id="user-phone"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
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
            <Label htmlFor="user-password">Password {initialValue ? "(optional)" : ""}</Label>
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
            {submitting ? "Saving..." : "Save user"}
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

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      setUsers(await usersApi.list());
    } catch (loadError) {
      setError(loadError.message || "Could not load users");
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
      title="Users"
      description="Admin-only account management."
      actions={
        <UserDialog
          onSave={saveUser}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New user
            </Button>
          }
        />
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
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="border-border/60 bg-card/80">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-base">
                    {user.first_name} {user.last_name}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.phone}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="rounded-lg">
                    {user.role}
                  </Badge>

                  <UserDialog
                    initialValue={user}
                    onSave={saveUser}
                    trigger={
                      <Button variant="outline" size="icon-sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />

                  <Button variant="destructive" size="icon-sm" onClick={() => removeUser(user.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 ? (
            <Card className="border-border/60 bg-card/80">
              <CardContent className="p-6 text-sm text-muted-foreground">No users found.</CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </PageFrame>
  );
}
