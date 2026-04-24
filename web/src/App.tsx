import { Routes, Route, Navigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import Dashboard from "./routes/Dashboard";
import SignIn from "./routes/SignIn";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-paper text-ink-3 text-sm">Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
