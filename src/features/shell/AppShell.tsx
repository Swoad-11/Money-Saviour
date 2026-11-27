import { NavLink, Outlet, useLocation } from "react-router";
import { Wallet } from "lucide-react";
import { NAV } from "./nav";
import { ThemeSwitch } from "./ThemeSwitch";

const linkBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors";

export function AppShell() {
  const { pathname } = useLocation();
  const current = NAV.find((n) => pathname.startsWith(n.to));

  return (
    <div className="min-h-dvh bg-bg text-ink md:grid md:grid-cols-[64px_1fr] lg:grid-cols-[232px_1fr]">
      {/* Sidebar: icons on tablet, full on desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface md:flex">
        <div className="flex h-14 items-center gap-2 px-4 lg:px-5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-on-primary">
            <Wallet size={17} aria-hidden />
          </span>
          <span className="hidden font-semibold tracking-tight lg:inline">Money Saviour</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 px-2 py-2 lg:px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `${linkBase} justify-center lg:justify-start ${
                  isActive
                    ? "bg-primary-soft text-primary-strong dark:text-primary"
                    : "text-muted hover:bg-surface-muted hover:text-ink"
                }`
              }
            >
              <Icon size={18} aria-hidden />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-line p-3 lg:block">
          <ThemeSwitch />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-6">
          <span className="grid size-7 place-items-center rounded-lg bg-primary text-on-primary md:hidden">
            <Wallet size={15} aria-hidden />
          </span>
          <h1 className="text-[15px] font-semibold">{current?.label ?? "Money Saviour"}</h1>
          <div id="topbar-slot" className="ml-auto flex items-center gap-2" />
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-5 pb-24 md:px-6 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom bar on phones */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV.filter((n) => n.mobile).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive ? "text-primary" : "text-muted"
              }`
            }
          >
            <Icon size={20} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
