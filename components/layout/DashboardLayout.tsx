import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 sm:ml-[260px]">
        <Header />
        <main className="flex-1 p-4 sm:p-8 overflow-auto pb-20 sm:pb-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
