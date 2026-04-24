import { Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./routes/SignIn";

export default function App() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="*" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}
