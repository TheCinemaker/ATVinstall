import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import ActivityDetailModal from '../components/ActivityDetailModal';
import TotalReportModal from '../components/TotalReportModal';
import DailyReportModal from '../components/DailyReportModal';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import {
    LogOut,
    Plus,
    Tv,
    Wifi,
    Cast,
    Copy,
    AlertTriangle,
    Search,
    Filter,
    ListFilter,
    ArrowLeft,
    CheckCircle2,
    Camera,
    ToggleLeft,
    MonitorPlay,
    Users,
    X,
    BarChart3,
    Calendar,
    Server,
    Shield,
    Radio,
    Disc,
    Monitor,
    MoreHorizontal,
    Info,
    Phone,
    Map,
    MessageSquare,
    Send
} from 'lucide-react';

const getIcon = (type) => {
    switch (type?.toLowerCase()) {
        case 'tv': return <Tv className="h-5 w-5" />;
        case 'ap': return <Wifi className="h-5 w-5" />;
        case 'chromecast': return <Cast className="h-5 w-5" />;
        case 'cloning': return <Copy className="h-5 w-5" />;
        case 'issue': return <AlertTriangle className="h-5 w-5" />;
        case 'camera': return <Camera className="h-5 w-5" />;
        case 'switch': return <ToggleLeft className="h-5 w-5" />;
        case 'signage': return <MonitorPlay className="h-5 w-5" />;
        case 'firewall': return <Shield className="h-5 w-5" />;
        case 'management server': return <Server className="h-5 w-5" />;
        case 'opc': return <Disc className="h-5 w-5" />;
        case 'media encoder': return <Radio className="h-5 w-5" />;
        case 'headend': return <Server className="h-5 w-5" />;
        case 'other': return <MoreHorizontal className="h-5 w-5" />;
        default: return <CheckCircle2 className="h-5 w-5" />;
    }
};

export default function Dashboard() {
    const { currentProject, setCurrentProject } = useProject();
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const [installations, setInstallations] = useState([]);
    const [issues, setIssues] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showProjectInfo, setShowProjectInfo] = useState(false);
    const [showBlueprints, setShowBlueprints] = useState(false);
    const [showTotalReport, setShowTotalReport] = useState(false);
    const [showDailyReport, setShowDailyReport] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, tv, ap, chromecast, cloning, issue
    const [unseenAnnouncements, setUnseenAnnouncements] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState('');

    // Check for unseen announcements
    useEffect(() => {
        if (currentProject?.announcements) {
            const seenIds = JSON.parse(localStorage.getItem(`seen_announcements_${currentProject.id}`) || '[]');
            const unseen = currentProject.announcements.filter(a => !seenIds.includes(a.id));
            setUnseenAnnouncements(unseen);
        }
    }, [currentProject]);

    const handleMarkSeen = (announcementId) => {
        const seenIds = JSON.parse(localStorage.getItem(`seen_announcements_${currentProject.id}`) || '[]');
        if (!seenIds.includes(announcementId)) {
            const newSeenIds = [...seenIds, announcementId];
            localStorage.setItem(`seen_announcements_${currentProject.id}`, JSON.stringify(newSeenIds));

            // Update local state
            setUnseenAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        }
    };

    const handleMarkAllSeen = () => {
        if (unseenAnnouncements.length > 0) {
            const seenIds = JSON.parse(localStorage.getItem(`seen_announcements_${currentProject.id}`) || '[]');
            const newIds = unseenAnnouncements.map(a => a.id);
            const combinedIds = [...new Set([...seenIds, ...newIds])];
            localStorage.setItem(`seen_announcements_${currentProject.id}`, JSON.stringify(combinedIds));
            setUnseenAnnouncements([]);
        }
    };

    const handlePostAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;

        try {
            const announcement = {
                id: uuidv4(),
                text: newAnnouncement,
                author: user?.displayName || 'Unknown',
                createdAt: new Date().toISOString()
            };

            const projectRef = doc(db, 'projects', currentProject.id);
            await updateDoc(projectRef, {
                announcements: arrayUnion(announcement)
            });

            setNewAnnouncement('');
            // Optional: Mark as seen for the author immediately? 
            // Let's keep it simple: Author also sees it as "new" unless we add logic, 
            // but for now let's just let them see it or auto-mark it.
            // Actually, better to auto-mark it for the author so they don't get a popup of their own message.
            handleMarkSeen(announcement.id);

        } catch (error) {
            console.error("Error posting announcement:", error);
            alert("Failed to post announcement");
        }
    };

    useEffect(() => {
        if (!currentProject) return;

        console.log('🔍 Dashboard loading data for project:', currentProject.id, currentProject.name);

        // Listen for Installations
        const installsQuery = query(
            collection(db, 'projects', currentProject.id, 'installations'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeInstalls = onSnapshot(installsQuery, (snapshot) => {
            console.log('📦 Firestore installations snapshot:', snapshot.docs.length, 'documents');
            const installsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                resolvedAt: doc.data().resolvedAt?.toDate() || null
            }));
            console.log('📦 Processed installations:', installsData);
            setInstallations(installsData);
        });

        // Listen for Issues
        const issuesQuery = query(
            collection(db, 'projects', currentProject.id, 'issues'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
            const issuesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                resolvedAt: doc.data().resolvedAt?.toDate() || null
            }));
            setIssues(issuesData);
        });

        return () => {
            unsubscribeInstalls();
            unsubscribeIssues();
        };
    }, [currentProject]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSwitchProject = () => {
        setCurrentProject(null);
        navigate('/projects');
    };

    // Merge and sort
    const activities = [...installations, ...issues].sort((a, b) => {
        // Sort resolved issues by resolution date if available, otherwise created date
        const getTime = (date) => date instanceof Date ? date.getTime() : new Date(date).getTime();

        const timeA = a.status === 'resolved' && a.resolvedAt ? getTime(a.resolvedAt) : getTime(a.createdAt);
        const timeB = b.status === 'resolved' && b.resolvedAt ? getTime(b.resolvedAt) : getTime(b.createdAt);
        return timeB - timeA;
    });

    // Calculate Daily Stats
    const today = new Date();
    const isToday = (date) => {
        if (!date) return false;
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const dailyStats = {
        total: 0,
        issues: 0,
        // Dynamic device counters will be added here
    };

    // Initialize counters for all project devices
    const projectDevices = currentProject?.devices || ['TV', 'AP'];
    projectDevices.forEach(device => {
        dailyStats[device.toLowerCase()] = 0;
    });

    activities.forEach(item => {
        // Count resolved issues as "done" today if resolved today
        const isResolvedToday = item.status === 'resolved' && isToday(item.resolvedAt);
        const isCreatedToday = isToday(item.createdAt);

        if (isCreatedToday || isResolvedToday) {
            if (item.type !== 'issue' || isResolvedToday) {
                dailyStats.total++;
            }

            if (item.type === 'issue' || item.hasIssue) dailyStats.issues++; // Keep tracking total issues reported/active

            // Increment specific device counter if it exists
            if (item.deviceType && dailyStats[item.deviceType.toLowerCase()] !== undefined) {
                dailyStats[item.deviceType.toLowerCase()]++;
            }
        }
    });

    if (!currentProject) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p>No project selected.</p>
                <Button onClick={() => navigate('/projects')}>Select Project</Button>
            </div>
        );
    }

    const menuItems = [
        {
            title: "Install TV",
            icon: Tv,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            path: "/install/tv",
            desc: "Photo + Serial"
        },
        {
            title: "TV Cloning",
            icon: Copy,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            path: "/install/cloning",
            desc: "Update + Clone"
        },
        {
            title: "Install AP",
            icon: Wifi,
            color: "text-green-500",
            bg: "bg-green-500/10",
            path: "/install/ap",
            desc: "Photo + MAC"
        },
        {
            title: "Chromecast",
            icon: Cast,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            path: "/install/chromecast",
            desc: "Photo + Place"
        },
        {
            title: "Camera",
            icon: Camera,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            path: "/install/camera",
            desc: "Photo + MAC"
        },
        {
            title: "Switch",
            icon: ToggleLeft,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            path: "/install/switch",
            desc: "Pos + Serial"
        },
        {
            title: "Signage",
            icon: MonitorPlay,
            color: "text-pink-500",
            bg: "bg-pink-500/10",
            path: "/install/signage",
            desc: "Install + Config"
        },
        {
            title: "Report Issue",
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-500/10",
            path: "/report",
            desc: "Log problems"
        }
    ];

    // Filter and Sort
    const filteredActivities = activities.filter(item => {
        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const searchableText = [
                item.locationId,
                item.locationType,
                item.serialNumber,
                item.portInfo,
                item.description,
                item.issueDescription,
                item.deviceType,
                item.switchName,
                item.switchPosition
            ].filter(Boolean).join(' ').toLowerCase();

            if (!searchableText.includes(query)) return false;
        }

        // Tab Filter
        if (activeTab === 'all') return true;
        if (activeTab === 'issues') return item.type === 'issue' || item.hasIssue;
        return item.deviceType?.toLowerCase() === activeTab.toLowerCase();
    });

    const sortedActivities = filteredActivities.sort((a, b) => {
        // If viewing specific tabs, sort by location
        if (activeTab !== 'all' && activeTab !== 'issues') {
            const locA = a.locationId || '';
            const locB = b.locationId || '';

            // Try numerical sort for rooms
            const numA = parseInt(locA);
            const numB = parseInt(locB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }
            return locA.localeCompare(locB);
        }
        // Default to time for All and Issues (using resolvedAt for resolved issues)
        const timeA = a.status === 'resolved' && a.resolvedAt ? a.resolvedAt.getTime() : a.createdAt.getTime();
        const timeB = b.status === 'resolved' && b.resolvedAt ? b.resolvedAt.getTime() : b.createdAt.getTime();
        return timeB - timeA;
    });

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-lg truncate max-w-[200px]">{currentProject.name}</h1>
                        <p className="text-xs text-muted-foreground">{currentProject.location}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 max-w-[200px] sm:max-w-none">
                        <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(true)} title="Team Chat" className="relative">
                            <MessageSquare className="h-5 w-5" />
                            {unseenAnnouncements.length > 0 && (
                                <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowProjectInfo(true)} title="Project Info">
                            <Info className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowBlueprints(true)} title="Blueprints">
                            <Map className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowTotalReport(true)} title="Total Report">
                            <BarChart3 className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowTeamModal(true)} title="Team">
                            <Users className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleSwitchProject} title="Switch Project">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Important Info Banner - REMOVED (Replaced by Announcements) */}

            {/* Announcement Popup (Blocking) */}
            {unseenAnnouncements.length > 0 && !showAnnouncements && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-2 border-yellow-500">
                        <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-yellow-700 dark:text-yellow-400">New Announcements</h2>
                                <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80">Please acknowledge to continue</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            {unseenAnnouncements.map((announcement) => (
                                <div key={announcement.id} className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="font-semibold text-primary">{announcement.author}</span>
                                        <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="p-4 bg-muted/50 rounded-lg text-sm leading-relaxed border">
                                        {announcement.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t bg-muted/30">
                            <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold" onClick={handleMarkAllSeen}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                I have read and understood
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcements Modal (Chat View) */}
            {showAnnouncements && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background w-full max-w-md h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <MessageSquare className="h-5 w-5" /> Team Announcements
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(false)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {currentProject.announcements && currentProject.announcements.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {[...currentProject.announcements].reverse().map((announcement) => {
                                        const isMe = announcement.author === (user?.displayName || 'Unknown');
                                        return (
                                            <div key={announcement.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                                                    }`}>
                                                    {announcement.author.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-foreground">{announcement.author}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {new Date(announcement.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe
                                                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                        : 'bg-muted text-foreground rounded-tl-none'
                                                        }`}>
                                                        <p className="whitespace-pre-wrap leading-relaxed">{announcement.text}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                    <MessageSquare className="h-12 w-12 mb-2" />
                                    <p>No messages yet</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t bg-background">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    className="flex-1 min-h-[44px] max-h-32 rounded-2xl border border-input bg-muted/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
                                    placeholder="Type a message..."
                                    rows={1}
                                    value={newAnnouncement}
                                    onChange={(e) => setNewAnnouncement(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostAnnouncement();
                                        }
                                    }}
                                />
                                <Button size="icon" className="rounded-full h-11 w-11 shrink-0 shadow-sm" onClick={handlePostAnnouncement} disabled={!newAnnouncement.trim()}>
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Info Modal */}
            {showProjectInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Info className="h-5 w-5" /> Project Info
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowProjectInfo(false)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-6">
                            {/* Manager */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <Users className="h-3 w-3" /> Project Manager
                                </h3>
                                <div className="p-3 bg-card rounded-lg border">
                                    <p className="font-medium">{currentProject.manager || 'Not assigned'}</p>
                                </div>
                            </div>

                            {/* Contacts */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                                    <Users className="h-3 w-3" /> Contacts
                                </h3>
                                <div className="space-y-2">
                                    {currentProject.contacts && currentProject.contacts.length > 0 ? (
                                        currentProject.contacts.map((contact, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-card rounded-lg border">
                                                <div>
                                                    <p className="font-medium text-sm">{contact.name}</p>
                                                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                                </div>
                                                <a href={`tel:${contact.phone}`} className="p-2 bg-primary/10 rounded-full text-primary hover:bg-primary/20">
                                                    <Phone className="h-4 w-4" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No contacts listed.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Blueprints Modal */}
            {showBlueprints && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Map className="h-5 w-5" /> Blueprints & Plans
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowBlueprints(false)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {currentProject.blueprints && currentProject.blueprints.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentProject.blueprints.map((bp, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="relative group aspect-video bg-black rounded-lg overflow-hidden border border-gray-700">
                                                <img src={bp.data} alt={bp.name} className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <a
                                                        href={bp.data}
                                                        download={bp.name}
                                                        className="bg-background/80 text-foreground p-2 rounded-full shadow-lg hover:bg-background transition-colors"
                                                        title="Download"
                                                    >
                                                        <Download className="h-5 w-5" />
                                                    </a>
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium text-center truncate">{bp.name}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Map className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                    <p>No blueprints uploaded for this project.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Team Modal */}
            {showTeamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <Users className="h-5 w-5" /> Project Team
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowTeamModal(false)} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                            {currentProject.team && currentProject.team.length > 0 ? (
                                <>
                                    {['Install Team', 'IT Team', 'Other'].map(role => {
                                        const members = currentProject.team.filter(m => m.role === role);
                                        if (members.length === 0) return null;
                                        return (
                                            <div key={role} className="space-y-2">
                                                <h3 className="text-xs font-semibold uppercase text-muted-foreground">{role}</h3>
                                                <div className="space-y-2">
                                                    {members.map((member, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-2 bg-card rounded-lg border">
                                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                                {member.name.charAt(0)}
                                                            </div>
                                                            <span className="font-medium text-sm">{member.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                    <p>No team members assigned.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Total Report Modal */}
            {showTotalReport && (
                <TotalReportModal
                    project={currentProject}
                    installations={installations}
                    issues={issues}
                    onClose={() => setShowTotalReport(false)}
                />
            )}

            {/* Daily Report Modal */}
            {showDailyReport && (
                <DailyReportModal
                    project={currentProject}
                    installations={installations}
                    issues={issues}
                    onClose={() => setShowDailyReport(false)}
                />
            )}

            {/* Main Content */}
            <main className="max-w-md mx-auto p-4 space-y-6">

                {/* Daily Progress Stats */}
                <div
                    className="grid grid-cols-4 gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowDailyReport(true)}
                    title="View Daily Report"
                >
                    <div className="bg-card p-3 rounded-xl border shadow-sm text-center">
                        <p className="text-2xl font-bold text-primary">{dailyStats.total}</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Today</p>
                    </div>
                    {projectDevices.slice(0, 3).map(device => (
                        <div key={device} className="bg-muted/30 p-3 rounded-xl border text-center">
                            <p className="text-xl font-bold">{dailyStats[device.toLowerCase()] || 0}</p>
                            <p className="text-[10px] uppercase text-muted-foreground font-semibold">{device}s</p>
                        </div>
                    ))}
                    {dailyStats.issues > 0 && (
                        <div className="bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-900 text-center">
                            <p className="text-xl font-bold text-red-600 dark:text-red-400">{dailyStats.issues}</p>
                            <p className="text-[10px] uppercase text-muted-foreground font-semibold">Issues</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {menuItems.map((item) => (
                        <div
                            key={item.title}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95 text-center gap-2"
                        >
                            <div className={`p-3 rounded-full ${item.bg} ${item.color}`}>
                                <item.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">{item.title}</h3>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Feed */}
                <div className="pt-4">
                    <h2 className="font-semibold mb-4 flex items-center justify-between">
                        Activity
                    </h2>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search room, serial, port..."
                            className="w-full pl-9 pr-4 py-2 rounded-full border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (e.target.value && activeTab !== 'all') {
                                    setActiveTab('all'); // Auto-switch to All when searching
                                }
                            }}
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === 'all'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('issues')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === 'issues'
                                ? 'bg-red-500 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            Issues
                        </button>
                        {projectDevices.map(device => (
                            <button
                                key={device}
                                onClick={() => setActiveTab(device.toLowerCase())}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === device.toLowerCase()
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {device}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {sortedActivities.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8 border rounded-xl border-dashed">
                                No activity found in this category.
                            </div>
                        ) : (
                            sortedActivities.map((item) => {
                                const isResolved = item.status === 'resolved';
                                const displayDate = isResolved && item.resolvedAt ? item.resolvedAt : item.createdAt;

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-start space-x-4 p-3 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] transition-transform ${isResolved ? 'border-green-200 bg-green-50/30' : ''}`}
                                        onClick={() => setSelectedActivity(item)}
                                    >
                                        <div className={`p-2 rounded-full ${isResolved ? 'bg-green-100 text-green-600' : (item.type === 'issue' || item.hasIssue ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary')}`}>
                                            {isResolved ? <CheckCircle2 className="h-5 w-5" /> : getIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-sm truncate pr-2 flex items-center gap-2">
                                                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">
                                                        {item.locationId || item.location || 'N/A'}
                                                    </span>
                                                    {item.type === 'issue' ? 'Issue' : item.deviceType?.toUpperCase()}
                                                </h3>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                    {displayDate.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground truncate text-xs mt-1">
                                                {item.type === 'issue' ? item.description : `${item.locationType} • ${item.installerName || item.installer?.split('@')[0]}`}
                                            </p>
                                            {(item.type === 'issue' || item.hasIssue) && !isResolved && (
                                                <p className="text-xs text-red-500 mt-1 font-medium">
                                                    {item.issueDescription ? `- ${item.issueDescription}` : ''}
                                                </p>
                                            )}
                                            {isResolved && (
                                                <p className="text-xs text-green-600 mt-1 font-medium">
                                                    Resolved
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </main>

            <ActivityDetailModal
                activity={selectedActivity}
                onClose={() => setSelectedActivity(null)}
            />
        </div>
    );
}
