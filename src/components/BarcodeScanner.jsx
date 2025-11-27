import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { Button } from './ui/button';
import { X, Camera } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
    const [error, setError] = useState(null);
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef(null);
    const detectedRef = useRef(false);

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
                frequency: 10
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
                if (detectedRef.current) return; // Prevent multiple detections

                const code = result.codeResult.code;
                console.log("✅ Barcode detected:", code);

                detectedRef.current = true;
                Quagga.stop();
                onScan(code);
                onClose();
            });
        };

        initScanner();

        return () => {
            Quagga.stop();
            Quagga.offDetected();
        };
    }, [onScan, onClose]);

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
                        <>
                            <div ref={scannerRef} className="w-full h-full" />
                            {scanning && (
                                <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
                                        Scanning... Point at barcode
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 flex gap-2 shrink-0 bg-background">
                    <Button variant="secondary" onClick={onClose} className="w-full">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
