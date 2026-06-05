import { useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  Film,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Sun,
  Ticket,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import ChatBubbleWidget from "@/components/chat/ChatBubbleWidget";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

const navigationItems = [
  { label: "Movies", to: "/movies", icon: Film, roles: ["admin", "user", "guest"] },
  { label: "Screenings", to: "/screenings", icon: CalendarDays, roles: ["admin", "user", "guest"] },
  { label: "Reservations", to: "/reservations", icon: Ticket, roles: ["admin", "user"] },
  { label: "Contact", to: "/contact", icon: Mail, roles: ["user", "guest"] },
  { label: "Halls", to: "/halls", icon: Building2, roles: ["admin"] },
  { label: "Users", to: "/users", icon: Users, roles: ["admin"] },
];

function NavItems({ items, onNavigate, compact = false }) {
  return (
    <nav className={compact ? "flex flex-wrap gap-2" : "flex items-center gap-0.5"}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            compact
              ? [
                  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold",
                  isActive
                    ? "border-primary/30 bg-primary text-primary-foreground shadow-md"
                    : "border-border/70 bg-card/70 text-muted-foreground hover:bg-primary/10 hover:text-foreground",
                ].join(" ")
              : [
                  "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarNavItems({ items, onNavigate }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
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

function UserChip({ user, isAdmin, onLogout }) {
  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/80 py-1 pl-1 pr-2 backdrop-blur">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {initials || "?"}
      </div>
      <div className="hidden sm:block">
        <p className="text-xs font-semibold leading-tight">
          {user.first_name} {user.last_name}
        </p>
        <p className="text-[10px] leading-tight text-muted-foreground">
          {isAdmin ? "Admin" : "Member"}
        </p>
      </div>
      <button
        onClick={onLogout}
        title="Log out"
        className="ml-0.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function AppShell() {
  const { user, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = useMemo(
    () => navigationItems.filter((item) => item.roles.includes(user?.role || "guest")),
    [user?.role]
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_48%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.22),_transparent_40%)]" />

      <div className="flex min-h-screen">
        {/* Admin sidebar — desktop only */}
        {isAdmin ? (
          <>
            <aside className="hidden w-72 shrink-0 border-r border-border/70 bg-card/65 backdrop-blur md:flex md:flex-col">
              <div className="border-b border-border/70 px-6 py-6">

                <h1 className="mt-2 text-xl font-semibold">Admin Console</h1>
              </div>
              <div className="flex-1 space-y-6 p-4">
                <SidebarNavItems items={visibleItems} />

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
              <SidebarNavItems items={visibleItems} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </>
        ) : null}

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur md:px-8">
            {/* 3-column layout: logo | center nav | auth */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:grid-cols-[1fr_auto_1fr]">

              {/* Left: mobile hamburger (admin) + logo */}
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
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Film className="h-4 w-4" />
                  </div>
                  <span className="hidden text-base font-semibold sm:inline">CinemaApp</span>
                </Link>
              </div>

              {/* Center: nav items — non-admin desktop only */}
              <div className="hidden md:flex md:justify-center">
                {!isAdmin ? <NavItems items={visibleItems} /> : null}
              </div>

              {/* Right: theme toggle + user chip or login buttons */}
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {user ? (
                  <UserChip user={user} isAdmin={isAdmin} onLogout={logout} />
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/login">Log in</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link to="/register">Register</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Mobile: compact nav pills — non-admin only */}
            {!isAdmin ? (
              <div className="mt-3 md:hidden">
                <NavItems items={visibleItems} compact />
              </div>
            ) : null}
          </header>

          <main className="flex-1 p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>

          <footer className="border-t border-border/70 bg-card/50 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
                {/* Brand */}
                <div>
                  <Link to="/dashboard" className="inline-flex items-center gap-2 transition-opacity hover:opacity-80">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                      <Film className="h-4 w-4" />
                    </div>
                    <span className="text-base font-semibold">CinemaApp</span>
                  </Link>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Rezervă-ți locul la filmele preferate rapid și ușor.
                  </p>
                </div>

                {/* Navigation */}
                <div>
                  <h3 className="text-sm font-semibold">Navigare</h3>
                  <ul className="mt-3 space-y-2">
                    {[
                      { to: "/movies", label: "Filme" },
                      { to: "/screenings", label: "Proiecții" },
                      { to: "/reservations", label: "Rezervări" },
                      { to: "/contact", label: "Contact" },
                    ].map(({ to, label }) => (
                      <li key={to}>
                        <Link
                          to={to}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contact info */}
                <div>
                  <h3 className="text-sm font-semibold">Contact</h3>
                  <ul className="mt-3 space-y-2">
                    {[
                      { icon: Mail, text: "contact@cinemaapp.ro" },
                      { icon: Phone, text: "+40 700 000 000" },
                      { icon: MapPin, text: "București, România" },
                    ].map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} CinemaApp. Toate drepturile rezervate.
              </div>
            </div>
          </footer>
        </div>
      </div>

      {user ? <ChatBubbleWidget /> : null}
    </div>
  );
}
