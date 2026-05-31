import { isFirebaseConfigured } from "../config/env";
import { meetingService } from "../services/meetingService";

export function Settings() {
  const storage = meetingService.getStorageStatus();
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
        <p>Firebase: {isFirebaseConfigured() ? "Configured" : "Not configured (local storage mode)"}</p>
        <p>Active storage: {storage.activeStorage === "firebase" ? "Firebase" : "Local browser storage"}</p>
        {storage.lastFallbackReason && (
          <p className="mt-1 text-xs text-amber-700">Last storage fallback reason: {storage.lastFallbackReason}</p>
        )}
        <p>AI provider: Managed by backend API routes (`/api/*`).</p>
      </div>
    </section>
  );
}
