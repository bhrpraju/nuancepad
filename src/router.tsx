import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { MeetingDetail } from "./pages/MeetingDetail";
import { MeetingHistory } from "./pages/MeetingHistory";
import { NewMeeting } from "./pages/NewMeeting";
import { Settings } from "./pages/Settings";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/meetings/new" element={<NewMeeting />} />
        <Route path="/meetings" element={<MeetingHistory />} />
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
