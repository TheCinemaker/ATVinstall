import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from './ui/button';
import { X, Camera, ScanBarcode } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
    const [error, setError] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [cameraStarted, setCameraStarted] = useState(false);
    const scannerRef = useRef(null);

    useEffect(() => {
        let scanner = null;

        const startCamera = async () => {
            try {
                // Get Cameras
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    // Prefer back camera
                    const backCamera = devices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('environment')
                    );
                    const cameraId = backCamera ? backCamera.id : devices[0].id;

                    // Enable all common formats
                    const formatsToSupport = [
                        Html5QrcodeSupportedFormats.QR_CODE,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.DATA_MATRIX
                    ];

                    scanner = new Html5Qrcode("reader", {
                        formatsToSupport,
                        verbose: false
                    });
                    scannerRef.current = scanner;

                    // Start camera preview (no scanning yet)
                    await scanner.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 300, height: 150 },
                            videoConstraints: {
                                facingMode: "environment"
                            }
                        },
                        () => { }, // No continuous scanning
                        () => { }
                    );

                    setCameraStarted(true);
                } else {
                    setError("No cameras found.");
                }
            } catch (err) {
                console.error("Camera start error:", err);
                setError("Camera access denied. Please grant camera permissions.");
            }
        };

        startCamera();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { }).finally(() => {
                    if (scannerRef.current) {
                        scannerRef.current.clear().catch(() => { });
                    }
                });
            }
        };
    }, []);

    const handleCapture = async () => {
        if (!scannerRef.current || scanning) return;

        setScanning(true);
        try {
            // Scan current frame
            const result = await scannerRef.current.scanFile(
                document.querySelector('#reader video'),
                false
            );

            console.log("✅ Scan success:", result);

            // Stop camera
            await scannerRef.current.stop();
            await scannerRef.current.clear();

            // Return result
            onScan(result);
            onClose();
        } catch (err) {
            console.log("Scan failed:", err);
            setError("Could not read barcode. Try again or adjust position.");
            setScanning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30 shrink-0">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Camera className="h-5 w-5" /> Scan Barcode
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="relative bg-black flex-1 flex items-center justify-center min-h-[400px]">
                    {error ? (
                        <div className="text-center p-6 text-destructive">
                            <p className="font-medium mb-2">Error</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    ) : (
                        <div id="reader" className="w-full h-full"></div>
                    )}

                    {/* Overlay Guide */}
                    {!error && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-80 h-40 border-2 border-primary/70 rounded-lg relative bg-primary/5">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                                <p className="absolute bottom-[-40px] left-0 right-0 text-center text-sm text-white">
                                    Align barcode within frame
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 flex gap-2 shrink-0 bg-background">
                    <Button
                        variant="default"
                        className="flex-1"
                        onClick={handleCapture}
                        disabled={!cameraStarted || scanning}
                    >
                        <ScanBarcode className="h-4 w-4 mr-2" />
                        {scanning ? "Scanning..." : "Capture & Scan"}
                    </Button>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
