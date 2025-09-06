// frontend/src/utils/testFetch.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";
const client = axios.create({ baseURL: API_BASE, timeout: 20000 });

export async function testFetchEmails() {
  try {
    console.log("Fetching /emails from", API_BASE);
    const res = await client.get("/emails");
    const data = res.data;
    const emails = Array.isArray(data) ? data : (data.emails || data);
    if (!emails || emails.length === 0) {
      console.log("No emails returned.");
      return emails;
    }
    console.log(`Found ${emails.length} email(s). (logged first 10 below)`);
    emails.slice(0, 10).forEach((e, i) => {
      console.log(`#${i+1}`, { id: e._id || e.id, from: e.from, subject: e.subject, receivedAt: e.receivedAt });
    });
    return emails;
  } catch (err) {
    console.error("Error fetching emails:", err.response ? err.response.data || err.response.statusText : err.message);
    throw err;
  }
}
