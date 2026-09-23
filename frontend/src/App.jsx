import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import RecruiterPage from "./pages/RecruiterPage.jsx";
import CandidatePage from "./pages/CandidatePage.jsx";

function HomeRedirect() {
  const lastRole = localStorage.getItem("activeRole") || "recruiter";
  return <Navigate to={lastRole === "candidate" ? "/candidate" : "/recruiter"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/recruiter" element={<RecruiterPage />} />
        <Route path="/candidate" element={<CandidatePage />} />
      </Route>
    </Routes>
  );
}
