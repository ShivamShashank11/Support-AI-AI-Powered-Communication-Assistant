import React from "react";

export default function EmailCard({ email }) {
  const priority = email.priority || "normal";
  const sentiment = email.sentiment || "neutral";
  return (
    <div className="card email-card">
      <div>
        <div>
          <strong>{email.subject || "(no subject)"}</strong>
        </div>
        <div className="text-sm">From: {email.from || "(unknown)"}</div>
        <div style={{ margin: "8px 0", borderBottom: "1px solid #eee" }} />
        <div>{email.bodyText || ""}</div>
      </div>
      <div className="email-meta">
        <div className={`badge ${priority}`}>{priority}</div>
        <div className={`badge ${sentiment}`}>{sentiment}</div>
        <div style={{ fontSize: "12px", marginTop: "8px" }}>
          {new Date(email.receivedAt || Date.now()).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
