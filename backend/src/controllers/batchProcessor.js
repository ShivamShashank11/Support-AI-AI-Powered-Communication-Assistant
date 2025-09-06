
const Email = require("../models/Email");
const { addEmailJob } = require("../queues/emailQueue"); 


 
async function processPendingFilteredEmails(limit = 50) {
  
  const pending = await Email.find({
    isFiltered: true,
    status: { $in: ["pending"] }
  })
    .sort({ priority: -1, receivedAt: -1 }) 
    .limit(limit)
    .lean();

  const results = [];

  for (const e of pending) {
    try {

      const priority = e.priority || "normal";
      const r = await addEmailJob(e._id.toString(), priority);
      results.push({ id: e._id.toString(), queued: !!r.queued || !!r.inline, info: r });
    } catch (err) {
      results.push({ id: e._id.toString(), error: err.message || String(err) });
    }
  }

  return results;
}

module.exports = { processPendingFilteredEmails };
