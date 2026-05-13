import { create } from 'zustand';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface QueuedJob {
    jobId: string;
    parentId?: string; // e.g., Album ID for roll-ups
    status: JobStatus;
    percentage: number;
    actionFn: () => Promise<any>;
    error?: string;
    addedAt: number;
}

interface SyncQueueState {
    jobs: Record<string, QueuedJob>;
    maxConcurrent: number;
    
    // Actions
    addJob: (jobId: string, actionFn: () => Promise<any>, parentId?: string) => void;
    removeJob: (jobId: string) => void;
    updateJobProgress: (jobId: string, percentage: number) => void;
    updateJobStatus: (jobId: string, status: JobStatus, message?: string) => void;
    clearCompleted: () => void;
    
    // Internal Queue Manager
    _processQueue: () => void;
}

export const useSyncQueueStore = create<SyncQueueState>((set, get) => ({
    jobs: {},
    maxConcurrent: 4,

    addJob: (jobId, actionFn, parentId) => {
        set((state) => {
            // If job already tracking and not failed/completed, ignore (prevent double entry)
            const existing = state.jobs[jobId];
            if (existing && existing.status !== 'failed' && existing.status !== 'completed') {
                return state;
            }
            return {
                jobs: {
                    ...state.jobs,
                    [jobId]: {
                        jobId,
                        parentId,
                        status: 'pending',
                        percentage: 0,
                        actionFn,
                        addedAt: Date.now()
                    }
                }
            };
        });
        
        // Trigger queue processor
        get()._processQueue();
    },

    removeJob: (jobId) => {
        set((state) => {
            const next = { ...state.jobs };
            delete next[jobId];
            return { jobs: next };
        });
    },

    updateJobProgress: (jobId, percentage) => {
        set((state) => {
            const job = state.jobs[jobId];
            if (!job) return state;
            return {
                jobs: {
                    ...state.jobs,
                    [jobId]: { ...job, percentage }
                }
            };
        });
    },

    updateJobStatus: (jobId, status, message) => {
        set((state) => {
            const job = state.jobs[jobId];
            if (!job) return state;
            return {
                jobs: {
                    ...state.jobs,
                    [jobId]: {
                        ...job,
                        status,
                        percentage: status === 'completed' ? 100 : job.percentage,
                        error: status === 'failed' && message ? message : job.error
                    }
                }
            };
        });
    },

    clearCompleted: () => {
        set((state) => {
            const next = { ...state.jobs };
            for (const id in next) {
                if (next[id].status === 'completed' || next[id].status === 'failed') {
                    delete next[id];
                }
            }
            return { jobs: next };
        });
    },

    _processQueue: async () => {
        const state = get();
        
        const allJobs = Object.values(state.jobs);
        const runningJobs = allJobs.filter(j => j.status === 'running');
        const pendingJobs = allJobs.filter(j => j.status === 'pending').sort((a, b) => a.addedAt - b.addedAt);

        // Calculate available slots
        const availableSlots = state.maxConcurrent - runningJobs.length;
        
        if (availableSlots <= 0 || pendingJobs.length === 0) {
            return; // At capacity or nothing to do
        }

        // Pick the next batch
        const jobsToStart = pendingJobs.slice(0, availableSlots);

        // Mark them as running immediately to prevent re-picking
        set((st) => {
            const nextJobs = { ...st.jobs };
            jobsToStart.forEach(j => {
                nextJobs[j.jobId] = { ...j, status: 'running' };
            });
            return { jobs: nextJobs };
        });

        // Execute them
        jobsToStart.forEach(async (job) => {
            try {
                await job.actionFn();
                // POST returned successfully — job is now running on the backend.
                // Keep status as 'running'; the SSE stream will drive 'completed'/'failed'
                // via updateJobStatus called from useSyncProgress.
                // (No-op here — status is already 'running')
            } catch (err: any) {
                // Actual POST/network failure — mark failed immediately
                set((st) => ({
                    jobs: { ...st.jobs, [job.jobId]: { ...st.jobs[job.jobId], status: 'failed', error: err.message || 'Error occurred' } }
                }));
            } finally {
                // Once done or failed, try to process the next set
                get()._processQueue();
            }
        });
    }
}));
