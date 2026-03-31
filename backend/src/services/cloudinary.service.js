import cloudinary from "../config/cloudinary.js";
import { Readable } from "stream";

export const uploadToCloudinary = (fileBuffer, folder = "queueless") => {
  return new Promise((resolve, reject) => {
    console.log("➡️ Cloudinary upload function called");

    if (!fileBuffer) {
      console.log("❌ File buffer is missing");
      return reject(new Error("File buffer is missing"));
    }

    console.log("📊 Buffer size:", fileBuffer.length);

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary Error:", error);
          return reject(error);
        }

        console.log("✅ Cloudinary response:", result);

        resolve({
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    const readableStream = new Readable({
      read() { }
    });

    console.log("🔄 Converting buffer to stream...");

    readableStream.push(fileBuffer);
    readableStream.push(null);

    console.log("🚀 Piping to Cloudinary...");

    readableStream.pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};