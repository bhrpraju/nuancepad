import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <Sidebar />
        <main className="min-h-[80vh] flex-1 rounded-2xl bg-white p-6 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
