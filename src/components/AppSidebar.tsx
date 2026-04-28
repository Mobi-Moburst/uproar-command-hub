import { forwardRef } from "react";
import { NavLink } from "@/components/NavLink";
import uproarLogo from "@/assets/uproar-white-logo.svg";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart3, Users, Newspaper, Trophy, Package, FileText, Star, UserSearch, Brain, UsersRound, ClipboardList, Zap } from "lucide-react";

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

export const AppSidebar = forwardRef<HTMLElement, Record<string, never>>(function AppSidebar(_props, ref) {
  const location = useLocation();
  const { user, profile, signOut } = useAuthContext();

  const displayName = profile?.display_name || user?.email || "";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <aside
      ref={ref}
      className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col bg-[rgba(11,12,16,0.6)] backdrop-blur-[60px] saturate-[1.3] border-r border-[rgba(255,255,255,0.06)] rounded-tr-[20px] rounded-br-[20px] lg:flex"
    >
      <div className="flex h-[90px] items-center justify-center border-b border-[rgba(255,255,255,0.05)]">
        <img src={uproarLogo} alt="Uproar by Moburst" className="h-10 object-contain" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={`group flex h-[52px] items-center gap-[16px] rounded-[12px] px-[12px] text-[16px] font-medium tracking-[-0.5px] transition-all duration-150 ${
                    isActive
                      ? "nav-active text-white"
                      : "text-[#9ca3af] opacity-80 hover:opacity-100 hover:text-white hover:bg-[rgba(255,255,255,0.03)]"
                  }`}
                  activeClassName=""
                >
                  <Icon className={`h-6 w-6 shrink-0 ${isActive ? "text-[#b9e045]" : "text-[#9ca3af] group-hover:text-white"}`} />
                  {item.title}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-[rgba(255,255,255,0.05)] p-3">
        <div className="glass-elevated flex items-center gap-2.5 p-2.5">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-[#b9e045] text-[10px] text-black font-bold">{initials}</AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#10b981] border-2 border-[#1a1d23]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{displayName}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="h-6 px-2 text-[11px] text-[#9ca3af] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
          >
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
});
