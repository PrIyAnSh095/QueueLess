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

/**
 * Generic email sender — fixes "emailService.sendEmail is not a function"
 */
export async function sendEmail({ to, subject, text, html }) {
  try {
    await getTransporter().sendMail({ from: from(), to, subject, text, html });
    return true;
  } catch (err) {
    console.error("[email.service] sendEmail error:", err.message);
    return false;
  }
}

/**
 * Rich "leave now" notification including distance, travel time, ETA, and buffer disclosure
 */
export async function sendLeaveNowNotification(email, details) {
  const {
    serviceName,
    tokenNumber,
    position,
    etaMinutes,
    distanceKm,
    travelMinutes,
    leaveInMinutes,
    displayAddress,
    mapsUrl
  } = details;
  let leaveMsg = "";
  let leaveStatus = "on-schedule";
  const BUFFER_MINUTES = 5;
  
  if (leaveInMinutes <= 0) {
    leaveMsg = `<span style="color:#dc2626;font-weight:700;">Leave Now!</span>`;
    leaveStatus = "immediate";
  } else if (leaveInMinutes <= 10) {
    leaveMsg = `<span style="color:#d97706;font-weight:700;">Leave in ${leaveInMinutes} minutes</span>`;
  } else {
    leaveMsg = `<span style="color:#059669;font-weight:700;">Leave in ~${leaveInMinutes} minutes</span>`;
  }

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">⏰ Time to Head Out!</h2>
      <p style="color:#475569;">Your turn for <b>${serviceName}</b> is approaching.</p>
      
      ${leaveStatus === 'immediate' ? `
        <div style="background:#fee2e2;border:1px solid #ef4444;color:#991b1b;padding:12px;border-radius:8px;margin-bottom:16px;font-size:14px;font-weight:600;text-align:center;">
          ⚠️ Leave immediately to avoid missing your turn!
        </div>
      ` : ""}

      <div style="background:#7c3aed;color:#fff;text-align:center;padding:20px;border-radius:10px;margin:16px 0;">
        <div style="font-size:13px;opacity:.85;">Your Queue Position</div>
        <div style="font-size:40px;font-weight:700;">#${position}</div>
        <div style="font-size:13px;opacity:.85;">Token: #${tokenNumber}</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin:12px 0;">
        ${displayAddress ? `<p style="margin:4px 0;color:#334155;"><b>📍 Location:</b> ${displayAddress}</p>` : ""}
        <p style="margin:4px 0;color:#334155;"><b>Estimated Queue Wait:</b> ${etaMinutes} minutes</p>
        ${distanceKm != null ? `<p style="margin:4px 0;color:#334155;"><b>Distance:</b> ${distanceKm.toFixed(2)} km</p>` : ""}
        ${travelMinutes != null ? `<p style="margin:4px 0;color:#334155;"><b>Estimated Travel Time:</b> ${travelMinutes} minutes</p>` : ""}
        <p style="margin:8px 0;color:#334155;font-size:16px;"><b>Suggested Leave Time:</b> ${leaveMsg}</p>
      </div>
      
      ${mapsUrl ? `
        <div style="margin:16px 0;">
          <a href="${mapsUrl}" target="_blank" style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;padding:12px;border-radius:8px;font-size:14px;font-weight:600;">
            🗺️ Get Directions in Google Maps
          </a>
        </div>
      ` : ""}
      
      <p style="color:#94a3b8;font-size:12px;margin-top:16px;">
        ℹ️ Travel time includes a <b>${BUFFER_MINUTES}-minute buffer</b> to account for traffic and walking.
        ETA is calculated based on current queue length × average service time per person.
      </p>
    </div>
  `;

  try {
    await getTransporter().sendMail({
      from: from(),
      to: email,
      subject: "QueueLess — Time to Head Out!",
      html
    });
    return true;
  } catch (err) {
    console.error("[email.service] sendLeaveNowNotification error:", err.message);
    return false;
  }
}


/**
 * Post-ETA delay follow-up: ask user if they were served
 */
export async function sendDelayFollowUpEmail(email, details) {
  const { serviceName, tokenNumber, apiBase } = details;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">🤔 Were You Served On Time?</h2>
      <p style="color:#475569;">Your estimated wait time for <b>${serviceName}</b> (Token #${tokenNumber}) has passed.</p>
      <p style="color:#475569;">Please log into QueueLess and update your serve status to help us improve accuracy for everyone.</p>
      <p style="color:#64748b;font-size:13px;">Your feedback directly helps calibrate wait time estimates.</p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: "QueueLess — Were You Served On Time?", html });
  } catch (err) {
    console.error("[email.service] sendDelayFollowUpEmail error:", err.message);
  }
}

/**
 * Ask org to update avgServiceTime based on actual observed data
 */
export async function sendOrgAvgTimeUpdateRequest(email, { orgName, actualAvg, currentAvg }) {
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">📊 Update Average Service Time?</h2>
      <p style="color:#475569;">Based on recent queue data for <b>${orgName}</b>, we've calculated an updated average:</p>
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:18px;margin:12px 0;">
        <p style="margin:4px 0;color:#334155;"><b>Current Avg Service Time:</b> ${currentAvg} minutes</p>
        <p style="margin:4px 0;color:#7c3aed;font-size:16px;"><b>Suggested New Average:</b> ${actualAvg} minutes</p>
      </div>
      <p style="color:#475569;">Log in to your QueueLess dashboard to accept or reject this update.</p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: "QueueLess — Update Average Service Time?", html });
  } catch (err) {
    console.error("[email.service] sendOrgAvgTimeUpdateRequest error:", err.message);
  }
}

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
  const { 
    serviceName, 
    tokenNumber, 
    estimatedWait, 
    distance, 
    timeToReach, 
    locationAddress,
    userLocation,
    orgLocation,
    status = "on schedule" 
  } = details;
  
  // Handle GeoJSON [lng, lat] vs Object {lat, lng}
  const getCoords = (loc) => {
    if (!loc) return null;
    if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
      return { lat: loc.coordinates[1], lng: loc.coordinates[0] };
    }
    if (loc.lat !== undefined && loc.lng !== undefined) {
      return { lat: loc.lat, lng: loc.lng };
    }
    return null;
  };

  const uLoc = getCoords(userLocation);
  const oLoc = getCoords(orgLocation);
  // Strictly coordinate-based pinpoint directions
  const mapsUrl = oLoc
    ? `https://www.google.com/maps/dir/?api=1&destination=${oLoc.lat},${oLoc.lng}`
    : null;

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">Queue Booking Confirmed! 🎉</h2>
      <p style="color:#475569;">Your booking for <b>${serviceName}</b> is successful.</p>
      
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:20px 0;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your Token</div>
          <div style="font-size:48px;font-weight:800;color:#7c3aed;">#${tokenNumber}</div>
        </div>
        
        <div style="border-top:1px solid #f1f5f9;padding-top:16px;">
          <p style="margin:8px 0;color:#334155;font-size:14px;">📍 <b>Location:</b> ${locationAddress || 'On-site'}</p>
          <p style="margin:8px 0;color:#334155;font-size:14px;">⏱️ <b>Est. Wait:</b> ${estimatedWait || 'N/A'}</p>
          ${distance > 0 ? `<p style="margin:8px 0;color:#334155;font-size:14px;">🚗 <b>Distance:</b> ${distance} km</p>` : ""}
          ${timeToReach > 0 ? `<p style="margin:8px 0;color:#334155;font-size:14px;">🏎️ <b>Estimated Travel Time:</b> ~${timeToReach} mins</p>` : ""}
          <p style="margin:8px 0;color:#334155;font-size:14px;">📈 <b>Status:</b> <span style="color:#059669;font-weight:600;">${status}</span></p>
        </div>
        
        ${mapsUrl ? `
          <div style="margin-top:20px;">
            <a href="${mapsUrl}" target="_blank" style="display:block;text-align:center;background:#0f172a;color:#fff;text-decoration:none;padding:12px;border-radius:8px;font-size:14px;font-weight:600;">
              🗺️ Open Directions in Google Maps
            </a>
          </div>
        ` : ""}
      </div>
      
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;margin:16px 0;font-size:13px;color:#92400e;">
        ⏰ <b>Suggested Leave Time:</b> ${timeToReach > 0 ? `We recommend heading out approx. <b>${timeToReach + 5} minutes</b> before your turn (includes a 5-min buffer).` : 'Keep an eye on your queue position and head out once your turn is approaching.'}
      </div>
      
      <p style="color:#64748b;font-size:13px;">We'll notify you again when your turn is approaching. Thank you for using QueueLess!</p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: `QueueLess — Booking Confirmed (#${tokenNumber})`, html });
  } catch (err) {
    console.error("Queue confirmation email error:", err.message);
  }
}

export async function sendServedNotification(email, details) {
  const { serviceName, tokenNumber, counterName } = details;
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#059669;">You Are Being Served! ✅</h2>
      <p style="color:#475569;">It's finally your turn for <b>${serviceName}</b>.</p>
      
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
        <div style="font-size:14px;color:#64748b;">Proceed to</div>
        <div style="font-size:32px;font-weight:800;color:#059669;margin:8px 0;">${counterName || 'Service Counter'}</div>
        <div style="font-size:14px;color:#94a3b8;">Token: #${tokenNumber}</div>
      </div>
      
      <p style="color:#64748b;font-size:13px;">Please complete your transaction and don't forget to rate your experience!</p>
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: "QueueLess — Your turn has arrived!", html });
  } catch (err) {
    console.error("Served notification email error:", err.message);
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

export async function sendServiceStatusEmail(email, serviceName, status) {
  const approved = status === "approved";
  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
      <h2 style="color:#1e293b;">Service ${approved ? "Approved ✅" : "Rejected ❌"}</h2>
      <p style="color:#475569;">Your service <b>${serviceName}</b> has been <b>${status}</b> by the admin.</p>
      ${approved
        ? '<p style="color:#475569;">It is now visible to users and ready to accept bookings!</p>'
        : '<p style="color:#475569;">Please check your service details and ensure all requirements are met before resubmitting.</p>'
      }
    </div>
  `;
  try {
    await getTransporter().sendMail({ from: from(), to: email, subject: `QueueLess — Service ${approved ? "Approved" : "Rejected"}`, html });
  } catch (err) {
    console.error("Service status email error:", err.message);
  }
}
