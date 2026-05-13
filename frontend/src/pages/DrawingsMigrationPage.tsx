import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
    ChevronRight,
    ChevronDown,
    FolderOpen,
    Folder,
    FileImage,
    CheckCircle2,
    RefreshCw,
    Play,
    Search as SearchIcon,
    AlertCircle
} from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import {
    Button,
    Card,
    Typography,
    message,
    Input,
    Checkbox,
    Empty,
    Tag,
    Space
} from 'antd';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { useSyncQueueStore } from '../store/syncQueueStore';
import { useSyncProgress } from '../hooks/useSyncProgress';
import { AccessRequestBanner } from '../components/AccessRequestBanner';

const { Text, Title, Paragraph } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Drawing {
    id: number;
    name: string;
    number?: string;
    title?: string;
    url?: string;
    drawing_area_id?: number;
    drawing_discipline_id?: number;
    current_revision?: {
        id: number;
        revision_number: string;
        updated_at: string;
        pdf_url?: string;
    };
}

interface DrawingDiscipline {
    id: number;
    name: string;
    drawings: Drawing[];
}

interface DrawingArea {
    id: number;
    name: string;
    disciplines: DrawingDiscipline[];
}

// ─── Drawing Row ──────────────────────────────────────────────────────────────
const DrawingRow = ({
    drawing,
    synced,
    selected,
    level,
    onToggle,
    srcProjId,
    dstProjId,
    sourceCompanyId,
    destCompanyId,
    onMigrated,
}: {
    drawing: Drawing;
    synced: boolean;
    selected: boolean;
    level: 'company' | 'project';
    onToggle: () => void;
    srcProjId: number | null;
    dstProjId: number | null;
    sourceCompanyId: string | null;
    destCompanyId: string | null;
    onMigrated: () => void;
}) => {
    const { addJob, removeJob } = useSyncQueueStore();
    const jobId = `draw_s_${drawing.id}`;
    const { progress, isRunning, isCompleted, isFailed, isWaiting } = useSyncProgress(jobId);

    const handleMigrate = useCallback(() => {
        addJob(jobId, async () => {
            await apiClient.post('/sync/migrate/drawings', {
                source_project_id: srcProjId,
                dest_project_id: dstProjId,
                source_company_id: Number(sourceCompanyId),
                dest_company_id: Number(destCompanyId),
                selected_ids: [drawing.id],
                level,
            });
            message.success(`Sync started for ${drawing.name}`);
            onMigrated();
        });
    }, [jobId, drawing.id, srcProjId, dstProjId, sourceCompanyId, destCompanyId, addJob, onMigrated]);

    const isSyncing = isRunning || isWaiting;
    const displaySynced = isCompleted || synced;

    // Syncing / completed bar view
    if (isSyncing || isCompleted || isFailed) {
        return (
            <div className={`flex items-center gap-3 pl-14 pr-4 py-2.5 rounded-lg border mb-1 transition-all ${
                isSyncing ? 'bg-orange-50/20 dark:bg-orange-900/5 border-zinc-200 dark:border-zinc-800' :
                isCompleted ? 'bg-green-50/30 dark:bg-green-900/5 border-green-100 dark:border-green-900/30' :
                'bg-red-50/30 dark:bg-red-900/5 border-red-100 dark:border-red-900/30'
            }`}>
                {/* file icon box */}
                <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                    {isSyncing ? <InfinityLoader size="xs" variant="rotate" /> :
                     isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                     <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <Text strong className="text-sm dark:text-zinc-200 block truncate">{drawing.name}</Text>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-28 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-orange-500'
                                }`}
                                style={{ width: `${isCompleted ? 100 : progress}%` }}
                            />
                        </div>
                        <span className={`text-[10px] font-bold ${
                            isCompleted ? 'text-green-600 dark:text-green-400' :
                            isFailed ? 'text-red-600 dark:text-red-400' :
                            'text-zinc-700 dark:text-zinc-300'
                        }`}>
                            {isWaiting ? 'Waiting...' :
                             isCompleted ? 'Synced ✓' :
                             isFailed ? 'Failed' :
                             `Syncing... ${Math.round(progress)}%`}
                        </span>
                    </div>
                </div>
                {(isSyncing || isWaiting) && (
                    <Button type="link" size="small" className="text-zinc-400 hover:text-red-500 p-0 text-xs"
                        onClick={() => removeJob(jobId)}>Cancel</Button>
                )}
                {(isCompleted || isFailed) && (
                    <Button type="link" size="small" className="text-zinc-400 hover:text-orange-500 p-0 text-xs flex items-center gap-1"
                        onClick={() => { removeJob(jobId); handleMigrate(); }}>
                        <RefreshCw className="w-3 h-3" /> Resync
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-3 pl-14 pr-4 py-2 rounded-lg cursor-pointer group transition-colors mb-0.5 ${
                selected
                    ? 'bg-orange-50/60 dark:bg-orange-900/10'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
            onClick={onToggle}
        >
            <div onClick={e => e.stopPropagation()}>
                <Checkbox checked={selected} onChange={onToggle} />
            </div>
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                <FileImage className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
                <Text className="text-sm dark:text-zinc-300 truncate block">{drawing.name}</Text>
                {drawing.current_revision && (
                    <Text className="text-[10px] text-zinc-400">Rev: {drawing.current_revision.revision_number}</Text>
                )}
            </div>
            {displaySynced && (
                <Tag color="success" className="m-0 text-[10px] flex items-center gap-1">
                    <CheckCircle2 size={9} /> Synced
                </Tag>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {displaySynced && (
                    <Button size="small" type="link" className="text-zinc-400 hover:text-orange-500 text-xs p-0 flex items-center gap-1"
                        icon={<RefreshCw className="w-3 h-3" />} onClick={handleMigrate}>Resync</Button>
                )}
                {!displaySynced && (
                    <Button size="small" type="primary" className="bg-orange-500 hover:bg-orange-600 text-xs h-7"
                        onClick={handleMigrate}>Sync</Button>
                )}
            </div>
        </div>
    );
};

// ─── Discipline Row ───────────────────────────────────────────────────────────
const DisciplineRow = ({
    discipline,
    mappings,
    selectedIds,
    onToggleDrawing,
    onToggleAll,
    level,
    srcProjId,
    dstProjId,
    sourceCompanyId,
    destCompanyId,
    searchQuery,
    onMigrated,
}: {
    discipline: DrawingDiscipline;
    mappings: Record<string, any>;
    selectedIds: Set<number>;
    onToggleDrawing: (id: number) => void;
    onToggleAll: (ids: number[], check: boolean) => void;
    level: 'company' | 'project';
    srcProjId: number | null;
    dstProjId: number | null;
    sourceCompanyId: string | null;
    destCompanyId: string | null;
    searchQuery: string;
    onMigrated: () => void;
}) => {
    const [expanded, setExpanded] = useState(true);

    const filtered = useMemo(() => {
        if (!searchQuery) return discipline.drawings;
        const q = searchQuery.toLowerCase();
        return discipline.drawings.filter(d => d.name?.toLowerCase().includes(q));
    }, [discipline.drawings, searchQuery]);

    const drawingIds = filtered.map(d => d.id);
    const allSelected = drawingIds.length > 0 && drawingIds.every(id => selectedIds.has(id));
    const someSelected = drawingIds.some(id => selectedIds.has(id));
    const syncedCount = filtered.filter(d => !!mappings[String(d.id)]).length;

    if (filtered.length === 0) return null;

    return (
        <div className="mb-1">
            {/* Discipline header */}
            <div
                className="flex items-center gap-2 pl-7 pr-3 py-1.5 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 group"
                onClick={() => setExpanded(e => !e)}
            >
                <div onClick={e => { e.stopPropagation(); onToggleAll(drawingIds, !allSelected); }}>
                    <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} />
                </div>
                {expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <Text className="text-sm font-medium dark:text-zinc-300 flex-1">{discipline.name}</Text>
                <Text className="text-[10px] text-zinc-400">{syncedCount}/{filtered.length} synced</Text>
            </div>

            {expanded && (
                <div className="mt-0.5">
                    {filtered.map(drawing => (
                        <DrawingRow
                            key={drawing.id}
                            drawing={drawing}
                            synced={!!mappings[String(drawing.id)]}
                            selected={selectedIds.has(drawing.id)}
                            level={level}
                            onToggle={() => onToggleDrawing(drawing.id)}
                            srcProjId={srcProjId}
                            dstProjId={dstProjId}
                            sourceCompanyId={sourceCompanyId}
                            destCompanyId={destCompanyId}
                            onMigrated={onMigrated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Area Row ─────────────────────────────────────────────────────────────────
const AreaRow = ({
    area,
    mappings,
    selectedIds,
    onToggleDrawing,
    onToggleAll,
    level,
    srcProjId,
    dstProjId,
    sourceCompanyId,
    destCompanyId,
    searchQuery,
    onMigrated,
}: {
    area: DrawingArea;
    mappings: Record<string, any>;
    selectedIds: Set<number>;
    onToggleDrawing: (id: number) => void;
    onToggleAll: (ids: number[], check: boolean) => void;
    level: 'company' | 'project';
    srcProjId: number | null;
    dstProjId: number | null;
    sourceCompanyId: string | null;
    destCompanyId: string | null;
    searchQuery: string;
    onMigrated: () => void;
}) => {
    const [expanded, setExpanded] = useState(true);

    const allDrawings = useMemo(
        () => area.disciplines.flatMap(d => d.drawings || []),
        [area.disciplines]
    );

    const filteredDrawings = useMemo(() => {
        if (!searchQuery) return allDrawings;
        const q = searchQuery.toLowerCase();
        return allDrawings.filter(d => d.name?.toLowerCase().includes(q));
    }, [allDrawings, searchQuery]);

    const drawingIds = filteredDrawings.map(d => d.id);
    const allSelected = drawingIds.length > 0 && drawingIds.every(id => selectedIds.has(id));
    const someSelected = drawingIds.some(id => selectedIds.has(id));
    const syncedCount = filteredDrawings.filter(d => !!mappings[String(d.id)]).length;
    const visibleDisciplines = area.disciplines.filter(disc =>
        (disc.drawings || []).some(d =>
            !searchQuery || d.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    if (visibleDisciplines.length === 0) return null;

    return (
        <div className="mb-3">
            {/* Area header */}
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 group"
                onClick={() => setExpanded(e => !e)}
            >
                <div onClick={e => { e.stopPropagation(); onToggleAll(drawingIds, !allSelected); }}>
                    <Checkbox checked={allSelected} indeterminate={someSelected && !allSelected} />
                </div>
                {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    {expanded
                        ? <FolderOpen className="w-4 h-4 text-orange-500" />
                        : <Folder className="w-4 h-4 text-orange-500" />
                    }
                </div>
                <Text strong className="text-sm dark:text-zinc-200 flex-1">{area.name}</Text>
                <div className="flex items-center gap-2">
                    <Text className="text-[10px] text-zinc-400">{syncedCount}/{filteredDrawings.length} synced</Text>
                    <Text className="text-[10px] text-zinc-400">·</Text>
                    <Text className="text-[10px] text-zinc-400">{visibleDisciplines.length} discipline{visibleDisciplines.length !== 1 ? 's' : ''}</Text>
                </div>
            </div>

            {expanded && (
                <div className="mt-1.5 pl-2">
                    {visibleDisciplines.map(disc => (
                        <DisciplineRow
                            key={disc.id}
                            discipline={disc}
                            mappings={mappings}
                            selectedIds={selectedIds}
                            onToggleDrawing={onToggleDrawing}
                            onToggleAll={onToggleAll}
                            level={level}
                            srcProjId={srcProjId}
                            dstProjId={dstProjId}
                            sourceCompanyId={sourceCompanyId}
                            destCompanyId={destCompanyId}
                            searchQuery={searchQuery}
                            onMigrated={onMigrated}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Drawings Tab ────────────────────────────────────────────────────────
const DrawingsTab = ({
    level,
}: {
    level: 'company' | 'project';
}) => {
    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const destCompanyId = sessionStorage.getItem('dest_company_id');

    const [srcProjId, setSrcProjId] = useState<number | null>(null);
    const [dstProjId, setDstProjId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const queryClient = useQueryClient();
    const { jobs, addJob } = useSyncQueueStore();

    // Fetch nested drawing tree
    const { data: areas, isLoading } = useQuery<DrawingArea[]>({
        queryKey: ['source-items', 'drawings', srcProjId, sourceCompanyId, level],
        queryFn: async () => {
            const res = await apiClient.get('/sync/source_items/drawings', {
                params: {
                    source_project_id: srcProjId,
                    source_company_id: sourceCompanyId,
                    dest_company_id: destCompanyId,
                    dest_project_id: dstProjId,
                },
            });
            return res.data.items as DrawingArea[];
        },
        enabled: !!srcProjId && !!sourceCompanyId,
    });

    // Fetch mappings (which drawings are already synced)
    const { data: mappings, refetch: refetchMappings } = useQuery<Record<string, any>>({
        queryKey: ['mappings', 'drawings', dstProjId],
        queryFn: async () => {
            const res = await apiClient.get('/sync/mappings', {
                params: { dest_project_id: dstProjId, dest_company_id: destCompanyId, entity_type: 'drawing' },
            });
            return res.data.mappings;
        },
        enabled: !!dstProjId,
    });

    const allDrawings: Drawing[] = useMemo(
        () => (areas || []).flatMap(a => a.disciplines.flatMap(d => d.drawings || [])),
        [areas]
    );

    const syncingCount = useMemo(() => {
        return Object.values(jobs).filter(j =>
            j?.jobId?.startsWith('draw_s_') && (j.status === 'running' || j.status === 'pending')
        ).length;
    }, [jobs]);

    const toggleDrawing = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleAll = (ids: number[], check: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => check ? next.add(id) : next.delete(id));
            return next;
        });
    };

    const handleMigrateSelected = useCallback(() => {
        Array.from(selectedIds).forEach(id => {
            const jobId = `draw_s_${id}`;
            addJob(jobId, async () => {
                await apiClient.post('/sync/migrate/drawings', {
                    source_project_id: srcProjId,
                    dest_project_id: dstProjId,
                    source_company_id: Number(sourceCompanyId),
                    dest_company_id: Number(destCompanyId),
                    selected_ids: [id],
                    level,
                });
                refetchMappings();
            });
        });
        setSelectedIds(new Set());
    }, [selectedIds, srcProjId, dstProjId, sourceCompanyId, destCompanyId, addJob, refetchMappings, level]);

    const visibleAreas = useMemo(() => {
        if (!areas) return [];
        if (!searchQuery) return areas;
        const q = searchQuery.toLowerCase();
        return areas.filter(a =>
            a.disciplines.some(d =>
                (d.drawings || []).some(dr => dr.name?.toLowerCase().includes(q))
            )
        );
    }, [areas, searchQuery]);

    return (
        <div className="flex flex-col gap-6 mt-6">
            {level === 'project' && (
                <GlobalProjectSelector
                    sourceCompanyId={sourceCompanyId!}
                    destCompanyId={destCompanyId!}
                    onSourceProjectChange={setSrcProjId}
                    onDestProjectChange={setDstProjId}
                />
            )}

            {(srcProjId && dstProjId) ? (
                <Card className="rounded-2xl shadow-xl overflow-hidden" styles={{ body: { padding: 0 } }}>
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-3">
                            <Input
                                placeholder="Search drawings..."
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
                                    icon={syncingCount > 0 ? <InfinityLoader size="xs" variant="rotate" /> : <Play className="w-3.5 h-3.5" />}
                                    onClick={handleMigrateSelected}
                                >
                                    {syncingCount > 0
                                        ? `Syncing (${syncingCount})...`
                                        : `Migrate Selected (${selectedIds.size})`}
                                </Button>
                            )}
                            <Button
                                icon={isLoading ? <InfinityLoader size="xs" variant="rotate" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                size="small"
                                type="text"
                                onClick={() => queryClient.invalidateQueries({ queryKey: ['source-items', 'drawings'] })}
                            />
                        </Space>
                    </div>

                    {/* Tree Content */}
                    <div className="p-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <InfinityLoader size="lg" />
                                <Text type="secondary">Loading drawing tree...</Text>
                            </div>
                        ) : visibleAreas.length === 0 ? (
                            <Empty description="No drawings found." className="py-20" />
                        ) : (
                            <div>
                                {visibleAreas.map(area => (
                                    <AreaRow
                                        key={area.id}
                                        area={area}
                                        mappings={mappings || {}}
                                        selectedIds={selectedIds}
                                        onToggleDrawing={toggleDrawing}
                                        onToggleAll={toggleAll}
                                        level={level}
                                        srcProjId={srcProjId}
                                        dstProjId={dstProjId}
                                        sourceCompanyId={sourceCompanyId}
                                        destCompanyId={destCompanyId}
                                        searchQuery={searchQuery}
                                        onMigrated={refetchMappings}
                                    />
                                ))}
                                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                                    <Text type="secondary" className="text-[11px] italic">
                                        {selectedIds.size} drawing{selectedIds.size !== 1 ? 's' : ''} selected ·{' '}
                                        {allDrawings.filter(d => !!mappings?.[String(d.id)]).length}/{allDrawings.length} total synced
                                    </Text>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            ) : (
                <Card className="mt-8 bg-zinc-50 dark:bg-zinc-900/50 border-dashed border-zinc-300 dark:border-zinc-800 text-center py-20">
                    <Text type="secondary">Select projects to view drawings.</Text>
                </Card>
            )}
        </div>
    );
};

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
export const DrawingsMigrationPage: React.FC = () => {
    const destCompanyId = sessionStorage.getItem('dest_company_id');

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

    const hasPermission = myPermissions?.includes('drawings');

    return (
        <div className="p-8 max-w-full mx-auto text-zinc-800 dark:text-zinc-200">
            {/* Header */}
            <div className="relative mb-6 p-8 rounded-3xl bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-800 text-zinc-900 dark:text-white overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
                <div className="relative z-10 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                        <FileImage className="w-8 h-8 text-indigo-500" />
                    </div>
                    <div>
                        <Title level={2} className="!text-zinc-900 dark:!text-white !m-0 mb-1">Drawings Sync</Title>
                        <Paragraph className="text-zinc-500 dark:text-zinc-400 !m-0 max-w-lg">
                            Migrate drawing areas, disciplines, and individual sheets with revision history.
                        </Paragraph>
                    </div>
                </div>
            </div>

            {!hasPermission && (
                <AccessRequestBanner
                    appSlug="drawings"
                    companyId={destCompanyId || ''}
                    title="Drawings Access Restricted"
                    description="You need 'Drawings' migration permissions to perform this operation."
                />
            )}

            <DrawingsTab level="project" />
        </div>
    );
};
