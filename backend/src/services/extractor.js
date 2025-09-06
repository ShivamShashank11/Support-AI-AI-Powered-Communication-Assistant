
const phoneRegex = /(\+?\d[\d\s().-]{6,20}\d)/g;
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const orderRegex = /order\s*#?\s*(\d{4,})/ig;

function normalizePhone(s) {
  return s.replace(/[^\d+]/g, "").replace(/\s+/g, "");
}

function extractContactInfo(text = "") {
 
  const rawPhones = [...(text.match(phoneRegex) || [])].map(s => s.trim());
  const phones = [...new Set(rawPhones.map(normalizePhone).filter(Boolean))];

  
  const rawEmails = [...(text.match(emailRegex) || [])].map(s => s.trim());
  const emails = [...new Set(rawEmails.map(e => e.toLowerCase()))];

  
  const orderMatches = [...text.matchAll(orderRegex)];
  const orderIds = [...new Set(orderMatches.map(m => (m && m[1] ? m[1].trim() : null)).filter(Boolean))];

  return { phones, emails, orderIds };
}

function detectPriority(text = "") {
  const urgentKeywords = [
    "immediately",
    "urgent",
    "critical",
    "cannot access",
    "can't access",
    "cant access",
    "asap",
    "as soon as possible",
    "down",
    "not working",
    "blocked"
  ];
  const lower = (text || "").toLowerCase();
  return urgentKeywords.some(k => lower.includes(k)) ? "urgent" : "normal";
}

function detectSentiment(text = "") {
  const negWords = [
    "angry",
    "frustrated",
    "frustrat",
    "not working",
    "not happy",
    "bad",
    "worst",
    "issue",
    "problem",
    "can't",
    "cannot",
    "failed",
    "disappointed"
  ];
  const posWords = [
    "thanks",
    "thank you",
    "appreciate",
    "great",
    "good",
    "happy",
    "love",
    "resolved",
    "resolved my"
  ];
  const lower = (text || "").toLowerCase();

  if (negWords.some(w => lower.includes(w))) return "negative";
  if (posWords.some(w => lower.includes(w))) return "positive";
  return "neutral";
}

module.exports = { extractContactInfo, detectPriority, detectSentiment };
