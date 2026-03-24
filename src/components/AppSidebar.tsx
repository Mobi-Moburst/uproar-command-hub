import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Overview", path: "/" },
  { title: "Clients", path: "/clients" },
  { title: "Media Placements", path: "/placements" },
  { title: "Awards Pipeline", path: "/awards" },
  { title: "Weekly Wins", path: "/weekly-wins" },
  { title: "Reporter Analytics", path: "/reporters" },
  { title: "Vertical Benchmarking", path: "/verticals" },
  { title: "Teams", path: "/teams" },
  { title: "Client Report", path: "/report" },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          Uproar Command Center
        </h1>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-light text-emerald"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  activeClassName=""
                >
                  {item.title}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border px-6 py-4">
        <p className="text-xs font-mono text-muted-foreground">v1.0 — Internal Use Only</p>
      </div>
    </aside>
  );
}
