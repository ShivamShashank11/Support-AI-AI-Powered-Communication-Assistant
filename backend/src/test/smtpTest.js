const { sendMail, verifySMTP } = require("../services/mailerService");

async function run() {
  await verifySMTP();

  const res = await sendMail(
    "your_other_email@gmail.com", // 👈 yaha apna dusra test email daalo
    "SMTP Test - Support AI",
    "Hello! 👋 This is a test auto-response from your Support AI backend."
  );

  console.log("Test result:", res);
}

run();
