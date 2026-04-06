import { forwardRef, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Menu, X } from "lucide-react";
import uproarLogo from "@/assets/uproar-dark-logo.png";

const navItems = [
  { title: "Overview", path: "/" },
  { title: "Clients", path: "/clients" },
  { title: "Media Placements", path: "/placements" },
  { title: "Awards Pipeline", path: "/awards" },
  { title: "Samples", path: "/samples" },
  { title: "Briefings", path: "/briefings" },
  { title: "Weekly Wins", path: "/weekly-wins" },
  { title: "Reporter Analytics", path: "/reporters" },
  { title: "Intelligence", path: "/intelligence" },
  { title: "Pulse Center", path: "/pulse" },
  { title: "Teams", path: "/teams" },
  { title: "Reports", path: "/reports" },
];

export const MobileNav = forwardRef<HTMLDivElement, Record<string, never>>(function MobileNav(_props, ref) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut } = useAuthContext();
  const { theme, toggleTheme } = useTheme();

  const displayName = profile?.display_name || user?.email || "";

  return (
    <div ref={ref} className="lg:hidden">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <img src={uproarLogo} alt="Uproar by Moburst" className="h-6 object-contain" />
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 top-14 z-30 overflow-y-auto bg-background/95 p-4 backdrop-blur-sm">
          <nav>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end
                      className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
          <div className="mt-6 space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Theme</span>
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-7 w-7 p-0">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-muted text-xs text-muted-foreground">
                  {displayName.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <p className="flex-1 truncate text-sm text-foreground">{displayName}</p>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-muted-foreground">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
