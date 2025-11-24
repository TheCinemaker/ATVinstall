import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Camera, X, Image as ImageIcon } from 'lucide-react';

export default function ImageUpload({ label, onImageSelect, required = false }) {
    const [preview, setPreview] = useState(null);
    const inputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
                onImageSelect(file);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleClear = () => {
        setPreview(null);
        onImageSelect(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
                {label} {required && <span className="text-destructive">*</span>}
            </label>

            {preview ? (
                <div className="relative rounded-lg overflow-hidden border aspect-video bg-muted">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            ) : (
                <div
                    className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => inputRef.current?.click()}
                >
                    <Camera className="h-8 w-8" />
                    <span className="text-sm">Tap to take photo</span>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            )}
        </div>
    );
}
