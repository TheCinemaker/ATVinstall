import { X, CheckCircle2, AlertTriangle, Tv, Wifi, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { generatePDF } from '../utils/PDFGenerator';

export default function TotalReportModal({ project, installations, issues, onClose }) {
    if (!project) return null;

    // Calculate Stats
    const totalTvs = installations.filter(i => i.deviceType === 'tv').length;
    const totalAps = installations.filter(i => i.deviceType === 'ap').length;

    const targetTv = project.targets?.tv || 0;
    const targetAp = project.targets?.ap || 0;

    const tvProgress = targetTv > 0 ? Math.min((totalTvs / targetTv) * 100, 100) : 0;
    const apProgress = targetAp > 0 ? Math.min((totalAps / targetAp) * 100, 100) : 0;

    const totalIssues = issues.length;
    const resolvedIssues = issues.filter(i => i.status === 'resolved').length;
    const activeIssues = totalIssues - resolvedIssues;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/20">
                    <h2 className="font-bold text-lg text-white">Total Project Report</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-gray-400 hover:text-white hover:bg-white/10">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                        {/* Dynamic Device Progress */}
                        {(project.devices || ['TV', 'AP']).map(device => {
                            // Map UI Key to DB Key
                            const type = device === 'TV Cloning' ? 'cloning' : device.toLowerCase();

                            const count = installations.filter(i => i.deviceType?.toLowerCase() === type).length;
                            const target = project.targets?.[device] || 0; // Look up by exact key used in project targets
                            // Fix: If target is 0, progress is technically 100% if count > 0, or 0% if count 0. 
                            // But usually we want to show progress towards a goal.
                            // If no target set, we can't show a bar effectively, maybe just counts.
                            const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0;

                            // Icon mapping (simplified reusing getIcon logic or just hardcoded standard known ones)
                            let Icon = Tv;
                            let color = "text-blue-500";
                            let barColor = "bg-blue-500";

                            if (type === 'ap' || type === 'wifi') { Icon = Wifi; color = "text-green-500"; barColor = "bg-green-500"; }
                            else if (type.includes('cloning')) { Icon = CheckCircle2; color = "text-purple-500"; barColor = "bg-purple-500"; }
                            else if (type === 'switch') { Icon = CheckCircle2; color = "text-cyan-500"; barColor = "bg-cyan-500"; }
                            else if (type === 'camera') { Icon = CheckCircle2; color = "text-indigo-500"; barColor = "bg-indigo-500"; }
                            else { Icon = CheckCircle2; color = "text-yellow-500"; barColor = "bg-yellow-500"; }

                            return (
                                <div key={device} className="space-y-2">
                                    <div className="flex justify-between items-center text-white">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <Icon className={`h-4 w-4 ${color}`} /> {device}
                                        </h3>
                                        <span className="text-sm font-medium">
                                            {count} {target > 0 ? `/ ${target}` : 'Installed'}
                                        </span>
                                    </div>
                                    {target > 0 ? (
                                        <>
                                            <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${barColor} transition-all duration-500 shadow-[0_0_10px_rgba(255,255,255,0.2)]`}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 text-right">{Math.round(progress)}% Complete</p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-gray-500 italic text-right">No target set</p>
                                    )}
                                </div>
                            );
                        })}

                        {/* Issues Summary */}
                        <div className="bg-black/40 border border-gray-700 p-4 rounded-xl space-y-3">
                            <h3 className="font-semibold flex items-center gap-2 mb-2 text-white">
                                <AlertTriangle className="h-4 w-4 text-orange-500" /> Issues Summary
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-green-900/20 border border-green-900/50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-500">{resolvedIssues}</p>
                                    <p className="text-xs text-green-400/60 uppercase font-semibold">Resolved</p>
                                </div>
                                <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-red-500">{activeIssues}</p>
                                    <p className="text-xs text-red-400/60 uppercase font-semibold">Active</p>
                                </div>
                            </div>
                            <div className="text-center pt-2">
                                <p className="text-sm font-medium text-gray-400">
                                    Total Reported: {totalIssues}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-800 bg-black/20 flex gap-3">
                        <Button className="flex-1 bg-gray-800 text-white hover:bg-gray-700 font-semibold" onClick={() => generatePDF("Project Status Report", project, { installations, issues }, 'total')}>
                            <FileText className="mr-2 h-4 w-4" /> Download PDF
                        </Button>
                        <Button className="flex-1 bg-yellow-500 text-black hover:bg-yellow-400 font-semibold" onClick={onClose}>Close</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
