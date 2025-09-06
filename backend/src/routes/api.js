// src/routes/api.js
const express = require("express");
const router = express.Router();

const sampleLoader = require("./sampleLoader");
router.use("/sample", sampleLoader);

const Email = require("../models/Email");
const { fetchEmails } = require("../fetchers/gmailFetcher");
const { processPendingFilteredEmails } = require("../controllers/batchProcessor");

// Explicit direct-send handlers (preferred)
const { sendEmailReply, sendPending } = require("../controllers/emailController");

// High-level controller (exports many handlers)
const emailController = require("../controllers/emailController");
// expected exports (some may be optional):
// listEmails, getEmail, createEmail, processEmailHandler, sendDraftHandler, updateStatus

// Fallback handlers (defensive) if controller is missing some functions
const listEmails = emailController.listEmails || (async (req, res) => {
  try {
    const emails = await Email.find().sort({ receivedAt: -1 }).limit(200).lean();
    res.json({ ok: true, count: emails.length, emails });
  } catch (err) {
    console.error("GET /emails fallback error:", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
});

const getEmail = emailController.getEmail || (async (req, res) => {
  try {
    const email = await Email.findById(req.params.id).lean();
    if (!email) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, email });
  } catch (err) {
    console.error("GET /emails/:id fallback error:", err);
    res.status(500).json({ ok: false, error: "db error" });
  }
});

const createEmail = emailController.createEmail || (async (req, res) => {
  try {
    const payload = req.body || {};
    // ensure receivedAt when creating
    if (!payload.receivedAt) payload.receivedAt = new Date();
    const e = await Email.create(payload);
    res.json({ ok: true, email: e });
  } catch (err) {
    console.error("POST /emails fallback error:", err);
    res.status(500).json({ ok: false, error: "create failed" });
  }
});

const processEmailHandler = emailController.processEmailHandler || emailController.processEmail || (async (req, res) => {
  try {
    const { id } = req.params;
    const { processEmail } = require("../controllers/emailProcessor");
    const result = await processEmail(id);
    res.json({ ok: true, email: result });
  } catch (err) {
    console.error("POST /emails/:id/process fallback error:", err);
    res.status(500).json({ ok: false, error: err.message || "process failed" });
  }
});

// This will prefer controller's sendDraftHandler, else fall back to sendDraftResponse
const sendDraftHandler = emailController.sendDraftHandler || emailController.sendDraft || emailController.sendEmailReply || (async (req, res) => {
  try {
    const { id } = req.params;
    const { sendDraftResponse } = require("../controllers/sendController");
    const force = !!(req.body && req.body.force);
    const result = await sendDraftResponse(id, { force });
    res.json({ ok: true, info: result.info || result, email: result.email });
  } catch (err) {
    console.error("POST /emails/:id/send fallback error:", err);
    res.status(500).json({ ok: false, error: err.message || "send failed" });
  }
});

const updateStatus = emailController.updateStatus || (async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ ok: false, error: "status required" });
    const allowed = ["pending", "responded", "resolved", "archived"];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: "invalid status" });
    const email = await Email.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!email) return res.status(404).json({ ok: false, error: "not found" });
    res.json({ ok: true, email });
  } catch (err) {
    console.error("POST /emails/:id/status fallback error:", err);
    res.status(500).json({ ok: false, error: "update failed" });
  }
});

// --- Health + fetch/process routes ---

// Health check
router.get("/health", (req, res) => res.json({ ok: true, time: new Date() }));

// Manual fetch new mails from Gmail/IMAP
router.get("/fetch-mails", async (req, res) => {
  try {
    await fetchEmails();
    res.json({ ok: true, message: "Fetched new emails from Gmail/IMAP" });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ ok: false, error: "fetch failed" });
  }
});

// Convenience: fetch then process pending filtered emails
router.get("/fetch-and-process", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "50", 10);
    await fetchEmails();
    const results = await processPendingFilteredEmails(limit);
    res.json({ ok: true, results });
  } catch (err) {
    console.error("/fetch-and-process error:", err);
    res.status(500).json({ ok: false, error: err.message || "failed" });
  }
});

// Manual only process pending filtered emails
router.post("/process-pending", async (req, res) => {
  try {
    const limit = parseInt(req.body.limit || 50, 10);
    const results = await processPendingFilteredEmails(limit);
    res.json({ ok: true, results });
  } catch (err) {
    console.error("POST /process-pending error:", err);
    res.status(500).json({ ok: false, error: err.message || "failed" });
  }
});

// --- Email CRUD + actions (wired to controller handlers) ---
router.get("/emails", listEmails);
router.post("/emails", createEmail);
router.get("/emails/:id", getEmail);
router.post("/emails/:id/process", processEmailHandler);

// Send single email — prefer explicit sendEmailReply import
if (typeof sendEmailReply === "function") {
  router.post("/emails/:id/send", sendEmailReply);
} else {
  router.post("/emails/:id/send", sendDraftHandler);
}

// Bulk send pending — prefer explicit sendPending import
if (typeof sendPending === "function") {
  router.post("/emails/send-pending", sendPending);
} else {
  router.post("/emails/send-pending", async (req, res) => {
    try {
      const { sendPending: fallback } = require("../controllers/emailController");
      if (typeof fallback === "function") return fallback(req, res);
      return res.status(501).json({ ok: false, error: "bulk send not implemented" });
    } catch (err) {
      console.error("Bulk send fallback error:", err);
      return res.status(500).json({ ok: false, error: "bulk send failed" });
    }
  });
}

router.post("/emails/:id/status", updateStatus);

/**
 * Analytics endpoints for dashboard
 */

// summary (counts by status / priority / sentiment)
router.get("/stats/summary", async (req, res) => {
  try {
    const total = await Email.countDocuments();
    const byStatus = await Email.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const byPriority = await Email.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);
    const bySentiment = await Email.aggregate([{ $group: { _id: "$sentiment", count: { $sum: 1 } } }]);
    res.json({ ok: true, total, byStatus, byPriority, bySentiment });
  } catch (err) {
    console.error("GET /stats/summary error:", err);
    res.status(500).json({ ok: false, error: "stats error" });
  }
});

// last24h counts + time-series (hourly)
router.get("/stats/last24h", async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const total24 = await Email.countDocuments({ createdAt: { $gte: since } });
    const series = await Email.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);
    res.json({ ok: true, total24, series });
  } catch (err) {
    console.error("GET /stats/last24h error:", err);
    res.status(500).json({ ok: false, error: "stats error" });
  }
});

module.exports = router;
