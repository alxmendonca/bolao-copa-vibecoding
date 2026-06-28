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
        <footer className="site-footer" style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.8rem", color: "var(--muted)", borderTop: "1px solid var(--border)", marginTop: "3rem" }}>
          <p style={{ maxWidth: "600px", margin: "0 auto", lineHeight: "1.5" }}>
            Disclaimer: O site não é comercial, é apenas para uma brincadeira de amigos, sem fins lucrativos.
            As pessoas representadas no site não existem realmente. Pessoas não autorizadas não devem criar bolão.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
