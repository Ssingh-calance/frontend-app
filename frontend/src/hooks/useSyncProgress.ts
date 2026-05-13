import { useEffect, useState } from 'react';
import { useSyncQueueStore } from '../store/syncQueueStore';

/**
 * Hook to stream sync progress via SSE.
 * SSE drives the authoritative status — 'completed'/'failed' are set here, not from POST return.
 */
export const useSyncProgress = (jobId: string | null) => {
    const { jobs, updateJobProgress, updateJobStatus } = useSyncQueueStore();
    const jobInfo = jobId ? jobs[jobId] : undefined;
    
    const [localPercentage, setLocalPercentage] = useState(0);

    useEffect(() => {
        if (!jobId || !jobInfo) return;

        // Only open SSE when the backend job is running
        if (jobInfo.status === 'running') {
            const apiBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const source = new EventSource(`${apiBaseURL}/api/v1/sync/stream/${jobId}`);

            source.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    
                    if (data.type === 'step' && data.percentage !== undefined) {
                        setLocalPercentage(data.percentage);
                        updateJobProgress(jobId, data.percentage);
                    }
                    
                    if (data.type === 'job_status') {
                        if (data.status === 'completed' || data.status === 'done') {
                            setLocalPercentage(100);
                            updateJobProgress(jobId, 100);
                            updateJobStatus(jobId, 'completed');
                            source.close();
                        } else if (data.status === 'failed') {
                            updateJobStatus(jobId, 'failed', data.message);
                            source.close();
                        }
                    }
                } catch (err) {
                    console.error('Failed to parse SSE data', err);
                }
            };

            source.onerror = () => {
                source.close();
            };

            return () => {
                source.close();
            };
        } else if (jobInfo.status === 'completed') {
            setLocalPercentage(100);
        } else if (jobInfo.status === 'pending') {
            setLocalPercentage(0);
        }
        
    }, [jobId, jobInfo?.status, updateJobProgress, updateJobStatus]);

    return {
        progress: jobInfo?.status === 'completed' ? 100 : localPercentage,
        percentage: jobInfo?.status === 'completed' ? 100 : localPercentage,
        status: jobInfo?.status || 'idle',
        isWaiting: jobInfo?.status === 'pending',
        isRunning: jobInfo?.status === 'running',
        isCompleted: jobInfo?.status === 'completed',
        isFailed: jobInfo?.status === 'failed',
        error: jobInfo?.error
    };
};
