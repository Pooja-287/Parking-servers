// import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const accountSid = "AC970dc58a4fa4be2a252337ad44f511d7";
const authToken = "c8521f454891615800e1ca56b59edcba";
const client = require("twilio")(accountSid, authToken);
client.messages
  .create({
    from: "whatsapp:+14155238886",
    contentSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
    contentVariables: '{"1":"12/1","2":"3pm"}',
    to: "whatsapp:+919384565239",
  })
  .then((message) => console.log(message.sid))
  .done();

// // Headers
// const headers = {
//   Authorization: `Bearer ${process.env.WHATSAPP_API}`,
//   "Content-Type": "application/json",
// };

// export async function sendWhatsAppTemplate(imageUrl) {
//   try {
//     const payload = {
//       messaging_product: "whatsapp",
//       to: "91**********",
//       type: "template",
//       template: {
//         name: "check_in_template",
//         language: { code: "en" },
//         components: [
//           {
//             type: "header",
//             parameters: [
//               {
//                 type: "image",
//                 image: {
//                   link: imageUrl,
//                 },
//               },
//             ],
//           },
//           {
//             type: "body",
//             parameters: [{ type: "text", text: "your_token_value" }],
//           },
//         ],
//       },
//     };

//     const response = await axios.post(process.env.WHATSAPP_URL, payload, {
//       headers,
//     });

//     if (response.status === 200) {
//       console.log("Template message sent successfully:", response.data);
//       return response.data;
//     } else {
//       throw new Error(`Failed to send template message: ${response.status}`);
//     }
//   } catch (error) {
//     console.error(
//       "Error sending template:",
//       error.response?.data || error.message
//     );
//     throw error;
//   }
// }
