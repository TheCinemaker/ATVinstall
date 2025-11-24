import { useState, useEffect } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Plus, Building2, Calendar, ChevronRight, Wand2, Eraser, Users, X, UserPlus, Trash2, Download } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function ProjectSelect() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Project Form State
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLocation, setNewProjectLocation] = useState('');

    // Room Generator State
    const [startFloor, setStartFloor] = useState(1);
    const [endFloor, setEndFloor] = useState(4);
    const [roomsPerFloor, setRoomsPerFloor] = useState(20);
    const [skip13, setSkip13] = useState(true);
    const [roomListText, setRoomListText] = useState('');

    // Team State
    const [teamMembers, setTeamMembers] = useState([]);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('Install Team');

    // Delete State
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [deletePin, setDeletePin] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const { setCurrentProject } = useProject();
    const { isDemo } = useAuth(); // Should be true
    const navigate = useNavigate();

    useEffect(() => {
        // Load from LocalStorage
        const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        // Mock dates
        const projectsWithDates = localProjects.map(p => ({
            ...p,
            createdAt: new Date(p.createdAt)
        }));
        setProjects(projectsWithDates);
        setLoading(false);
    }, []);

    const generateRooms = () => {
        let rooms = [];
        for (let floor = startFloor; floor <= endFloor; floor++) {
            // Skip 13th floor if requested
            if (skip13 && floor === 13) continue;

            for (let r = 1; r <= roomsPerFloor; r++) {
                // Skip room 13 if requested
                if (skip13 && r === 13) continue;

                // Format: 101, 102... 201... 1001
                // Pad room number with leading zero if needed (e.g. 101 for floor 1 room 1)
                // Actually standard hotel numbering: Floor + 01. 
                // If roomsPerFloor >= 100, we might need 001. 
                // Let's assume standard 2-digit room suffix for now, or 3 if >99.

                const roomSuffix = r.toString().padStart(2, '0');
                const roomNumber = `${floor}${roomSuffix}`;

                // Skip "X13" rooms if requested (e.g. 113, 213)
                if (skip13 && roomNumber.endsWith('13')) continue;

                rooms.push(roomNumber);
            }
        }
        setRoomListText(rooms.join('\n'));
    };

    const handleAddMember = () => {
        if (!newMemberName.trim()) return;
        setTeamMembers([...teamMembers, { name: newMemberName, role: newMemberRole }]);
        setNewMemberName('');
    };

    const handleRemoveMember = (index) => {
        const newTeam = [...teamMembers];
        newTeam.splice(index, 1);
        setTeamMembers(newTeam);
    };

    const handleCreateProject = (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        // Parse room list
        const rooms = roomListText.split('\n').map(r => r.trim()).filter(r => r);

        const newProject = {
            id: Date.now().toString(),
            name: newProjectName,
            location: newProjectLocation,
            rooms: rooms,
            team: teamMembers,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        const existing = JSON.parse(localStorage.getItem('projects') || '[]');
        localStorage.setItem('projects', JSON.stringify([newProject, ...existing]));

        // Refresh list
        setProjects(prev => [{ ...newProject, createdAt: new Date(newProject.createdAt) }, ...prev]);

        // Reset form
        setNewProjectName('');
        setNewProjectLocation('');
        setRoomListText('');
        setTeamMembers([]);
        setIsCreating(false);
    };

    const handleDeleteProject = () => {
        if (deletePin !== '987654321') {
            setDeleteError('Incorrect PIN');
            return;
        }

        if (!projectToDelete) return;

        // Remove from projects list
        const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
        setProjects(updatedProjects);

        // Update localStorage
        // 1. Projects list
        const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const filteredLocalProjects = localProjects.filter(p => p.id !== projectToDelete.id);
        localStorage.setItem('projects', JSON.stringify(filteredLocalProjects));

        // 2. Project Data
        localStorage.removeItem(`installs_${projectToDelete.id}`);
        localStorage.removeItem(`issues_${projectToDelete.id}`);

        // Close modal
        setProjectToDelete(null);
        setDeletePin('');
        setDeleteError('');
    };

    const handleExportProject = async (e, project) => {
        e.stopPropagation();
        const zip = new JSZip();
        const folderName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export`;
        const root = zip.folder(folderName);
        const imagesFolder = root.folder("images");

        // 1. Get all data
        const installsKey = `installs_${project.id}`;
        const issuesKey = `issues_${project.id}`;

        const installs = JSON.parse(localStorage.getItem(installsKey) || '[]');
        const issues = JSON.parse(localStorage.getItem(issuesKey) || '[]');

        // 2. Process Images & Create Clean Data
        // Helper to extract Base64, save to ZIP, and return filename
        let imageCounter = 1;
        const processImages = (dataArray, type) => {
            return dataArray.map(item => {
                const newItem = { ...item };

                // Helper to process a single URL field
                const processField = (field) => {
                    if (newItem[field] && newItem[field].startsWith('data:image')) {
                        const extension = newItem[field].substring(newItem[field].indexOf('/') + 1, newItem[field].indexOf(';'));
                        const filename = `${type}_${item.id}_${field}_${imageCounter++}.${extension}`;
                        const base64Data = newItem[field].split(',')[1];

                        imagesFolder.file(filename, base64Data, { base64: true });
                        newItem[field] = `images/${filename}`; // Update reference
                    }
                };

                // Process standard photo fields
                ['photoPortUrl', 'photoInstallUrl', 'photoSerialUrl', 'photoConfigUrl'].forEach(processField);

                // Process photos array (for issues)
                if (newItem.photos && Array.isArray(newItem.photos)) {
                    newItem.photos = newItem.photos.map((photoUrl, idx) => {
                        if (photoUrl && photoUrl.startsWith('data:image')) {
                            const extension = photoUrl.substring(photoUrl.indexOf('/') + 1, photoUrl.indexOf(';'));
                            const filename = `${type}_${item.id}_photo_${idx}_${imageCounter++}.${extension}`;
                            const base64Data = photoUrl.split(',')[1];

                            imagesFolder.file(filename, base64Data, { base64: true });
                            return `images/${filename}`;
                        }
                        return photoUrl;
                    });
                }

                return newItem;
            });
        };

        const cleanInstalls = processImages(installs, 'install');
        const cleanIssues = processImages(issues, 'issue');

        // 3. Create JSON Data
        const projectData = {
            project: project,
            installations: cleanInstalls,
            issues: cleanIssues,
            exportedAt: new Date().toISOString(),
            appVersion: '1.0.0'
        };

        root.file("project_data.json", JSON.stringify(projectData, null, 2));

        // 4. Generate ZIP
        try {
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${folderName}.zip`);
        } catch (err) {
            console.error("Export failed:", err);
            alert("Export failed. See console for details.");
        }
    };

    const handleSelectProject = (project) => {
        setCurrentProject(project);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                        <p className="text-muted-foreground">Select a hotel to start working</p>
                    </div>
                    <Button onClick={() => setIsCreating(!isCreating)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Project
                    </Button>
                </div>

                {isCreating && (
                    <div className="bg-card p-6 rounded-xl border shadow-sm animate-accordion-down">
                        <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
                        <form onSubmit={handleCreateProject} className="space-y-6">
                            {/* Basic Info */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium">Hotel Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                                        placeholder="e.g. Grand Hotel Budapest"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Location (City/Address)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                                        placeholder="e.g. Budapest, Váci utca 1."
                                        value={newProjectLocation}
                                        onChange={(e) => setNewProjectLocation(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Room Generator */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Building2 className="h-4 w-4" /> Room Configuration
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {/* Generator Controls */}
                                    <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase">Generator</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-medium">Start Floor</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full rounded-md border border-input bg-background px-2 py-1"
                                                    value={startFloor}
                                                    onChange={(e) => setStartFloor(parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium">End Floor</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-full rounded-md border border-input bg-background px-2 py-1"
                                                    value={endFloor}
                                                    onChange={(e) => setEndFloor(parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs font-medium">Rooms per Floor</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full rounded-md border border-input bg-background px-2 py-1"
                                                    value={roomsPerFloor}
                                                    onChange={(e) => setRoomsPerFloor(parseInt(e.target.value) || 1)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="skip13"
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={skip13}
                                                onChange={(e) => setSkip13(e.target.checked)}
                                            />
                                            <label htmlFor="skip13" className="text-sm font-medium">
                                                Skip 13 (Floor 13, Room 13, X13)
                                            </label>
                                        </div>

                                        <Button type="button" variant="secondary" className="w-full" onClick={generateRooms}>
                                            <Wand2 className="h-4 w-4 mr-2" /> Generate List
                                        </Button>
                                    </div>

                                    {/* Manual Editor */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-medium">Room List (One per line)</label>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="xs"
                                                className="h-6 text-xs text-muted-foreground hover:text-destructive"
                                                onClick={() => setRoomListText('')}
                                            >
                                                <Eraser className="h-3 w-3 mr-1" /> Clear
                                            </Button>
                                        </div>
                                        <textarea
                                            className="w-full h-[200px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                                            placeholder="101&#10;102&#10;..."
                                            value={roomListText}
                                            onChange={(e) => setRoomListText(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {roomListText ? `${roomListText.split('\n').filter(r => r.trim()).length} rooms generated` : 'No rooms added'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Team Configuration */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Team Configuration
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            placeholder="Name (e.g. John Doe)"
                                            value={newMemberName}
                                            onChange={(e) => setNewMemberName(e.target.value)}
                                        />
                                        <select
                                            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={newMemberRole}
                                            onChange={(e) => setNewMemberRole(e.target.value)}
                                        >
                                            <option>Install Team</option>
                                            <option>IT Team</option>
                                            <option>Other</option>
                                        </select>
                                        <Button type="button" size="icon" onClick={handleAddMember}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {teamMembers.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {teamMembers.map((member, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border">
                                                    <div>
                                                        <p className="font-medium text-sm">{member.name}</p>
                                                        <p className="text-xs text-muted-foreground">{member.role}</p>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveMember(idx)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit">Create Project</Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {projectToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6">
                            <h2 className="text-xl font-bold text-destructive mb-2">Delete Project?</h2>
                            <p className="text-muted-foreground mb-4">
                                This will permanently delete <strong>{projectToDelete.name}</strong> and all associated data (installations, issues, photos). This action cannot be undone.
                            </p>

                            <div className="space-y-2 mb-6">
                                <label className="text-sm font-medium">Enter PIN to confirm</label>
                                <input
                                    type="password"
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-center tracking-widest font-mono text-lg"
                                    placeholder="Enter PIN"
                                    value={deletePin}
                                    onChange={(e) => {
                                        setDeletePin(e.target.value);
                                        setDeleteError('');
                                    }}
                                />
                                {deleteError && <p className="text-xs text-destructive font-medium">{deleteError}</p>}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => {
                                    setProjectToDelete(null);
                                    setDeletePin('');
                                    setDeleteError('');
                                }}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteProject}>Delete Forever</Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <p>Loading projects...</p>
                    ) : projects.length === 0 ? (
                        <p className="text-muted-foreground col-span-full text-center py-12">No projects found. Create one to get started.</p>
                    ) : (
                        projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => handleSelectProject(project)}
                                className="group relative flex flex-col gap-2 rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary cursor-pointer"
                            >
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 shadow-sm"
                                        title="Export Project"
                                        onClick={(e) => handleExportProject(e, project)}
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 shadow-sm"
                                        title="Delete Project"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProjectToDelete(project);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                                <h3 className="font-semibold text-xl mt-2">{project.name}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    {project.location || 'No location specified'}
                                </p>
                                <div className="flex gap-4 mt-1">
                                    {project.rooms && (
                                        <p className="text-xs text-muted-foreground">
                                            {project.rooms.length} rooms
                                        </p>
                                    )}
                                    {project.team && (
                                        <p className="text-xs text-muted-foreground">
                                            {project.team.length} members
                                        </p>
                                    )}
                                </div>
                                <div className="mt-auto pt-4 flex items-center text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {project.createdAt.toLocaleDateString() || 'Just now'}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
