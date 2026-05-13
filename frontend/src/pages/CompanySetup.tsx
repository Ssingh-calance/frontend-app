import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Building2, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import { useAuthStore } from '../store/authStore';
import { message, Select, Button, Tooltip } from 'antd';

export const CompanySetup = () => {
    const navigate = useNavigate();
    const { userEmail, userName, companyId: sessionCompanyId } = useAuthStore();
    
    const [sourceCompanyId, setSourceCompanyId] = useState(sessionStorage.getItem('source_company_id') || '');
    const [destCompanyId] = useState(sessionStorage.getItem('dest_company_id') || sessionCompanyId || '');
    
    const [sourceVerified, setSourceVerified] = useState(!!sessionStorage.getItem('source_company_name'));
    const [destVerified, setDestVerified] = useState(!!sessionStorage.getItem('dest_company_name'));
    const [sourceName, setSourceName] = useState(sessionStorage.getItem('source_company_name') || '');
    const [destName, setDestName] = useState(sessionStorage.getItem('dest_company_name') || '');
    const [sourceLogo, setSourceLogo] = useState(sessionStorage.getItem('source_company_logo') || '');
    const [destLogo, setDestLogo] = useState(sessionStorage.getItem('dest_company_logo') || '');

    // Fetch common available companies
    const { data, isLoading: loadingCompanies, refetch, isRefetching } = useQuery({
        queryKey: ['available-companies', destCompanyId],
        queryFn: async () => {
            if (!destCompanyId) return { companies: [], dest_company: null };
            const res = await apiClient.get('/data/available-companies', {
                params: { dest_company_id: parseInt(destCompanyId, 10) }
            });
            return res.data;
        },
        enabled: !!destCompanyId,
    });

    const availableCompanies = data?.companies as { id: number, name: string, logo_url?: string }[] | undefined;
    const destCompanyDetails = data?.dest_company as { id: number, name: string, logo_url?: string } | null;

    useEffect(() => {
        if (destCompanyDetails && !destVerified) {
            setDestVerified(true);
            setDestName(destCompanyDetails.name);
            setDestLogo(destCompanyDetails.logo_url || '');
        }
    }, [destCompanyDetails, destVerified]);

    const handleSourceChange = (value: number) => {
        const comp = availableCompanies?.find(c => c.id === value);
        if (comp) {
            setSourceCompanyId(String(comp.id));
            setSourceName(comp.name);
            setSourceLogo(comp.logo_url || '');
            setSourceVerified(true);
        }
    };

    const handleContinue = () => {
        if (sourceCompanyId === destCompanyId) {
            message.error("Source and Destination Company IDs cannot be the same.");
            return;
        }

        if (sourceVerified && destVerified) {
            sessionStorage.setItem('source_company_id', sourceCompanyId);
            sessionStorage.setItem('source_company_name', sourceName);
            if (sourceLogo) sessionStorage.setItem('source_company_logo', sourceLogo);
            else sessionStorage.removeItem('source_company_logo');
            
            sessionStorage.setItem('dest_company_id', destCompanyId);
            sessionStorage.setItem('dest_company_name', destName);
            if (destLogo) sessionStorage.setItem('dest_company_logo', destLogo);
            else sessionStorage.removeItem('dest_company_logo');
            
            navigate('/dashboard');
        }
    };

    return (
        <div className="max-w-2xl mx-auto mt-16 p-10 bg-white rounded-2xl shadow-xl border border-zinc-200">
            <div className="flex flex-col items-center mb-10 text-center">
                <div className="w-20 h-20 bg-orange-50 text-[#f47e42] rounded-3xl flex items-center justify-center mb-6 border border-orange-100 shadow-inner">
                    <Building2 className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">Company Configuration</h2>
                <p className="text-zinc-500 mt-3 text-lg">Select your source company and confirm destination.</p>
                <div className="mt-2 px-3 py-1 bg-zinc-100 rounded-full text-xs font-medium text-zinc-600 border border-zinc-200">
                    Logged in as: {userName || userEmail}
                </div>
            </div>

            <div className="space-y-8">
                {/* Source Company Section */}
                <div className="space-y-3">
                    <div className={`p-6 rounded-xl border-2 transition-all ${sourceVerified ? 'border-green-500 bg-green-50/30' : 'border-zinc-100 bg-zinc-50/50'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-zinc-700">Source Company</label>
                            <Tooltip title="Refresh available companies">
                                <Button 
                                    type="text" 
                                    size="small" 
                                    icon={isRefetching ? <InfinityLoader size="xs" variant="rotate" /> : <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />} 
                                    onClick={() => refetch()}
                                />
                            </Tooltip>
                        </div>
                        <div className="flex gap-3">
                            <Select
                                showSearch
                                className="w-full h-12"
                                placeholder="Select a Source Company"
                                loading={loadingCompanies || isRefetching}
                                value={sourceCompanyId ? parseInt(sourceCompanyId, 10) : undefined}
                                onChange={handleSourceChange}
                                filterOption={(input, option) =>
                                    (option?.label as unknown as string ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={availableCompanies?.map(c => ({
                                    value: c.id,
                                    label: c.name,
                                    logo: c.logo_url
                                }))}
                                optionRender={(opt) => (
                                    <div className="flex items-center gap-2">
                                        {opt.data.logo ? (
                                            <img src={opt.data.logo} alt="" className="w-6 h-6 rounded object-contain border border-zinc-200" />
                                        ) : (
                                            <div className="w-6 h-6 rounded border border-zinc-200 flex items-center justify-center bg-zinc-100 shrink-0">
                                                <Building2 className="w-3 h-3 text-zinc-400" />
                                            </div>
                                        )}
                                        <span>{opt.data.label}</span>
                                    </div>
                                )}
                            />
                            {sourceVerified && (
                                <div className="flex items-center gap-2 text-green-600 font-bold px-4 py-3 bg-white rounded-xl border border-green-200 shadow-sm shrink-0">
                                    <CheckCircle2 className="w-5 h-5" /> Selected
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Destination Company Section */}
                <div className="space-y-3">
                    <div className={`p-6 rounded-xl border-2 transition-all ${destVerified ? 'border-green-500 bg-green-50/30' : 'border-zinc-100 bg-zinc-50/50'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-zinc-700">Destination Company ID</label>
                        </div>
                        <div className="flex gap-3">
                            <input
                                type="number"
                                className="flex-1 px-4 py-3 border border-zinc-300 rounded-xl bg-zinc-100 text-zinc-500 cursor-not-allowed outline-none shadow-sm"
                                placeholder="Target Company ID"
                                value={destCompanyId}
                                readOnly
                            />
                            {destVerified && (
                                <div className="flex items-center gap-2 text-green-600 font-bold px-4 py-3 bg-white rounded-xl border border-green-200 shadow-sm shrink-0">
                                    <CheckCircle2 className="w-5 h-5" /> Verified
                                </div>
                            )}
                        </div>
                    </div>
                    {destVerified && destName && (
                         <div className="flex items-center gap-2 px-2 py-1">
                            {destLogo ? (
                                <img src={destLogo} alt="" className="w-6 h-6 rounded object-contain border border-zinc-200" />
                            ) : (
                                <Building2 className="w-5 h-5 text-zinc-400" />
                            )}
                            <span className="text-sm text-zinc-700 font-semibold">{destName}</span>
                         </div>
                    )}
                </div>

                <button
                    onClick={handleContinue}
                    disabled={!sourceVerified || !destVerified}
                    className="w-full bg-[#f47e42] hover:bg-[#dc7e42] text-white font-bold py-4 px-4 rounded-2xl transition-all flex items-center justify-center gap-2 outline-none focus:ring-4 focus:ring-orange-200 shadow-xl shadow-orange-500/20 disabled:opacity-30 disabled:grayscale disabled:shadow-none mt-4 text-xl"
                >
                    Initialize Mapping <ArrowRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};
