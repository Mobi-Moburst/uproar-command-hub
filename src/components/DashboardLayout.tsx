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
    <div ref={ref} className="min-h-screen bg-background">
      <AppSidebar />
      <MobileNav />
      <main className="lg:pl-60">
        <div className="h-[2px] gradient-brand opacity-40" />
        <div className="mx-auto max-w-[1280px] px-6 py-8 pt-20 lg:px-10 lg:py-10 lg:pt-10">{children}</div>
      </main>
    </div>
  );
});
