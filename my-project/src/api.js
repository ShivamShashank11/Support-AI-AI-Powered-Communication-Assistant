import axios from "axios";

const base =
  import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const client = axios.create({ baseURL: base, timeout: 20000 });

/**
 * Emails CRUD
 */
export async function fetchEmails(params = {}) {
  const res = await client.get("/emails", { params });
  return res.data;
}

export async function getEmail(id) {
  const res = await client.get(`/emails/${id}`);
  return res.data;
}

export async function createEmail(payload) {
  const res = await client.post("/emails", payload);
  return res.data;
}

/**
 * Processing
 */
export async function processEmail(id) {
  const res = await client.post(`/emails/${id}/process`);
  return res.data;
}

export async function fetchAndProcess(limit = 50) {
  const res = await client.get(`/fetch-and-process?limit=${limit}`);
  return res.data;
}

export async function sendPending(
  limit = 50,
  force = false,
  concurrency = 3
) {
  const res = await client.post("/emails/send-pending", {
    limit,
    force,
    concurrency,
  });
  return res.data;
}

/**
 * Drafts & Replies
 */
export async function sendDraft(id, text, force = false) {
  const res = await client.post(`/emails/${id}/send`, { text, force });
  return res.data;
}

export async function saveDraft(id, text) {
  // optional endpoint if backend supports
  const res = await client.post(`/emails/${id}/draft`, { text });
  return res.data;
}

export async function updateStatus(id, status) {
  const res = await client.post(`/emails/${id}/status`, { status });
  return res.data;
}

/**
 * Stats for dashboard
 */
export async function fetchStats() {
  const res = await client.get("/stats/summary");
  return res.data;
}

export async function fetchLast24hSeries() {
  const res = await client.get("/stats/last24h");
  return res.data;
}
