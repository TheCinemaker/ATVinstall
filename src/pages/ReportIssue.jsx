import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import Footer from '../components/Footer';
import ImageUpload from '../components/ImageUpload';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { uploadImage } from '../utils/uploadImage';
import { saveToQueue } from '../utils/offlineStorage';
import { v4 as uuidv4 } from 'uuid';

export default function ReportIssue() {
    const { currentProject } = useProject();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([null]);
    const [loading, setLoading] = useState(false);

    const handleAddPhoto = () => {
        setPhotos([...photos, null]);
    };

    const handlePhotoUpdate = (index, base64) => {
        const newPhotos = [...photos];
        newPhotos[index] = base64;
        setPhotos(newPhotos);
    };

    const [loadingStatus, setLoadingStatus] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description.trim()) return;

        setLoading(true);
        setLoadingStatus('Uploading photos...');
        try {
            const validPhotos = photos.filter(p => p !== null);
            const projectId = currentProject.id;

            // Upload photos concurrently
            const rawPhotoUrls = await Promise.all(
                validPhotos.map(base64 => uploadImage(base64, `${projectId}/issues`))
            );

            // Filter out failed uploads (nulls)
            const photoUrls = rawPhotoUrls.filter(url => url !== null);

            setLoadingStatus('Submitting report...');

            const newIssue = {
                location,
                description,
                photos: photoUrls, // Only valid URLs
                status: 'open',
                reportedBy: user?.email || 'anonymous@user.com',
                createdBy: user?.displayName || user?.email || 'Anonymous',
                createdAt: new Date(),
                type: 'issue'
            };

            // Optimistic Save with Offline Support
            const newDocRef = doc(collection(db, 'projects', currentProject.id, 'issues'));

            const savePromise = setDoc(newDocRef, newIssue);
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

            await Promise.race([savePromise, timeoutPromise]);

            // Queue photos that failed to upload (null URLs correspond to validPhotos indices)
            // we have rawPhotoUrls which has nulls.
            // validPhotos and rawPhotoUrls match index-wise.
            for (let i = 0; i < rawPhotoUrls.length; i++) {
                if (rawPhotoUrls[i] === null) {
                    console.log(`Queuing offline resolution photo ${i}`);
                    await saveToQueue({
                        id: uuidv4(),
                        projectId: currentProject.id,
                        collection: 'issues',
                        docId: newDocRef.id,
                        field: 'photos', // array field
                        base64: validPhotos[i],
                        timestamp: Date.now()
                    });
                }
            }

            navigate('/dashboard');
        } catch (error) {
            console.error("Error reporting issue:", error);
            alert("Failed to report issue.");
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
                <h1 className="font-bold text-lg text-red-500">Report Issue</h1>
            </header>

            <main className="max-w-md mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800 shadow-sm">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-400">Location (Room/Area)</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder-gray-500"
                                placeholder="e.g. Room 432"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-400">Description</label>
                            <textarea
                                required
                                rows={5}
                                className="w-full rounded-md border border-gray-700 bg-gray-800 text-white px-3 py-2 resize-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder-gray-500"
                                placeholder="Describe the issue (e.g. Door locked, Cannot access AP mount...)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-gray-400">Photos</label>
                            {photos.map((_, index) => (
                                <ImageUpload
                                    key={index}
                                    label={`Photo ${index + 1}`}
                                    onImageCapture={(base64) => handlePhotoUpdate(index, base64)}
                                    required={false}
                                />
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                                onClick={handleAddPhoto}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Photo
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white" onClick={() => navigate('/dashboard')} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="destructive" className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-900/20" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {loadingStatus || 'Submitting...'}
                                </>
                            ) : (
                                'Submit Report'
                            )}
                        </Button>
                    </div>
                </form>
            </main>
            <Footer />
        </div>
    );
}
