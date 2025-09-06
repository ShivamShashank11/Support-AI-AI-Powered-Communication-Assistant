// src/services/knowledgeBase.js
const faqs = [
  { q: "How to reset my password?", a: "Click on 'Forgot Password' on the login page and follow the steps." },
  { q: "How to contact support?", a: "You can email us at support@company.com or call +91-9000000000." },
];

function findRelevantAnswer(text) {
  text = text.toLowerCase();
  for (let f of faqs) {
    if (text.includes(f.q.toLowerCase().split(" ")[0])) {
      return f.a;
    }
  }
  return null;
}

module.exports = { findRelevantAnswer };
