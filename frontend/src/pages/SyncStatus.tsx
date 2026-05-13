import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { RefreshCw, CheckCircle2, AlertTriangle, FileText, Info } from 'lucide-react';

interface EntityProgress {
    entity_type: string;
    total: number;
    synced: number;
    failed: number;
    status: 'pending' | 'running' | 'done' | 'failed';
}

interface JobStatus {
    status: 'running' | 'completed' | 'failed';
    progress: string;
    total_projects: number;
    completed: number;
    error_message?: string;
    entity_breakdown: EntityProgress[];
}

export const SyncStatus = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const jobId = searchParams.get('job_id');
    const [isPolling, setIsPolling] = useState(true);

    const { data: job, isError } = useQuery({
        queryKey: ['syncStatus', jobId],
        queryFn: async () => {
            if (!jobId) return null;
            const res = await apiClient.get(`/sync/status/${jobId}`);
            return res.data as JobStatus;
        },
        refetchInterval: isPolling ? 1500 : false,
        enabled: !!jobId,
    });

    useEffect(() => {
        if (job?.status === 'completed' || job?.status === 'failed' || isError) {
            setIsPolling(false);
        }
    }, [job, isError]);

    if (!jobId) return <div className="p-10 text-center">No Job ID</div>;

    const { status, progress, entity_breakdown, error_message } = job || { status: 'running', progress: 'Initializing...' };

    return (
        <div className="max-w-4xl mx-auto mt-10 p-4 md:p-8">
            <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
                {/* Header Status Bar */}
                <div className={`p-6 text-white flex items-center justify-between ${status === 'running' ? 'bg-zinc-900' : status === 'failed' ? 'bg-red-600' : 'bg-green-600'}`}>
                    <div className="flex items-center gap-4">
                        {status === 'running' ? <RefreshCw className="w-6 h-6 animate-spin text-orange-400" /> : <CheckCircle2 className="w-6 h-6" />}
                        <div>
                            <h2 className="text-xl font-bold capitalize">{status}</h2>
                            <p className="text-xs opacity-70 font-mono">{jobId}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-medium">{progress}</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Entity Breakdown Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entity_breakdown?.map((entity) => (
                            <div key={entity.entity_type} className={`p-4 rounded-2xl border transition-all ${entity.status === 'done' ? 'bg-green-50/50 border-green-100' : entity.status === 'failed' ? 'bg-red-50/50 border-red-100' : 'bg-zinc-50 border-zinc-100'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className={`w-4 h-4 ${entity.status === 'done' ? 'text-green-500' : 'text-zinc-400'}`} />
                                        <span className="font-bold text-zinc-900 capitalize">{entity.entity_type.replace('_', ' ')}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${entity.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'}`}>
                                        {entity.status}
                                    </span>
                                </div>
                                <div className="w-full bg-zinc-200 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${entity.status === 'failed' ? 'bg-red-500' : 'bg-green-500'}`}
                                        style={{ width: `${entity.total > 0 ? (entity.synced / entity.total) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                    <span>{entity.synced} Synced</span>
                                    <span>{entity.failed} Failed</span>
                                    <span>{entity.total} Total</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {error_message && (
                        <div className="bg-red-50 border-2 border-red-100 p-5 rounded-2xl flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                            <div>
                                <h4 className="font-bold text-red-800">Critical Error Encountered</h4>
                                <p className="text-red-600 text-sm mt-1">{error_message}</p>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button 
                            onClick={() => window.location.reload()}
                            className="flex-1 px-6 py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" /> Refresh Manual
                        </button>
                        <button 
                            onClick={() => navigate('/company-setup')}
                            className="flex-1 px-6 py-4 bg-[#f47e42] hover:bg-[#dc7e42] text-white font-bold rounded-2xl transition-all shadow-lg shadow-orange-500/20"
                        >
                            New Migration
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-zinc-400 text-xs font-medium">
                <Info className="w-4 h-4" />
                <span>Migration logs are stored in the MySQL database for auditing and re-sync deduplication.</span>
            </div>
        </div>
    );
};
