import { forwardRef, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import uproarLogo from "@/assets/uproar-white-logo.svg";

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

  const displayName = profile?.display_name || user?.email || "";

  return (
    <div ref={ref} className="lg:hidden">
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[rgba(11,12,16,0.5)] px-4 backdrop-blur-[60px]">
        <div className="flex items-center gap-2">
          <img src={uproarLogo} alt="Uproar by Moburst" className="h-8 object-contain" />
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg p-2 text-[#9ca3af] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 top-14 z-30 overflow-y-auto bg-[rgba(11,12,16,0.92)] p-4 backdrop-blur-2xl">
          <nav>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end
                      className={`block rounded-[12px] px-3 py-2.5 text-sm font-medium tracking-[-0.5px] transition-colors ${
                        isActive ? "nav-active text-white" : "text-[#9ca3af] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
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
          <div className="mt-6 space-y-3 border-t border-[rgba(255,255,255,0.06)] pt-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-[#b9e045] text-xs text-black font-bold">
                  {displayName.slice(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <p className="flex-1 truncate text-sm text-white">{displayName}</p>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-[#9ca3af]">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
