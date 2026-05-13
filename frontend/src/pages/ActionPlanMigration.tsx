import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
    ClipboardList,
    Building2,
    Briefcase,
    ArrowRight,
    RefreshCw,
    Copy,
    Search
} from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import { useSyncQueueStore } from '../store/syncQueueStore';
import {
    Button,
    Card,
    Typography,
    message,
    Space,
    Tag,
    Table,
    Tabs,
    Input
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { AccessRequestBanner } from '../components/AccessRequestBanner';

const { Title, Paragraph } = Typography;

interface ActionPlanItem {
    id: number;
    name?: string;
    title?: string;
    plan_number?: string;
    number?: string;
    destId?: number;
    status: 'Migrated' | 'Not Migrated';
}

interface TemplateRecord {
    id: number;
    title?: string;
    name?: string;
    number?: string;
    plan_number?: string;
    is_company_template?: boolean;
    plan_template?: { id: number };
}

interface PlanRecord {
    id: number;
    title?: string;
    number?: string;
    plan_number?: string;
}

interface MappingEntry {
    dest_id?: string | number;
}

type MappingRecord = Record<string, MappingEntry>;

interface ComparedActionPlanItem extends ActionPlanItem {
    destName?: string;
    isCompanyTemplate?: boolean;
}

// --- Sub-App 1: Company Templates ---
const CompanyTemplatesTab = ({ sourceId, destId }: { sourceId: string; destId: string }) => {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');

    const { data: myPermissions } = useQuery<string[]>({
        queryKey: ['my-permissions', destId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: sessionStorage.getItem('dest_company_id') }
            });
            return res.data as string[];
        },
        enabled: !!destId
    });

    const hasPermission = myPermissions?.includes('action-plans');

    const { data: sourceTemplates, isLoading: loadingSource } = useQuery<TemplateRecord[]>({
        queryKey: ['company-templates-source', sourceId],
        queryFn: async () => {
            const res = await apiClient.get(`/action-plans/company/${sourceId}/templates/source`);
            return res.data as TemplateRecord[];
        }
    });

    const { data: destTemplates, isLoading: loadingDest, refetch: refetchDest } = useQuery<TemplateRecord[]>({
        queryKey: ['company-templates-dest', destId],
        queryFn: async () => {
            const res = await apiClient.get(`/action-plans/company/${destId}/templates`);
            return res.data as TemplateRecord[];
        }
    });

    const { data: mappings, refetch: refetchMappings } = useQuery<MappingRecord>({
        queryKey: ['mappings-company', destId],
        queryFn: async () => {
            const res = await apiClient.get(
                `/sync/mappings?dest_project_id=${destId}&dest_company_id=${destId}&entity_type=action_plan_company_template`
            );
            return (res.data.mappings ?? {}) as MappingRecord;
        }
    });

    const comparisonData = useMemo<ComparedActionPlanItem[]>(() => {
        if (!sourceTemplates) return [];
        return sourceTemplates
            .filter((st) => {
                const title = st.title || st.name || '';
                return title.toLowerCase().includes((search || '').toLowerCase());
            })
            .map((st) => {
                const sTitle = st.title || st.name;
                const mapping = mappings?.[String(st.id)];
                let match: TemplateRecord | undefined;

                if (mapping?.dest_id !== undefined) {
                    match = destTemplates?.find((dt) => String(dt.id) === String(mapping.dest_id));
                }

                if (!match) {
                    match = destTemplates?.find((dt) => {
                        const dTitle = dt.title || dt.name;
                        return !!sTitle && !!dTitle && dTitle.toLowerCase().trim() === sTitle.toLowerCase().trim();
                    });
                }

                return {
                    ...st,
                    name: sTitle,
                    destId: match?.id,
                    destName: match?.title || match?.name,
                    status: match ? 'Migrated' : 'Not Migrated'
                };
            });
    }, [sourceTemplates, destTemplates, mappings, search]);

    const { jobs, addJob } = useSyncQueueStore();

    const syncingItemsCount = useMemo(() => {
        return Object.values(jobs).filter(
            (j) => j.jobId.startsWith('action_plan_company_template_') && (j.status === 'running' || j.status === 'pending')
        ).length;
    }, [jobs]);

    const isRunning = syncingItemsCount > 0;

    const handleSync = (sourceTemplateId: number) => {
        const jobId = `action_plan_company_template_${sourceTemplateId}`;
        addJob(jobId, async () => {
            await apiClient.post(
                `/action-plans/sync-company-template?source_company_id=${sourceId}&dest_company_id=${destId}&source_template_id=${sourceTemplateId}`
            );
            message.success('Company Template synced!');
            refetchDest();
            refetchMappings();
        });
    };

    const columns: ColumnsType<ComparedActionPlanItem> = [
        {
            title: 'Number',
            dataIndex: 'plan_number',
            key: 'plan_number',
            width: 100,
            render: (t: string | undefined, r: ComparedActionPlanItem) => <span>{t || r.number || '-'}</span>
        },
        {
            title: 'Source Template',
            dataIndex: 'name',
            key: 'name',
            render: (t: string | undefined) => <span className="font-semibold text-zinc-900">{t}</span>
        },
        {
            title: '',
            key: 'arrow',
            width: 50,
            render: () => <ArrowRight className="w-4 h-4 text-zinc-300" />
        },
        {
            title: 'Destination Template',
            dataIndex: 'destName',
            key: 'destName',
            render: (t: string | undefined) =>
                t ? <span className="text-zinc-600">{t}</span> : <span className="text-zinc-400 italic">Not found</span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={s === 'Migrated' ? 'green' : 'orange'}>{s}</Tag>
        },
        {
            title: 'Action',
            key: 'action',
            render: (_value: unknown, r: ComparedActionPlanItem) => {
                const job = jobs[`action_plan_company_template_${r.id}`];
                const isPending = job?.status === 'running' || job?.status === 'pending';
                if (job?.status === 'pending') {
                    return <Tag color="orange">Waiting...</Tag>;
                }
                return (
                    <Button
                        size="small"
                        icon={
                            isPending ? (
                                <InfinityLoader size="xs" variant="rotate" />
                            ) : r.status === 'Migrated' ? (
                                <RefreshCw className="w-3 h-3" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )
                        }
                        onClick={() => handleSync(r.id)}
                        disabled={isPending || !hasPermission}
                    >
                        {isPending ? 'Syncing...' : r.status === 'Migrated' ? 'Resync' : 'Sync'}
                    </Button>
                );
            }
        }
    ];

    return (
        <div className="space-y-6">
            {!hasPermission && (
                <AccessRequestBanner
                    appSlug="action-plans"
                    companyId={destId}
                    title="Company Templates Access Restricted"
                    description="You need 'Action Plans' migration permissions to perform this operation."
                />
            )}
            <Card className="border-0 shadow-none" bodyStyle={{ padding: 0 }}>
                <div className="flex justify-between items-center mb-6 gap-4">
                    <div className="flex gap-2 items-center">
                        <Input
                            placeholder="Search templates by title..."
                            prefix={<Search className="w-4 h-4 text-zinc-400" />}
                            className="max-w-xs h-10 rounded-lg"
                            allowClear
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => { refetchDest(); refetchMappings(); }} title="Refresh" />
                    </div>
                    {selectedIds.length > 0 && (
                        <Button
                            type="primary"
                            className="bg-orange-600 hover:bg-orange-700 border-none"
                            disabled={!hasPermission}
                            onClick={() => {
                                selectedIds.forEach((id) => handleSync(id));
                                setSelectedIds([]);
                            }}
                        >
                            {isRunning ? `Syncing Queue (${syncingItemsCount})...` : `Migrate Selected Templates (${selectedIds.length})`}
                        </Button>
                    )}
                </div>
                <Table
                    rowSelection={{
                        selectedRowKeys: selectedIds,
                        onChange: (keys: Key[]) => setSelectedIds(keys.map((k) => Number(k)))
                    }}
                    dataSource={comparisonData}
                    columns={columns}
                    rowKey="id"
                    loading={(loadingSource || loadingDest) ? { indicator: <InfinityLoader size="lg" /> } : false}
                    pagination={{ pageSize: 8 }}
                />
            </Card>
        </div>
    );
};

// --- Sub-App 2: Project Templates ---
const ProjectTemplatesTab = ({ sourceId, destId }: { sourceId: string; destId: string }) => {
    const [srcProjId, setSrcProjId] = useState<number | null>(null);
    const [dstProjId, setDstProjId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');

    const { data: myPermissions } = useQuery<string[]>({
        queryKey: ['my-permissions', destId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: sessionStorage.getItem('dest_company_id') }
            });
            return res.data as string[];
        },
        enabled: !!destId
    });

    const hasPermission = myPermissions?.includes('action-plans');

    const { data: srcTemplates, isLoading: loadingSrc } = useQuery<TemplateRecord[]>({
        queryKey: ['project-templates-src', srcProjId],
        queryFn: async () => {
            const res = await apiClient.get(`/action-plans/project/${srcProjId}/templates/source?company_id=${sourceId}`);
            return res.data as TemplateRecord[];
        },
        enabled: !!srcProjId
    });

    const { data: dstTemplates, isLoading: loadingDst, refetch: refetchDest } = useQuery<TemplateRecord[]>({
        queryKey: ['project-templates-dst', dstProjId],
        queryFn: async () => {
            const res = await apiClient.get(`/action-plans/project/${dstProjId}/templates?company_id=${destId}`);
            return res.data as TemplateRecord[];
        },
        enabled: !!dstProjId
    });

    const { data: mappings, refetch: refetchMappings } = useQuery<MappingRecord>({
        queryKey: ['mappings-project-temp', dstProjId, destId],
        queryFn: async () => {
            const [pRes, cRes] = await Promise.all([
                apiClient.get(`/sync/mappings?dest_project_id=${dstProjId}&dest_company_id=${destId}&entity_type=action_plan_project_template`),
                apiClient.get(`/sync/mappings?dest_project_id=${destId}&dest_company_id=${destId}&entity_type=action_plan_company_template`)
            ]);
            return {
                ...(cRes.data.mappings ?? {}),
                ...(pRes.data.mappings ?? {})
            } as MappingRecord;
        },
        enabled: !!dstProjId && !!destId
    });

    const comparisonData = useMemo<ComparedActionPlanItem[]>(() => {
        if (!srcTemplates) return [];
        return srcTemplates
            .filter((st) => {
                const title = st.title || st.name || '';
                return title.toLowerCase().includes(search.toLowerCase());
            })
            .map((st) => {
                const sTitle = st.title || st.name;
                const mapping = mappings?.[String(st.id)];
                let match: TemplateRecord | undefined;

                if (mapping?.dest_id !== undefined) {
                    match = dstTemplates?.find((dt) => String(dt.id) === String(mapping.dest_id));
                }
                if (!match && st.plan_template?.id) {
                    const cMapping = mappings?.[String(st.plan_template.id)];
                    if (cMapping?.dest_id !== undefined) {
                        match = dstTemplates?.find((dt) => String(dt.id) === String(cMapping.dest_id));
                    }
                }
                if (!match) {
                    match = dstTemplates?.find((dt) => {
                        const dTitle = dt.title || dt.name;
                        return !!sTitle && !!dTitle && dTitle.toLowerCase().trim() === sTitle.toLowerCase().trim();
                    });
                }
                return {
                    ...st,
                    name: sTitle,
                    isCompanyTemplate: !!(st.is_company_template || st.plan_template),
                    destId: match?.id,
                    destName: match?.title || match?.name,
                    status: match ? 'Migrated' : 'Not Migrated'
                };
            });
    }, [srcTemplates, dstTemplates, mappings, search]);

    const { jobs, addJob } = useSyncQueueStore();

    const syncingItemsCount = useMemo(() => {
        return Object.values(jobs).filter(
            (j) => j.jobId.startsWith('action_plan_project_template_') && (j.status === 'running' || j.status === 'pending')
        ).length;
    }, [jobs]);

    const isRunning = syncingItemsCount > 0;

    const handleSync = (sourceTemplateId: number) => {
        const jobId = `action_plan_project_template_${sourceTemplateId}`;
        addJob(jobId, async () => {
            await apiClient.post('/action-plans/migrate-project-template', null, {
                params: {
                    source_company_id: sourceId,
                    source_project_id: srcProjId,
                    source_template_id: sourceTemplateId,
                    dest_company_id: destId,
                    dest_project_id: dstProjId
                }
            });
            message.success('Project Template synced!');
            refetchDest();
            refetchMappings();
        });
    };

    const columns: ColumnsType<ComparedActionPlanItem> = [
        {
            title: 'Source Template',
            dataIndex: 'name',
            key: 'name',
            render: (t: string | undefined, r: ComparedActionPlanItem) => (
                <Space>
                    <span className="font-semibold text-zinc-900">{t}</span>
                    <Tag color={r.isCompanyTemplate ? 'blue' : 'purple'} className="border-none text-[10px] font-bold uppercase py-0 px-2 rounded-full">
                        {r.isCompanyTemplate ? 'Company' : 'Project'}
                    </Tag>
                </Space>
            )
        },
        {
            title: '',
            key: 'arrow',
            width: 50,
            render: () => <ArrowRight className="w-4 h-4 text-zinc-300" />
        },
        {
            title: 'Destination Template',
            dataIndex: 'destName',
            key: 'destName',
            render: (t: string | undefined) =>
                t ? <span className="text-zinc-600">{t}</span> : <span className="text-zinc-400 italic">Not found</span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={s === 'Migrated' ? 'green' : 'orange'}>{s}</Tag>
        },
        {
            title: 'Action',
            key: 'action',
            render: (_value: unknown, r: ComparedActionPlanItem) => {
                const job = jobs[`action_plan_project_template_${r.id}`];
                const isPending = job?.status === 'running' || job?.status === 'pending';
                if (job?.status === 'pending') {
                    return <Tag color="orange">Waiting...</Tag>;
                }
                return (
                    <Button
                        size="small"
                        icon={
                            isPending ? (
                                <InfinityLoader size="xs" variant="rotate" />
                            ) : r.status === 'Migrated' ? (
                                <RefreshCw className="w-3 h-3" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )
                        }
                        onClick={() => handleSync(r.id)}
                        disabled={isPending || !hasPermission}
                    >
                        {isPending ? 'Syncing...' : r.status === 'Migrated' ? 'Resync' : 'Sync'}
                    </Button>
                );
            }
        }
    ];

    return (
        <div className="space-y-6">
            {!hasPermission && (
                <AccessRequestBanner
                    appSlug="action-plans"
                    companyId={destId}
                    title="Project Templates Access Restricted"
                    description="You need 'Action Plans' migration permissions to perform this operation."
                />
            )}
            <Card className="border-0 shadow-none" bodyStyle={{ padding: 0 }}>
                <GlobalProjectSelector
                    sourceCompanyId={sourceId}
                    destCompanyId={destId}
                    onSourceProjectChange={setSrcProjId}
                    onDestProjectChange={setDstProjId}
                />
                {srcProjId && dstProjId ? (
                    <>
                        <div className="flex justify-between items-center mb-6 gap-4">
                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Search templates by title..."
                                    prefix={<Search className="w-4 h-4 text-zinc-400" />}
                                    className="max-w-xs h-10 rounded-lg"
                                    allowClear
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => { refetchDest(); refetchMappings(); }} title="Refresh" />
                            </div>
                            {selectedIds.length > 0 && (
                                <Button
                                    type="primary"
                                    className="bg-orange-600 hover:bg-orange-700 border-none"
                                    disabled={!hasPermission}
                                    onClick={() => {
                                        selectedIds.forEach((id) => handleSync(id));
                                        setSelectedIds([]);
                                    }}
                                >
                                    {isRunning ? `Syncing Queue (${syncingItemsCount})...` : `Migrate Selected Templates (${selectedIds.length})`}
                                </Button>
                            )}
                        </div>
                        <Table
                            rowSelection={{
                                selectedRowKeys: selectedIds,
                                onChange: (keys: Key[]) => setSelectedIds(keys.map((k) => Number(k)))
                            }}
                            dataSource={comparisonData}
                            columns={columns}
                            rowKey="id"
                            loading={(loadingSrc || loadingDst) ? { indicator: <InfinityLoader size="lg" /> } : false}
                        />
                    </>
                ) : (
                    <div className="py-20 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-400">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        Please select both source and destination projects to compare templates.
                    </div>
                )}
            </Card>
        </div>
    );
};

// --- Sub-App 3: Project Plans ---
const ProjectPlansTab = ({ sourceId, destId }: { sourceId: string; destId: string }) => {
    const [srcProjId, setSrcProjId] = useState<number | null>(null);
    const [dstProjId, setDstProjId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [search, setSearch] = useState('');

    const { data: myPermissions } = useQuery<string[]>({
        queryKey: ['my-permissions', destId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: sessionStorage.getItem('dest_company_id') }
            });
            return res.data as string[];
        },
        enabled: !!destId
    });

    const hasPermission = myPermissions?.includes('action-plans');

    const { data: srcPlans, isLoading: loadingSrc } = useQuery<PlanRecord[]>({
        queryKey: ['project-plans-src', srcProjId],
        queryFn: async () => {
            const res = await apiClient.get(`/action-plans/project/${srcProjId}/plans/source?company_id=${sourceId}`);
            return res.data as PlanRecord[];
        },
        enabled: !!srcProjId
    });

    const { data: dstPlans, isLoading: loadingDst, refetch: refetchDest } = useQuery<PlanRecord[]>({
        queryKey: ['project-plans-dst', dstProjId],
        queryFn: async () => {
            const res = await apiClient.get(`/action-plans/project/${dstProjId}/plans?company_id=${destId}`);
            return res.data as PlanRecord[];
        },
        enabled: !!dstProjId
    });

    const { data: mappings, refetch: refetchMappings } = useQuery<MappingRecord>({
        queryKey: ['mappings-project-plans', dstProjId],
        queryFn: async () => {
            const res = await apiClient.get(
                `/sync/mappings?dest_project_id=${dstProjId}&dest_company_id=${destId}&entity_type=action_plan_project_plan`
            );
            return (res.data.mappings ?? {}) as MappingRecord;
        },
        enabled: !!dstProjId
    });

    const { jobs, addJob } = useSyncQueueStore();

    const syncingItemsCount = useMemo(() => {
        return Object.values(jobs).filter(
            (j) => j.jobId.startsWith('action_plan_project_plan_') && (j.status === 'running' || j.status === 'pending')
        ).length;
    }, [jobs]);

    const isRunning = syncingItemsCount > 0;

    const handleSync = (sourcePlanId: number) => {
        const jobId = `action_plan_project_plan_${sourcePlanId}`;
        addJob(jobId, async () => {
            await apiClient.post('/action-plans/migrate-project-plan', null, {
                params: {
                    source_company_id: sourceId,
                    source_project_id: srcProjId,
                    source_plan_id: sourcePlanId,
                    dest_company_id: destId,
                    dest_project_id: dstProjId
                }
            });
            message.success('Project Plan migrated!');
            refetchDest();
            refetchMappings();
        });
    };

    const comparisonData = useMemo<ComparedActionPlanItem[]>(() => {
        if (!srcPlans) return [];
        return srcPlans
            .filter((sp) => {
                const title = sp.title || '';
                return title.toLowerCase().includes(search.toLowerCase());
            })
            .map((sp) => {
                const mapping = mappings?.[String(sp.id)];
                let match: PlanRecord | undefined;

                if (mapping?.dest_id !== undefined) {
                    match = dstPlans?.find((dp) => String(dp.id) === String(mapping.dest_id));
                }
                if (!match) {
                    match = dstPlans?.find((dp) => {
                        return !!dp?.title && !!sp.title && dp.title.toLowerCase().trim() === sp.title.toLowerCase().trim();
                    });
                }
                return {
                    ...sp,
                    name: sp.title,
                    destName: match?.title,
                    status: match ? 'Migrated' : 'Not Migrated'
                };
            });
    }, [srcPlans, dstPlans, mappings, search]);

    const columns: ColumnsType<ComparedActionPlanItem> = [
        {
            title: 'Number',
            dataIndex: 'plan_number',
            key: 'plan_number',
            width: 100,
            render: (t: string | undefined, r: ComparedActionPlanItem) => <span>{t || r.number || '-'}</span>
        },
        {
            title: 'Source Plan',
            dataIndex: 'title',
            key: 'title',
            render: (t: string | undefined) => <span className="font-semibold text-zinc-900">{t}</span>
        },
        {
            title: '',
            key: 'arrow',
            width: 50,
            render: () => <ArrowRight className="w-4 h-4 text-zinc-300" />
        },
        {
            title: 'Destination Plan',
            dataIndex: 'destName',
            key: 'destName',
            render: (t: string | undefined) =>
                t ? <span className="text-zinc-600">{t}</span> : <span className="text-zinc-400 italic">Not Migrated</span>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={s === 'Migrated' ? 'green' : 'orange'}>{s}</Tag>
        },
        {
            title: 'Action',
            key: 'action',
            render: (_value: unknown, r: ComparedActionPlanItem) => {
                const job = jobs[`action_plan_project_plan_${r.id}`];
                const isPending = job?.status === 'running' || job?.status === 'pending';
                if (job?.status === 'pending') {
                    return <Tag color="orange">Waiting...</Tag>;
                }
                return (
                    <Button
                        size="small"
                        icon={
                            isPending ? (
                                <InfinityLoader size="xs" variant="rotate" />
                            ) : r.status === 'Migrated' ? (
                                <RefreshCw className="w-3 h-3" />
                            ) : (
                                <Copy className="w-3 h-3" />
                            )
                        }
                        onClick={() => handleSync(r.id)}
                        disabled={isPending || !hasPermission}
                    >
                        {isPending ? 'Migrating...' : r.status === 'Migrated' ? 'Resync' : 'Migrate'}
                    </Button>
                );
            }
        }
    ];

    return (
        <div className="space-y-6">
            {!hasPermission && (
                <AccessRequestBanner
                    appSlug="action-plans"
                    companyId={destId}
                    title="Project Plans Access Restricted"
                    description="You need 'Action Plans' migration permissions to perform this operation."
                />
            )}
            <Card className="border-0 shadow-none" bodyStyle={{ padding: 0 }}>
                <GlobalProjectSelector
                    sourceCompanyId={sourceId}
                    destCompanyId={destId}
                    onSourceProjectChange={setSrcProjId}
                    onDestProjectChange={setDstProjId}
                />
                {srcProjId && dstProjId ? (
                    <>
                        <div className="flex justify-between items-center mb-6 gap-4">
                            <div className="flex gap-2 items-center">
                                <Input
                                    placeholder="Search plans by title..."
                                    prefix={<Search className="w-4 h-4 text-zinc-400" />}
                                    className="max-w-xs h-10 rounded-lg"
                                    allowClear
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => { refetchDest(); refetchMappings(); }} title="Refresh" />
                            </div>
                            {selectedIds.length > 0 && (
                                <Button
                                    type="primary"
                                    className="bg-orange-600 hover:bg-orange-700 border-none"
                                    disabled={!hasPermission}
                                    onClick={() => {
                                        selectedIds.forEach((id) => handleSync(id));
                                        setSelectedIds([]);
                                    }}
                                >
                                    {isRunning ? `Syncing Queue (${syncingItemsCount})...` : `Migrate Selected Plans (${selectedIds.length})`}
                                </Button>
                            )}
                        </div>
                        <Table
                            rowSelection={{
                                selectedRowKeys: selectedIds,
                                onChange: (keys: Key[]) => setSelectedIds(keys.map((k) => Number(k)))
                            }}
                            dataSource={comparisonData}
                            columns={columns}
                            rowKey="id"
                            loading={(loadingSrc || loadingDst) ? { indicator: <InfinityLoader size="lg" /> } : false}
                        />
                    </>
                ) : (
                    <div className="py-20 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-400">
                        <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        Please select both source and destination projects to compare plans.
                    </div>
                )}
            </Card>
        </div>
    );
};

export const ActionPlanMigration = () => {
    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const destCompanyId = sessionStorage.getItem('dest_company_id');
    const sourceCompanyName = sessionStorage.getItem('source_company_name');
    const destCompanyName = sessionStorage.getItem('dest_company_name');

    if (!sourceCompanyId || !destCompanyId) return null;

    const items = [
        {
            key: '1',
            label: (
                <Space>
                    <Building2 className="w-4 h-4" />
                    Company Templates
                </Space>
            ),
            children: <CompanyTemplatesTab sourceId={sourceCompanyId} destId={destCompanyId} />
        },
        {
            key: '2',
            label: (
                <Space>
                    <Briefcase className="w-4 h-4" />
                    Project Templates
                </Space>
            ),
            children: <ProjectTemplatesTab sourceId={sourceCompanyId} destId={destCompanyId} />
        },
        {
            key: '3',
            label: (
                <Space>
                    <ClipboardList className="w-4 h-4" />
                    Project Plans
                </Space>
            ),
            children: <ProjectPlansTab sourceId={sourceCompanyId} destId={destCompanyId} />
        }
    ];

    return (
        <div className="p-8 max-w-full">
            <div className="mb-0">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Title level={2} className="flex items-center gap-3 mb-1">
                            <ClipboardList className="text-orange-500" />
                            Action Plan Migration
                        </Title>
                        <Paragraph className="text-zinc-500 m-0">
                            Select a sub-module to migrate templates or plans between companies and projects.
                        </Paragraph>
                    </div>
                    <Space className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                        <Tag color="orange" className="m-0 border-none font-bold">{sourceCompanyName}</Tag>
                        <ArrowRight className="w-4 h-4 text-zinc-300" />
                        <Tag color="blue" className="m-0 border-none font-bold">{destCompanyName}</Tag>
                    </Space>
                </div>

                <Tabs defaultActiveKey="1" items={items} className="action-plan-tabs" size="large" />
            </div>

            <style>{`
                .action-plan-tabs .ant-tabs-nav::before {
                    display: none;
                }
                .action-plan-tabs .ant-tabs-tab {
                    padding: 12px 24px;
                    border-radius: 12px 12px 0 0;
                    margin-right: 4px;
                    transition: all 0.3s;
                }
                .action-plan-tabs .ant-tabs-tab-active {
                    background: #fff !important;
                }
            `}</style>
        </div>
    );
};