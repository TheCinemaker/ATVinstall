import { X, CheckCircle2, AlertTriangle, Tv, Wifi, Calendar } from 'lucide-react';
import { Button } from './ui/button';

export default function DailyReportModal({ project, installations, issues, onClose }) {
    if (!project) return null;

    const today = new Date();
    const isToday = (date) => {
        if (!date) return false;
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Filter for Today
    const todayInstalls = installations.filter(i => isToday(i.createdAt));
    const todayIssues = issues.filter(i => isToday(i.createdAt));
    const todayResolved = [...installations, ...issues].filter(i => i.status === 'resolved' && isToday(i.resolvedAt));

    const totalActions = todayInstalls.length + todayIssues.length + todayResolved.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" /> Daily Report
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b bg-muted/10">
                    <p className="text-sm text-muted-foreground text-center">
                        {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-blue-50 p-2 rounded-lg text-center border border-blue-100">
                            <span className="block text-xl font-bold text-blue-600">{todayInstalls.length}</span>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Installed</span>
                        </div>
                        <div className="bg-red-50 p-2 rounded-lg text-center border border-red-100">
                            <span className="block text-xl font-bold text-red-600">{todayIssues.length}</span>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Issues</span>
                        </div>
                        <div className="bg-green-50 p-2 rounded-lg text-center border border-green-100">
                            <span className="block text-xl font-bold text-green-600">{todayResolved.length}</span>
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Resolved</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {totalActions === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No activity recorded today.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {todayInstalls.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Installations</h3>
                                    <div className="space-y-2">
                                        {todayInstalls.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-card border rounded-lg text-sm">
                                                <div className="flex items-center gap-2">
                                                    {item.deviceType === 'tv' ? <Tv className="h-4 w-4 text-blue-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
                                                    <span className="font-medium">{item.locationId || 'N/A'}</span>
                                                </div>
                                                <span className="text-muted-foreground text-xs">
                                                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {todayIssues.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Reported Issues</h3>
                                    <div className="space-y-2">
                                        {todayIssues.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-100 rounded-lg text-sm">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                    <span className="font-medium">{item.locationId || 'N/A'}</span>
                                                </div>
                                                <span className="text-red-600 text-xs truncate max-w-[120px]">
                                                    {item.description}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {todayResolved.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Resolved Today</h3>
                                    <div className="space-y-2">
                                        {todayResolved.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-green-50 border border-green-100 rounded-lg text-sm">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <span className="font-medium">{item.locationId || 'N/A'}</span>
                                                </div>
                                                <span className="text-muted-foreground text-xs">
                                                    {item.resolvedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/30">
                    <Button className="w-full" onClick={onClose}>Close Report</Button>
                </div>
            </div>
        </div>
    );
}
