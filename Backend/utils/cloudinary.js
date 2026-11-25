import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) return null;

    // upload_large is chunked/streamed; wrap in Promise to await final completion
    const response = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        localFilePath,
        {
          resource_type: "video",
          folder: "acadex/lectures",
          chunk_size: 6000000, // 6MB chunks
          ...options,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });

    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanupErr) {
      console.warn("Could not remove temp file after upload:", cleanupErr);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    try {
      if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanupErr) {
      console.warn("Could not remove temp file on error:", cleanupErr);
    }

    return null;
  }
};

const deleteFromCloudinary = async (publicId, resourceType = "video") => {
  try {
    if (!publicId) return null;
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.warn("Cloudinary delete error:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };