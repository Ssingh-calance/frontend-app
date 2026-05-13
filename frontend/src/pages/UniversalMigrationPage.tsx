import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
    Play,
    Database,
    RefreshCw,
    Building2,
    Briefcase,
    LayoutGrid,
    List as ListIcon,
    ArrowRight,
    Search as SearchIcon,
    Clock,
    FileText,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import {
    Button,
    Card,
    Typography,
    message,
    Space,
    Tag,
    Alert,
    Tabs,
    Input,
    Checkbox,
    Empty,
    Progress
} from 'antd';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { AccessRequestBanner } from '../components/AccessRequestBanner';
import { useSyncQueueStore } from '../store/syncQueueStore';
import { useSyncProgress } from '../hooks/useSyncProgress';

const { Title, Text, Paragraph } = Typography;

export interface UniversalMigrationPageProps {
    entityType: string;
    permissionKey?: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    supportedLevels?: ('company' | 'project')[];
    sourceResourceId?: number | null;
}

interface SyncProgress {
    total: number;
    synced: number;
    failed: number;
    status: string;
    step?: string;
    percentage?: number;
    message?: string;
}

export const UniversalMigrationTab: React.FC<UniversalMigrationPageProps & { level: 'company' | 'project' }> = ({
    entityType, permissionKey, title, level, sourceResourceId
}) => {
    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const destCompanyId = sessionStorage.getItem('dest_company_id');

    const [srcProjId, setSrcProjId] = useState<number | null>(null);
    const [dstProjId, setDstProjId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const { jobs, addJob } = useSyncQueueStore();

    const { data: myPermissions } = useQuery({
        queryKey: ['my-permissions', destCompanyId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: destCompanyId }
            });
            return res.data as string[];
        },
        enabled: !!destCompanyId
    });

    const hasPermission = myPermissions?.includes((permissionKey || entityType).replace('_', '-'));

    // Fetch Source Items
    const { data: sourceItems, isLoading: loadingItems, refetch: refetchSource } = useQuery({
        queryKey: ['source-items', entityType, srcProjId, sourceCompanyId, level],
        queryFn: async () => {
            const endpoint = level === 'company' ? `/sync/company_source_items/${entityType}` : `/sync/source_items/${entityType}`;
            const params = level === 'company'
                ? { source_company_id: sourceCompanyId, dest_company_id: destCompanyId }
                : { source_project_id: srcProjId, source_company_id: sourceCompanyId, dest_company_id: destCompanyId, dest_project_id: dstProjId };

            const res = await apiClient.get(endpoint, { params });
            return res.data.items;
        },
        enabled: level === 'company' ? !!sourceCompanyId : (!!srcProjId && !!sourceCompanyId)
    });

    // Fetch Migrated Mappings
    const { data: mappings, refetch: refetchMappings } = useQuery({
        queryKey: ['mappings', entityType, dstProjId, level],
        queryFn: async () => {
            const endpoint = level === 'company' ? `/sync/company_mappings` : `/sync/mappings`;
            const params = level === 'company'
                ? { dest_company_id: destCompanyId, entity_type: entityType }
                : { dest_project_id: dstProjId, dest_company_id: destCompanyId, entity_type: entityType };

            const res = await apiClient.get(endpoint, { params });
            return res.data.mappings;
        },
        enabled: level === 'company' ? !!destCompanyId : !!dstProjId
    });

    // Fetch Destination Items for name-based matching
    const { data: destinationItems, isLoading: loadingDest } = useQuery({
        queryKey: ['destination-items', entityType, dstProjId, destCompanyId, level],
        queryFn: async () => {
            const endpoint = level === 'company' ? `/sync/company_destination_items/${entityType}` : `/sync/destination_items/${entityType}`;
            const params = level === 'company'
                ? { dest_company_id: destCompanyId }
                : { dest_project_id: dstProjId, dest_company_id: destCompanyId };

            const res = await apiClient.get(endpoint, { params });
            return res.data.items as Record<string, unknown>[];
        },
        enabled: level === 'company' ? !!destCompanyId : (!!dstProjId && !!destCompanyId)
    });

    // Auto-reconcile on load
    const { mutate: reconcile, isPending: isReconciling } = useMutation({
        mutationFn: async () => {
            const endpoint = level === 'company' ? `/sync/company_reconcile/${entityType}` : `/sync/reconcile/${entityType}`;
            const payload = level === 'company'
                ? { source_company_id: Number(sourceCompanyId), dest_company_id: Number(destCompanyId) }
                : { source_project_id: srcProjId, source_company_id: Number(sourceCompanyId), dest_project_id: dstProjId, dest_company_id: Number(destCompanyId) };
            
            await apiClient.post(endpoint, payload);
        },
        onSuccess: () => {
            refetchMappings();
        }
    });

    useEffect(() => {
        if (level === 'company' && sourceCompanyId && destCompanyId) {
            reconcile();
        } else if (level === 'project' && srcProjId && dstProjId) {
            reconcile();
        }
    }, [srcProjId, dstProjId, sourceCompanyId, destCompanyId, level, reconcile]);

    const handleMigrate = useCallback(async (singleId?: number, force?: boolean) => {
        const idsToMigrate = singleId ? [singleId] : Array.from(selectedIds);

        const prefix = entityType.substring(0, 4);
        for (const id of idsToMigrate) {
            const jobId = level === 'company'
                ? `${prefix}_c_s_${id}`
                : `${prefix}_s_${id}`;

            addJob(jobId, async () => {
                const endpoint = level === 'company' ? `/sync/migrate_company/${entityType}` : `/sync/migrate/${entityType}`;
                const payload = level === 'company'
                    ? {
                        source_company_id: Number(sourceCompanyId),
                        dest_company_id: Number(destCompanyId),
                        selected_ids: [id],
                        level: level,
                        force: force
                    }
                    : {
                        source_project_id: srcProjId,
                        source_company_id: Number(sourceCompanyId),
                        dest_project_id: dstProjId,
                        dest_company_id: Number(destCompanyId),
                        source_resource_id: sourceResourceId,
                        selected_ids: [id],
                        level: level,
                        force: force
                    };

                await apiClient.post(endpoint, payload);
                message.success(`Sync started for item ${id}`);
                refetchMappings();
            });
        }

        if (!singleId) setSelectedIds(new Set());
    }, [selectedIds, level, entityType, sourceCompanyId, destCompanyId, srcProjId, dstProjId, sourceResourceId, addJob, refetchMappings]);

    const syncingItemsCount = useMemo(() => {
        const prefix = entityType.substring(0, 4);
        return Object.values(jobs).filter(j =>
            (j?.id?.startsWith(`${prefix}_s_`) || j?.id?.startsWith(`${prefix}_c_s_`)) &&
            (j.status === 'running' || j.status === 'pending')
        ).length;
    }, [jobs, entityType]);

    const isRunning = syncingItemsCount > 0;

    const filteredItems = useMemo(() => {
        if (!sourceItems) return [];
        if (!searchQuery) return sourceItems;

        const q = searchQuery.toLowerCase();
        return sourceItems.filter((item: any) => {
            const title = (item.title || item.name || item.subject || item.number || item.description || "").toLowerCase();
            return title.includes(q);
        });
    }, [sourceItems, searchQuery]);

    const isDestMatched = (item: Record<string, unknown>) => {
        const itemName = (String(item.title || item.name || item.subject || item.number || item.description || "")).toLowerCase().trim();
        if (!itemName) return false;

        return destinationItems?.some((di: Record<string, unknown>) => {
            const diName = (String(di.title || di.name || di.subject || di.number || di.description || "")).toLowerCase().trim();
            return diName === itemName;
        });
    };

    const isSynced = (item: Record<string, unknown>) => {
        // Direct Mapping match
        if (mappings?.[String(item.id)]) return true;

        // Name-based match fallback
        return isDestMatched(item);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredItems.map((i: Record<string, unknown>) => Number(i.id))));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleIdSelection = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };


    return (
        <div className="flex flex-col gap-8 mt-6 w-full">
            <div className="space-y-6">
                {!hasPermission && (
                    <AccessRequestBanner
                        appSlug={entityType}
                        companyId={destCompanyId || ''}
                        title={`${title} Access Restricted`}
                        description={`You need '${title}' migration permissions to perform this operation.`}
                    />
                )}

                {level === 'project' && (
                    <GlobalProjectSelector
                        sourceCompanyId={sourceCompanyId!}
                        destCompanyId={destCompanyId!}
                        onSourceProjectChange={setSrcProjId}
                        onDestProjectChange={setDstProjId}
                    />
                )}

                {(level === 'company' || (srcProjId && dstProjId)) ? (
                    <Card
                        className="rounded-2xl shadow-xl overflow-hidden"
                        styles={{ body: { padding: 0 } }}
                    >
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-4">
                                <Checkbox
                                    onChange={e => handleSelectAll(e.target.checked)}
                                    checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                                    indeterminate={selectedIds.size > 0 && selectedIds.size < filteredItems.length}
                                />
                                <Input
                                    placeholder="Search items..."
                                    prefix={<SearchIcon className="w-4 h-4 text-zinc-400" />}
                                    allowClear
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-64 h-9"
                                />
                            </div>
                            <Space>
                                {selectedIds.size > 0 && (
                                    <Button
                                        type="primary"
                                        className="bg-orange-600 hover:bg-orange-700 border-none h-9"
                                        onClick={() => handleMigrate()}
                                        disabled={!hasPermission}
                                        icon={isRunning ? null : <Play className="w-3.5 h-3.5" />}
                                    >
                                        {isRunning ? `Syncing Queue (${syncingItemsCount})...` : `Migrate Selected ${title} (${selectedIds.size})`}
                                    </Button>
                                )}
                                <Button
                                    icon={loadingItems || loadingDest ? <InfinityLoader size="xs" variant="rotate" /> : <RefreshCw className="w-3 h-3" />}
                                    size="small"
                                    type="text"
                                    onClick={() => { refetchSource(); refetchMappings(); }}
                                />
                                <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`px-3 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                    >
                                        <ListIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-3 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </Space>
                        </div>

                        {/* Content Area */}
                        <div className="p-6">
                            {loadingItems || loadingDest ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <InfinityLoader size="lg" />
                                    <Text type="secondary">Fetching items from Procore...</Text>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <Empty description={`No ${title} items found.`} className="py-20" />
                            ) : viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {(filteredItems as Record<string, unknown>[]).map((item) => (
                                        <UniversalItem
                                            key={String(item.id)}
                                            item={item}
                                            viewMode="grid"
                                            selected={selectedIds.has(Number(item.id))}
                                            level={level}
                                            entityType={entityType}
                                            synced={!!isSynced(item)}
                                            onToggle={() => toggleIdSelection(Number(item.id))}
                                            onMigrate={() => handleMigrate(Number(item.id))}
                                            onResync={() => handleMigrate(Number(item.id), true)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(filteredItems as Record<string, unknown>[]).map((item) => (
                                        <UniversalItem
                                            key={String(item.id)}
                                            item={item}
                                            viewMode="list"
                                            selected={selectedIds.has(Number(item.id))}
                                            level={level}
                                            entityType={entityType}
                                            synced={!!isSynced(item)}
                                            onToggle={() => toggleIdSelection(Number(item.id))}
                                            onMigrate={() => handleMigrate(Number(item.id))}
                                            onResync={() => handleMigrate(Number(item.id), true)}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
                                <Text type="secondary" className="text-[11px] italic">
                                    {selectedIds.size} items selected for synchronization.
                                </Text>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="mt-8 bg-zinc-50 dark:bg-zinc-900/50 border-dashed border-zinc-300 dark:border-zinc-800 text-center py-20">
                        <Text type="secondary">Select projects to view available items.</Text>
                    </Card>
                )}


            </div>
        </div>
    );
};

export const UniversalMigrationPage: React.FC<UniversalMigrationPageProps> = (props) => {
    const { entityType, title, description, icon } = props;
    const levels = props.supportedLevels || ['project'];

    const items = levels.map(level => ({
        key: level,
        label: (
            <Space>
                {level === 'company' ? <Building2 className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                {level === 'company' ? 'Company Level' : 'Project Level'}
            </Space>
        ),
        children: <UniversalMigrationTab {...props} level={level as 'company' | 'project'} />
    }));

    return (
        <div className="p-8 max-w-full mx-auto anime-fade-in text-zinc-800 dark:text-zinc-200">
            <div className="relative mb-6 p-8 rounded-3xl bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-800 text-zinc-900 dark:text-white overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/10 backdrop-blur-md flex items-center justify-center border border-black/5 dark:border-white/20 shadow-inner">
                            {icon}
                        </div>
                        <div>
                            <Title level={2} className="!text-zinc-900 dark:!text-white !m-0 mb-1">{title} Sync</Title>
                            <Paragraph className="text-zinc-500 dark:text-zinc-400 !m-0 max-w-md">{description}</Paragraph>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                        <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 px-4 py-2 rounded-xl border border-black/5 dark:border-white/10">
                            <Database className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                            <span className="text-xs font-mono uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Entity: {entityType}</span>
                        </div>
                    </div>
                </div>
            </div>

            {levels.length > 1 ? (
                <div>
                    <Tabs
                        defaultActiveKey={levels[0]}
                        items={items}
                        size="large"
                        className="universal-tabs"
                    />
                </div>
            ) : (
                <UniversalMigrationTab {...props} level={levels[0] as 'company' | 'project'} />
            )}

            <style>{`
                .anime-fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .universal-tabs .ant-tabs-nav::before { display: none; }
                .universal-tabs .ant-tabs-tab { padding: 12px 24px; border-radius: 12px 12px 0 0; }
                
                html.dark .universal-tabs .ant-tabs-tab { 
                    color: #a1a1aa; 
                }
                html.dark .universal-tabs .ant-tabs-tab-active { 
                    background: transparent !important; 
                }
                html.dark .universal-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                    color: #ff8b3d !important;
                }
                
                /* Ensure Antd table matches dark theme perfectly when in dark mode */
                html.dark .procore-table .ant-table {
                    background: transparent;
                }
                html.dark .procore-table .ant-table-thead > tr > th {
                    background: #18181b !important;
                    color: #a1a1aa !important;
                    border-bottom: 1px solid #27272a;
                }
                html.dark .procore-table .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #27272a;
                }
                html.dark .procore-table .ant-table-tbody > tr:hover > td {
                    background: #27272a !important;
                }
            `}</style>
        </div>
    );
};

const UniversalItem = ({
    item,
    viewMode,
    selected,
    level,
    entityType,
    synced,
    onToggle,
    onMigrate,
    onResync
}: {
    item: Record<string, unknown>,
    viewMode: 'list' | 'grid',
    selected: boolean,
    level: 'company' | 'project',
    entityType: string,
    synced: boolean,
    onToggle: () => void,
    onMigrate: () => void,
    onResync: () => void
}) => {
    const prefix = entityType.substring(0, 4);
    const jobId = level === 'company'
        ? `${prefix}_c_s_${item.id}`
        : `${prefix}_s_${item.id}`;

    const { progress, status, error } = useSyncProgress(jobId);
    const isSyncing = status === 'running' || status === 'pending';
    const isPending = status === 'pending';
    const isCompleted = status === 'completed' || status === 'done';
    const isFailed = status === 'failed';

    // Use either the real-time completion or the baseline 'synced' state from parent
    const displaySynced = isCompleted || synced;

    const name = String(
        item.name ||
        item.title ||
        item.identifier ||
        (item.type as { name?: string })?.name ||
        item.subject ||
        item.number ||
        item.company_name ||
        item.description ||
        `Item #${item.id}`
    );

    const { jobs: queueJobs, removeJob } = useSyncQueueStore();

    if (isSyncing || isCompleted || isFailed) {
        return (
            <div className={`flex flex-col p-4 rounded-xl border transition-all mb-2 shadow-sm
                ${isSyncing ? 'bg-orange-50/20 dark:bg-orange-900/5 border-zinc-200 dark:border-zinc-800' :
                    isCompleted ? 'bg-green-50/30 dark:bg-green-900/5 border-green-100 dark:border-green-900/30' :
                        'bg-red-50/30 dark:bg-red-900/5 border-red-100 dark:border-red-900/30'}
            `}>
                <div className="flex items-center gap-4">
                    {/* Icon Box */}
                    <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shrink-0">
                        {isSyncing ? <InfinityLoader size="sm" variant="rotate" /> :
                            isCompleted ? <CheckCircle2 className="w-6 h-6 text-green-500" /> :
                                <AlertCircle className="w-6 h-6 text-red-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <Text strong className="text-sm dark:text-zinc-200 block truncate mb-1">
                                {name}
                            </Text>
                            {/* Action buttons — Cancel while active, Resync when done */}
                            {(isSyncing || isPending) && (
                                <Button
                                    type="link"
                                    size="small"
                                    className="text-zinc-400 hover:text-red-500 p-0 h-auto text-xs"
                                    onClick={(e) => { e.stopPropagation(); removeJob(jobId); }}
                                >
                                    Cancel
                                </Button>
                            )}
                            {(isCompleted || isFailed) && (
                                <Button
                                    type="link"
                                    size="small"
                                    className="text-zinc-400 hover:text-orange-500 p-0 h-auto text-xs flex items-center gap-1"
                                    onClick={(e) => { e.stopPropagation(); removeJob(jobId); onResync(); }}
                                >
                                    <RefreshCw className="w-3 h-3" /> Resync
                                </Button>
                            )}
                        </div>

                        {/* Progress Section */}
                        <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-orange-500'}`}
                                    style={{ width: `${isCompleted ? 100 : progress}%` }}
                                />
                            </div>
                            <span className={`text-[11px] font-bold ${
                                isCompleted ? 'text-green-600 dark:text-green-400' :
                                isFailed ? 'text-red-600 dark:text-red-400' :
                                'text-zinc-900 dark:text-zinc-100'
                            }`} title={error || ''}>
                                {isPending ? 'Waiting...' :
                                    isCompleted ? 'Synced ✓' :
                                        isFailed ? `Failed: ${error || 'Unknown error'}` : `Syncing... ${Math.round(progress)}%`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer group mb-2
                ${selected ? 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
            `}
            onClick={onToggle}
        >
            <div onClick={e => e.stopPropagation()}>
                <Checkbox checked={selected} onChange={onToggle} />
            </div>
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <Text strong className="text-sm dark:text-zinc-200 truncate block">{String(name)}</Text>
                <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-zinc-400">ID: {String(item.id)}</span>
                    {item.updated_at ? (
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(item.updated_at as string).toLocaleDateString()}
                        </span>
                    ) : null}
                </div>
            </div>
            {synced && !isSyncing && (
                <Tag color="success" className="m-0 text-[10px] flex items-center gap-1 min-w-[70px] justify-center">
                    <CheckCircle2 size={10} /> Synced
                </Tag>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2" onClick={e => e.stopPropagation()}>
                {synced && (
                    <Button
                        size="small"
                        type="link"
                        className="text-[12px] h-8 px-2 flex items-center gap-1 text-zinc-500 hover:text-blue-500"
                        icon={<RefreshCw className="w-3 h-3" />}
                        onClick={onResync}
                    >
                        Resync
                    </Button>
                )}
                {!synced && (
                    <Button
                        size="small"
                        type="primary"
                        className="bg-orange-500 hover:bg-orange-600"
                        onClick={onMigrate}
                    >
                        Sync
                    </Button>
                )}
            </div>
        </div>
    );
};
