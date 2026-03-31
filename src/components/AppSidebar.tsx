import { NavLink } from "@/components/NavLink";
import uproarLogo from "@/assets/uproar-white-logo.svg";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sun, Moon, BarChart3, Users, Newspaper, Trophy, Package, FileText, Star, UserSearch, Brain, UsersRound, ClipboardList, Zap } from "lucide-react";

const navItems = [
  { title: "Overview", path: "/", icon: BarChart3 },
  { title: "Clients", path: "/clients", icon: Users },
  { title: "Media Placements", path: "/placements", icon: Newspaper },
  { title: "Awards Pipeline", path: "/awards", icon: Trophy },
  { title: "Samples", path: "/samples", icon: Package },
  { title: "Briefings", path: "/briefings", icon: FileText },
  { title: "Weekly Wins", path: "/weekly-wins", icon: Star },
  { title: "Reporter Analytics", path: "/reporters", icon: UserSearch },
  { title: "Intelligence", path: "/intelligence", icon: Brain },
  { title: "Pulse Center", path: "/pulse", icon: Zap },
  
  { title: "Teams", path: "/teams", icon: UsersRound },
  { title: "Reports", path: "/reports", icon: ClipboardList },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, profile, signOut } = useAuthContext();
  const { theme, toggleTheme } = useTheme();

  const displayName = profile?.display_name || user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border lg:flex">
      {/* Brand header with gradient accent */}
      <div className="relative flex h-16 items-center px-5">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sidebar-primary/40 to-transparent" />
        <div className="flex items-center gap-2.5">
          <img src={uproarLogo} alt="Uproar by Moburst" className="h-8 object-contain" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }`}
                  activeClassName=""
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"}`} />
                  {item.title}
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-sidebar-muted uppercase tracking-wider">Theme</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-7 w-7 p-0 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-sidebar-accent text-[10px] text-sidebar-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {displayName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="h-6 px-2 text-[11px] text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
