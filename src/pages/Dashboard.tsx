import { Link } from "react-router-dom";

export function Dashboard() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold">NuancePad Dashboard</h2>
        <p className="text-sm text-slate-600">Start from transcript input and generate executive-ready minutes of meeting.</p>
      </header>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-lg font-semibold">Milestone A enabled</h3>
        <p className="mt-2 text-sm text-slate-700">
          Paste or upload transcript, generate structured MoM JSON, save meeting history, and export compact leadership-ready notes.
        </p>
        <Link to="/meetings/new" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
          Create New Meeting
        </Link>
      </div>
    </section>
  );
}
