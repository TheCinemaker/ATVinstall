import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a Base64 image string to Firebase Storage
 * @param {string} base64String - The Base64 encoded image string
 * @param {string} folder - The folder path in storage (e.g., 'installs' or 'issues')
 * @returns {Promise<string>} - The download URL of the uploaded image
 */
export const uploadImage = async (base64String, folder) => {
    if (!base64String) return null;

    try {
        // Create a unique filename
        const filename = `${Date.now()}_${uuidv4()}.jpg`;
        const storageRef = ref(storage, `projects/${folder}/${filename}`);

        // Upload the Base64 string
        // 'data_url' format handles the "data:image/jpeg;base64,..." prefix automatically
        await uploadString(storageRef, base64String, 'data_url');

        // Get and return the download URL
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;

    } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error("Image upload failed");
    }
};
