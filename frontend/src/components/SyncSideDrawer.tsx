import { useState, useEffect } from 'react';
import { Drawer, Progress, Card, Tag, Button, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
    Activity, 
    X, 
    Terminal,
    ChevronRight
} from 'lucide-react';
import { InfinityLoader } from './InfinityLoader';

interface SyncEvent {
    type: 'step' | 'progress' | 'job_status';
    entity?: string;
    step?: string;
    percentage?: number;
    message?: string;
    status?: string;
    total?: number;
    synced?: number;
    failed?: number;
    timestamp: string;
}

const SyncJobItem = ({ job }: { job: any }) => {
    const [currentStatus, setCurrentStatus] = useState<any>(job);
    const [lastEvent, setLastEvent] = useState<SyncEvent | null>(null);

    useEffect(() => {
        if (job.status !== 'running') return;

        const eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/sync/stream/${job.id}`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'step') {
                    setLastEvent(data);
                } else if (data.type === 'progress') {
                    setCurrentStatus((prev: any) => ({ ...prev, progress_data: data }));
                } else if (data.type === 'job_status') {
                    setCurrentStatus((prev: any) => ({ ...prev, status: data.status }));
                    if (data.status === 'completed' || data.status === 'failed') {
                        eventSource.close();
                    }
                }
            } catch (e) {
                console.error("SSE Parse Error", e);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    }, [job.id]);

    const isRunning = currentStatus.status === 'running' || currentStatus.status === 'pending';
    const percentage = lastEvent?.percentage || 0;

    return (
        <Card size="small" className="mb-4 overflow-hidden border-zinc-100 shadow-sm" styles={{ body: { padding: 12 } }}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg">
                        {isRunning ? (
                            <InfinityLoader size="xs" variant="rotate" />
                        ) : (
                            <Activity className="w-4 h-4 text-zinc-400" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-zinc-900 leading-none">Sync Job</h4>
                        <span className="text-[10px] text-zinc-400 font-mono">{job.id.slice(0, 8)}...</span>
                    </div>
                </div>
                <Tag color={currentStatus.status === 'completed' ? 'green' : currentStatus.status === 'failed' ? 'red' : 'blue'} className="rounded-full border-0 font-bold uppercase text-[10px]">
                    {currentStatus.status}
                </Tag>
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1 leading-none">
                    <span>{lastEvent?.step || (isRunning ? 'Initializing...' : 'Idle')}</span>
                    <span>{Math.round(percentage)}%</span>
                </div>
                <Progress 
                    percent={percentage} 
                    showInfo={false} 
                    strokeColor={{ '0%': '#f47e42', '100%': '#dc7e42' }} 
                    trailColor="#f1f1f1"
                    status={isRunning ? 'active' : 'normal'}
                    size="small"
                />
            </div>

            {lastEvent?.message && (
                <div className="bg-zinc-50 p-2 rounded-lg border border-zinc-100 flex items-start gap-2 mb-2">
                    <Terminal className="w-3 h-3 text-zinc-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-zinc-600 leading-tight italic">{lastEvent.message}</p>
                </div>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-50">
                <div className="flex gap-4">
                     <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter">Synced</span>
                        <span className="text-xs font-bold text-zinc-700 leading-none">{currentStatus.progress_data?.synced || 0}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter">Failed</span>
                        <span className="text-xs font-bold text-red-500 leading-none">{currentStatus.progress_data?.failed || 0}</span>
                     </div>
                </div>
                <Button size="small" type="link" className="text-xs font-bold p-0 flex items-center gap-1 text-[#f47e42] hover:text-[#dc7e42]">
                    Details <ChevronRight className="w-3 h-3" />
                </Button>
            </div>
        </Card>
    );
};

export const SyncSideDrawer = ({ open, onClose }: { open: boolean, onClose: () => void }) => {
    const { data: activeJobs, refetch } = useQuery({
        queryKey: ['active-sync-jobs'],
        queryFn: async () => {
            const res = await apiClient.get('/sync/active');
            return res.data.jobs;
        },
        refetchInterval: 10000, // Background poll to find new jobs
        enabled: open
    });

    return (
        <Drawer
            title={
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-zinc-900 rounded-xl">
                        <InfinityLoader size="sm" variant="rotate" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-900 leading-none">Sync Center</h3>
                        <p className="text-[10px] text-zinc-400 mt-1 uppercase font-black">Real-time status</p>
                    </div>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={open}
            size="default"
            className="sync-center-drawer"
            styles={{
                header: { borderBottom: '1px solid #f1f1f1', padding: '24px 20px' },
                body: { padding: '20px', backgroundColor: '#fafafa' }
            }}
            closeIcon={<X className="w-5 h-5 text-zinc-400 hover:text-zinc-900 transition-colors" />}
        >
            {activeJobs && activeJobs.length > 0 ? (
                <div>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{activeJobs.length} ACTIVE JOBS</span>
                        <div className="flex gap-2">
                             <Button type="link" size="small" onClick={() => refetch()} className="text-[#f47e42] p-0 font-bold text-[10px]">RELOAD</Button>
                        </div>
                    </div>
                    {activeJobs.map((job: any) => (
                        <SyncJobItem key={job.id} job={job} />
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col justify-center items-center opacity-50 px-8 text-center">
                    <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE} 
                        description={
                            <div className="space-y-1">
                                <p className="text-zinc-500 font-bold">No active migrations</p>
                                <p className="text-xs text-zinc-400">Start a sync from the migration apps to see progress here.</p>
                            </div>
                        }
                    />
                </div>
            )}
        </Drawer>
    );
};
