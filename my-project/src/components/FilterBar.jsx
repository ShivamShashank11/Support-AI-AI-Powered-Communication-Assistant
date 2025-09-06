import React from "react";

export default function FilterBar({
  q,
  setQ,
  status,
  setStatus,
  priority,
  setPriority,
  onFetchAndProcess,
}) {
  return (
    <div
      className="card"
      style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search subject/from/body..."
      />
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Any status</option>
        <option value="pending">Pending</option>
        <option value="responded">Responded</option>
        <option value="resolved">Resolved</option>
      </select>
      <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="">Any priority</option>
        <option value="urgent">Urgent</option>
        <option value="normal">Normal</option>
      </select>
      <button onClick={onFetchAndProcess}>Fetch & Process</button>
    </div>
  );
}
