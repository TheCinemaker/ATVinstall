import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { v4 as uuidv4 } from 'uuid';

// Helper to convert Base64 to Blob
const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
    // Check if base64 string contains the data prefix
    const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;

    const byteCharacters = atob(base64Clean);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

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

        // Convert to Blob
        const blob = base64ToBlob(base64String);

        // Upload with Timeout (15 seconds)
        const uploadTask = uploadBytes(storageRef, blob);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Upload timed out")), 15000)
        );

        await Promise.race([uploadTask, timeoutPromise]);

        // Get and return the download URL
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;

    } catch (error) {
        console.error("Error uploading image:", error);
        // Return null to prevent blocking the entire save process
        return null;
    }
};
