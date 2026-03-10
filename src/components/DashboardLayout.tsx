import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <MobileNav />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1280px] px-6 py-8 lg:px-10 lg:py-10 pt-20 lg:pt-10">
          {children}
        </div>
      </main>
    </div>
  );
}
