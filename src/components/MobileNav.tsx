import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navItems = [
  { title: "Overview", path: "/" },
  { title: "Clients", path: "/clients" },
  { title: "Media Placements", path: "/placements" },
  { title: "Awards Pipeline", path: "/awards" },
  { title: "Weekly Wins", path: "/weekly-wins" },
  { title: "Teams", path: "/teams" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="lg:hidden">
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <h1 className="text-sm font-semibold text-foreground">Uproar Command Center</h1>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 top-14 z-30 bg-background p-4">
          <nav>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end
                      className={`block rounded-md px-3 py-2.5 text-sm font-medium ${
                        isActive
                          ? "bg-emerald-light text-emerald"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                      activeClassName=""
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
