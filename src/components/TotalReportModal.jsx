import { X, CheckCircle2, AlertTriangle, Tv, Wifi } from 'lucide-react';
import { Button } from './ui/button';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                    <h2 className="font-bold text-lg">Total Project Report</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* TV Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Tv className="h-4 w-4 text-blue-500" /> TV Installation
                            </h3>
                            <span className="text-sm font-medium">
                                {totalTvs} / {targetTv || '?'}
                            </span>
                        </div>
                        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${tvProgress}%` }}
                            />
                        </div>
                        {targetTv > 0 && (
                            <p className="text-xs text-muted-foreground text-right">{Math.round(tvProgress)}% Complete</p>
                        )}
                    </div>

                    {/* AP Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-green-500" /> AP Installation
                            </h3>
                            <span className="text-sm font-medium">
                                {totalAps} / {targetAp || '?'}
                            </span>
                        </div>
                        <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{ width: `${apProgress}%` }}
                            />
                        </div>
                        {targetAp > 0 && (
                            <p className="text-xs text-muted-foreground text-right">{Math.round(apProgress)}% Complete</p>
                        )}
                    </div>

                    {/* Issues Summary */}
                    <div className="bg-muted/30 p-4 rounded-xl space-y-3">
                        <h3 className="font-semibold flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" /> Issues Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background p-3 rounded-lg border text-center">
                                <p className="text-2xl font-bold text-green-600">{resolvedIssues}</p>
                                <p className="text-xs text-muted-foreground uppercase">Resolved</p>
                            </div>
                            <div className="bg-background p-3 rounded-lg border text-center">
                                <p className="text-2xl font-bold text-red-600">{activeIssues}</p>
                                <p className="text-xs text-muted-foreground uppercase">Active</p>
                            </div>
                        </div>
                        <div className="text-center pt-2">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Reported: {totalIssues}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-muted/30">
                    <Button className="w-full" onClick={onClose}>Close Report</Button>
                </div>
            </div>
        </div>
    );
}
