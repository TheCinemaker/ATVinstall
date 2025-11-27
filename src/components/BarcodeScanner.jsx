import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Button } from './ui/button';
import { X, Camera } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
    const scannerRef = useRef(null);
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText, decodedResult) => {
                // Success callback
                console.log("Scan success:", decodedText);
                onScan(decodedText);

                // Stop scanning and close
                scanner.clear().catch(err => console.error("Failed to clear scanner", err));
                onClose();
            },
            (errorMessage) => {
                // Error callback (called frequently when no code is found)
                // console.log("Scan error:", errorMessage);
            }
        );

        scannerRef.current = scanner;

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            }
        };
    }, [onScan, onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Camera className="h-5 w-5" /> Scan Barcode
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 bg-black">
                    <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
                    <p className="text-center text-xs text-gray-400 mt-2">
                        Point camera at a barcode or QR code.
                    </p>
                </div>

                <div className="p-4 text-center">
                    <Button variant="outline" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
