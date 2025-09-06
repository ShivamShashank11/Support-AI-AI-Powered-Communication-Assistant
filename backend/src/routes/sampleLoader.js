// src/routes/sampleLoader.js
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const express = require("express");
const router = express.Router();
const Email = require("../models/Email");

// POST /api/sample/load
router.post("/load", async (req, res) => {
  try {
    const csvPath = path.resolve(__dirname, "../../data/data1.csv");
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ ok: false, error: "CSV not found at " + csvPath });
    }

    const rows = [];
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        const mapped = {
          from: row.from || row.From || row.sender || "",
          subject: row.subject || row.Subject || "(no subject)",
          bodyText: row.body || row.bodyText || row.Body || "",
          receivedAt: row.receivedAt || row.date || new Date(),
          priority: (row.priority || "normal").toLowerCase(),
          sentiment: (row.sentiment || "neutral").toLowerCase(),
          status: (row.status || "pending").toLowerCase(),
        };

        // parse date safely
        try {
          mapped.receivedAt = new Date(mapped.receivedAt);
          if (isNaN(mapped.receivedAt)) mapped.receivedAt = new Date();
        } catch {
          mapped.receivedAt = new Date();
        }

        rows.push(mapped);
      })
      .on("end", async () => {
        if (!rows.length) {
          return res.json({ ok: true, inserted: 0, message: "No rows in CSV" });
        }

        try {
          const inserted = await Email.insertMany(rows, { ordered: false });
          return res.json({ ok: true, inserted: inserted.length });
        } catch (err) {
          console.error("insertMany error:", err);
          return res.status(500).json({ ok: false, error: err.message });
        }
      })
      .on("error", (err) => {
        console.error("CSV read error:", err);
        return res.status(500).json({ ok: false, error: String(err) });
      });
  } catch (err) {
    console.error("load-sample error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
