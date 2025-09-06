// src/index.js
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const { connectMongo } = require("./config");
const apiRoutes = require("./routes/api");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api", apiRoutes);

app.get("/", (req, res) => res.send("Support AI Backend is up"));

const PORT = process.env.PORT || 4000;

/**
 * Optional subsystems:
 * - workerModule: starts background worker (stub or real). It must export startWorker()
 * - startFetchScheduler: starts periodic fetcher if AUTO_FETCH=true
 *
 * Those modules should be resilient (not throw) — we wrap calls in try/catch.
 */
let workerModule = null;
try {
  workerModule = require("./workers/emailWorker");
} catch (e) {
  workerModule = null;
  console.warn("Worker module not found or failed to load:", e?.message || e);
}

let startFetchScheduler = null;
try {
  ({ startFetchScheduler } = require("./scheduler/fetchScheduler"));
} catch (e) {
  startFetchScheduler = null;
  console.warn("Scheduler module not found or failed to load. AUTO_FETCH will be disabled unless you add scheduler/fetchScheduler.js");
}

// load KB builder (try both common names)
let buildKB = null;
try {
  ({ buildKB } = require("./services/kbService"));
} catch (_) {
  try {
    ({ buildKB } = require("./services/kb"));
  } catch (_) {
    buildKB = null;
  }
}

// load SMTP verify function from possible modules
let verifySMTP = null;
try {
  // preferred new mailer module (exports verify)
  ({ verify: verifySMTP } = require("./services/mailer"));
} catch (_) {
  try {
    // older name
    ({ verifySMTP } = require("./services/mailerService"));
    // rename to verifySMTP for consistency
    if (typeof verifySMTP !== "function") verifySMTP = null;
  } catch (_) {
    verifySMTP = null;
  }
}

async function start() {
  try {
    // 1) connect to MongoDB first
    await connectMongo();

    // 2) Build KB (ensure embeddings / index are ready) - try/catch so startup continues
    if (typeof buildKB === "function") {
      try {
        // awaiting here ensures KB is ready before processing emails if you want strict ordering.
        // If you prefer non-blocking, remove the await.
        await buildKB();
        console.log("Knowledge base (KB) build completed.");
      } catch (kbErr) {
        console.warn("KB build error (continuing startup):", kbErr?.message || kbErr);
      }
    } else {
      console.log("KB builder not present. Skipping buildKB.");
    }

    // 3) Verify SMTP (optional but useful to fail fast if mail config is broken)
    if (typeof verifySMTP === "function") {
      try {
        const ok = await verifySMTP();
        if (ok === false) {
          // some verify implementations return boolean
          console.warn("SMTP verification returned false (continuing startup).");
        } else {
          console.log("SMTP verification succeeded.");
        }
      } catch (smtpErr) {
        console.warn("SMTP verification failed (continuing startup):", smtpErr?.message || smtpErr);
      }
    } else {
      console.log("No SMTP verification function available; skipping SMTP verify.");
    }

    // 4) start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // 5) start worker if available (stub's startWorker should be no-op)
    if (workerModule && typeof workerModule.startWorker === "function") {
      try {
        await workerModule.startWorker();
        console.log("Worker started.");
      } catch (err) {
        console.warn("startWorker error:", err?.message || err);
      }
    } else {
      console.log("Worker module missing or does not export startWorker()");
    }

    // 6) start fetch scheduler (if module present)
    if (startFetchScheduler && typeof startFetchScheduler === "function") {
      try {
        await startFetchScheduler();
        console.log("Fetch scheduler started.");
      } catch (err) {
        console.warn("startFetchScheduler error:", err?.message || err);
      }
    } else {
      console.log("Fetch scheduler not present or not configured. Use GET /api/fetch-mails to fetch manually.");
    }

    // graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal} - shutting down gracefully...`);
      try {
        // stop accepting new connections
        if (server) {
          server.close(() => {
            console.log("HTTP server closed.");
          });
        }

        // stop scheduler if available
        try {
          const sched = require("./scheduler/fetchScheduler");
          if (sched && typeof sched.stopFetchScheduler === "function") {
            sched.stopFetchScheduler();
            console.log("Fetch scheduler stopped.");
          }
        } catch (_) { /* ignore */ }

        // stop worker if available
        try {
          if (workerModule && typeof workerModule.stopWorker === "function") {
            await workerModule.stopWorker();
            console.log("Worker stopped.");
          }
        } catch (_) { /* ignore */ }

        // disconnect mongo if config exposes a disconnect function
        try {
          const cfg = require("./config");
          if (cfg && typeof cfg.disconnectMongo === "function") {
            await cfg.disconnectMongo();
            console.log("MongoDB disconnected.");
          }
        } catch (_) { /* ignore */ }

        setTimeout(() => process.exit(0), 1000);
      } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
