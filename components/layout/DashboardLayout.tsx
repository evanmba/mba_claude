import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar />
      <div
        className="flex flex-col flex-1"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <Header />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
