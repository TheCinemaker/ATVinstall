import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { Button } from './ui/button';
import { X, Camera, Check } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
    const [error, setError] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [detectedCode, setDetectedCode] = useState(null);
    const scannerRef = useRef(null);
    const detectedRef = useRef(false);
    const lastDetectionTime = useRef(0);

    useEffect(() => {
        const initScanner = () => {
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: scannerRef.current,
                    constraints: {
                        facingMode: "environment",
                        width: { min: 640 },
                        height: { min: 480 }
                    },
                    area: { // Restrict detection to the center 30% of the screen height
                        top: "35%",
                        bottom: "35%",
                        left: "10%",
                        right: "10%"
                    }
                },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "code_39_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "upc_reader",
                        "upc_e_reader"
                    ]
                },
                locate: true,
                locator: {
                    patchSize: "medium",
                    halfSample: true
                },
                numOfWorkers: 2,
                frequency: 5 // Reduced from 10 to slow down scanning
            }, (err) => {
                if (err) {
                    console.error("Quagga init error:", err);
                    setError("Failed to start camera. Please grant camera permissions.");
                    return;
                }

                console.log("Quagga initialized");
                Quagga.start();
                setScanning(true);
            });

            Quagga.onDetected((result) => {
                if (detectedRef.current) return; // Already detected something

                const now = Date.now();
                // Require 1.5 seconds between detections to avoid rapid-fire scanning
                if (now - lastDetectionTime.current < 1500) {
                    return;
                }

                const code = result.codeResult.code;
                console.log("✅ Barcode detected:", code);

                lastDetectionTime.current = now;
                detectedRef.current = true;

                // Pause scanning and show confirmation
                Quagga.pause();
                setDetectedCode(code);
                setScanning(false);
            });
        };

        initScanner();

        return () => {
            Quagga.stop();
            Quagga.offDetected();
        };
    }, []);

    const handleConfirm = () => {
        Quagga.stop();
        onScan(detectedCode);
        onClose();
    };

    const handleRetry = () => {
        setDetectedCode(null);
        detectedRef.current = false;
        Quagga.start();
        setScanning(true);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30 shrink-0 relative z-20">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Camera className="h-5 w-5" /> Scan Barcode
                    </h2>
                    <Button type="button" variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="relative bg-black flex-1 flex items-center justify-center min-h-[400px] overflow-hidden">
                    {error ? (
                        <div className="text-center p-6 text-destructive">
                            <p className="font-medium mb-2">Error</p>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    ) : (
                        <>
                            <div
                                ref={scannerRef}
                                className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_canvas]:w-full [&_canvas]:h-full [&_canvas]:object-cover"
                            />

                            {/* Scanning Zone Guide (Laser) */}
                            {scanning && !detectedCode && (
                                <>
                                    {/* Center Box Guide */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[30%] border-2 border-red-500/30 rounded-lg pointer-events-none shadow-[0_0_20px_rgba(255,0,0,0.2)]"></div>
                                    {/* Laser Line */}
                                    <div className="absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-red-600 shadow-[0_0_8px_rgba(255,0,0,0.9)] -translate-y-1/2 pointer-events-none animate-pulse"></div>
                                    <div className="absolute top-[30%] left-0 right-0 text-center pointer-events-none">
                                        <p className="text-red-500 font-bold text-xs uppercase tracking-widest shadow-black drop-shadow-md">
                                            Align code here
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Detected Code Overlay */}
                            {detectedCode && (
                                <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center p-6">
                                    <div className="bg-background rounded-lg p-6 max-w-sm w-full text-center">
                                        <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                        <p className="text-sm text-muted-foreground mb-2">Detected Code:</p>
                                        <p className="text-2xl font-bold mb-6 font-mono">{detectedCode}</p>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" onClick={handleRetry} className="flex-1">
                                                Wrong Code
                                            </Button>
                                            <Button type="button" onClick={handleConfirm} className="flex-1">
                                                Use This
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {scanning && !detectedCode && (
                                <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                                    <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                                        Scanning...
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 flex gap-2 shrink-0 bg-background relative z-20">
                    <Button type="button" variant="secondary" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
