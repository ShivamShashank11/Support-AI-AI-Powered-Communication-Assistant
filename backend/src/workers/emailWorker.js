// src/workers/emailWorker.js
// DEV-SAFE: worker stub — no Redis connection attempts.

console.log("Worker disabled in dev-safe development mode.");

module.exports = {
  startWorker: async function () {
    console.log("startWorker called but worker is disabled in dev mode.");
  }
};
