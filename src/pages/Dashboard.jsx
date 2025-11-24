import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import ActivityDetailModal from '../components/ActivityDetailModal';
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
    X
} from 'lucide-react';

const getIcon = (type) => {
    switch (type) {
        case 'tv': return <Tv className="h-5 w-5" />;
        case 'ap': return <Wifi className="h-5 w-5" />;
        case 'chromecast': return <Cast className="h-5 w-5" />;
        case 'cloning': return <Copy className="h-5 w-5" />;
        case 'issue': return <AlertTriangle className="h-5 w-5" />;
        case 'camera': return <Camera className="h-5 w-5" />;
        case 'switch': return <ToggleLeft className="h-5 w-5" />;
        case 'signage': return <MonitorPlay className="h-5 w-5" />;
        default: return <CheckCircle2 className="h-5 w-5" />;
    }
};

export default function Dashboard() {
    const { currentProject, setCurrentProject } = useProject();
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [installations, setInstallations] = useState([]);
    const [issues, setIssues] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all, tv, ap, chromecast, cloning, issue

    const loadData = () => {
        if (!currentProject) return;

        // Load from localStorage
        const localInstalls = JSON.parse(localStorage.getItem(`installs_${currentProject.id}`) || '[]');
        const localIssues = JSON.parse(localStorage.getItem(`issues_${currentProject.id}`) || '[]');

        // Convert string dates to objects for sorting
        setInstallations(localInstalls.map(i => ({
            ...i,
            createdAt: new Date(i.createdAt),
            resolvedAt: i.resolvedAt ? new Date(i.resolvedAt) : null
        })));
        setIssues(localIssues.map(i => ({
            ...i,
            createdAt: new Date(i.createdAt),
            resolvedAt: i.resolvedAt ? new Date(i.resolvedAt) : null
        })));
    };

    useEffect(() => {
        loadData();
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
        tv: 0,
        ap: 0,
        issues: 0
    };

    activities.forEach(item => {
        // Count resolved issues as "done" today if resolved today
        const isResolvedToday = item.status === 'resolved' && isToday(item.resolvedAt);
        const isCreatedToday = isToday(item.createdAt);

        if (isCreatedToday || isResolvedToday) {
            if (item.type !== 'issue' || isResolvedToday) {
                dailyStats.total++;
            }

            if (item.type === 'issue' || item.hasIssue) dailyStats.issues++; // Keep tracking total issues reported/active
            if (item.deviceType === 'tv') dailyStats.tv++;
            if (item.deviceType === 'ap') dailyStats.ap++;
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

        // Tab Filter (only if no search query, or if we want to filter search results by tab too. 
        // User said "mindegy hogy... AP, TV", so search overrides tabs usually, but let's keep tabs active for refinement if needed.
        // Actually, for "universal search", it's often better to ignore tabs or switch to 'all'.
        // Let's auto-switch to 'all' when searching? Or just ignore tabs if searching?
        // Let's make search filter the CURRENT view. So if on 'All', it searches all.

        if (activeTab === 'all') return true;
        if (activeTab === 'issues') return item.type === 'issue' || item.hasIssue;
        if (activeTab === 'tv') return item.deviceType === 'tv';
        if (activeTab === 'ap') return item.deviceType === 'ap';
        if (activeTab === 'cc') return item.deviceType === 'chromecast';
        if (activeTab === 'cloning') return item.deviceType === 'cloning';
        return true;
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
                    <div className="flex gap-2">
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

            {/* Main Content */}
            <main className="max-w-md mx-auto p-4 space-y-6">

                {/* Daily Progress Stats */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-card p-3 rounded-xl border shadow-sm text-center">
                        <p className="text-2xl font-bold text-primary">{dailyStats.total}</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Today</p>
                    </div>
                    <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900 text-center">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{dailyStats.tv}</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">TVs</p>
                    </div>
                    <div className="bg-green-500/10 p-3 rounded-xl border border-green-100 dark:border-green-900 text-center">
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">{dailyStats.ap}</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">APs</p>
                    </div>
                    <div className="bg-red-500/10 p-3 rounded-xl border border-red-100 dark:border-red-900 text-center">
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">{dailyStats.issues}</p>
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Issues</p>
                    </div>
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

                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                        {['all', 'tv', 'ap', 'cc', 'cloning', 'issues'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                            >
                                {tab === 'cc' ? 'Chromecast' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                onUpdate={loadData}
            />
        </div>
    );
}
