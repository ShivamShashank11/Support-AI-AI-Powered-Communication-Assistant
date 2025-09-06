// src/scheduler/fetchScheduler.js
const { fetchEmails } = require("../fetchers/gmailFetcher");
const { processPendingFilteredEmails } = require("../controllers/batchProcessor");
require("dotenv").config();

const AUTO_FETCH = (process.env.AUTO_FETCH || "false").toLowerCase() === "true";
const FETCH_INTERVAL_MS = parseInt(process.env.FETCH_INTERVAL_MS || String(60 * 1000 * 5), 10); // default 5 minutes

let schedulerHandle = null;

async function oneShotFetchAndProcess() {
  try {
    console.log("Scheduler: fetching emails...");
    await fetchEmails(); // fetch and save filtered into DB
  } catch (err) {
    console.warn("Scheduler fetchEmails error:", err?.message || err);
  }

  try {
    console.log("Scheduler: processing pending filtered emails...");
    const res = await processPendingFilteredEmails(50);
    console.log("Scheduler: process results:", res);
  } catch (err) {
    console.warn("Scheduler processPendingFilteredEmails error:", err?.message || err);
  }
}

function startFetchScheduler() {
  if (!AUTO_FETCH) {
    console.log("✳️ AUTO_FETCH disabled. Use GET /api/fetch-mails to fetch manually.");
    return;
  }
  if (schedulerHandle) {
    console.log("Fetch scheduler already running.");
    return;
  }
  // run immediately, then interval
  oneShotFetchAndProcess().catch(e => console.warn("initial scheduler run failed:", e?.message || e));
  schedulerHandle = setInterval(oneShotFetchAndProcess, FETCH_INTERVAL_MS);
  console.log(`✅ Fetch scheduler started (interval ${FETCH_INTERVAL_MS} ms)`);
}

function stopFetchScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
    console.log("Fetch scheduler stopped.");
  }
}

module.exports = { startFetchScheduler, stopFetchScheduler, oneShotFetchAndProcess };
