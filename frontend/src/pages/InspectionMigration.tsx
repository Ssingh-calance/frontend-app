import React from 'react';
import { Tabs, Space, Typography } from 'antd';
import { ClipboardCheck, Calendar, ListChecks, LayoutGrid, Building2 } from 'lucide-react';
import { UniversalMigrationTab } from './UniversalMigrationPage';

const { Title, Paragraph } = Typography;

export const InspectionMigration: React.FC = () => {
    const tabs = [
        {
            key: 'types',
            label: (
                <Space>
                    <Building2 className="w-4 h-4" />
                    Type
                </Space>
            ),
            children: (
                <UniversalMigrationTab 
                    entityType="inspection_types" 
                    permissionKey="inspections"
                    title="Inspection Types" 
                    description="Migrate company-level inspection types." 
                    icon={<Building2 className="w-5 h-5 text-white" />}
                    level="company"
                />
            )
        },
        {
            key: 'project_templates',
            label: (
                <Space>
                    <LayoutGrid className="w-4 h-4" />
                    Project Templates
                </Space>
            ),
            children: (
                <UniversalMigrationTab 
                    entityType="inspection_project_templates" 
                    permissionKey="inspections"
                    title="Project Templates" 
                    description="Migrate checklist list templates for the project." 
                    icon={<LayoutGrid className="w-5 h-5 text-white" />}
                    level="project"
                />
            )
        },
        {
            key: 'lists',
            label: (
                <Space>
                    <ListChecks className="w-4 h-4" />
                    Lists
                </Space>
            ),
            children: (
                <UniversalMigrationTab 
                    entityType="inspection_lists" 
                    permissionKey="inspections"
                    title="Inspection Lists" 
                    description="Migrate checklist lists (grouped index)." 
                    icon={<ListChecks className="w-5 h-5 text-white" />}
                    level="project"
                />
            )
        },
        {
            key: 'schedules',
            label: (
                <Space>
                    <Calendar className="w-4 h-4" />
                    Schedules
                </Space>
            ),
            children: (
                <UniversalMigrationTab 
                    entityType="inspection_schedules" 
                    permissionKey="inspections"
                    title="Inspection Schedules" 
                    description="Migrate recurring inspection schedules." 
                    icon={<Calendar className="w-5 h-5 text-white" />}
                    level="project"
                />
            )
        }
    ];

    return (
        <div className="p-8 max-w-full mx-auto anime-fade-in text-zinc-800 dark:text-zinc-200">
            <div className="relative mb-6 p-8 rounded-3xl bg-gradient-to-br from-zinc-100 to-white dark:from-zinc-900 dark:to-zinc-800 text-zinc-900 dark:text-white overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/10 backdrop-blur-md flex items-center justify-center border border-black/5 dark:border-white/20 shadow-inner">
                            <ClipboardCheck className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <Title level={2} className="!text-zinc-900 dark:!text-white !m-0 mb-1">Inspections Migration</Title>
                            <Paragraph className="text-zinc-500 dark:text-zinc-400 !m-0 max-w-md">
                                Manage and migrate your inspection types, templates, lists, and schedules.
                            </Paragraph>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs 
                defaultActiveKey="types"
                items={tabs}
                size="large"
                className="universal-tabs"
            />

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
                    color: #10b981 !important;
                }
            `}</style>
        </div>
    );
};
