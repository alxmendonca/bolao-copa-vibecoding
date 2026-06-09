import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LeagueNew from "./pages/LeagueNew";
import LeagueDetail from "./pages/LeagueDetail";
import LeagueFill from "./pages/LeagueFill";
import ParticipantDetail from "./pages/ParticipantDetail";
import AdminPanel from "./pages/AdminPanel";
import Header from "./components/Header";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/league/new" element={<LeagueNew />} />
          <Route path="/league/:leagueId" element={<LeagueDetail />} />
          <Route path="/league/:leagueId/fill" element={<LeagueFill />} />
          <Route path="/league/:leagueId/:participantId" element={<ParticipantDetail />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
