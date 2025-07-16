import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// Headers
const headers = {
  Authorization: `Bearer ${process.env.WHATSAPP_API}`,
  "Content-Type": "application/json",
};

export async function sendWhatsAppTemplate(recipientNumber, imageUrl, tokenId) {
  try {
    const payload = {
      messaging_product: "whatsapp",
      to: +recipientNumber,
      type: "template",
      template: {
        name: "purchase_receipt_3",
        language: {
          code: "en_US",
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: imageUrl,
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: tokenId,
              },
            ],
          },
        ],
      },
    };

    const response = await axios.post(process.env.WHATSAPP_URL, payload, {
      headers,
    });

    if (response.status === 200) {
      console.log("Template message sent successfully:", response.data);
      return response.data;
    } else {
      throw new Error(`Failed to send template message: ${response.status}`);
    }
  } catch (error) {
    console.error(
      "Error sending template:",
      error.response?.data || error.message
    );
    throw error;
  }
}
