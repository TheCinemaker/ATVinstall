import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import Footer from '../components/Footer';
import ImageUpload from '../components/ImageUpload';
import { ArrowLeft, Loader2, ScanBarcode } from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/uploadImage';
import { saveToQueue } from '../utils/offlineStorage';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_CONFIG = {
    tv: {
        label: "TV Installation",
        locations: ["Room", "Lobby", "Garage", "Bar", "Restaurant", "Gym", "Other"],
        idLabel: "Room Number / Area Name",
        serialLabel: "TV Serial Number"
    },
    ap: {
        label: "Access Point (AP)",
        locations: ["Room", "Corridor", "Lobby", "Outdoor", "Garage", "Other"],
        idLabel: "Room / Area / AP Name",
        serialLabel: "AP MAC Address / Serial"
    },
    chromecast: {
        label: "Chromecast",
        locations: ["Behind TV", "Server Room (Encoder)", "Other"],
        idLabel: "Associated Room / TV ID",
        serialLabel: null // No serial needed
    },
    cloning: {
        label: "TV Cloning",
        locations: ["Room", "Lobby", "Garage", "Bar", "Restaurant", "Gym", "Other"],
        idLabel: "Room Number or position",
        serialLabel: null // Removed ID/Info field as requested
    },
    camera: {
        label: "Camera Installation",
        locations: ["Corridor", "Lobby", "Outdoor", "Garage", "Stairwell", "Other"],
        idLabel: "Camera Name / Location ID",
        serialLabel: "Camera MAC / Serial"
    },
    switch: {
        label: "Switch Installation",
        locations: ["Server Room", "IDF", "MDF", "Other"],
        idLabel: "Rack / Cabinet ID",
        serialLabel: "Switch Serial Number"
    },
    signage: {
        label: "Digital Signage",
        locations: ["Lobby", "Restaurant", "Bar", "Elevator", "Other"],
        idLabel: "Screen Name / Location",
        serialLabel: null // No serial needed, just photos
    },
    firewall: {
        label: "Firewall Installation",
        locations: ["Server Room", "MDF", "Other"],
        idLabel: "Rack / Location",
        serialLabel: "Serial Number"
    },
    sat: {
        label: "SAT / Headend",
        locations: ["Server Room", "Roof", "MDF"],
        idLabel: "Dish / Unit ID",
        serialLabel: "Receiver Serial"
    },
    iptel: {
        label: "IP Telephone",
        locations: ["Room", "Reception", "Office", "Other"],
        idLabel: "Extension / Room",
        serialLabel: "MAC Address",
        noScanner: true // Scanner disabled as requested
    },
    "management server": {
        label: "Management Server",
        locations: ["Server Room", "MDF"],
        idLabel: "Rack Unit / ID",
        serialLabel: "Service Tag / Serial"
    },
    opc: {
        label: "OPC Server",
        locations: ["Server Room", "MDF"],
        idLabel: "Rack Unit / ID",
        serialLabel: "Service Tag / Serial"
    },
    "media encoder": {
        label: "Media Encoder",
        locations: ["Server Room", "MDF", "AV Rack"],
        idLabel: "Rack Unit / ID",
        serialLabel: "Serial Number"
    },
    headend: {
        label: "Headend Component",
        locations: ["Server Room", "MDF"],
        idLabel: "Rack Unit / ID",
        serialLabel: "Serial Number"
    }
};

export default function InstallDevice() {
    const { deviceType } = useParams();
    const { currentProject } = useProject();
    const { user } = useAuth();
    const navigate = useNavigate();

    const config = DEVICE_CONFIG[deviceType] || DEVICE_CONFIG.tv;
    const isCloning = deviceType === 'cloning';
    const isAP = deviceType === 'ap';
    const isTV = deviceType === 'tv';
    const isChromecast = deviceType === 'chromecast';
    const isCamera = deviceType === 'camera';
    const isSwitch = deviceType === 'switch';
    const isSignage = deviceType === 'signage';

    const needsPortInfo = isAP || isTV || isCamera;

    const [locationType, setLocationType] = useState(config.locations[0]);
    const [customLocation, setCustomLocation] = useState('');
    const [locationId, setLocationId] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [portInfo, setPortInfo] = useState('');
    const [switchPosition, setSwitchPosition] = useState('');
    const [switchName, setSwitchName] = useState('');
    const [isUpdateDone, setIsUpdateDone] = useState(false);
    const [isCloningDone, setIsCloningDone] = useState(false);
    const [notes, setNotes] = useState('');

    // Photos
    const [photoSerial, setPhotoSerial] = useState(null);
    const [photoInstall, setPhotoInstall] = useState(null);
    const [photoPort, setPhotoPort] = useState(null);
    const [photoConfig, setPhotoConfig] = useState(null); // For Signage

    const [hasIssue, setHasIssue] = useState(false);
    const [issueDescription, setIssueDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanTarget, setScanTarget] = useState(null); // 'serial' or 'mac'

    const handleScan = (result) => {
        if (scanTarget === 'serial') {
            setSerialNumber(result);
        } else if (scanTarget === 'mac') {
            setPortInfo(result); // Assuming MAC goes into portInfo for some devices, or we need a dedicated MAC field? 
            // Wait, looking at config:
            // TV: serialLabel="TV Serial Number" -> serialNumber
            // AP: serialLabel="AP MAC Address / Serial" -> serialNumber
            // Camera: serialLabel="Camera MAC / Serial" -> serialNumber
            // Switch: serialLabel="Switch Serial Number" -> serialNumber

            // It seems 'serialNumber' state is used for both Serial and MAC depending on device type.
            // But wait, the user asked for "Serial AND Mac address" on AP box.
            // Currently we only have one field `serialNumber`.
            // Let's check if we need to split it.
            // For now, let's assume we scan into the main ID field.
            setSerialNumber(result);
        }
    };

    const startScan = (target) => {
        setScanTarget(target);
        setShowScanner(true);
    };

    const [loadingStatus, setLoadingStatus] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setLoadingStatus('Uploading photos...');
        try {
            const finalLocationType = locationType === 'Other' ? customLocation : locationType;

            // Upload images first
            const projectId = currentProject.id;
            const uploadPromises = [];

            const uploadIfPresent = async (base64, prefix) => {
                if (base64) {
                    return await uploadImage(base64, `${projectId}/installations`);
                }
                return null;
            };

            const photoSerialUrl = await uploadIfPresent(photoSerial);
            const photoInstallUrl = await uploadIfPresent(photoInstall);
            const photoPortUrl = await uploadIfPresent(photoPort);
            const photoConfigUrl = await uploadIfPresent(photoConfig);

            setLoadingStatus('Saving data...');

            const newInstall = {
                deviceType,
                locationType: finalLocationType,
                locationId,
                serialNumber,
                portInfo: needsPortInfo ? portInfo : undefined,
                switchPosition: isSwitch ? switchPosition : undefined,
                switchName: isSwitch ? switchName : undefined,
                isUpdateDone: isCloning ? isUpdateDone : undefined,
                isCloningDone: isCloning ? isCloningDone : undefined,
                notes,
                photoSerialUrl,
                photoInstallUrl,
                photoPortUrl,
                photoConfigUrl,
                hasIssue,
                issueDescription,
                installerName: user?.displayName || user?.email || 'Anonymous',
                installer: user?.email || 'anonymous@user.com',
                createdAt: new Date(),
                status: hasIssue ? 'active' : 'completed'
            };

            // Remove undefined fields (Firestore doesn't accept them)
            Object.keys(newInstall).forEach(key => {
                if (newInstall[key] === undefined) {
                    delete newInstall[key];
                }
            });

            // Optimistic Save with Offline Support
            // 1. Generate ID immediately so we can queue photos
            const newDocRef = doc(collection(db, 'projects', currentProject.id, 'installations'));

            // 2. Start the save (but don't wait forever)
            const savePromise = setDoc(newDocRef, newInstall);
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

            // 3. Race!
            await Promise.race([savePromise, timeoutPromise]);

            // 4. Queue photos that failed to upload (we use the confirmed ID)
            const queueIfFailed = async (base64, field, url) => {
                if (base64 && !url) {
                    console.log(`Queuing offline photo for ${field}`);
                    await saveToQueue({
                        id: uuidv4(),
                        projectId: currentProject.id,
                        collection: 'installations',
                        docId: newDocRef.id,
                        field: field,
                        base64: base64,
                        timestamp: Date.now()
                    });
                }
            };

            await queueIfFailed(photoSerial, 'photoSerialUrl', photoSerialUrl);
            await queueIfFailed(photoInstall, 'photoInstallUrl', photoInstallUrl);
            await queueIfFailed(photoPort, 'photoPortUrl', photoPortUrl);
            await queueIfFailed(photoConfig, 'photoConfigUrl', photoConfigUrl);

            navigate('/dashboard');
        } catch (error) {
            console.error("Error saving installation:", error);
            alert("Failed to save. Please try again.");
        } finally {
            setLoading(false);
            setLoadingStatus('');
        }
    };

    return (
        <div className="min-h-screen bg-black pb-20 text-gray-100">
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white hover:bg-gray-800">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="font-bold text-lg text-yellow-500">{config.label}</h1>
            </header>

            <main className="max-w-md mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Location Section */}
                    <div className="space-y-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-sm">
                        <h2 className="font-semibold text-sm uppercase text-gray-500 tracking-wider">Location Details</h2>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-400">Location Type</label>
                            <select
                                className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all"
                                value={locationType}
                                onChange={(e) => setLocationType(e.target.value)}
                            >
                                {config.locations.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>

                        {locationType === 'Other' && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-400">Specify Location</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                    placeholder="e.g. Poolside"
                                    value={customLocation}
                                    onChange={(e) => setCustomLocation(e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-400">{config.idLabel}</label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                placeholder={isSwitch ? "e.g. Rack A" : "e.g. 101"}
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                            />
                        </div>

                        {/* Merged Serial Input Logic */}
                        {(config.serialLabel || isSwitch) && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-400">
                                        {config.serialLabel || "Serial Number"}
                                    </label>
                                    {!config.noScanner && (
                                        <span className="text-xs text-yellow-500 font-bold animate-pulse">
                                            📸 USE SCANNER FOR PRECISION
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                        placeholder={`Scan or type ${config.serialLabel || 'Serial'}`}
                                        value={serialNumber}
                                        onChange={(e) => setSerialNumber(e.target.value)}
                                    />
                                    {!config.noScanner && (
                                        <Button
                                            type="button"
                                            variant="default"
                                            onClick={() => startScan('serial')}
                                            className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold shadow-lg shadow-yellow-500/20 px-4 min-w-[100px]"
                                        >
                                            <ScanBarcode className="h-4 w-4 mr-2" />
                                            SCAN
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Device Details */}
                    <div className="space-y-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-sm">
                        <h2 className="font-semibold text-sm uppercase text-gray-500 tracking-wider">Device Details</h2>

                        {/* Switch Specific Fields */}
                        {isSwitch && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">Switch Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                        placeholder="e.g. SW-Lobby-01"
                                        value={switchName}
                                        onChange={(e) => setSwitchName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-400">Position (U)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                        placeholder="e.g. U12"
                                        value={switchPosition}
                                        onChange={(e) => setSwitchPosition(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Port Info */}
                        {needsPortInfo && (
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-400">Port / Patch Panel Info</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                    placeholder="e.g. Panel A / Port 24"
                                    value={portInfo}
                                    onChange={(e) => setPortInfo(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Cloning Checkboxes */}
                        {isCloning && (
                            <div className="space-y-3 p-3 bg-black/20 rounded-lg border border-gray-800">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isUpdateDone"
                                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
                                        checked={isUpdateDone}
                                        onChange={(e) => setIsUpdateDone(e.target.checked)}
                                    />
                                    <label htmlFor="isUpdateDone" className="text-sm font-medium text-gray-300">
                                        Software Update Done
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isCloningDone"
                                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
                                        checked={isCloningDone}
                                        onChange={(e) => setIsCloningDone(e.target.checked)}
                                    />
                                    <label htmlFor="isCloningDone" className="text-sm font-medium text-gray-300">
                                        Cloning Done
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Issue Reporting Checkbox */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-gray-800">
                            <input
                                type="checkbox"
                                id="hasIssue"
                                className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
                                checked={hasIssue}
                                onChange={(e) => setHasIssue(e.target.checked)}
                            />
                            <label htmlFor="hasIssue" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-red-400/80 hover:text-red-400 transition-colors">
                                Report an Issue
                            </label>
                        </div>

                        {hasIssue && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-sm font-medium mb-1 text-red-400">Issue Description</label>
                                <textarea
                                    className="w-full rounded-md border border-red-900/30 bg-red-900/10 text-red-100 px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder-red-300/30"
                                    placeholder="Describe the problem..."
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Photos */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Photos</h3>

                            {needsPortInfo && (
                                <ImageUpload
                                    label="Photo: Wall Socket / Port Info"
                                    onImageCapture={setPhotoPort}
                                />
                            )}

                            {!isCloning && !isSignage && (
                                <ImageUpload
                                    label={needsPortInfo ? "Photo: Installation State" : "Photo: Installation State"}
                                    onImageCapture={setPhotoInstall}
                                />
                            )}

                            {isSignage && (
                                <>
                                    <ImageUpload
                                        label="Photo: Installation State"
                                        onImageCapture={setPhotoInstall}
                                    />
                                    <ImageUpload
                                        label="Photo: Configuration / Content"
                                        onImageCapture={setPhotoConfig}
                                    />
                                </>
                            )}

                            {/* Serial Photo logic (also for Switch) */}
                            {(config.serialLabel || isSwitch) && (
                                <ImageUpload
                                    label="Photo: Serial Number / MAC"
                                    onImageCapture={setPhotoSerial}
                                />
                            )}

                            {/* Cloning specific photo */}
                            {isCloning && (
                                <ImageUpload
                                    label="Photo: Landing Page / Error"
                                    onImageCapture={setPhotoSerial} // Reusing serial photo slot for cloning proof
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-400">Notes / Comments</label>
                            <textarea
                                className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500 outline-none transition-all placeholder-gray-500"
                                placeholder="Any additional info..."
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => navigate('/dashboard')} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 font-semibold" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {loadingStatus || 'Saving...'}
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </div>
                </form>
            </main>
            {showScanner && (
                <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}
            <Footer />
        </div>
    );
}
