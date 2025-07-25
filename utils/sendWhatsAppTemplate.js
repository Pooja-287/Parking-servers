import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILLIO_SID;
const authToken = process.env.TWILLIO_TOKEN;
const client = twilio(accountSid, authToken);

export const sendWhatsAppCheckIn = async (to, imageUrl, tokenId) => {
  try {
    const response = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:+91${to}`,
      body: `✅ Vehicle Checked-in Successfully\n\n🔑 Token ID: ${tokenId}`,
      mediaUrl: [`${imageUrl}`],
    });

    console.log(" WhatsApp message sent. SID:", response.sid);
    return response.sid;
  } catch (error) {
    console.error(" WhatsApp sending failed:", error?.message || error);
    if (error?.code) {
      console.error("🔎 Twilio Error Code:", error.code);
    }
    throw new Error("Failed to send WhatsApp message.");
  }
};
// ✅ 2. Monthly Pass Created Successfully
export const sendMonthlyPassCreatedMessage = async (
  to,
  name,
  vehicleNo,
  vehicleType,
  duration,
  startDate,
  endDate,
  amount,
  paymentMode
) => {
  try {
    const body = `✅ Monthly Pass Created Successfully!\n\n Name: ${name}\n Vehicle: ${vehicleNo} (${vehicleType})\n Duration: ${duration} month(s)\n Start: ${startDate}\n End: ${endDate}\n Amount: ₹${amount}\n💳 Payment: ${paymentMode}\n\n `;

    const response = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to.startsWith("+") ? to : `+91${to}`}`,
      body,
    });

    console.log("✅ WhatsApp pass creation message sent. SID:", response.sid);
    return response.sid;
  } catch (error) {
    console.error("Pass creation message failed:", error?.message || error);
    if (error?.code) console.error("Twilio Error Code:", error.code);
    throw new Error("Failed to send monthly pass creation WhatsApp message.");
  }
};

export const sendExpiryReminderMessage = async (
  to,
  name,
  vehicleNo,
  endDate,
  extendLink
) => {
  try {
    const body = ` Monthly Pass Expiry Reminder!\n\n Name: ${name}\n Vehicle: ${vehicleNo}\n End Date: ${endDate}\n\n Click here to extend your pass: ${extendLink}`;
    const response = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to.startsWith("+") ? to : `+91${to}`}`,
      body,
    });
    console.log("✅ WhatsApp expiry reminder message sent. SID:", response.sid);
    return response.sid;
  } catch (error) {
    console.error(" Expiry reminder message failed:", error?.message || error);
    if (error?.code) console.error("Twilio Error Code:", error.code);
    throw new Error("Failed to send expiry reminder WhatsApp message.");
  }
};

// ✅ 3. Monthly Pass Extended Successfully
export const sendMonthlyPassExtendedMessage = async (
  to,
  name,
  vehicleNo,
  addedMonths,
  newEndDate,
  additionalAmount
) => {
  try {
    const body = ` Monthly Pass Extended Successfully!\n\n Name: ${name}\n Vehicle: ${vehicleNo}\n Added: ${addedMonths} month(s)\n New End Date: ${newEndDate}\n Additional Amount: ₹${additionalAmount}`;

    const response = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to.startsWith("+") ? to : `+91${to}`}`,
      body,
    });

    console.log("✅ WhatsApp pass extension message sent. SID:", response.sid);
    return response.sid;
  } catch (error) {
    console.error(" Pass extension message failed:", error?.message || error);
    if (error?.code) console.error("Twilio Error Code:", error.code);
    throw new Error("Failed to send monthly pass extension WhatsApp message.");
  }
};
