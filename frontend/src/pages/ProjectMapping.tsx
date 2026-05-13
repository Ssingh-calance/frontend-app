import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { ArrowRight, DatabaseBackup, Loader2, Search } from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import { AccessRequestBanner } from '../components/AccessRequestBanner';

interface Project {
    id: number;
    name: string;
    display_name: string;
    active: boolean;
}

interface Template {
    id: number;
    name: string;
}

interface SyncPayload {
    source_project_id: number;
    source_company_id: number;
    dest_company_id: number;
    dest_project_id?: number;
    create_from_source?: boolean;
    source_template_id?: number;
}

interface SyncStartResponse {
    job_id: string | number;
}

/*
## Project Mapping & Migration Refinements

Optimized the workflow for creating destination projects and initiating migrations:
- **Improved Layout**: Redesigned the project mapping grid (4-1-7 ratio) to ensure all controls, including the mapping selectors, are visible without horizontal scrolling.
- **Dual-Dropdown Mapping**: Replaced the combined selector with two distinct dropdowns per project:
    - **Existing Project**: Select a pre-existing destination project.
    - **Create New (Template)**: Select a **Source Company** template to create a new mirrored project.
- **Mutual Exclusion**: Selecting an option in one dropdown automatically disables the other, preventing conflicting mapping intents while allowing for easy clearing/switching.
- **Deferred Execution**: All "heavy" operations—including template migration to the destination company and project creation—are deferred until the **"Initiate Migration"** button is clicked.
- **Integrated Sync Flow**: The backend orchestrates the template-to-project-to-sync pipeline in a single automated flow when migration starts.
- **Session Persistence**: Re-confirmed that the Source Company ID persists through navigation for a seamless experience.
*/

interface MappingStatus {
    type: 'existing' | 'new';
    id?: number;
    sourceTemplateId?: number;
    createFromSource?: boolean;
}

export const ProjectMapping = () => {
    const navigate = useNavigate();
    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const sourceCompanyName = sessionStorage.getItem('source_company_name');
    const destCompanyId = sessionStorage.getItem('dest_company_id');
    const destCompanyName = sessionStorage.getItem('dest_company_name');

    // Mappings: SourceProjectID -> MappingStatus
    const [projectMap, setProjectMap] = useState<Record<number, MappingStatus>>({});
    const [searchQuery, setSearchQuery] = useState('');

    const { data: sourceProjects, isLoading: loadingSource } = useQuery<Project[]>({
        queryKey: ['sourceProjects', sourceCompanyId],
        queryFn: async () => {
            const res = await apiClient.post('/data/projects/source', {
                company_id: parseInt(sourceCompanyId || '0'),
                dest_company_id: parseInt(destCompanyId || '0')
            });
            return res.data.projects as Project[];
        },
        enabled: !!sourceCompanyId
    });

    const { data: destProjects, isLoading: loadingDest } = useQuery<Project[]>({
        queryKey: ['destProjects', destCompanyId],
        queryFn: async () => {
            const res = await apiClient.post('/data/projects/destination', {
                company_id: parseInt(destCompanyId || '0'),
                dest_company_id: parseInt(destCompanyId || '0')
            });
            return res.data.projects as Project[];
        },
        enabled: !!destCompanyId
    });

    const { data: sourceTemplates } = useQuery<Template[]>({
        queryKey: ['sourceTemplates', sourceCompanyId],
        queryFn: async () => {
            const res = await apiClient.get(`/data/projects/templates?company_id=${sourceCompanyId}&dest_company_id=${destCompanyId}`);
            return res.data.templates as Template[];
        },
        enabled: !!sourceCompanyId
    });

    const { data: myPermissions } = useQuery<string[]>({
        queryKey: ['my-permissions', destCompanyId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: destCompanyId }
            });
            return res.data as string[];
        },
        enabled: !!destCompanyId
    });

    const hasProjectAdmin = myPermissions?.includes('project-admin');

    const filteredSourceProjects = useMemo(() => {
        if (!sourceProjects) return [];
        if (!searchQuery) return sourceProjects;
        const q = searchQuery.toLowerCase();
        return sourceProjects.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.display_name.toLowerCase().includes(q)
        );
    }, [sourceProjects, searchQuery]);

    const handleMappingChange = (sourceId: number, value: string) => {
        setProjectMap(prev => {
            const nextMap = { ...prev };
            if (value === '') {
                delete nextMap[sourceId];
            } else if (value === 'new-source') {
                nextMap[sourceId] = { type: 'new', createFromSource: true };
            } else if (value.startsWith('new-')) {
                const templateId = parseInt(value.replace('new-', ''));
                nextMap[sourceId] = { type: 'new', sourceTemplateId: templateId };
            } else {
                nextMap[sourceId] = { type: 'existing', id: parseInt(value) };
            }
            return nextMap;
        });
    };

    const startSync = useMutation<SyncStartResponse, unknown, SyncPayload>({
        mutationFn: async (payload: SyncPayload) => {
            const res = await apiClient.post('/sync/start-sync', payload);
            return res.data as SyncStartResponse;
        },
        onSuccess: (data: SyncStartResponse) => {
            navigate(`/sync-status?job_id=${data.job_id}`);
        }
    });

    const handleInitiateSync = async () => {
        // Find first selected mapping
        const sourceIdStr = Object.keys(projectMap)[0];
        if (!sourceIdStr) return;

        const sourceId = parseInt(sourceIdStr);
        const mapping = projectMap[sourceId];

        const payload: SyncPayload = {
            source_project_id: sourceId,
            source_company_id: parseInt(sourceCompanyId || '0'),
            dest_company_id: parseInt(destCompanyId || '0'),
        };

        if (mapping.type === 'existing') {
            payload.dest_project_id = mapping.id;
        } else if (mapping.createFromSource) {
            payload.create_from_source = true;
        } else {
            payload.source_template_id = mapping.sourceTemplateId;
        }

        startSync.mutate(payload);
    };

    const mappedDestinationIds = new Set(
        Object.values(projectMap)
            .filter(m => m.type === 'existing')
            .map(m => m.id)
    );

    const isLoading = loadingSource || loadingDest;

    if (isLoading) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#f47e42] animate-spin" />
                <p className="text-zinc-500 font-medium">Loading Procore Project Repositories...</p>
            </div>
        );
    }

    return (
        <div className="mt-6 flex flex-col gap-6 max-w-6xl mx-auto px-4">
            {!hasProjectAdmin && (
                <AccessRequestBanner
                    appSlug="project-admin"
                    companyId={destCompanyId || ''}
                    title="Project Mapping Access Restricted"
                    description="You need 'Project Admin' migration permissions to create or update global project mappings."
                />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Project Mapping</h2>
                    <p className="text-zinc-500 mt-1">Bind your source repository to a target destination project.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all w-64"
                        />
                    </div>
                    <button
                        onClick={handleInitiateSync}
                        disabled={Object.keys(projectMap).length === 0 || startSync.isPending || !hasProjectAdmin}
                        className="bg-[#f47e42] hover:bg-[#dc7e42] text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-3 disabled:opacity-30 shadow-lg shadow-orange-500/20 whitespace-nowrap min-w-[200px] justify-center"
                    >
                        {startSync.isPending ? (
                            <div className="flex items-center gap-2">
                                <InfinityLoader size="xs" variant="rotate" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <><DatabaseBackup className="w-5 h-5" /> Initiate Migration</>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 bg-zinc-900 p-5 font-bold text-white text-sm uppercase tracking-widest items-center">
                    <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse shrink-0" />
                        <span className="truncate" title={sourceCompanyName || 'Source'}>
                            {sourceCompanyName || 'Source Repository'}
                        </span>
                    </div>
                    <div className="col-span-1 flex justify-center text-orange-500">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                    <div className="col-span-7 flex items-center gap-3 overflow-hidden">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shrink-0" />
                        <span className="truncate" title={destCompanyName || 'Destination'}>
                            {destCompanyName || 'Target Destination'}
                        </span>
                    </div>
                </div>

                <div className="divide-y divide-zinc-100 max-h-[550px] overflow-y-auto">
                    {filteredSourceProjects?.map(source => {
                        const currentMapping = projectMap[source.id];
                        return (
                            <div key={source.id} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-zinc-50/80 transition-all border-l-4 border-transparent hover:border-[#f47e42]">
                                <div className="col-span-4 flex flex-col min-w-0">
                                    <span className="font-bold text-zinc-900 text-base leading-tight truncate" title={source.display_name}>{source.display_name}</span>
                                    <span className="text-[10px] font-mono text-zinc-400 mt-1 truncate">#SOURCE_{source.id}</span>
                                </div>

                                <div className="col-span-1 flex justify-center">
                                    <div className={`h-1 w-6 rounded-full ${currentMapping ? 'bg-orange-500 shadow-sm' : 'bg-zinc-200'}`} />
                                </div>

                                <div className="col-span-7 flex items-center gap-3">
                                    <div className="flex-1 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Existing Project</label>
                                        <select
                                            value={currentMapping?.type === 'existing' ? currentMapping.id?.toString() : ''}
                                            disabled={currentMapping?.type === 'new'}
                                            onChange={(e) => handleMappingChange(source.id, e.target.value)}
                                            className={`w-full bg-white border-2 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all ${currentMapping?.type === 'existing' ? 'border-orange-200 text-zinc-900' : 'border-zinc-100 text-zinc-400'} disabled:opacity-20`}
                                        >
                                            <option value="">-- No Selection --</option>
                                            {destProjects?.map(dest => {
                                                const isAlreadyMapped = mappedDestinationIds.has(dest.id) && currentMapping?.id !== dest.id;
                                                return (
                                                    <option key={dest.id} value={dest.id} disabled={isAlreadyMapped}>
                                                        {dest.display_name} {isAlreadyMapped ? '🔒' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="h-8 w-px bg-zinc-100 shrink-0 self-end mb-1" />

                                    <div className="flex-1 flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-[#f47e42] uppercase tracking-tight">Create New Project (Seeding Template)</label>
                                        <select
                                            value={currentMapping?.type === 'new' ? (currentMapping.createFromSource ? 'new-source' : `new-${currentMapping.sourceTemplateId}`) : ''}
                                            disabled={currentMapping?.type === 'existing'}
                                            onChange={(e) => handleMappingChange(source.id, e.target.value)}
                                            className={`w-full bg-white border-2 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all ${currentMapping?.type === 'new' ? 'border-orange-200 text-zinc-900' : 'border-zinc-100 text-zinc-400'} disabled:opacity-20`}
                                        >
                                            <option value="">-- No Template --</option>
                                            <option value="new-source" className="font-bold text-orange-600">-- From Source Project --</option>
                                            {sourceTemplates?.map(t => (
                                                <option key={t.id} value={`new-${t.id}`}>
                                                    {t.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {(!sourceProjects || sourceProjects.length === 0) && (
                        <div className="p-16 text-center text-zinc-400 flex flex-col items-center gap-2">
                            <DatabaseBackup className="w-12 h-12 opacity-20" />
                            <p className="text-lg font-medium">No projects found in this repository.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 bg-zinc-100/50 rounded-xl border border-zinc-200 text-zinc-500 text-xs text-center italic">
                Note: Destination projects will be created automatically if selecting from templates.
            </div>
        </div>
    );
};