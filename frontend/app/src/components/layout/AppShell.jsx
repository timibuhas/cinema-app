import { useEffect, useMemo, useState } from "react";
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
  { label: "Filme",       to: "/movies",       icon: Film,         roles: ["admin", "user", "guest"] },
  { label: "Program",   to: "/screenings",   icon: CalendarDays, roles: ["admin", "user", "guest"] },
  { label: "Rezervări",   to: "/reservations", icon: Ticket,       roles: ["admin", "user"] },
  { label: "Contact",     to: "/contact",      icon: Mail,         roles: ["user", "guest"] },
  { label: "Săli",        to: "/halls",        icon: Building2,    roles: ["admin"] },
  { label: "Utilizatori", to: "/users",        icon: Users,        roles: ["admin"] },
];

// Desktop center nav (no icons)
function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex items-center gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-primary/8 hover:text-foreground",
            ].join(" ")
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

// Sidebar + mobile drawer nav (with icons, touch-friendly)
function SidebarNavItems({ items, onNavigate }) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
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
          {isAdmin ? "Admin" : "Membru"}
        </p>
      </div>
      <button
        onClick={onLogout}
        title="Deconectare"
        className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

  const closeMobile = () => setMobileOpen(false);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.18),_transparent_48%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.22),_transparent_40%)]" />

      <div className="flex min-h-screen">

        {/* ── Admin sidebar — tablet (md) + desktop (lg) ───────────────────────── */}
        {isAdmin ? (
          <aside className="hidden md:flex md:w-56 lg:w-72 shrink-0 flex-col border-r border-border bg-card/70 backdrop-blur-sm">
            <div className="border-b border-border/70 px-4 py-5 lg:px-6 lg:py-6">
              <h1 className="text-base font-semibold lg:text-xl">Consolă Admin</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-3 lg:p-4">
              <SidebarNavItems items={visibleItems} />
            </div>
          </aside>
        ) : null}

        {/* ── Mobile overlay (fade in/out without unmounting) ───────────────────── */}
        <div
          className={[
            "fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 md:hidden",
            mobileOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          ].join(" ")}
          onClick={closeMobile}
          aria-hidden="true"
        />

        {/* ── Mobile drawer — all user roles ────────────────────────────────────── */}
        <aside
          className={[
            "fixed inset-y-0 left-0 z-40 flex w-[min(288px,85vw)] flex-col",
            "border-r border-border/70 bg-card shadow-2xl",
            "transition-transform duration-300 ease-in-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
          aria-label="Mobile navigation"
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
            <Link
              to="/dashboard"
              onClick={closeMobile}
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Film className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold">TapTicket</span>
            </Link>
            <button
              onClick={closeMobile}
              aria-label="Închide meniu"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto p-3">
            <SidebarNavItems items={visibleItems} onNavigate={closeMobile} />
          </div>

          {/* Auth buttons — guests only */}
          {!user && (
            <div className="border-t border-border/70 p-4 space-y-2">
              <Button asChild className="h-11 w-full">
                <Link to="/login" onClick={closeMobile}>Conectare</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link to="/register" onClick={closeMobile}>Înregistrare</Link>
              </Button>
            </div>
          )}
        </aside>

        {/* ── Content column ────────────────────────────────────────────────────── */}
        <div className="flex min-h-screen flex-1 flex-col overflow-hidden">

          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur md:px-6 lg:px-8">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 md:grid-cols-[1fr_auto_1fr]">

              {/* Left: burger (mobile only) + logo */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileOpen(true)}
                  aria-label="Deschide meniu"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 text-foreground transition-colors hover:bg-muted md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 transition-opacity hover:opacity-80"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                    <Film className="h-4 w-4" />
                  </div>
                  <span className="text-base font-semibold sm:inline">TapTicket</span>
                </Link>
              </div>

              {/* Center: nav links — non-admin, tablet + desktop */}
              <div className="hidden md:flex md:justify-center">
                {!isAdmin ? <NavItems items={visibleItems} /> : null}
              </div>

              {/* Right: theme toggle + user chip / login buttons */}
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={toggleTheme}
                  aria-label="Schimbă tema"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:h-9 md:w-9"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                {user ? (
                  <UserChip user={user} isAdmin={isAdmin} onLogout={logout} />
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
                      <Link to="/login">Conectare</Link>
                    </Button>
                    <Button asChild size="sm" className="hidden md:inline-flex">
                      <Link to="/register">Înregistrare</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="mx-auto w-full max-w-7xl">
              <Outlet />
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-border/70 bg-card/50 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
              {/* 1 col → 2 cols (tablet) → 3 cols (desktop) */}
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">

                {/* Brand */}
                <div>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                      <Film className="h-4 w-4" />
                    </div>
                    <span className="text-base font-semibold">TapTicket</span>
                  </Link>
                  <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                    Rezervă-ți locul la filmele preferate rapid și ușor.
                  </p>
                </div>

                {/* Navigation */}
                <div>
                  <h3 className="text-sm font-semibold">Navigare</h3>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      { to: "/movies",       label: "Filme" },
                      { to: "/screenings",   label: "Program" },
                      { to: "/reservations", label: "Rezervări" },
                      { to: "/contact",      label: "Contact" },
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

                {/* Contact — spans 2 cols on tablet so it fills the row */}
                <div className="md:col-span-2 lg:col-span-1">
                  <h3 className="text-sm font-semibold">Contact</h3>
                  <ul className="mt-3 space-y-2.5">
                    {[
                      { icon: Mail,  text: "tapticketcinema@gmail.com" },
                      { icon: Phone, text: "+40 700 000 000" },
                      { icon: MapPin, text: "Oradea, România" },
                    ].map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} TapTicket. Toate drepturile rezervate.
              </div>
            </div>
          </footer>
        </div>
      </div>

      {user ? <ChatBubbleWidget /> : null}
    </div>
  );
}
