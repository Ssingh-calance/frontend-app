import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FolderTree, Search, ArrowLeft,
    PenTool, HelpCircle, CalendarDays, FileCheck, ClipboardCheck,
    Camera, BookOpen, Mail, ListChecks, Zap, MessageSquare, Settings, Lock, RefreshCw
} from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, Typography, Input, Row, Col, Button, message } from 'antd';
import { useAuthStore } from '../store/authStore';
import { ProjectMapping } from './ProjectMapping';
import { ActionPlanMigration } from './ActionPlanMigration';
import { PhotosMigration } from './PhotosMigration';
import { InspectionMigration } from './InspectionMigration';
import { UniversalMigrationPage } from './UniversalMigrationPage';
import { DrawingsMigrationPage } from './DrawingsMigrationPage';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;

interface AccessRequestItem {
    status: string;
    app_slug: string;
}

interface MeResponse {
    allowed_apps?: string[];
    is_admin?: boolean;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
    ) {
        return (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? fallback;
    }

    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

export const Dashboard = () => {
    const navigate = useNavigate();
    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const destCompanyId = sessionStorage.getItem('dest_company_id');
    const sourceCompanyName = sessionStorage.getItem('source_company_name');
    const destCompanyName = sessionStorage.getItem('dest_company_name');
    const { permissions, userEmail, userName, userId, setPermissions, setIsAdmin } = useAuthStore();

    const [activeApp, setActiveApp] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [requesting, setRequesting] = useState<string | null>(null);

    const {
        data: pendingSlugs = [],
        refetch: refetchPermissions,
        isFetching: refreshing
    } = useQuery<string[]>({
        queryKey: ['dashboard-permissions', destCompanyId],
        enabled: !!destCompanyId,
        queryFn: async () => {
            const meResponse = await apiClient.get<MeResponse>('/auth/me', {
                params: { company_id: destCompanyId }
            });

            setPermissions(meResponse.data.allowed_apps ?? []);
            setIsAdmin(Boolean(meResponse.data.is_admin));

            const reqResponse = await apiClient.get<AccessRequestItem[]>('/admin/my-requests', {
                params: { company_id: destCompanyId }
            });

            return reqResponse.data
                .filter((r) => r.status === 'pending')
                .map((r) => r.app_slug);
        }
    });

    const requestedApps = useMemo(() => new Set(pendingSlugs), [pendingSlugs]);

    const handleRequestAccess = async (appKey: string, appName: string) => {
        if (!userId || !userEmail || !destCompanyId) return;

        setRequesting(appKey);
        try {
            const response = await apiClient.post('/admin/request-access', {
                user_id: String(userId),
                user_email: userEmail,
                user_name: userName || userEmail,
                company_id: Number(destCompanyId),
                app_slug: appKey
            });

            if (response.status === 200 || response.status === 201) {
                message.success(`Access request for ${appName} sent to administrators.`);
                await refetchPermissions();
            }
        } catch (error: unknown) {
            console.error('Request access error:', error);
            message.error(getErrorMessage(error, 'Failed to send access request.'));
        } finally {
            setRequesting(null);
        }
    };

    if (!sourceCompanyId || !destCompanyId) {
        return <Navigate to="/company-setup" replace />;
    }

    const apps = [
        {
            key: 'action-plans',
            name: 'Action Plans',
            description: 'Migrate company templates and project action plans.',
            icon: <Zap className="w-8 h-8 text-amber-500" />,
            component: <ActionPlanMigration />,
        },
        {
            key: 'documents',
            name: 'Documents',
            description: 'Recursively sync project folders and files.',
            icon: <FolderTree className="w-8 h-8 text-green-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="documents"
                    title="Documents"
                    description="Recursively synchronize project folder hierarchies and files between Procore projects."
                    icon={<FolderTree className="w-8 h-8 text-white" />}
                    supportedLevels={['company', 'project']}
                />
            ),
        },
        {
            key: 'correspondence',
            name: 'Correspondence',
            description: 'Migrate project correspondence records.',
            icon: <MessageSquare className="w-8 h-8 text-pink-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="correspondence"
                    title="Correspondence"
                    description="Migrate specialized correspondence type records between projects."
                    icon={<MessageSquare className="w-8 h-8 text-white" />}
                    supportedLevels={['company', 'project']}
                />
            ),
        },
        {
            key: 'daily-log',
            name: 'Daily Log',
            description: 'Migrate daily logs including notes and weather.',
            icon: <CalendarDays className="w-8 h-8 text-cyan-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="daily_log"
                    title="Daily Log"
                    description="Migrate detailed daily log entries: Manpower, Weather, Site Observation, and more."
                    icon={<CalendarDays className="w-8 h-8 text-white" />}
                    supportedLevels={['project']}
                />
            ),
        },
        {
            key: 'drawings',
            name: 'Drawings',
            description: 'Migrate project drawing sets and revisions.',
            icon: <PenTool className="w-8 h-8 text-indigo-500" />,
            component: <DrawingsMigrationPage />,
        },
        {
            key: 'emails',
            name: 'Emails',
            description: 'Migrate project email communications.',
            icon: <Mail className="w-8 h-8 text-sky-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="emails"
                    title="Emails"
                    description="Migrate project email threads, communications, and their attachments."
                    icon={<Mail className="w-8 h-8 text-white" />}
                    supportedLevels={['project']}
                />
            ),
        },
        {
            key: 'inspections',
            name: 'Inspections',
            description: 'Migrate inspection templates and records.',
            icon: <ClipboardCheck className="w-8 h-8 text-emerald-500" />,
            component: <InspectionMigration />,
        },
        {
            key: 'photos',
            name: 'Photos',
            description: 'Migrate project photo albums and images.',
            icon: <Camera className="w-8 h-8 text-rose-500" />,
            component: <PhotosMigration />,
        },
        {
            key: 'project-admin',
            name: 'Project Admin',
            description: 'Create and migrate projects between companies.',
            icon: <Settings className="w-8 h-8 text-orange-500" />,
            component: <ProjectMapping />,
        },
        {
            key: 'punch-list',
            name: 'Punch List',
            description: 'Migrate punch list items and statuses.',
            icon: <ListChecks className="w-8 h-8 text-red-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="punch_list"
                    title="Punch List"
                    description="Migrate punch items, their metadata, comments, and attachments."
                    icon={<ListChecks className="w-8 h-8 text-white" />}
                    supportedLevels={['company', 'project']}
                />
            ),
        },
        {
            key: 'rfis',
            name: 'RFIs',
            description: 'Migrate Requests for Information.',
            icon: <HelpCircle className="w-8 h-8 text-blue-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="rfis"
                    title="RFIs"
                    description="Migrate RFIs including official responses, replies, and attachments."
                    icon={<HelpCircle className="w-8 h-8 text-white" />}
                    supportedLevels={['company', 'project']}
                />
            ),
        },
        {
            key: 'specifications',
            name: 'Specifications',
            description: 'Migrate specification sets and sections.',
            icon: <BookOpen className="w-8 h-8 text-violet-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="specifications"
                    title="Specifications"
                    description="Sync specification sets and all section revisions with full history."
                    icon={<BookOpen className="w-8 h-8 text-white" />}
                    supportedLevels={['company', 'project']}
                />
            ),
        },
        {
            key: 'submittals',
            name: 'Submittals',
            description: 'Migrate submittal logs and packages.',
            icon: <FileCheck className="w-8 h-8 text-teal-500" />,
            component: (
                <UniversalMigrationPage
                    entityType="submittals"
                    title="Submittals"
                    description="Migrate submittal packages and individual items with attachments."
                    icon={<FileCheck className="w-8 h-8 text-white" />}
                    supportedLevels={['company', 'project']}
                />
            ),
        },
    ];

    const filteredApps = apps
        .filter((app) =>
            app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map((app) => ({
            ...app,
            disabled: !permissions.includes(app.key)
        }));

    if (activeApp) {
        const app = apps.find((a) => a.key === activeApp);
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => setActiveApp(null)}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <Title level={3} className="m-0 !mb-0 dark:!text-zinc-100">{app?.name}</Title>
                        <Text type="secondary" className="dark:text-zinc-400">{app?.description}</Text>
                    </div>
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-[600px] transition-colors duration-200">
                    {app?.component}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-1">
                        <Button
                            icon={<ArrowLeft className="w-4 h-4" />}
                            type="text"
                            onClick={() => navigate('/company-setup')}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 -ml-2"
                        >
                            Change Company
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 transition-colors">Migration Apps</h1>
                    <div className="flex flex-wrap items-center gap-2 text-zinc-500">
                        <Text type="secondary" className="dark:text-zinc-400">Connected:</Text>
                        <span className="font-semibold text-orange-600 px-2 py-0.5 bg-orange-50 dark:bg-orange-500/10 rounded border border-orange-100 dark:border-orange-500/20 text-xs transition-colors">{sourceCompanyName}</span>
                        <ArrowLeft className="w-3 h-3 rotate-180 dark:text-zinc-500" />
                        <span className="font-semibold text-blue-600 px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 rounded border border-blue-100 dark:border-blue-500/20 text-xs transition-colors">{destCompanyName}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Input
                        placeholder="Search migration tools..."
                        prefix={<Search className="w-4 h-4 text-zinc-400" />}
                        className="w-full sm:w-64 h-11 rounded-xl border-zinc-200 focus:border-orange-500 focus:ring-orange-500 transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 shadow-sm"
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button
                        icon={refreshing ? <InfinityLoader size="xs" variant="rotate" /> : <RefreshCw className="w-4 h-4" />}
                        onClick={() => void refetchPermissions()}
                        className="h-11 rounded-xl border-zinc-200 hover:border-orange-500 hover:text-orange-500 transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 flex items-center gap-2"
                    >
                        <span className="hidden sm:inline">Sync Permissions</span>
                    </Button>
                </div>
            </div>

            <Row gutter={[24, 24]}>
                {filteredApps.map((app) => (
                    <Col xs={24} sm={12} md={8} key={app.key}>
                        <Card
                            hoverable={!app.disabled}
                            className={`group border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-300 rounded-2xl overflow-hidden ${
                                app.disabled
                                    ? 'opacity-60 cursor-not-allowed grayscale'
                                    : 'hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/5'
                            }`}
                            styles={{ body: { padding: 0 } }}
                            onClick={() => !app.disabled && setActiveApp(app.key)}
                        >
                            <div className="p-8 relative">
                                {app.disabled && (
                                    <div className="absolute top-4 right-4 text-zinc-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                )}
                                <div className={`mb-6 w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700/50 transition-colors ${
                                    !app.disabled ? 'group-hover:bg-orange-50 dark:group-hover:bg-orange-500/10 group-hover:border-orange-100 dark:group-hover:border-orange-500/20' : ''
                                }`}>
                                    {app.icon}
                                </div>
                                <Title level={4} className={`mb-2 !text-zinc-900 dark:!text-zinc-100 transition-colors ${
                                    !app.disabled ? 'group-hover:!text-orange-600' : ''
                                }`}>
                                    {app.name}
                                </Title>
                                <Text className="text-zinc-500 block min-h-[40px]">
                                    {app.description}
                                </Text>
                            </div>
                            <div className={`px-8 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end text-xs font-medium text-zinc-400 transition-colors ${
                                !app.disabled ? 'group-hover:bg-orange-50/30' : ''
                            }`}>
                                {app.disabled ? (
                                    <div className="flex items-center gap-2">
                                        {requestedApps.has(app.key) ? (
                                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                <FileCheck className="w-3 h-3" />
                                                Request Sent
                                            </span>
                                        ) : (
                                            <Button
                                                size="small"
                                                type="primary"
                                                ghost
                                                loading={requesting === app.key}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleRequestAccess(app.key, app.name);
                                                }}
                                                className="text-[10px] h-7 px-2 rounded-lg border-zinc-300 text-zinc-500 hover:!border-orange-500 hover:!text-orange-600"
                                            >
                                                Request Access
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-orange-600">
                                        <span>Launch App</span>
                                        <ArrowLeft className="w-3 h-3 rotate-180" />
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};