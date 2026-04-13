import { useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ChatBubbleWidget from "@/components/chat/ChatBubbleWidget";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const navigationItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["admin", "user"] },
  { label: "Movies", to: "/movies", icon: Film, roles: ["admin", "user"] },
  { label: "Screenings", to: "/screenings", icon: CalendarDays, roles: ["admin", "user"] },
  { label: "Reservations", to: "/reservations", icon: Ticket, roles: ["admin", "user"] },
  { label: "Halls", to: "/halls", icon: Building2, roles: ["admin"] },
  { label: "Users", to: "/users", icon: Users, roles: ["admin"] },
];

function NavItems({ items, onNavigate, compact = false }) {
  return (
    <nav className={compact ? "flex flex-wrap gap-2" : "space-y-1"}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                compact
                  ? "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                  : "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                isActive
                  ? "border-primary/30 bg-primary text-primary-foreground shadow-md"
                  : "border-border/70 bg-card/70 text-muted-foreground hover:bg-primary/10 hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = useMemo(
    () => navigationItems.filter((item) => item.roles.includes(user?.role)),
    [user?.role]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_48%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.22),_transparent_40%)]" />

      <div className="flex min-h-screen">
        {isAdmin ? (
          <>
            <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card/65 backdrop-blur md:flex md:flex-col">
              <div className="border-b border-border/70 px-6 py-6">
                <p className="text-xs uppercase tracking-[0.22em] text-primary/80">Cinema Desk</p>
                <h1 className="mt-2 text-xl font-semibold">Admin Console</h1>
              </div>

              <div className="flex-1 space-y-6 p-4">
                <NavItems items={visibleItems} />

                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-xs text-primary/90 shadow-inner">
                  <p className="font-semibold">Admin mode</p>
                  <p className="mt-1 text-foreground/80">
                    Full control for movies, halls, screenings, users and reservations.
                  </p>
                </div>
              </div>
            </aside>

            {mobileOpen ? (
              <button
                type="button"
                className="fixed inset-0 z-30 bg-black/30 md:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Close mobile menu"
              />
            ) : null}

            <aside
              className={[
                "fixed inset-y-0 left-0 z-40 w-72 border-r border-border/70 bg-card p-4 shadow-xl transition-transform duration-200 md:hidden",
                mobileOpen ? "translate-x-0" : "-translate-x-full",
              ].join(" ")}
            >
              <div className="mb-6 flex items-center justify-between px-1">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <NavItems items={visibleItems} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </>
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="md:hidden"
                    onClick={() => setMobileOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                ) : null}

                <div>
                  <p className="text-xs text-muted-foreground">Welcome back</p>
                  <p className="text-sm font-semibold">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>

                <Badge variant={isAdmin ? "default" : "secondary"} className="rounded-full px-2.5 py-0.5">
                  {user?.role}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>

            {!isAdmin ? (
              <div className="mt-3">
                <NavItems items={visibleItems} compact />
              </div>
            ) : null}
          </header>

          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <ChatBubbleWidget />
    </div>
  );
}
