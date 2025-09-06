import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import EmailCard from "../components/EmailCard";
import { fetchEmails, fetchAndProcess } from "../api";

export default function EmailList() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const r = await fetchEmails(params);
      const data = Array.isArray(r) ? r : r.emails || [];
      setEmails(data);
    } catch {
      alert("Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onFetchAndProcess() {
    setLoading(true);
    try {
      await fetchAndProcess(50);
      await load();
    } catch {
      alert("Fetch & process failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginBottom: "12px" }}>Support Emails</h1>
      <FilterBar
        q={q}
        setQ={setQ}
        status={status}
        setStatus={setStatus}
        priority={priority}
        setPriority={setPriority}
        onFetchAndProcess={onFetchAndProcess}
      />
      <div style={{ marginTop: "16px" }}>
        {loading
          ? "Loading..."
          : emails.length === 0
          ? "No filtered emails"
          : emails.map((e) => (
              <Link key={e._id} to={`/emails/${e._id}`}>
                <EmailCard email={e} />
              </Link>
            ))}
      </div>
    </div>
  );
}
