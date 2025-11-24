import { useState, useRef } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export default function ImageUpload({ onImageCapture, label = "Take Photo", currentImage = null }) {
    const [preview, setPreview] = useState(currentImage);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create local preview
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            setUploading(true);

            try {
                // Upload to Firebase Storage
                // Path: images/{timestamp}_{random}_{filename}
                const filename = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${file.name}`;
                const storageRef = ref(storage, 'images/' + filename);
                const uploadTask = uploadBytesResumable(storageRef, file);

                uploadTask.on('state_changed',
                    (snapshot) => {
                        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setProgress(p);
                    },
                    (error) => {
                        console.error("Upload error:", error);
                        alert("Upload failed!");
                        setUploading(false);
                    },
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            setUploading(false);
                            onImageCapture(downloadURL);
                        });
                    }
                );
            } catch (error) {
                console.error("Error processing file:", error);
                setUploading(false);
            }
        }
    };

    const clearImage = (e) => {
        e.stopPropagation();
        setPreview(null);
        onImageCapture(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>

            <div
                className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px] transition-colors ${preview ? 'border-primary/50 bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                    }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                {preview ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-[200px] rounded-lg object-contain"
                        />
                        {uploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                <div className="text-white font-bold">{Math.round(progress)}%</div>
                            </div>
                        )}
                        {!uploading && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
                                onClick={clearImage}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="text-center space-y-2 cursor-pointer">
                        <div className="p-3 bg-primary/10 rounded-full inline-block">
                            <Camera className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                        </div>
                    </div>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploading}
                />
            </div>
        </div>
    );
}
