import React from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>Support AI</h2>
      <nav>
        <NavLink
          end
          to="/"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Emails
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          Dashboard
        </NavLink>
        <button onClick={() => window.location.reload()}>Refresh</button>
      </nav>
    </aside>
  );
}
