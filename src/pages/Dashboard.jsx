import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import ActivityDetailModal from '../components/ActivityDetailModal';
import Footer from '../components/Footer';
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
    Send,
    Download,
    Maximize,
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

    // Loading state check
    if (!currentProject) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p>Loading project...</p>
                </div>
            </div>
        );
    }

    const [installations, setInstallations] = useState([]);
    const [issues, setIssues] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showProjectInfo, setShowProjectInfo] = useState(false);
    const [showBlueprints, setShowBlueprints] = useState(false);
    const [showTotalReport, setShowTotalReport] = useState(false);
    const [showDailyReport, setShowDailyReport] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, tv, ap, chromecast, cloning, issue
    const [unseenAnnouncements, setUnseenAnnouncements] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [zoomedImage, setZoomedImage] = useState(null);

    // FIX: These are now defined and safe to use
    const projectDevices = currentProject?.devices || [];

    const installCounts = installations.reduce((acc, install) => {
        const type = install.deviceType?.toLowerCase();
        if (type) {
            acc[type] = (acc[type] || 0) + 1;
        }
        return acc;
    }, {});

    // Check for unseen announcements
    useEffect(() => {
        if (currentProject?.announcements) {
            const seenIds = JSON.parse(localStorage.getItem(`seen_announcements_${currentProject.id}`) || '[]');
            const unseen = currentProject.announcements.filter(a => !seenIds.includes(a.id));
            setUnseenAnnouncements(unseen);
        }
    }, [currentProject]);

    // Auto-mark as seen when chat is open
    useEffect(() => {
        if (showAnnouncements && unseenAnnouncements.length > 0) {
            handleMarkAllSeen();
        }
    }, [showAnnouncements, unseenAnnouncements]);

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
                author: user?.displayName || user?.email?.split('@')[0] || 'Unknown',
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

    // Calculate Daily Stats
    const todayStr = new Date().toDateString();

    const dailyInstalls = installations.filter(i => new Date(i.createdAt).toDateString() === todayStr);
    const dailyIssues = issues.filter(i => new Date(i.createdAt).toDateString() === todayStr);

    const dailyStats = {
        total: dailyInstalls.length,
        issues: dailyIssues.length,
    };

    // Add per-device daily counts
    projectDevices.forEach(device => {
        dailyStats[device.toLowerCase()] = dailyInstalls.filter(i => i.deviceType?.toLowerCase() === device.toLowerCase()).length;
    });

    const reportItems = [
        { label: "Total Report", icon: BarChart3, onClick: () => setShowTotalReport(true) },
        { label: "Daily Report", icon: Calendar, onClick: () => setShowDailyReport(true) },
    ];

    const projectItems = [
        { label: "Project Info", icon: Info, onClick: () => setShowProjectInfo(true) },
        { label: "Team Members", icon: Users, onClick: () => setShowTeamModal(true) },
        { label: "Switch Project", icon: ArrowLeft, onClick: handleSwitchProject },
        { label: "Logout", icon: LogOut, onClick: handleLogout, color: "text-red-500" },
    ];


    const menuItems = [
        {
            title: "Install TV",
            icon: Tv,
            color: "text-white",
            bg: "bg-blue-600/20 border border-blue-500/30",
            path: "/install/tv",
            type: "TV"
        },
        {
            title: "TV Cloning",
            icon: Copy,
            color: "text-white",
            bg: "bg-purple-600/20 border border-purple-500/30",
            path: "/install/cloning",
            type: "TV Cloning"
        },
        {
            title: "Install AP",
            icon: Wifi,
            color: "text-white",
            bg: "bg-green-600/20 border border-green-500/30",
            path: "/install/ap",
            type: "AP"
        },
        {
            title: "Chromecast",
            icon: Cast,
            color: "text-white",
            bg: "bg-orange-600/20 border border-orange-500/30",
            path: "/install/chromecast",
            type: "Chromecast"
        },
        {
            title: "Camera",
            icon: Camera,
            color: "text-white",
            bg: "bg-indigo-600/20 border border-indigo-500/30",
            path: "/install/camera",
            type: "Camera"
        },
        {
            title: "Switch",
            icon: ToggleLeft,
            color: "text-white",
            bg: "bg-cyan-600/20 border border-cyan-500/30",
            path: "/install/switch",
            type: "Switch"
        },
        {
            title: "Signage",
            icon: MonitorPlay,
            color: "text-white",
            bg: "bg-pink-600/20 border border-pink-500/30",
            path: "/install/signage",
            type: "Signage"
        },
        {
            title: "Firewall",
            icon: Shield,
            color: "text-white",
            bg: "bg-red-800/20 border border-red-700/30",
            path: "/install/firewall",
            type: "Firewall"
        },
        {
            title: "SAT",
            icon: Radio,
            color: "text-white",
            bg: "bg-gray-600/20 border border-gray-500/30",
            path: "/install/sat",
            type: "SAT"
        },
        {
            title: "IPTEL",
            icon: Phone,
            color: "text-white",
            bg: "bg-teal-600/20 border border-teal-500/30",
            path: "/install/iptel",
            type: "IPTEL"
        },
        {
            title: "Mgmt Server",
            icon: Server,
            color: "text-white",
            bg: "bg-slate-700/30 border border-slate-600/30",
            path: "/install/management server",
            type: "Management server"
        },
        {
            title: "OPC",
            icon: Disc,
            color: "text-white",
            bg: "bg-emerald-600/20 border border-emerald-500/30",
            path: "/install/opc",
            type: "OPC"
        },
        {
            title: "Media Encoder",
            icon: Radio,
            color: "text-white",
            bg: "bg-amber-600/20 border border-amber-500/30",
            path: "/install/media encoder",
            type: "Media Encoder"
        },
        {
            title: "Headend",
            icon: Server,
            color: "text-white",
            bg: "bg-violet-600/20 border border-violet-500/30",
            path: "/install/headend",
            type: "Headend"
        },
        {
            title: "Report Issue",
            icon: AlertTriangle,
            color: "text-white",
            bg: "bg-red-600/20 border border-red-500/30",
            path: "/report",
            desc: "Log problems",
            type: "ALWAYS_VISIBLE"
        }
    ].filter(item => {
        if (item.type === 'ALWAYS_VISIBLE') return true;
        return currentProject.devices?.includes(item.type);
    }).map(item => {
        if (item.type === 'ALWAYS_VISIBLE') return item;

        // Map UI/Project type to Database type (handles "TV Cloning" -> "cloning" mismatch)
        const dbType = item.type === 'TV Cloning' ? 'cloning' : item.type.toLowerCase();

        // Calculate progress logic
        // Targets are stored using the Project/UI Key (e.g. "TV Cloning")
        const target = currentProject.targets?.[item.type] || 0;

        // Installations and Issues are stored using the DB Key (e.g. "cloning")
        const installed = installCounts[dbType] || 0;
        const isDone = target > 0 && installed >= target;

        // Check for unresolved issues for this device type
        const hasActiveIssues = issues.some(i =>
            i.status !== 'resolved' &&
            i.deviceType?.toLowerCase() === dbType
        );

        return {
            ...item,
            desc: target > 0 ? `${installed} / ${target}` : `${installed} Installed`,
            isDone: isDone,
            hasActiveIssues: hasActiveIssues,
            bg: hasActiveIssues ? "bg-red-900/20 border border-red-500/50" : (isDone ? "bg-green-600/30 border border-green-500/50" : item.bg)
        };
    });

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
        <div className="min-h-screen bg-black pb-20 text-gray-100">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                        <h1 className="font-bold text-lg truncate text-yellow-500">{currentProject.name}</h1>
                        <p className="text-xs text-gray-400 truncate">{currentProject.location}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Always visible: Chat & Plans */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAnnouncements(true)}
                            className="bg-gray-900 border border-gray-800 text-gray-300 hover:text-yellow-500 hover:bg-gray-800 relative px-3"
                        >
                            <MessageSquare className="h-5 w-5 mr-2" />
                            <span className="font-medium">Chat</span>
                            {unseenAnnouncements.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse border-2 border-black" />
                            )}
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBlueprints(true)}
                            className="bg-gray-900 border border-gray-800 text-gray-300 hover:text-yellow-500 hover:bg-gray-800 px-3"
                        >
                            <Map className="h-5 w-5 mr-2" />
                            <span className="font-medium">Plans</span>
                        </Button>

                        {/* Hamburger Menu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowMenu(true)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                        >
                            <ListFilter className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Menu Modal (Hamburger) */}
            {showMenu && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900">
                        <h2 className="font-bold text-lg text-white">Menu</h2>
                        <Button variant="ghost" size="icon" onClick={() => setShowMenu(false)} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                            <X className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase text-gray-500 px-2">Project</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {projectItems.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            item.onClick();
                                            setShowMenu(false);
                                        }}
                                        className={`flex items-center gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 transition-colors text-left ${item.color || 'text-white'}`}
                                    >
                                        <div className="p-2 rounded-full bg-black/40">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase text-gray-500 px-2">Reports</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {reportItems.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            item.onClick();
                                            setShowMenu(false);
                                        }}
                                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:bg-gray-800 transition-colors text-left text-white"
                                    >
                                        <div className="p-2 rounded-full bg-black/40">
                                            <item.icon className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Important Info Banner - REMOVED (Replaced by Announcements) */}

            {/* Announcement Popup (Blocking) */}
            {/* Announcement Popup (Blocking) */}
            {unseenAnnouncements.length > 0 && !showAnnouncements && (
                (() => {
                    const hasUrgent = unseenAnnouncements.some(a => a.text.toLowerCase().includes('@admin'));
                    const borderColor = hasUrgent ? "border-red-600" : "border-yellow-500/50";
                    const bgColor = hasUrgent ? "bg-red-950" : "bg-gray-900"; // darker background for urgent
                    const headerBg = hasUrgent ? "bg-red-600/20 border-red-600/30" : "bg-yellow-500/10 border-yellow-500/20";
                    const iconColor = hasUrgent ? "text-red-500" : "text-yellow-500";
                    const iconBg = hasUrgent ? "bg-red-600/20" : "bg-yellow-500/20";
                    const titleColor = hasUrgent ? "text-red-500" : "text-yellow-500";
                    const subtitleColor = hasUrgent ? "text-red-400/80" : "text-gray-400";
                    const btnColor = hasUrgent ? "bg-red-600 hover:bg-red-700" : "bg-yellow-500 hover:bg-yellow-400 text-black";

                    return (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border ${borderColor} ${bgColor}`}>
                                <div className={`p-4 ${headerBg} border-b flex items-center gap-3`}>
                                    <div className={`p-2 ${iconBg} rounded-full`}>
                                        <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
                                    </div>
                                    <div>
                                        <h2 className={`font-bold text-lg ${titleColor}`}>
                                            {hasUrgent ? "URGENT MESSAGE" : "New Announcements"}
                                        </h2>
                                        <p className={`text-xs ${subtitleColor}`}>Please acknowledge to continue</p>
                                    </div>
                                </div>
                                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                    {unseenAnnouncements.map((announcement) => {
                                        const isUrgent = announcement.text.toLowerCase().includes('@admin');
                                        return (
                                            <div key={announcement.id} className="space-y-2">
                                                <div className="flex items-center justify-between text-xs text-gray-400">
                                                    <span className={`font-semibold ${isUrgent ? 'text-red-500' : 'text-yellow-500'}`}>{announcement.author}</span>
                                                    <span>{new Date(announcement.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className={`p-4 rounded-lg text-sm leading-relaxed border ${isUrgent ? 'bg-red-500/10 border-red-500/50 text-red-100' : 'bg-black/40 border-gray-700 text-gray-200'}`}>
                                                    {announcement.text}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="p-4 border-t border-gray-800 bg-black/20">
                                    <Button className={`w-full ${btnColor} font-semibold`} onClick={handleMarkAllSeen}>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        I have read and understood
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            )}

            {/* Announcements Modal (Chat View) */}
            {showAnnouncements && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-md h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                                <MessageSquare className="h-5 w-5 text-yellow-500" /> Team Announcements
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowAnnouncements(false)} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
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
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'
                                                    }`}>
                                                    {announcement.author.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-semibold text-gray-300">{announcement.author}</span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {new Date(announcement.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    {(() => {
                                                        const isUrgent = announcement.text.toLowerCase().includes('@admin');
                                                        const bubbleClass = isMe
                                                            ? isUrgent ? 'bg-red-600 text-white rounded-tr-none' : 'bg-yellow-500 text-black rounded-tr-none'
                                                            : isUrgent ? 'bg-red-600 text-white rounded-tl-none' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none';

                                                        return (
                                                            <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${bubbleClass}`}>
                                                                <p className="whitespace-pre-wrap leading-relaxed">
                                                                    {isUrgent && <span className="font-bold">⚠️ URGENT: </span>}
                                                                    {announcement.text}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                    <MessageSquare className="h-12 w-12 mb-2" />
                                    <p>No messages yet</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-800 bg-black/20">
                            <div className="flex gap-2 items-end">
                                <textarea
                                    className="flex-1 min-h-[44px] max-h-32 rounded-2xl border border-gray-700 bg-gray-800 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none transition-all placeholder-gray-500"
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
                                <Button size="icon" className="rounded-full h-11 w-11 shrink-0 shadow-sm bg-yellow-500 hover:bg-yellow-400 text-black" onClick={handlePostAnnouncement} disabled={!newAnnouncement.trim()}>
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Info Modal */}
            {showProjectInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                                <Info className="h-5 w-5 text-yellow-500" /> Project Info
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowProjectInfo(false)} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-6">
                            {/* Manager */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
                                    <Users className="h-3 w-3" /> Project Manager
                                </h3>
                                <div className="p-3 bg-black/40 rounded-lg border border-gray-700 text-white">
                                    <p className="font-medium">{currentProject.manager || 'Not assigned'}</p>
                                </div>
                            </div>

                            {/* Contacts */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-2">
                                    <Users className="h-3 w-3" /> Contacts
                                </h3>
                                <div className="space-y-2">
                                    {currentProject.contacts && currentProject.contacts.length > 0 ? (
                                        currentProject.contacts.map((contact, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-black/40 rounded-lg border border-gray-700">
                                                <div>
                                                    <p className="font-medium text-sm text-white">{contact.name}</p>
                                                    <p className="text-xs text-gray-400">{contact.phone}</p>
                                                </div>
                                                <a href={`tel:${contact.phone}`} className="p-2 bg-yellow-500/10 rounded-full text-yellow-500 hover:bg-yellow-500/20">
                                                    <Phone className="h-4 w-4" />
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No contacts listed.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Blueprints Modal */}
            {showBlueprints && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                                <Map className="h-5 w-5 text-yellow-500" /> Blueprints & Plans
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowBlueprints(false)} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
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
                                                <div className="absolute inset-0 bg-black/0 hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => setZoomedImage(bp.data)}>
                                                    <div className="bg-yellow-500 text-black p-2 rounded-full shadow-lg hover:bg-yellow-400 transition-colors">
                                                        <Maximize className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium text-center truncate text-gray-300">{bp.name}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-gray-800 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                            <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                                <Users className="h-5 w-5 text-yellow-500" /> Project Team
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowTeamModal(false)} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
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
                                                <h3 className="text-xs font-semibold uppercase text-gray-500">{role}</h3>
                                                <div className="space-y-2">
                                                    {members.map((member, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-2 bg-black/40 rounded-lg border border-gray-700">
                                                            <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs">
                                                                {member.name.charAt(0)}
                                                            </div>
                                                            <span className="font-medium text-sm text-white">{member.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
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
                    <div className="bg-gray-900 p-3 rounded-xl border border-gray-800 shadow-sm text-center">
                        <p className="text-2xl font-bold text-yellow-500">{dailyStats.total}</p>
                        <p className="text-[10px] uppercase text-gray-500 font-semibold">Today</p>
                    </div>
                    {projectDevices.slice(0, 3).map(device => (
                        <div key={device} className="bg-black/40 p-3 rounded-xl border border-gray-800 text-center">
                            <p className="text-xl font-bold text-white">{dailyStats[device.toLowerCase()] || 0}</p>
                            <p className="text-[10px] uppercase text-gray-500 font-semibold">{device}s</p>
                        </div>
                    ))}
                    {dailyStats.issues > 0 && (
                        <div className="bg-red-900/20 p-3 rounded-xl border border-red-900/50 text-center">
                            <p className="text-xl font-bold text-red-500">{dailyStats.issues}</p>
                            <p className="text-[10px] uppercase text-red-400/60 font-semibold">Issues</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {menuItems.map((item) => (
                        <div
                            key={item.title}
                            onClick={() => navigate(item.path)}
                            className={`p-4 rounded-xl border shadow-sm transition-all cursor-pointer active:scale-95 text-center gap-3 group flex flex-col items-center ${item.isDone
                                ? 'bg-green-900/20 border-green-500/50 hover:bg-green-900/30'
                                : 'bg-gray-900 border-gray-800 hover:border-yellow-500/50'
                                }`}
                        >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${item.bg} group-hover:scale-110 transition-transform duration-200 relative`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} />
                                {item.hasActiveIssues && (
                                    <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black shadow-sm z-10 animate-pulse">
                                        ISSUE
                                    </div>
                                )}
                                {item.isDone && !item.hasActiveIssues && (
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black shadow-sm z-10">
                                        DONE
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className={`font-semibold text-sm ${item.hasActiveIssues ? 'text-red-400' : (item.isDone ? 'text-green-400' : 'text-gray-100')}`}>{item.title}</h3>
                                <p className={`text-xs uppercase mt-1 ${item.hasActiveIssues ? 'text-red-500/80 font-bold' : (item.isDone ? 'text-green-500/80 font-bold' : 'text-gray-300')}`}>{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Feed */}
                <div className="pt-4">
                    <h2 className="font-semibold mb-4 flex items-center justify-between text-yellow-500">
                        Activity
                    </h2>

                    {/* Search Bar */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search room, serial, port..."
                            className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-700 bg-gray-900 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-gray-600"
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
                    <div className="flex gap-2 gap-y-3 mb-4 flex-wrap justify-center">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${activeTab === 'all'
                                ? 'bg-yellow-500 text-black border-yellow-500'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setActiveTab('issues')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${activeTab === 'issues'
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            Issues
                        </button>
                        {projectDevices.map(device => (
                            <button
                                key={device}
                                onClick={() => setActiveTab(device.toLowerCase())}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${activeTab === device.toLowerCase()
                                    ? 'bg-yellow-500 text-black border-yellow-500'
                                    : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
                                    }`}
                            >
                                {device}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {sortedActivities.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-8 border border-gray-800 rounded-xl border-dashed bg-gray-900/50">
                                No activity found in this category.
                            </div>
                        ) : (
                            sortedActivities.map((item) => {
                                const isResolved = item.status === 'resolved';
                                const displayDate = isResolved && item.resolvedAt ? item.resolvedAt : item.createdAt;

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-start space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800 shadow-sm hover:border-yellow-500/30 transition-all cursor-pointer active:scale-[0.98] ${isResolved ? 'border-green-900/50 bg-green-900/10' : ''}`}
                                        onClick={() => setSelectedActivity(item)}
                                    >
                                        <div className={`p-2 rounded-full ${isResolved ? 'bg-green-900/20 text-green-500' : (item.type === 'issue' || item.hasIssue ? 'bg-red-900/20 text-red-500' : 'bg-gray-800 text-yellow-500')}`}>
                                            {isResolved ? <CheckCircle2 className="h-5 w-5" /> : getIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-sm truncate pr-2 flex items-center gap-2 text-gray-200">
                                                    <span className="font-mono bg-black/40 border border-gray-700 px-1.5 py-0.5 rounded text-xs text-gray-300">
                                                        {item.locationId || item.location || 'N/A'}
                                                    </span>
                                                    {item.type === 'issue' ? 'Issue' : item.deviceType?.toUpperCase()}
                                                </h3>
                                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                                    {displayDate.toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 truncate text-xs mt-1">
                                                {item.type === 'issue' ? item.description : `${item.locationType} • ${item.installerName || item.installer?.split('@')[0]}`}
                                            </p>

                                            {/* Tech Info Chips */}
                                            {(!item.type || item.type !== 'issue') && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {item.serialNumber && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800 text-gray-300 border border-gray-700 font-mono">
                                                            SN: {item.serialNumber}
                                                        </span>
                                                    )}
                                                    {item.portInfo && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/20 text-blue-400 border border-blue-900/30">
                                                            {item.portInfo}
                                                        </span>
                                                    )}
                                                    {item.switchName && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-900/20 text-purple-400 border border-purple-900/30">
                                                            SW: {item.switchName}
                                                        </span>
                                                    )}
                                                    {item.switchPosition && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-900/20 text-purple-400 border border-purple-900/30">
                                                            Pos: {item.switchPosition}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {(item.type === 'issue' || item.hasIssue) && !isResolved && (
                                                <p className="text-xs text-red-400 mt-1 font-medium">
                                                    {item.issueDescription ? `- ${item.issueDescription}` : ''}
                                                </p>
                                            )}
                                            {isResolved && (
                                                <p className="text-xs text-green-500 mt-1 font-medium">
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

            {/* Zoomed Blueprint Lightbox */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <div className="relative w-full h-full p-4 flex items-center justify-center">
                        <img
                            src={zoomedImage}
                            alt="Zoomed Blueprint"
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

            <ActivityDetailModal
                activity={selectedActivity}
                onClose={() => setSelectedActivity(null)}
            />
            <Footer />
        </div>
    );
}
