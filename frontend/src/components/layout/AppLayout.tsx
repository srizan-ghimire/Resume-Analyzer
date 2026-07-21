import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Logo } from "./Logo";
import { useAuth } from "@/app/AuthProvider";
import { ThemeToggle } from "@/app/ThemeProvider";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const SEEKER_NAV: NavItem[] = [
  { to: "/jobs", label: "Browse jobs", icon: <IconBriefcase /> },
  { to: "/matches", label: "My matches", icon: <IconSparkles /> },
  { to: "/ats", label: "ATS check", icon: <IconGauge /> },
  { to: "/resume", label: "My resume", icon: <IconFile /> },
  { to: "/applications", label: "Applications", icon: <IconInbox /> },
];

const RECRUITER_NAV: NavItem[] = [
  { to: "/recruiter/jobs", label: "My postings", icon: <IconBriefcase /> },
  { to: "/jobs", label: "Browse jobs", icon: <IconSearch /> },
];

export function AppLayout() {
  const { user, isRecruiter, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  const items = isRecruiter ? RECRUITER_NAV : SEEKER_NAV;

  // Close the drawer on navigation.
  React.useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh bg-[var(--surface)]">
      <a href="#main" className="sr-only-focusable">
        Skip to main content
      </a>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} items={items} />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-[var(--surface-raised)] lg:flex">
        <div className="p-5">
          <Link to="/" className="inline-block rounded-lg">
            <Logo />
          </Link>
        </div>
        <SidebarNav items={items} />
        <SidebarFooter user={user} onLogout={logout} />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-[var(--surface-raised)]/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            <IconMenu />
          </Button>

          <Link to="/" className="rounded-lg lg:hidden">
            <Logo showWordmark={false} />
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link
              to="/settings"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
              aria-label="Account settings"
            >
              <IconUser />
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/**
 * Real links with router-driven active state.
 *
 * The previous sidebar used `<li onClick>` with a local activeIndex: not
 * keyboard reachable, invisible to screen readers as navigation, and the
 * highlight was wrong after a refresh or back-button.
 */
function SidebarNav({ items, id }: { items: NavItem[]; id?: string }) {
  return (
    <nav id={id} aria-label="Main" className="flex-1 space-y-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/jobs"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]",
            )
          }
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarFooter({
  user,
  onLogout,
}: {
  user: { full_name?: string; username: string; role: string } | null;
  onLogout: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="mt-auto border-t p-3">
      <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
          {(user?.full_name || user?.username || "?").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-[var(--text)]">
            {user?.full_name || user?.username}
          </span>
          <span className="block text-xs capitalize text-[var(--text-subtle)]">
            {user?.role?.toLowerCase()}
          </span>
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-3"
          onClick={() => setOpen(true)}
        >
          <IconLogout />
          Sign out
        </Button>
        <DialogContent
          title="Sign out?"
          description="You'll need to sign in again to see your matches and applications."
        >
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                await onLogout();
                setBusy(false);
                setOpen(false);
                navigate("/");
              }}
            >
              Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Mobile drawer: focus-trapped, Escape-dismissable, scroll-locked (via Radix). */
function MobileDrawer({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
}) {
  const { user, logout } = useAuth();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        title="Menu"
        className="left-0 top-0 h-dvh max-h-dvh w-72 max-w-[85vw] translate-x-0 translate-y-0 rounded-none rounded-r-xl"
      >
        <div className="-m-5 flex h-full flex-col">
          <SidebarNav items={items} id="mobile-nav" />
          <SidebarFooter user={user} onLogout={logout} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* Icons -------------------------------------------------------------- */

function svgProps() {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

function IconBriefcase() {
  return (
    <svg {...svgProps()}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg {...svgProps()}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

function IconGauge() {
  return (
    <svg {...svgProps()}>
      <path d="M12 14 8 10" />
      <path d="M3.3 17a9 9 0 1 1 17.4 0" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg {...svgProps()}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg {...svgProps()}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1Z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg {...svgProps()}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg {...svgProps()}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg {...svgProps()}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg {...svgProps()}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}
