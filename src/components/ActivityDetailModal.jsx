import { useState } from 'react';
import { X, Calendar, User, MapPin, Hash, Router, Image as ImageIcon, AlertTriangle, FileText, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import ImageUpload from './ImageUpload';
import { useProject } from '../contexts/ProjectContext';

export default function ActivityDetailModal({ activity, onClose, onUpdate }) {
    const { currentProject } = useProject();
    const [isResolving, setIsResolving] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionPhotos, setResolutionPhotos] = useState([null]);
    const [loading, setLoading] = useState(false);

    if (!activity) return null;

    const isIssue = activity.type === 'issue' || activity.hasIssue;
    const isResolved = activity.status === 'resolved';

    // Helper to format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString([], {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Collect all photos
    const photos = [];
    if (activity.photos) {
        // Handle issue photos array
        activity.photos.forEach((url, i) => photos.push({ label: `Photo ${i + 1}`, url }));
    } else {
        // Handle installation photos
        if (activity.photoPortUrl) photos.push({ label: "Port / Wall Socket", url: activity.photoPortUrl });
        if (activity.photoInstallUrl) photos.push({ label: "Installation State", url: activity.photoInstallUrl });
        if (activity.photoSerialUrl) photos.push({ label: "Serial / MAC / Proof", url: activity.photoSerialUrl });
        if (activity.photoConfigUrl) photos.push({ label: "Configuration / Content", url: activity.photoConfigUrl });
    }

    // Add resolution photos if they exist
    if (activity.resolutionPhotos) {
        activity.resolutionPhotos.forEach((url, i) => photos.push({ label: `Resolution Photo ${i + 1}`, url }));
    }

    const handleAddPhoto = () => {
        setResolutionPhotos([...resolutionPhotos, null]);
    };

    const handlePhotoUpdate = (index, base64) => {
        const newPhotos = [...resolutionPhotos];
        newPhotos[index] = base64;
        setResolutionPhotos(newPhotos);
    };

    const handleResolve = async () => {
        if (!resolutionNotes.trim()) return;

        setLoading(true);
        try {
            // Mock upload
            const validPhotos = resolutionPhotos.filter(p => p !== null);
            const photoUrls = validPhotos.map((_, i) => `https://placehold.co/600x400?text=Resolution+Photo+${i + 1}`);

            // Update the issue in localStorage
            const storageKey = activity.type === 'issue' ? `issues_${currentProject.id}` : `installs_${currentProject.id}`;
            const existingItems = JSON.parse(localStorage.getItem(storageKey) || '[]');

            const updatedItems = existingItems.map(item => {
                if (item.id === activity.id) {
                    return {
                        ...item,
                        status: 'resolved',
                        resolutionNotes,
                        resolutionPhotos: photoUrls,
                        resolvedAt: new Date().toISOString()
                    };
                }
                return item;
            });

            localStorage.setItem(storageKey, JSON.stringify(updatedItems));

            await new Promise(resolve => setTimeout(resolve, 500));

            if (onUpdate) onUpdate();
            onClose();
        } catch (error) {
            console.error("Error resolving issue:", error);
            alert("Failed to resolve issue.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-lg max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <div>
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            {isIssue ? <AlertTriangle className={`h-5 w-5 ${isResolved ? 'text-green-500' : 'text-red-500'}`} /> : <Router className="h-5 w-5 text-primary" />}
                            {activity.deviceType ? activity.deviceType.toUpperCase() : 'Issue Report'}
                            {isResolved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Resolved</span>}
                        </h2>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(activity.createdAt)}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {isResolving ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl">
                                <h3 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" /> Resolve Issue
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Resolution Notes</label>
                                        <textarea
                                            className="w-full rounded-md border border-input bg-background px-3 py-2"
                                            placeholder="How did you fix it?"
                                            rows={3}
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium">Proof Photos</label>
                                        {resolutionPhotos.map((_, index) => (
                                            <ImageUpload
                                                key={index}
                                                label={`Proof Photo ${index + 1}`}
                                                onImageSelect={(base64) => handlePhotoUpdate(index, base64)}
                                            />
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-dashed"
                                            onClick={handleAddPhoto}
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Another Photo
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Installer Info */}
                            <div className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-sm">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Installer</p>
                                    <p className="text-sm text-muted-foreground">{activity.installerName || activity.installer || activity.reportedBy}</p>
                                </div>
                            </div>

                            {/* Location Details */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> Location
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Type</p>
                                        <p className="font-medium">{activity.locationType || 'N/A'}</p>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded-lg">
                                        <p className="text-xs text-muted-foreground">ID / Room</p>
                                        <p className="font-medium">{activity.locationId || activity.location || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Device / Technical Details */}
                            {!isIssue && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                        <Hash className="h-4 w-4" /> Technical Details
                                    </h3>
                                    <div className="space-y-2">
                                        {activity.serialNumber && (
                                            <div className="flex justify-between p-2 border-b">
                                                <span className="text-sm text-muted-foreground">Serial / MAC</span>
                                                <span className="text-sm font-mono">{activity.serialNumber}</span>
                                            </div>
                                        )}
                                        {activity.portInfo && (
                                            <div className="flex justify-between p-2 border-b">
                                                <span className="text-sm text-muted-foreground">Port Info</span>
                                                <span className="text-sm font-medium">{activity.portInfo}</span>
                                            </div>
                                        )}
                                        {activity.switchName && (
                                            <div className="flex justify-between p-2 border-b">
                                                <span className="text-sm text-muted-foreground">Switch Name</span>
                                                <span className="text-sm font-medium">{activity.switchName}</span>
                                            </div>
                                        )}
                                        {activity.switchPosition && (
                                            <div className="flex justify-between p-2 border-b">
                                                <span className="text-sm text-muted-foreground">Position</span>
                                                <span className="text-sm font-medium">{activity.switchPosition}</span>
                                            </div>
                                        )}
                                        {activity.deviceType === 'cloning' && (
                                            <div className="flex justify-between p-2 border-b">
                                                <span className="text-sm text-muted-foreground">Status</span>
                                                <div className="flex gap-2">
                                                    {activity.isUpdateDone && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Updated</span>}
                                                    {activity.isCloningDone && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Cloned</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Notes / Description */}
                            {(activity.notes || activity.description || activity.issueDescription) && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> {isIssue ? 'Description' : 'Notes'}
                                    </h3>
                                    <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm leading-relaxed">
                                        {activity.notes || activity.description || activity.issueDescription}
                                    </div>
                                </div>
                            )}

                            {/* Resolution Details */}
                            {isResolved && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2 text-green-600">
                                        <CheckCircle2 className="h-4 w-4" /> Resolution
                                    </h3>
                                    <div className="p-3 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg text-sm leading-relaxed">
                                        {activity.resolutionNotes}
                                    </div>
                                </div>
                            )}

                            {/* Photos */}
                            {photos.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" /> Photos
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        {photos.map((photo, idx) => (
                                            <div key={idx} className="space-y-1">
                                                <p className="text-xs text-muted-foreground ml-1">{photo.label}</p>
                                                <div className="rounded-lg overflow-hidden border shadow-sm bg-muted">
                                                    <img
                                                        src={photo.url}
                                                        alt={photo.label}
                                                        className="w-full h-auto object-cover max-h-64"
                                                        loading="lazy"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30 flex gap-3">
                    {isResolving ? (
                        <>
                            <Button variant="outline" className="flex-1" onClick={() => setIsResolving(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleResolve} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Resolved'}
                            </Button>
                        </>
                    ) : (
                        <>
                            {isIssue && !isResolved && (
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => setIsResolving(true)}>
                                    Resolve Issue
                                </Button>
                            )}
                            <Button className={isIssue && !isResolved ? "flex-1" : "w-full"} variant={isIssue && !isResolved ? "outline" : "default"} onClick={onClose}>
                                Close
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
