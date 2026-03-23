import nodemailer from "nodemailer";
import { calculateDistance } from "../utils/location.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendNotification = async (email, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      text
    });
    console.log(`Notification sent to ${email}`);
  } catch (err) {
    console.error("Failed to send email", err);
  }
};

export const checkAndNotifyTravel = async (ticket, avgServiceTime) => {
  if (!ticket.userLocation?.lat || !ticket.serviceLocation?.lat) return;

  const dist = calculateDistance(
    ticket.userLocation.lat,
    ticket.userLocation.lng,
    ticket.serviceLocation.lat,
    ticket.serviceLocation.lng
  );

  // Assume avg travel speed 30km/h -> 2 min per km
  const travelTime = dist * 2;
  const waitTime = ticket.etaMinutes || 0;

  if (waitTime <= travelTime + 5 && !ticket.notified) {
     await sendNotification(
       ticket.user.email,
       "Time to start your journey!",
       `Your turn at ${ticket.service.serviceName} is coming up in approximately ${waitTime} minutes. Your estimated travel time is ${travelTime} minutes. Please start moving now.`
     );
     ticket.notified = true;
     await ticket.save();
  }
};
