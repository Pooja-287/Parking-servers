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
