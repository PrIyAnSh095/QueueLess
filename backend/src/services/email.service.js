import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  return transporter;
}

const from = () => `"QueueLess" <${process.env.SMTP_USER || "noreply@queueless.com"}>`;

export async function sendOTPEmail(email, otp, purpose = "verification") {
  const subjects = {
    "queue-join": "QueueLess — Verify Your Queue Join",
    "forgot-password": "QueueLess — Password Reset OTP",
    "verify-email": "QueueLess — Email Verification",
    "change-password": "QueueLess — Password Change OTP"
  };
  const subject = subjects[purpose] || "QueueLess — OTP Verification";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;margin-bottom:8px;">QueueLess Verification</h2>
      <p style="color:#475569;font-size:15px;">Your one-time verification code is:</p>
      <div style="background:#7c3aed;color:#ffffff;font-size:32px;letter-spacing:6px;text-align:center;padding:18px;border-radius:8px;margin:20px 0;font-weight:700;">${otp}</div>
      <p style="color:#64748b;font-size:13px;">This code expires in <b>10 minutes</b>. Do not share it with anyone.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
      <p style="color:#94a3b8;font-size:12px;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  try {
    await getTransporter().sendMail({ from: from(), to: email, subject, html });
    return true;
  } catch (err) {
    console.error("Email send error:", err.message);
    return false;
  }
}

export async function sendQueueConfirmation(email, details) {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">Queue Booking Confirmed! 🎉</h2>
      <p style="color:#475569;">Your booking has been confirmed.</p>
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:16px 0;">
        <p style="margin:4px 0;color:#334155;"><b>Service:</b> ${details.serviceName}</p>
        <p style="margin:4px 0;color:#334155;"><b>Token:</b> #${details.tokenNumber}</p>
        ${details.scheduledTime ? `<p style="margin:4px 0;color:#334155;"><b>Scheduled:</b> ${details.scheduledTime}</p>` : ""}
        <p style="margin:4px 0;color:#334155;"><b>Estimated Wait:</b> ${details.estimatedWait || "N/A"}</p>
      </div>
      <p style="color:#64748b;font-size:13px;">You will receive a reminder when your turn is approaching.</p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: "QueueLess — Booking Confirmed", html });
  } catch (err) {
    console.error("Queue confirmation email error:", err.message);
  }
}

export async function sendTurnReminder(email, details) {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">Your Turn is Coming! ⏰</h2>
      <p style="color:#475569;">Get ready — your turn for <b>${details.serviceName}</b> is approaching.</p>
      <div style="background:#7c3aed;color:#fff;text-align:center;padding:18px;border-radius:8px;margin:16px 0;">
        <div style="font-size:14px;">Your Position</div>
        <div style="font-size:36px;font-weight:700;">#${details.position}</div>
      </div>
      <p style="color:#64748b;font-size:13px;">Estimated wait: <b>${details.estimatedWait}</b></p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: "QueueLess — Your Turn is Coming!", html });
  } catch (err) {
    console.error("Turn reminder email error:", err.message);
  }
}

export async function sendDelayCheck(email, details) {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">Has Your Turn Arrived? 🤔</h2>
      <p style="color:#475569;">We noticed your scheduled time for <b>${details.serviceName}</b> has passed.</p>
      <p style="color:#475569;">Please let us know if you were served on time by logging into QueueLess and updating your status.</p>
      <p style="color:#64748b;font-size:13px;">Your feedback helps us improve wait time estimates for everyone.</p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: "QueueLess — Was Your Turn On Time?", html });
  } catch (err) {
    console.error("Delay check email error:", err.message);
  }
}

export async function sendOrgStatusEmail(email, orgName, status) {
  const approved = status === "approved";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">Organization ${approved ? "Approved ✅" : "Rejected ❌"}</h2>
      <p style="color:#475569;">Your organization <b>${orgName}</b> has been <b>${status}</b> by the QueueLess admin.</p>
      ${approved
        ? '<p style="color:#475569;">You can now create services and start accepting bookings!</p>'
        : '<p style="color:#475569;">Please review the requirements and re-apply, or contact support for more information.</p>'
      }
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: `QueueLess — Organization ${approved ? "Approved" : "Rejected"}`, html });
  } catch (err) {
    console.error("Org status email error:", err.message);
  }
}
