// Example using Cloudinary SDK
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const uploadQR = async (base64DataUrl) => {
  const uploaded = await cloudinary.uploader.upload(base64DataUrl, {
    folder: "qr-codes",
  });
  return uploaded.secure_url;
};

export default uploadQR;
