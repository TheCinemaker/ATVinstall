import { useState } from 'react';
import { X, Calendar, User, MapPin, Hash, Router, Image as ImageIcon, AlertTriangle, FileText, CheckCircle2, Plus, Loader2, Edit, Save, ScanBarcode } from 'lucide-react';
import { Button } from './ui/button';
import ImageUpload from './ImageUpload';
import BarcodeScanner from './BarcodeScanner';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext'; // Import Auth
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function ActivityDetailModal({ activity, onClose }) {
    const { user } = useAuth(); // Get User
    const { currentProject } = useProject();
    const [isResolving, setIsResolving] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [resolutionPhotos, setResolutionPhotos] = useState([null]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit State
    const [editSerial, setEditSerial] = useState(activity?.serialNumber || '');
    const [editMac, setEditMac] = useState(activity?.macAddress || '');
    const [editLocation, setEditLocation] = useState(activity?.locationId || activity?.location || '');
    const [editDescription, setEditDescription] = useState(activity?.notes || activity?.description || activity?.issueDescription || '');
    const [editInstaller, setEditInstaller] = useState(activity?.installerName || activity?.installer || activity?.reportedBy || '');

    // Scanner State
    const [showScanner, setShowScanner] = useState(false);
    const [scanTarget, setScanTarget] = useState(null); // 'serial' or 'mac'
    const [zoomedImage, setZoomedImage] = useState(null); // For Image Zoom

    const handleScan = (result) => {
        if (scanTarget === 'serial') {
            setEditSerial(result);
        } else if (scanTarget === 'mac') {
            setEditMac(result);
        }
    };

    const startScan = (target) => {
        setScanTarget(target);
        setShowScanner(true);
    };

    if (!activity) return null;

    const isIssue = activity.type === 'issue' || activity.hasIssue;
    const isResolved = activity.status === 'resolved';

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // Handle Firestore Timestamp
        const date = dateString.seconds ? new Date(dateString.seconds * 1000) : new Date(dateString);
        return date.toLocaleString([], {
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

    const handlePhotoUpdate = (index, url) => {
        const newPhotos = [...resolutionPhotos];
        newPhotos[index] = url;
        setResolutionPhotos(newPhotos);
    };

    const handleResolve = async () => {
        if (!resolutionNotes.trim()) return;

        setLoading(true);
        try {
            const validPhotos = resolutionPhotos.filter(p => p !== null);

            // Determine collection name based on activity type
            const collectionName = activity.type === 'issue' ? 'issues' : 'installations';

            const activityRef = doc(db, 'projects', currentProject.id, collectionName, activity.id);

            await updateDoc(activityRef, {
                status: 'resolved',
                resolutionNotes,
                resolutionPhotos: validPhotos,
                resolvedBy: user?.displayName || user?.email || 'Admin', // Save the resolver!
                resolvedAt: new Date()
            });

            onClose();
        } catch (error) {
            console.error("Error resolving issue:", error);
            alert("Failed to resolve issue.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdit = async () => {
        setLoading(true);
        try {
            const collectionName = activity.type === 'issue' || activity.hasIssue ? 'issues' : 'installations';
            const activityRef = doc(db, 'projects', currentProject.id, collectionName, activity.id);

            const updates = {
                locationId: editLocation,
                location: editLocation, // Update both for compatibility
                notes: editDescription,
                description: editDescription,
                issueDescription: editDescription,
                installerName: editInstaller,
                installer: editInstaller,
                reportedBy: editInstaller,
                updatedAt: new Date()
            };

            if (editSerial) updates.serialNumber = editSerial;
            if (editMac) updates.macAddress = editMac;

            await updateDoc(activityRef, updates);
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating activity:", error);
            alert("Failed to update activity.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-lg max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-gray-100">

                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                    <div>
                        <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                            {isIssue ? <AlertTriangle className={`h-5 w-5 ${isResolved ? 'text-green-500' : 'text-red-500'}`} /> : <Router className="h-5 w-5 text-yellow-500" />}
                            {activity.deviceType ? activity.deviceType.toUpperCase() : 'Issue Report'}
                            {isResolved && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">Resolved</span>}
                        </h2>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(activity.createdAt)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isResolving && !isEditing && (
                            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="rounded-full hover:bg-gray-800 text-gray-400 hover:text-white" title="Edit">
                                <Edit className="h-5 w-5" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-800 text-gray-400 hover:text-white">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {isResolving ? (
                        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-green-900/10 border border-green-900/30 p-4 rounded-xl">
                                <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" /> Resolve Issue
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-400">Resolution Notes</label>
                                        <textarea
                                            className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 outline-none focus:border-green-500 transition-all"
                                            placeholder="How did you fix it?"
                                            rows={3}
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-400">Proof Photos</label>
                                        {resolutionPhotos.map((_, index) => (
                                            <ImageUpload
                                                key={index}
                                                label={`Proof Photo ${index + 1}`}
                                                onImageCapture={(url) => handlePhotoUpdate(index, url)}
                                            />
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
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
                        <div className="space-y-8">
                            {/* --- SECTION 1: THE REPORT --- */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-2">
                                        <AlertTriangle className="h-3 w-3" /> Issue Report
                                    </h3>
                                    <span className="text-xs text-gray-500">{formatDate(activity.createdAt)}</span>
                                </div>

                                <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 space-y-4">
                                    {/* Reporter Info */}
                                    <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
                                        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                            <User className="h-5 w-5 text-red-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">
                                                {activity.createdBy || activity.reportedBy || 'Unknown User'}
                                            </p>
                                            <p className="text-xs text-gray-500">reported this issue</p>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Location</p>
                                        <div className="flex items-center gap-2 text-gray-300">
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            {isEditing ? (
                                                <input
                                                    className="bg-gray-800 border-gray-700 rounded px-2 py-1 text-sm text-white"
                                                    value={editLocation}
                                                    onChange={(e) => setEditLocation(e.target.value)}
                                                />
                                            ) : (
                                                <span>{activity.locationId || activity.location || 'N/A'}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Description</p>
                                        {isEditing ? (
                                            <textarea
                                                className="w-full bg-gray-800 border-gray-700 rounded p-2 text-sm text-white"
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                            />
                                        ) : (
                                            <div className="text-sm text-gray-300 leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">
                                                {activity.notes || activity.description || activity.issueDescription || "No description provided."}
                                            </div>
                                        )}
                                    </div>

                                    {/* Unified Photos (Installs & Issues) */}
                                    {photos.length > 0 && (
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Attached Photos</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {photos.map((photo, idx) => (
                                                    <div key={idx} className="relative group aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
                                                        <img
                                                            src={photo.url}
                                                            alt={photo.label}
                                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-zoom-in"
                                                            onClick={() => setZoomedImage(photo.url)}
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                                            <p className="text-[10px] text-white text-center truncate px-1">
                                                                {photo.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* --- SECTION 2: THE RESOLUTION --- */}
                            {isResolved && (
                                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500 delay-100">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase text-green-500 tracking-wider flex items-center gap-2">
                                            <CheckCircle2 className="h-3 w-3" /> Resolution
                                        </h3>
                                        <span className="text-xs text-green-500/70">{formatDate(activity.resolvedAt)}</span>
                                    </div>

                                    <div className="bg-green-900/10 rounded-xl border border-green-500/20 p-4 space-y-4">
                                        {/* Resolver Info */}
                                        <div className="flex items-center gap-3 pb-4 border-b border-green-500/20">
                                            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {activity.resolvedBy || 'Unknown User'}
                                                </p>
                                                <p className="text-xs text-green-400/70">resolved this issue</p>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <p className="text-xs text-green-500/70 mb-1">Resolution Details</p>
                                            <div className="text-sm text-gray-200 leading-relaxed bg-black/30 p-3 rounded-lg border border-green-500/10">
                                                {activity.resolutionNotes || "No details provided."}
                                            </div>
                                        </div>

                                        {/* Resolution Photos */}
                                        {activity.resolutionPhotos && activity.resolutionPhotos.length > 0 && (
                                            <div>
                                                <p className="text-xs text-green-500/70 mb-2">Proof of Fix</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {activity.resolutionPhotos.map((url, idx) => (
                                                        <div key={idx} className="aspect-video bg-black rounded-lg overflow-hidden border border-green-900/50 relative group">
                                                            <img
                                                                src={url}
                                                                alt={`Resolution ${idx + 1}`}
                                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity cursor-zoom-in"
                                                                onClick={() => setZoomedImage(url)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 bg-black/20 flex gap-3">
                    {isResolving ? (
                        <>
                            <Button variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => setIsResolving(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleResolve} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark as Resolved'}
                            </Button>
                        </>
                    ) : isEditing ? (
                        <>
                            <Button variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => setIsEditing(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 font-bold" onClick={handleSaveEdit} disabled={loading}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                            </Button>
                        </>
                    ) : (
                        <>
                            {isIssue && !isResolved && (
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => setIsResolving(true)}>
                                    Resolve Issue
                                </Button>
                            )}
                            <Button className={isIssue && !isResolved ? "flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white" : "w-full bg-gray-800 hover:bg-gray-700 text-white"} variant={isIssue && !isResolved ? "outline" : "default"} onClick={onClose}>
                                Close
                            </Button>
                        </>
                    )}
                </div>
            </div>
            {showScanner && (
                <BarcodeScanner
                    onScan={handleScan}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Zoomed Image Lightbox */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <div className="relative w-full h-full p-4 flex items-center justify-center">
                        <img
                            src={zoomedImage}
                            alt="Zoomed"
                            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white/50 hover:text-white rounded-full bg-black/50 hover:bg-black/80"
                            onClick={() => setZoomedImage(null)}
                        >
                            <X className="h-8 w-8" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
