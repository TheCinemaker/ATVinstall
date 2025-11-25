import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import ImageUpload from '../components/ImageUpload';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
        serialLabel: "TV Serial Number (Optional)"
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Mock upload
            const urlSerial = photoSerial ? "https://placehold.co/600x400?text=Serial+Photo" : null;
            const urlInstall = photoInstall ? "https://placehold.co/600x400?text=Install+Photo" : null;
            const urlPort = photoPort ? "https://placehold.co/600x400?text=Port+Photo" : null;
            const urlConfig = photoConfig ? "https://placehold.co/600x400?text=Config+Photo" : null;

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            const finalLocationType = locationType === 'Other' ? customLocation : locationType;

            const newInstall = {
                id: Date.now().toString(),
                projectId: currentProject.id,
                projectName: currentProject.name,
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
                photoSerialUrl: urlSerial,
                photoInstallUrl: urlInstall,
                photoPortUrl: needsPortInfo ? urlPort : undefined,
                photoConfigUrl: isSignage ? urlConfig : undefined,
                hasIssue,
                issueDescription,
                installer: user?.email || 'Offline User',
                createdAt: new Date().toISOString()
            };

            const existing = JSON.parse(localStorage.getItem(`installs_${currentProject.id}`) || '[]');
            localStorage.setItem(`installs_${currentProject.id}`, JSON.stringify([newInstall, ...existing]));

            navigate('/dashboard');
        } catch (error) {
            console.error("Error saving installation:", error);
            alert("Failed to save. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="font-bold text-lg">{config.label}</h1>
            </header>

            <main className="max-w-md mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Location Section */}
                    <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
                        <h2 className="font-semibold text-sm uppercase text-muted-foreground">Location Details</h2>

                        <div>
                            <label className="block text-sm font-medium mb-1">Location Type</label>
                            <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
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
                                <label className="block text-sm font-medium mb-1">Specify Location</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    placeholder="e.g. Poolside"
                                    value={customLocation}
                                    onChange={(e) => setCustomLocation(e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">{config.idLabel}</label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                placeholder={isSwitch ? "e.g. Rack A" : "e.g. 101"}
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Device Details */}
                    <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
                        <h2 className="font-semibold text-sm uppercase text-muted-foreground">Device Details</h2>

                        {/* Switch Specific Fields */}
                        {isSwitch && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Switch Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                                        placeholder="e.g. SW-Lobby-01"
                                        value={switchName}
                                        onChange={(e) => setSwitchName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Position (U)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                                        placeholder="e.g. U12"
                                        value={switchPosition}
                                        onChange={(e) => setSwitchPosition(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        {/* Serial Number (if applicable) */}
                        {config.serialLabel && (
                            <div>
                                <label className="block text-sm font-medium mb-1">{config.serialLabel}</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    placeholder="Enter Serial / MAC"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Port Info */}
                        {needsPortInfo && (
                            <div>
                                <label className="block text-sm font-medium mb-1">Port / Patch Panel Info</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                                    placeholder="e.g. Panel A / Port 24"
                                    value={portInfo}
                                    onChange={(e) => setPortInfo(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Cloning Checkboxes */}
                        {isCloning && (
                            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isUpdateDone"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={isUpdateDone}
                                        onChange={(e) => setIsUpdateDone(e.target.checked)}
                                    />
                                    <label htmlFor="isUpdateDone" className="text-sm font-medium">
                                        Software Update Done
                                    </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isCloningDone"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        checked={isCloningDone}
                                        onChange={(e) => setIsCloningDone(e.target.checked)}
                                    />
                                    <label htmlFor="isCloningDone" className="text-sm font-medium">
                                        Cloning Done
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Issue Reporting Checkbox */}
                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <input
                                type="checkbox"
                                id="hasIssue"
                                className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                                checked={hasIssue}
                                onChange={(e) => setHasIssue(e.target.checked)}
                            />
                            <label htmlFor="hasIssue" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-red-600">
                                Report an Issue
                            </label>
                        </div>

                        {hasIssue && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="block text-sm font-medium mb-1 text-red-600">Issue Description</label>
                                <textarea
                                    className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 focus:ring-red-500"
                                    placeholder="Describe the problem..."
                                    value={issueDescription}
                                    onChange={(e) => setIssueDescription(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Photos */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Photos</h3>

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

                            {/* Serial Photo logic */}
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
                            <label className="block text-sm font-medium mb-1">Notes / Comments</label>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                placeholder="Any additional info..."
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Installation'
                        )}
                    </Button>
                </form>
            </main>
        </div>
    );
}
