import { useEffect, useState } from 'react';
import { getQueue, removeFromQueue } from '../utils/offlineStorage';
import { uploadImage } from '../utils/uploadImage';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useProject } from '../contexts/ProjectContext';
import { Wifi, WifiOff, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function OfflineSyncManager() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncing, setSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const { currentProject } = useProject();
    const { user } = useAuth(); // Need auth context to ensure we have permission/user is logged in 

    // Monitor Online Status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Check Queue periodically
    useEffect(() => {
        const checkQueue = async () => {
            try {
                const queue = await getQueue();
                setPendingCount(queue.length);
                if (isOnline && queue.length > 0 && !syncing) {
                    processQueue(queue);
                }
            } catch (error) {
                console.error("Error accessing offline queue:", error);
            }
        };

        const interval = setInterval(checkQueue, 10000); // Check every 10s
        checkQueue(); // Initial check

        return () => clearInterval(interval);
    }, [isOnline, syncing, currentProject]); // Re-run if online status or project changes

    const processQueue = async (queue) => {
        if (!currentProject) return;

        setSyncing(true);
        console.log("🔄 Starting background sync for", queue.length, "items");

        for (const item of queue) {
            try {
                // 1. Upload to Storage
                const folder = item.collection === 'issues' ? 'issues' : item.collection === 'resolutions' ? 'resolutions' : 'installations';
                // Use the projectId from the item if available, otherwise currentProject (fallback)
                // It's safer to store projectId in the item itself!
                const projectId = item.projectId || currentProject.id;

                const url = await uploadImage(item.base64, `${projectId}/${folder}`);

                if (url) {
                    // 2. Update Firestore
                    const docRef = doc(db, 'projects', projectId, item.collection, item.docId);

                    if (item.field === 'photos' || item.field === 'resolutionPhotos') {
                        // For arrays (issues/resolutions), we typically use arrayUnion 
                        // BUT be careful: if we just append, order might be lost or it might duplicate if logic is weird.
                        // However, for issues, 'photos' is an array of URLs.
                        // Ideally we should use arrayUnion.
                        await updateDoc(docRef, {
                            [item.field]: arrayUnion(url)
                        });
                    } else {
                        // For single fields (installs)
                        await updateDoc(docRef, {
                            [item.field]: url
                        });
                    }

                    // 3. Remove from Queue
                    await removeFromQueue(item.id);
                    console.log("✅ Synced item:", item.id);
                } else {
                    console.warn("⚠️ Upload failed (still null) for item:", item.id, "Retrying later.");
                }

            } catch (error) {
                console.error("❌ Error syncing item:", item.id, error);
                // Keep in queue to retry later
            }
        }

        const remaining = await getQueue();
        setPendingCount(remaining.length);
        setSyncing(false);
    };

    if (pendingCount === 0) return null;

    return (
        <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-right duration-500">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 flex items-center gap-3">
                <div className={`p-2 rounded-full ${syncing ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                    {syncing ? <UploadCloud className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <div>
                    <p className="text-sm font-medium text-white">
                        {syncing ? 'Syncing Photos...' : 'Pending Photos'}
                    </p>
                    <p className="text-xs text-gray-400">
                        {pendingCount} waiting for connection
                    </p>
                </div>
                {!isOnline && (
                    <div className="text-red-500" title="Offline">
                        <WifiOff className="h-4 w-4" />
                    </div>
                )}
            </div>
        </div>
    );
}
