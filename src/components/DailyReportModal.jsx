import { X, CheckCircle2, AlertTriangle, Tv, Wifi, Calendar, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { generatePDF } from '../utils/PDFGenerator';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                    <h2 className="font-bold text-lg flex items-center gap-2 text-white">
                        <Calendar className="h-5 w-5 text-yellow-500" /> Daily Report
                    </h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 border-b border-gray-800 bg-black/40">
                    <p className="text-sm text-gray-400 text-center font-medium">
                        {today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-blue-900/20 p-2 rounded-lg text-center border border-blue-900/50">
                            <span className="block text-xl font-bold text-blue-500">{todayInstalls.length}</span>
                            <span className="text-[10px] uppercase text-blue-400/60 font-semibold">Installed</span>
                        </div>
                        <div className="bg-red-900/20 p-2 rounded-lg text-center border border-red-900/50">
                            <span className="block text-xl font-bold text-red-500">{todayIssues.length}</span>
                            <span className="text-[10px] uppercase text-red-400/60 font-semibold">Issues</span>
                        </div>
                        <div className="bg-green-900/20 p-2 rounded-lg text-center border border-green-900/50">
                            <span className="block text-xl font-bold text-green-500">{todayResolved.length}</span>
                            <span className="text-[10px] uppercase text-green-400/60 font-semibold">Resolved</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {totalActions === 0 ? (
                        <div className="text-center py-8 text-gray-500 opacity-50">
                            <Calendar className="h-12 w-12 mx-auto mb-2" />
                            <p>No activity recorded today.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {todayInstalls.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Installations</h3>
                                    <div className="space-y-2">
                                        {todayInstalls.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                                                <div className="flex items-center gap-2">
                                                    {item.deviceType === 'tv' ? <Tv className="h-4 w-4 text-blue-500" /> : <Wifi className="h-4 w-4 text-green-500" />}
                                                    <span className="font-medium">{item.locationId || 'N/A'}</span>
                                                </div>
                                                <span className="text-gray-400 text-xs">
                                                    {item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {todayIssues.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Reported Issues</h3>
                                    <div className="space-y-2">
                                        {todayIssues.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-red-900/20 border border-red-900/50 rounded-lg text-sm">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                                    <span className="font-medium text-red-200">{item.locationId || 'N/A'}</span>
                                                </div>
                                                <span className="text-red-400 text-xs truncate max-w-[120px]">
                                                    {item.description}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {todayResolved.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Resolved Today</h3>
                                    <div className="space-y-2">
                                        {todayResolved.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-2 bg-green-900/20 border border-green-900/50 rounded-lg text-sm">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    <span className="font-medium text-green-200">{item.locationId || 'N/A'}</span>
                                                </div>
                                                <span className="text-green-400 text-xs">
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

                <div className="p-4 border-t border-gray-800 bg-black/20 flex gap-3">
                    <Button className="flex-1 bg-gray-800 text-white hover:bg-gray-700 font-semibold" onClick={() => generatePDF("Daily Report", project, { dailyInstalls: todayInstalls, dailyIssues: todayIssues }, 'daily')}>
                        <FileText className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                    <Button className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 font-semibold" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}
