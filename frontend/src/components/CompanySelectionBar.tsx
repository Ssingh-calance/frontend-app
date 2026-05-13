import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { CheckCircle2, AlertCircle, Loader2, ArrowRightLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const CompanySelectionBar = () => {
    const { companyId: sessionCompanyId, setContext } = useAuthStore();
    
    const [sourceId, setSourceId] = useState(sessionStorage.getItem('source_company_id') || '');
    const [destId, setDestId] = useState(sessionCompanyId || sessionStorage.getItem('dest_company_id') || '');
    
    const [sourceName, setSourceName] = useState(sessionStorage.getItem('source_company_name') || '');
    const [destName, setDestName] = useState(sessionStorage.getItem('dest_company_name') || '');
    
    const [sourceVerified, setSourceVerified] = useState(!!sessionStorage.getItem('source_company_name'));
    const [destVerified, setDestVerified] = useState(!!sessionStorage.getItem('dest_company_name'));

    const validateSource = useMutation({
        mutationFn: async (cid: number) => {
            const res = await apiClient.post('/data/validate-user', { company_id: cid });
            return res.data;
        },
        onSuccess: (data) => {
            setSourceVerified(true);
            setSourceName(data.company_name);
            sessionStorage.setItem('source_company_id', sourceId);
            sessionStorage.setItem('source_company_name', data.company_name);
        },
        onError: () => setSourceVerified(false)
    });

    const validateDest = useMutation({
        mutationFn: async (cid: number) => {
            const res = await apiClient.post('/data/validate-user', { company_id: cid });
            return res.data;
        },
        onSuccess: (data) => {
            setDestVerified(true);
            setDestName(data.company_name);
            sessionStorage.setItem('dest_company_id', destId);
            sessionStorage.setItem('dest_company_name', data.company_name);
            // Sync with auth store
            setContext(destId, data.company_name, sessionStorage.getItem('OrganizationId'));
        },
        onError: () => setDestVerified(false)
    });

    const handleVerify = () => {
        if (sourceId) validateSource.mutate(parseInt(sourceId, 10));
        if (destId) validateDest.mutate(parseInt(destId, 10));
    };

    return (
        <div className="bg-zinc-900 text-white px-6 py-3 border-b border-zinc-800 flex items-center justify-between gap-6 shadow-2xl">
            <div className="flex items-center gap-8 flex-1">
                {/* Source Side */}
                <div className="flex items-center gap-3 bg-zinc-800/50 p-1.5 px-3 rounded-xl border border-zinc-700/50 flex-1 max-w-sm">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest shrink-0">Source</span>
                    <input
                        type="number"
                        className="bg-transparent border-none outline-none text-sm w-24 placeholder:text-zinc-600 font-mono"
                        placeholder="Company ID"
                        value={sourceId}
                        onChange={(e) => { setSourceId(e.target.value); setSourceVerified(false); }}
                    />
                    {sourceVerified ? (
                        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold truncate">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="truncate">{sourceName}</span>
                        </div>
                    ) : (
                        validateSource.isError && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                </div>

                <ArrowRightLeft className="w-4 h-4 text-zinc-600 shrink-0" />

                {/* Destination Side */}
                <div className="flex items-center gap-3 bg-zinc-800/50 p-1.5 px-3 rounded-xl border border-zinc-700/50 flex-1 max-w-sm">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest shrink-0">Target</span>
                    <input
                        type="number"
                        className="bg-transparent border-none outline-none text-sm w-24 placeholder:text-zinc-600 font-mono"
                        placeholder="Company ID"
                        value={destId}
                        onChange={(e) => { setDestId(e.target.value); setDestVerified(false); }}
                    />
                    {destVerified ? (
                        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold truncate">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="truncate">{destName}</span>
                        </div>
                    ) : (
                        validateDest.isError && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                </div>

                <button
                    onClick={handleVerify}
                    disabled={validateSource.isPending || validateDest.isPending || (!sourceId && !destId)}
                    className="bg-white text-zinc-900 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 shrink-0 uppercase tracking-wider"
                >
                    {(validateSource.isPending || validateDest.isPending) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : 'Verify Access'}
                </button>
            </div>

            <div className="flex items-center gap-3 border-l border-zinc-800 pl-6 shrink-0">
                <div className={`w-2 h-2 rounded-full ${sourceVerified && destVerified ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'} transition-all`} />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {sourceVerified && destVerified ? 'System Ready' : 'Access Required'}
                </span>
            </div>
        </div>
    );
};
