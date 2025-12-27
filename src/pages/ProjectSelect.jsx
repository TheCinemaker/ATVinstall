import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Plus, Building2, Calendar, ChevronRight, Wand2, Eraser, Users, X, UserPlus, Trash2, Download, Edit, Target, Search, AlertTriangle, Lock } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

export default function ProjectSelect() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Project Form State
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectLocation, setNewProjectLocation] = useState('');
    const [targetCounts, setTargetCounts] = useState({});
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    // Delete/Edit Auth State
    const [projectToAuth, setProjectToAuth] = useState(null); // Project pending auth for delete or edit
    const [authAction, setAuthAction] = useState(null); // 'delete' or 'edit'
    const [authError, setAuthError] = useState('');
    const [projectManager, setProjectManager] = useState('');
    const deviceOptions = ['TV', 'TV Cloning', 'AP', 'Switch', 'Firewall', 'Signage', 'SAT', 'IPTEL', 'Camera', 'Management server', 'OPC', 'Media Encoder', 'Headend', 'Chromecast'];
    const [deviceTypes, setDeviceTypes] = useState([]);
    const [newDevice, setNewDevice] = useState('');
    const [contacts, setContacts] = useState([]);
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [blueprints, setBlueprints] = useState([]);
    const [authPin, setAuthPin] = useState('');
    const [newProjectPin, setNewProjectPin] = useState('');
    // Clear PIN when opening the create form
    useEffect(() => {
        if (isCreating) {
            setNewProjectPin('');
        }
    }, [isCreating]);

    const { setCurrentProject } = useProject();
    const { isDemo } = useAuth(); // Should be true
    const navigate = useNavigate();

    useEffect(() => {
        // Load from Firestore
        const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date()
            }));
            setProjects(projectsData);
            setLoading(false);
        });
        return unsubscribe;
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

    const handleAddDevice = (device) => {
        if (!deviceTypes.includes(device)) {
            setDeviceTypes([...deviceTypes, device]);
        }
    };

    const handleRemoveDevice = (device) => {
        setDeviceTypes(deviceTypes.filter(d => d !== device));
    };

    const handleAddCustomDevice = () => {
        if (newDevice && !deviceTypes.includes(newDevice)) {
            setDeviceTypes([...deviceTypes, newDevice]);
            setNewDevice('');
        }
    };

    const handleAddContact = () => {
        if (newContactName && newContactPhone) {
            setContacts([...contacts, { name: newContactName, phone: newContactPhone }]);
            setNewContactName('');
            setNewContactPhone('');
        }
    };

    const handleRemoveContact = (index) => {
        const newContacts = [...contacts];
        newContacts.splice(index, 1);
        setContacts(newContacts);
    };

    const handleBlueprintUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBlueprints(prev => [...prev, {
                    name: file.name,
                    type: file.type,
                    data: reader.result,
                    uploadedAt: new Date().toISOString()
                }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveBlueprint = (index) => {
        setBlueprints(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        // Parse room list
        const rooms = roomListText.split('\n').map(r => r.trim()).filter(r => r);

        // Clean up targets: remove keys for devices not in deviceTypes
        const cleanedTargets = {};
        deviceTypes.forEach(device => {
            if (targetCounts[device] !== undefined && targetCounts[device] !== '') {
                cleanedTargets[device] = parseInt(targetCounts[device]);
            }
        });

        const projectData = {
            name: newProjectName,
            location: newProjectLocation,
            rooms: rooms,
            team: teamMembers,
            targets: cleanedTargets,
            manager: projectManager,
            devices: deviceTypes,
            contacts: contacts,
            blueprints: blueprints,
            startDate: startDate,
            endDate: endDate,
            updatedAt: new Date().toISOString()
        };

        try {
            if (isEditing && editingProjectId) {
                await updateDoc(doc(db, 'projects', editingProjectId), projectData);
            } else {
                await addDoc(collection(db, 'projects'), {
                    ...projectData,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                });
            }
            // Reset form and PIN after successful save
            resetForm();
            setNewProjectPin('');
        } catch (error) {
            console.error('Error saving project:', error);
            alert("Failed to save project");
        }
    };

    const resetForm = () => {
        setNewProjectName('');
        setNewProjectLocation('');
        setTargetCounts({});
        setStartDate('');
        setEndDate('');
        setRoomListText('');
        setTeamMembers([]);
        setProjectManager('');
        setDeviceTypes([]);
        setContacts([]);
        setBlueprints([]);
        setNewDevice('');
        setNewContactName('');
        setNewContactPhone('');
        setIsCreating(false);
        setIsEditing(false);
        setEditingProjectId(null);
        setNewProjectPin('');
        setSearchQuery('');
    };

    const handleAuthSubmit = async () => {
        // Validation based on action
        if (authAction === 'create') {
            if (authPin !== '0918273645') {
                setAuthError('Incorrect PIN');
                return;
            }
            setIsCreating(true);
            closeAuthModal();
            return;
        }

        if (authPin !== '987654321') {
            setAuthError('Incorrect PIN');
            return;
        }

        if (authAction === 'delete') {
            try {
                await deleteDoc(doc(db, 'projects', projectToAuth.id));
                closeAuthModal();
            } catch (error) {
                console.error("Error deleting project:", error);
                alert("Failed to delete project");
            }
        } else if (authAction === 'edit') {
            // Populate form for editing
            const p = projectToAuth;
            setNewProjectName(p.name);
            setNewProjectLocation(p.location || '');
            setTargetCounts(p.targets || {});
            setRoomListText(p.rooms ? p.rooms.join('\n') : '');
            setTeamMembers(p.team || []);
            setProjectManager(p.manager || '');

            // Fallback: If devices array is missing (legacy project), derive from targets
            const initialDevices = (p.devices && p.devices.length > 0)
                ? p.devices
                : (p.targets ? Object.keys(p.targets) : []);

            setDeviceTypes(initialDevices);
            setContacts(p.contacts || []);
            setBlueprints(p.blueprints || []);
            setStartDate(p.startDate || '');
            setEndDate(p.endDate || '');

            setEditingProjectId(p.id);
            setIsEditing(true);
            setIsCreating(true); // Re-use the creating UI
            closeAuthModal();
        }
    };

    const closeAuthModal = () => {
        setProjectToAuth(null);
        setAuthAction(null);
        setAuthPin('');
        setAuthError('');
    };

    const handleExportProject = async (e, project) => {
        e.stopPropagation();
        const zip = new JSZip();
        const folderName = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()} _export`;
        const root = zip.folder(folderName);
        const imagesFolder = root.folder("images");

        // 1. Get all data
        const installsKey = `installs_${project.id} `;
        const issuesKey = `issues_${project.id} `;

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
                        const filename = `${type}_${item.id}_${field}_${imageCounter++}.${extension} `;
                        const base64Data = newItem[field].split(',')[1];

                        imagesFolder.file(filename, base64Data, { base64: true });
                        newItem[field] = `images / ${filename} `; // Update reference
                    }
                };

                // Process standard photo fields
                ['photoPortUrl', 'photoInstallUrl', 'photoSerialUrl', 'photoConfigUrl'].forEach(processField);

                // Process photos array (for issues)
                if (newItem.photos && Array.isArray(newItem.photos)) {
                    newItem.photos = newItem.photos.map((photoUrl, idx) => {
                        if (photoUrl && photoUrl.startsWith('data:image')) {
                            const extension = photoUrl.substring(photoUrl.indexOf('/') + 1, photoUrl.indexOf(';'));
                            const filename = `${type}_${item.id}_photo_${idx}_${imageCounter++}.${extension} `;
                            const base64Data = photoUrl.split(',')[1];

                            imagesFolder.file(filename, base64Data, { base64: true });
                            return `images / ${filename} `;
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Projects</h1>
                        <p className="text-gray-400">Select a project to start working</p>
                    </div>
                    <Button onClick={() => {
                        if (isCreating) resetForm();
                        else setAuthAction('create');
                    }} className="bg-gray-900 border border-yellow-500/50 text-yellow-500 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all shadow-lg shadow-yellow-500/10 font-medium">
                        <Plus className="mr-2 h-4 w-4" />
                        {isCreating ? 'Cancel' : 'New Project'}
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name or location..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                {isCreating && (
                    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700 shadow-2xl animate-accordion-down">
                        <h2 className="text-lg font-semibold mb-4 text-white">{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
                        <form onSubmit={handleSaveProject} className="space-y-6">
                            {/* Basic Info */}
                            <div>
                                <label className="text-sm font-medium text-white">Project Manager</label>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-md border border-input bg-gray-900/50 text-white px-3 py-2"
                                    placeholder="Project Manager Name"
                                    value={projectManager}
                                    onChange={(e) => setProjectManager(e.target.value)}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium text-white">Project Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full rounded-md border border-input bg-gray-900/50 text-white px-3 py-2"
                                        placeholder="e.g. Grand Hotel Budapest"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                    />
                                </div>


                                <div>
                                    <label className="text-sm font-medium text-white">Location (City/Address)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border border-input bg-gray-900/50 text-white px-3 py-2"
                                        placeholder="e.g. Budapest, Váci utca 1."
                                        value={newProjectLocation}
                                        onChange={(e) => setNewProjectLocation(e.target.value)}
                                    />
                                </div>

                                {/* Device Types */}
                                <div className="space-y-4 border-t pt-4">
                                    <h3 className="font-medium flex items-center gap-2">
                                        <Target className="h-4 w-4" /> <span className="text-white">Device Scope</span>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {deviceOptions.map(device => (
                                            <button
                                                key={device}
                                                type="button"
                                                onClick={() => deviceTypes.includes(device) ? handleRemoveDevice(device) : handleAddDevice(device)}
                                                className={`px - 3 py - 1 rounded - full text - xs font - medium border transition - colors ${deviceTypes.includes(device)
                                                    ? 'bg-yellow-500 text-black border-yellow-500'
                                                    : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                                                    } `}
                                            >
                                                {device}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            className="flex-1 rounded-md border border-input bg-gray-900/50 text-white px-3 py-2 text-sm"
                                            placeholder="Other Device Type"
                                            value={newDevice}
                                            onChange={(e) => setNewDevice(e.target.value)}
                                        />
                                        <Button type="button" size="sm" onClick={handleAddCustomDevice}>Add</Button>
                                    </div>
                                    {deviceTypes.filter(d => !deviceOptions.includes(d)).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {deviceTypes.filter(d => !deviceOptions.includes(d)).map(device => (
                                                <span key={device} className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-500 text-black border border-yellow-500">
                                                    {device}
                                                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveDevice(device)} />
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid gap-4 md:grid-cols-2 border-t pt-4">
                                <h3 className="col-span-2 font-medium flex items-center gap-2">
                                    <Calendar className="h-4 w-4" /> <span className="text-white">Project Schedule</span>
                                </h3>
                                <div>
                                    <label className="text-sm font-medium text-white">Start Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full rounded-md border border-input bg-gray-900/50 text-white px-3 py-2"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white">End Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full rounded-md border border-input bg-gray-900/50 text-white px-3 py-2"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Targets */}
                            {deviceTypes.length > 0 && (
                                <div className="space-y-4 border-t pt-4">
                                    <h3 className="font-medium flex items-center gap-2">
                                        <Target className="h-4 w-4" /> <span className="text-white">Project Targets</span>
                                    </h3>
                                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                                        {deviceTypes.map(device => (
                                            <div key={device}>
                                                <label className="text-sm font-medium text-white">{device} Count</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="mt-1 block w-full rounded-md border border-input bg-gray-900/50 text-white px-3 py-2"
                                                    value={targetCounts[device] ?? ''}
                                                    onChange={(e) => setTargetCounts({
                                                        ...targetCounts,
                                                        [device]: e.target.value === '' ? '' : parseInt(e.target.value)
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Team Configuration */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium flex items-center gap-2"><Users className="h-4 w-4" /> <span className="text-white">Team Configuration</span></h3>

                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 rounded-md border border-input bg-gray-900/50 text-white px-3 py-2 text-sm"
                                            placeholder="Name (e.g. John Doe)"
                                            value={newMemberName}
                                            onChange={(e) => setNewMemberName(e.target.value)}
                                        />
                                        <select
                                            className="rounded-md border border-input bg-gray-900/50 text-white px-3 py-2 text-sm"
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
                                                        <p className="text-xs text-gray-300">{member.role}</p>
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

                            {/* Contacts */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Users className="h-4 w-4" /> <span className="text-white">Contacts</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 rounded-md border border-input bg-gray-900/50 text-white px-3 py-2 text-sm"
                                            placeholder="Contact Name"
                                            value={newContactName}
                                            onChange={(e) => setNewContactName(e.target.value)}
                                        />
                                        <input
                                            type="tel"
                                            className="flex-1 rounded-md border border-input bg-gray-900/50 text-white px-3 py-2 text-sm"
                                            placeholder="Phone Number"
                                            value={newContactPhone}
                                            onChange={(e) => setNewContactPhone(e.target.value)}
                                        />
                                        <Button type="button" size="icon" onClick={handleAddContact}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {contacts.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {contacts.map((contact, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border">
                                                    <div>
                                                        <p className="font-medium text-sm text-white">{contact.name}</p>
                                                        <p className="text-xs text-gray-300">{contact.phone}</p>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveContact(idx)}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Blueprints */}
                            <div className="space-y-4 border-t pt-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Target className="h-4 w-4" /> <span className="text-white">Blueprints & Plans</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg hover:border-yellow-500 transition-colors bg-gray-900/30">
                                                <div className="text-center">
                                                    <Download className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-300">Click to upload images</p>
                                                    <p className="text-xs text-gray-500">(JPG, PNG)</p>
                                                </div>
                                            </div>
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleBlueprintUpload}
                                            />
                                        </label>
                                    </div>

                                    {blueprints.length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {blueprints.map((bp, idx) => (
                                                <div key={idx} className="relative group aspect-video bg-black rounded-lg overflow-hidden border border-gray-700">
                                                    <img src={bp.data} alt={bp.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Button type="button" variant="destructive" size="icon" onClick={() => handleRemoveBlueprint(idx)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/70 text-xs text-white truncate">
                                                        {bp.name}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PIN Input Removed - Auth handled upfront */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
                                <Button type="submit">{isEditing ? 'Save Changes' : 'Create Project'}</Button>
                            </div>
                        </form >
                    </div >
                )
                }

                {/* Auth Confirmation Modal (Delete/Edit) */}
                {
                    (projectToAuth || authAction === 'create') && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-gray-950 border border-yellow-500/20 w-full max-w-sm rounded-2xl shadow-[0_0_50px_-12px_rgba(234,179,8,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                                {/* Header */}
                                <div className="p-6 pb-0 flex flex-col items-center text-center">
                                    <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4 ring-1 ring-yellow-500/20">
                                        <Lock className="h-6 w-6 text-yellow-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">
                                        {authAction === 'delete' ? 'Delete Project' : 'Security Check'}
                                    </h2>
                                    <p className="text-sm text-gray-400 max-w-[240px] leading-relaxed">
                                        {authAction === 'delete'
                                            ? `This action is permanent and cannot be undone.`
                                            : "Please enter the master PIN to continue with this action."
                                        }
                                    </p>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <input
                                            type="password"
                                            autoFocus
                                            className="w-full text-center text-3xl font-mono tracking-widest px-4 py-4 rounded-xl border border-gray-800 bg-black/50 text-yellow-500 placeholder-gray-800 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all shadow-inner"
                                            placeholder="••••••"
                                            value={authPin}
                                            onChange={(e) => {
                                                setAuthPin(e.target.value.replace(/[^0-9]/g, ''));
                                                setAuthError('');
                                            }}
                                            maxLength={20}
                                        />
                                        {authError && (
                                            <div className="flex items-center justify-center gap-2 text-red-500 text-xs font-medium animate-pulse mt-2">
                                                <AlertTriangle className="h-3 w-3" />
                                                {authError}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={closeAuthModal}
                                            className="h-12 rounded-xl text-gray-400 hover:text-white hover:bg-gray-900"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            className="h-12 rounded-xl bg-yellow-500 text-black hover:bg-yellow-400 font-bold shadow-lg shadow-yellow-500/20"
                                            onClick={handleAuthSubmit}
                                        >
                                            {authAction === 'delete' ? 'Confirm Delete' : 'Verify PIN'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        <p>Loading projects...</p>
                    ) : projects.length === 0 ? (
                        <p className="text-gray-300 col-span-full text-center py-12">No projects found. Create one to get started.</p>
                    ) : (
                        projects
                            .filter(project =>
                                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                (project.location && project.location.toLowerCase().includes(searchQuery.toLowerCase()))
                            )
                            .map((project) => (
                                <div
                                    key={project.id}
                                    onClick={() => handleSelectProject(project)}
                                    className="group relative flex flex-col gap-2 rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm p-6 shadow-xl transition-all duration-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:border-yellow-500 cursor-pointer hover:scale-[1.01]"
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
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 shadow-sm"
                                            title="Edit Project"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setProjectToAuth(project);
                                                setAuthAction('edit');
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8 shadow-sm"
                                            title="Delete Project"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setProjectToAuth(project);
                                                setAuthAction('delete');
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                                            <Building2 className="h-6 w-6" />
                                        </div>
                                        <ChevronRight className="h-8 w-8 text-gray-500 group-hover:text-yellow-500 transition-colors" />
                                    </div>
                                    <h3 className="font-semibold text-xl mt-2 text-white">{project.name}</h3>
                                    <p className="text-sm text-gray-300 flex items-center gap-1">
                                        {project.location || 'No location specified'}
                                    </p>
                                    <div className="mt-auto space-y-3">
                                        <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-300">
                                            {project.targets && Object.entries(project.targets).map(([key, value]) => (
                                                value > 0 && (
                                                    <span key={key} className="px-1.5 py-0.5 rounded bg-gray-700/50 border border-gray-600">
                                                        {key}: {value}
                                                    </span>
                                                )
                                            ))}
                                        </div>

                                        <div className="pt-3 border-t border-gray-700/50 flex flex-col gap-2">
                                            {/* Date Range */}
                                            <div className="flex items-center text-xs text-yellow-500/80 font-medium mb-1">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                {project.startDate && project.endDate ? (
                                                    <span>
                                                        {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 italic">No schedule set</span>
                                                )}
                                            </div>

                                            {/* Team Info */}
                                            <div className="space-y-2 text-xs">
                                                {project.manager && (
                                                    <div className="flex justify-between items-center text-gray-400">
                                                        <span className="text-gray-500">Admin</span>
                                                        <span className="text-gray-200 font-medium">{project.manager}</span>
                                                    </div>
                                                )}

                                                {project.team && project.team.some(m => m.role === 'Install Team') && (
                                                    <div className="space-y-1">
                                                        <div className="text-gray-500">Install Team</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {project.team.filter(m => m.role === 'Install Team').map((m, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-gray-700/40 border border-gray-600/50 text-gray-200">
                                                                    {m.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {project.team && project.team.some(m => m.role === 'IT Team') && (
                                                    <div className="space-y-1">
                                                        <div className="text-gray-500">IT Team</div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {project.team.filter(m => m.role === 'IT Team').map((m, idx) => (
                                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-gray-700/40 border border-gray-600/50 text-gray-200">
                                                                    {m.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div >
            <Footer />
        </div >
    );
}
