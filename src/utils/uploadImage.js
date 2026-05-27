const CLOUD_NAME = "dvwajmgmx";
const UPLOAD_PRESET = "mayjay";

export const uploadImage = async (file) => {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) {
      throw new Error("Failed to upload image. Please check your Cloud Name and Preset.");
    }

    const data = await response.json();
    return data.secure_url; // Returns the final hosted URL
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};
