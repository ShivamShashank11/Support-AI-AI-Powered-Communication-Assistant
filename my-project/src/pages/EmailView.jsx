import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchEmail } from "../api";
import DraftEditor from "../components/DraftEditor";

export default function EmailView() {
  const { id } = useParams();
  const [email, setEmail] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetchEmail(id);
        const e = r.email || r;
        setEmail(e);
      } catch {
        alert("Failed to load email");
      }
    }
    load();
  }, [id]);

  if (!email) return <div>Loading...</div>;

  return (
    <div>
      {/* Back link */}
      <div style={{ marginBottom: "12px" }}>
        <Link to="/">← Back</Link>
      </div>

      {/* Email details */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <h2 style={{ marginBottom: "6px" }}>
          {email.subject || "(no subject)"}
        </h2>
        <p>
          <strong>From:</strong> {email.from}
        </p>
        <p style={{ marginTop: "8px" }}>{email.bodyText}</p>
      </div>

      {/* Draft editor (AI Suggested Response) */}
      <div className="card">
        <h3 style={{ marginBottom: "8px" }}>AI Suggested Response</h3>
        <DraftEditor
          initial={
            email.draftResponse || "This is an AI-generated draft reply..."
          }
          onSave={(txt) => alert("Draft saved: " + txt)}
          onSend={(txt) => alert("Reply sent: " + txt)}
        />
      </div>
    </div>
  );
}
