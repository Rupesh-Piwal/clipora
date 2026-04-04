import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#000000] text-gray-200 font-sans selection:bg-blue-500/30 flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen relative">
        {children}
      </main>
    </div>
  );
}
