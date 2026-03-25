import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuthContext();

  const displayName = profile?.display_name || user?.email || "";

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
          <div className="mt-6 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                  {displayName.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <p className="flex-1 truncate text-sm text-foreground">{displayName}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-xs text-muted-foreground"
              >
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
