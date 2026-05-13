import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { InfinityLoader } from './InfinityLoader';

export const GlobalLoader = () => {
    const isFetching = useIsFetching({
        predicate: (query) => 
            query.state.fetchStatus === 'fetching' && 
            query.queryKey[0] !== 'active-sync-jobs'
    });
    const isMutating = useIsMutating();

    const isLoading = isFetching > 0 || isMutating > 0;

    if (!isLoading) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none flex items-center gap-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-bottom-5 duration-300">
            <InfinityLoader size="sm" />
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">System Processing</span>
                <span className="text-[9px] text-zinc-500">Communicating with Procore...</span>
            </div>
        </div>
    );
};
