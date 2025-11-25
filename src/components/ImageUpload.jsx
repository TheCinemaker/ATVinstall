import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './ui/button';

export default function ImageUpload({ onImageCapture, label = "Take Photo", currentImage = null }) {
    const [preview, setPreview] = useState(currentImage);
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG with 0.6 quality to keep size low for Firestore
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
                };
            };
        });
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setProcessing(true);
            try {
                // Compress and convert to Base64
                const base64String = await compressImage(file);

                setPreview(base64String);
                onImageCapture(base64String); // Pass Base64 string instead of URL
            } catch (error) {
                console.error("Error processing image:", error);
                alert(`Failed to process image: ${error.message}`);
            } finally {
                setProcessing(false);
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
                onClick={() => !processing && fileInputRef.current?.click()}
            >
                {preview ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={preview}
                            alt="Preview"
                            className="max-h-[200px] rounded-lg object-contain"
                        />
                        {processing && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                                <div className="text-white font-bold text-sm">Processing...</div>
                            </div>
                        )}
                        {!processing && (
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
                    disabled={processing}
                />
            </div>
        </div>
    );
}
