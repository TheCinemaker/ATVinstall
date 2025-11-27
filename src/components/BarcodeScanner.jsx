import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from './ui/button';
import { X, Camera, RefreshCw } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
    const [error, setError] = useState(null);
    const [cameras, setCameras] = useState([]);
    const [activeCameraId, setActiveCameraId] = useState(null);
    const scannerRef = useRef(null);
    const isScanningRef = useRef(false);

    useEffect(() => {
        let scanner = null;

        const startScanning = async () => {
            try {
                // 1. Get Cameras
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    setCameras(devices);
                    // Prefer back camera if available
                    const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
                    const cameraId = backCamera ? backCamera.id : devices[0].id;
                    setActiveCameraId(cameraId);

                    // 2. Start Scanner
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
                        verbose: true // Enable logging to debug
                    });
                    scannerRef.current = scanner;

                    await scanner.start(
                        cameraId,
                        {
                            fps: 20, // Increased FPS for faster scanning
                            qrbox: { width: 300, height: 150 }, // Wider box for 1D codes
                            disableFlip: false, // Try both orientations
                            videoConstraints: {
                                facingMode: "environment" // Prefer back camera
                            }
                        },
                        (decodedText) => {
                            // Success
                            console.log("✅ Scan success:", decodedText);
                            if (isScanningRef.current) {
                                isScanningRef.current = false;
                                onScan(decodedText);
                                scanner.stop().then(() => {
                                    scanner.clear();
                                    onClose();
                                }).catch(err => console.error("Stop failed", err));
                            }
                        },
                        (errorMessage) => {
                            // Log errors occasionally to debug
                            if (Math.random() < 0.01) { // Log 1% of errors to avoid spam
                                console.log("Scanning...", errorMessage);
                            }
                        }
                    );
                    isScanningRef.current = true;
                } else {
                    setError("No cameras found.");
                }
            } catch (err) {
                console.error("Camera start error:", err);
                setError("Camera access denied or error starting camera. Please ensure you have granted camera permissions.");
            }
        };

        startScanning();

        return () => {
            isScanningRef.current = false;
            if (scannerRef.current) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current.clear();
                }).catch(err => {
                    // Ignore stop errors on unmount
                });
            }
        };
    }, []); // Run once on mount

    const switchCamera = async () => {
        if (cameras.length < 2 || !scannerRef.current) return;

        const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        const nextCameraId = cameras[nextIndex].id;

        try {
            await scannerRef.current.stop();
            setActiveCameraId(nextCameraId);
            await scannerRef.current.start(
                nextCameraId,
                {
                    fps: 15,
                    qrbox: { width: 300, height: 150 },
                    // aspectRatio: 1.0
                },
                (decodedText) => {
                    if (isScanningRef.current) {
                        isScanningRef.current = false;
                        onScan(decodedText);
                        scannerRef.current.stop().then(() => {
                            scannerRef.current.clear();
                            onClose();
                        });
                    }
                },
                () => { }
            );
            isScanningRef.current = true;
        } catch (err) {
            console.error("Switch camera failed", err);
            setError("Failed to switch camera.");
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

                <div className="relative bg-black flex-1 flex items-center justify-center min-h-[300px]">
                    {error ? (
                        <div className="text-center p-6 text-destructive">
                            <p className="font-medium mb-2">Camera Error</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    ) : (
                        <div id="reader" className="w-full h-full"></div>
                    )}

                    {/* Overlay Guide */}
                    {!error && (
                        <div className="absolute inset-0 pointer-events-none border-[50px] border-black/50 flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-red-500/50 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500"></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 flex gap-2 shrink-0 bg-background">
                    {cameras.length > 1 && (
                        <Button variant="outline" className="flex-1" onClick={switchCamera}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Switch Camera
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose} className="flex-1">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
