import cloudinary from "../config/cloudinary.config.js";

export async function uploadImage(fileBuffer, folder = "queueless") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(fileBuffer);
  });
}

export async function deleteImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch {
    return false;
  }
}
