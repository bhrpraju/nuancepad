import { NavLink } from "react-router-dom";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/meetings/new", label: "New Meeting" },
  { to: "/meetings", label: "Meeting History" },
  { to: "/settings", label: "Settings" }
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 rounded-2xl bg-slate-900 p-5 text-slate-200 md:block">
      <h1 className="text-lg font-semibold tracking-wide">NuancePad</h1>
      <p className="mt-1 text-xs text-slate-400">Corporate-safe meeting intelligence</p>
      <nav className="mt-6 space-y-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm transition ${
                isActive ? "bg-slate-200 text-slate-900" : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
