import { forwardRef, type ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = forwardRef<HTMLDivElement, DashboardLayoutProps>(function DashboardLayout(
  { children },
  ref,
) {
  return (
    <div ref={ref} className="intercept-bg min-h-screen">
      <div className="relative z-10">
        <AppSidebar />
        <MobileNav />
        <main className="lg:pl-60">
          <div className="mx-auto max-w-[1280px] px-6 py-8 pt-20 lg:px-10 lg:py-10 lg:pt-10">{children}</div>
        </main>
      </div>
    </div>
  );
});
