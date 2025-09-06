
const Email = require("../models/Email");
async function getStats() {
  const last24 = new Date(Date.now() - 24*60*60*1000);
  const total24 = await Email.countDocuments({ receivedAt: { $gte: last24 } });
  const pending = await Email.countDocuments({ status: "pending" });
  const resolved = await Email.countDocuments({ status: "resolved" });
  const byPriority = await Email.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]);
  const bySentiment = await Email.aggregate([{ $group: { _id: "$sentiment", count: { $sum: 1 } } }]);
  return { total24, pending, resolved, byPriority, bySentiment };
}
module.exports = { getStats };
