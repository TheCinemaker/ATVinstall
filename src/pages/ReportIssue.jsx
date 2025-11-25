import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import ImageUpload from '../components/ImageUpload';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!description.trim()) return;

        setLoading(true);
        try {
            // Mock upload for each photo
            const validPhotos = photos.filter(p => p !== null);
            const photoUrls = validPhotos.map((_, i) => `https://placehold.co/600x400?text=Issue+Photo+${i + 1}`);

            const newIssue = {
                id: Date.now().toString(),
                projectId: currentProject.id,
                projectName: currentProject.name,
                location,
                description,
                photos: photoUrls,
                status: 'open',
                reportedBy: user?.email || 'Offline User',
                createdAt: new Date().toISOString(),
                type: 'issue'
            };
            const existing = JSON.parse(localStorage.getItem(`issues_${currentProject.id}`) || '[]');
            localStorage.setItem(`issues_${currentProject.id}`, JSON.stringify([newIssue, ...existing]));

            await new Promise(resolve => setTimeout(resolve, 500));

            navigate('/dashboard');
        } catch (error) {
            console.error("Error reporting issue:", error);
            alert("Failed to report issue.");
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
                <h1 className="font-bold text-lg text-red-500">Report Issue</h1>
            </header>

            <main className="max-w-md mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4 bg-card p-4 rounded-xl border shadow-sm">
                        <div>
                            <label className="block text-sm font-medium mb-1">Location (Room/Area)</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-md border border-input bg-background px-3 py-2"
                                placeholder="e.g. Room 432"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                required
                                rows={5}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 resize-none"
                                placeholder="Describe the issue (e.g. Door locked, Cannot access AP mount...)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium">Photos</label>
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
                                className="w-full border-dashed"
                                onClick={handleAddPhoto}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Photo
                            </Button>
                        </div>
                    </div>

                    <Button type="submit" variant="destructive" className="w-full" size="lg" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Report'
                        )}
                    </Button>
                </form>
            </main>
        </div>
    );
}
