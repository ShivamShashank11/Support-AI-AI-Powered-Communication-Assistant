import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import EmailList from "./pages/EmailList";
import EmailView from "./pages/EmailView";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content">
        <header className="topbar">
          <strong>Support AI</strong>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<EmailList />} />
            <Route path="/emails/:id" element={<EmailView />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
