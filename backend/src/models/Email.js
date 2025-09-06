const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EmailSchema = new Schema({
  messageId: { type: String, index: true },
  from: String,
  to: [String],
  subject: String,
  bodyText: String,
  receivedAt: { type: Date, default: Date.now },
  isFiltered: { type: Boolean, default: false },
  priority: { type: String, enum: ["urgent", "normal"], default: "normal" },
  sentiment: { type: String, enum: ["positive", "neutral", "negative"], default: "neutral" },
  status: { type: String, enum: ["pending", "responded", "resolved"], default: "pending" },

  // new fields
  extractedInfo: {
    phones: [String],
    emails: [String],
    orderIds: [String]
  },
  draftResponse: String
}, { timestamps: true });

module.exports = mongoose.model("Email", EmailSchema);
