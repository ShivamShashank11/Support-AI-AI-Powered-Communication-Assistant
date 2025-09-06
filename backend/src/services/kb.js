// simple KB builder stub (expand later with real docs)
async function buildKB() {
  try {
    // if you have files or a folder to index, do it here.
    // For now, return an empty KB or sample snippets:
    const snippets = [
      { id: "reset-password", text: "If a user cannot login, ask them to reset password using the 'Forgot Password' flow." },
      { id: "account-access", text: "For account access issues verify email and last login time." }
    ];
    console.log("Knowledge base (KB) build completed.");
    return { ok: true, snippets };
  } catch (err) {
    console.error("KB build error:", err);
    return { ok: false, error: err.message };
  }
}

module.exports = { buildKB };
