import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { 
    Folder, 
    FolderPlus, 
    ChevronRight, 
    ChevronDown, 
    AlertCircle, 
    FileText, 
    FolderTree,
    Building2,
    Briefcase,
    ArrowRight
} from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import { 
    Typography, 
    Card, 
    Button, 
    Tag, 
    Checkbox, 
    message, 
    Space, 
    Empty,
    Tabs
} from 'antd';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { AccessRequestBanner } from '../components/AccessRequestBanner';

const { Title, Paragraph, Text } = Typography;

interface FolderData {
    id: number;
    name: string;
    parent_id: number | null;
    folders?: FolderData[];
    files?: FileData[];
    has_children_files?: boolean;
}

interface FileData {
    id: number;
    name: string;
    content_type: string;
    size: number;
}

const FolderTreeItem = ({ 
    scope,
    contextId,
    folder, 
    allFolders, 
    selectedFolders, 
    onToggle, 
    onSync,
    onSyncFile,
    mappings
}: { 
    scope: string;
    contextId: number;
    folder: any; 
    allFolders: any[]; 
    selectedFolders: number[];
    onToggle: (id: number) => void;
    onSync: (id: number) => void;
    onSyncFile: (id: number) => void;
    mappings: Record<string, any>;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const folderSyncInfo = mappings[folder.id.toString()];
    const isFolderSynced = folderSyncInfo?.status === 'success';

    const initialSubfolders = folder.folders || [];
    const initialFiles = folder.files || [];

    const subfoldersFromList = useMemo(() => 
        allFolders.filter(f => f.parent_id === folder.id && !initialSubfolders.find((s: any) => s.id === f.id)),
    [allFolders, folder.id, initialSubfolders]);

    const combinedSubfolders = [...initialSubfolders, ...subfoldersFromList];

    const shouldLoadFiles = isExpanded && !!contextId && initialFiles.length === 0;

    const { data: lazyFiles, isLoading: loadingFiles } = useQuery({
        queryKey: ['folder-files', scope, contextId, folder.id],
        queryFn: async () => {
            const res = await apiClient.get(`/documents/${scope}/${contextId}/folder/${folder.id}/files`, {
                params: { 
                    company_id: scope === 'company' ? contextId : Number(sessionStorage.getItem('source_company_id')),
                    dest_company_id: Number(sessionStorage.getItem('dest_company_id'))
                }
            });
            return res.data as FileData[];
        },
        enabled: shouldLoadFiles
    });

    const displayFiles = initialFiles.length > 0 ? initialFiles : (lazyFiles || []);

    return (
        <div className="mb-1">
            <div className="flex items-center group py-1 hover:bg-zinc-800/50 rounded px-2 transition-all">
                <Space size={4} className="flex-1">
                    <div 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="cursor-pointer text-zinc-500 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                    
                    <Checkbox 
                        checked={selectedFolders.includes(folder.id)}
                        onChange={() => onToggle(folder.id)}
                    />
                    
                    <Folder size={16} className="text-amber-400" />
                    <Text className="text-zinc-200 text-sm">{folder.name}</Text>
                    {isFolderSynced && (
                        <Tag color="success" className="text-[10px] h-4 leading-3 ml-2">Synced</Tag>
                    )}
                </Space>
                
                <Button 
                    type="link" 
                    size="small" 
                    icon={selectedFolders.includes(folder.id) ? <InfinityLoader size="xs" variant="rotate" /> : <FolderPlus size={14} />}
                    onClick={() => onSync(folder.id)}
                    className="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-300 transition-opacity"
                >
                    {isFolderSynced ? 'Sync Again' : 'Sync Folder'}
                </Button>
            </div>

            {isExpanded && (
                <div className="ml-6 border-l border-zinc-700 pl-4 mt-1 space-y-1">
                    {combinedSubfolders.map((sub: any) => (
                        <FolderTreeItem 
                            key={sub.id}
                            scope={scope}
                            contextId={contextId}
                            folder={sub}
                            allFolders={allFolders}
                            selectedFolders={selectedFolders}
                            onToggle={onToggle}
                            onSync={onSync}
                            onSyncFile={onSyncFile}
                            mappings={mappings}
                        />
                    ))}

                    {loadingFiles && <div className="ml-10 py-1"><InfinityLoader size="xs" /></div>}
                    
                    {displayFiles.map((file: any) => {
                        const fileSyncInfo = mappings[file.id.toString()];
                        const isFileSynced = fileSyncInfo?.status === 'success';
                        const isFileSyncing = fileSyncInfo?.status === 'pending';
                        
                        return (
                            <div key={file.id} className="flex items-center group py-0.5 hover:bg-zinc-800/30 rounded px-2">
                                <div className="flex items-center gap-3 group py-1 hover:bg-zinc-800/30 rounded px-2 transition-all w-full">
                                    <FileText size={14} className="text-zinc-400 shrink-0" />
                                    <Text className="text-zinc-300 text-xs flex-1 truncate">{file.name}</Text>
                                    
                                    {isFileSynced && <Tag color="success" className="text-[9px] h-3.5 leading-3">Synced</Tag>}
                                    
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={isFileSyncing ? <InfinityLoader size="xs" variant="rotate" /> : <ArrowRight size={12} className="text-zinc-500" />}
                                        onClick={() => onSyncFile(file.id)}
                                        className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center p-0 transition-opacity"
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {!loadingFiles && combinedSubfolders.length === 0 && displayFiles.length === 0 && (
                        <div className="ml-10 py-1 text-zinc-300 text-xs italic">Empty folder</div>
                    )}
                </div>
            )}
        </div>
    );
};

const MigrationTab = ({ 
    scope, 
    sourceId, 
    destId, 
    sourceName
}: { 
    scope: 'company' | 'project'; 
    sourceId: number; 
    destId: number;
    sourceName: string;
}) => {
    const [selectedFolders, setSelectedFolders] = useState<number[]>([]);

    const { data: myPermissions } = useQuery({
        queryKey: ['my-permissions', destId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: sessionStorage.getItem('dest_company_id') }
            });
            return res.data as string[];
        },
        enabled: !!destId
    });

    const hasPermission = myPermissions?.includes('documents');

    const { data: folders, isLoading: loadingFolders } = useQuery({
        queryKey: ['folders', scope, sourceId],
        queryFn: async () => {
            const res = await apiClient.get(`/documents/${scope}/${sourceId}/folders`, {
                params: { 
                    company_id: scope === 'company' ? sourceId : Number(sessionStorage.getItem('source_company_id')),
                    dest_company_id: destId
                }
            });
            return res.data as FolderData[];
        },
        enabled: !!sourceId
    });

    const { data: mappings = {}, refetch: refetchMappings } = useQuery({
        queryKey: ['document-mappings', scope, destId],
        queryFn: async () => {
            const params: any = { dest_company_id: destId };
            if (scope === 'project') {
                params.dest_project_id = destId;
            }
            const res = await apiClient.get(`/documents/mappings`, { params });
            return res.data as Record<string, any>;
        },
        enabled: !!destId
    });

    const syncMutation = useMutation({
        mutationFn: async (folderId: number) => {
            return await apiClient.post('/documents/sync-folder', null, {
                params: {
                    scope,
                    source_context_id: sourceId,
                    dest_context_id: destId,
                    source_folder_id: folderId,
                    source_company_id: scope === 'company' ? sourceId : Number(sessionStorage.getItem('source_company_id')),
                    dest_company_id: scope === 'company' ? destId : Number(sessionStorage.getItem('dest_company_id'))
                }
            });
        },
        onSuccess: () => {
            message.success('Folder migration initiated');
            refetchMappings();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.detail || 'Failed to sync folder');
        }
    });

    const syncFileMutation = useMutation({
        mutationFn: async (fileId: number) => {
            return await apiClient.post('/documents/sync-file', null, {
                params: {
                    scope,
                    source_context_id: sourceId,
                    dest_context_id: destId,
                    source_file_id: fileId,
                    source_company_id: scope === 'company' ? sourceId : Number(sessionStorage.getItem('source_company_id')),
                    dest_company_id: scope === 'company' ? destId : Number(sessionStorage.getItem('dest_company_id'))
                }
            });
        },
        onSuccess: (res: any) => {
            if (res.data.status === 'skipped') {
                message.info(`File already up to date.`);
            } else {
                message.success(`File migrated successfully`);
            }
            refetchMappings();
        },
        onError: (err: any) => {
            message.error(`File migration failed: ${err.response?.data?.detail || err.message}`);
        }
    });

    const rootFolder = useMemo(() => {
        if (scope === 'project') return null; // Projects don't usually have the company name root folder Filter
        return folders?.find(f => !f.parent_id && (f.name.toLowerCase() === sourceName?.toLowerCase() || f.name.includes(sourceName || '')));
    }, [folders, sourceName, scope]);

    const displayFolders = useMemo(() => {
        if (!folders) return [];
        if (rootFolder) {
            const rootChildren = (rootFolder as any).folders || [];
            const flatChildren = folders.filter(f => f.parent_id === rootFolder.id);
            const combined = [...rootChildren];
            flatChildren.forEach(f => {
                if (!combined.find(c => c.id === f.id)) combined.push(f);
            });
            return combined;
        }
        return folders.filter(f => !f.parent_id);
    }, [folders, rootFolder]);

    const displayFiles = useMemo(() => {
        if (rootFolder && (rootFolder as any).files) {
            return (rootFolder as any).files as FileData[];
        }
        return [];
    }, [rootFolder]);

    return (
        <div className="space-y-6">
            {!hasPermission && (
                <AccessRequestBanner 
                    appSlug="documents" 
                    companyId={destId} 
                    title="Document migration Access Restricted"
                    description="You need 'Documents' migration permissions to perform this operation."
                />
            )}
            <Card 
            title={
                <div className="flex justify-between items-center w-full py-1">
                    <Space>
                        <FolderTree className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-200">
                             Folders in {sourceName}
                        </span>
                    </Space>
                    <Button 
                        type="primary" 
                        disabled={selectedFolders.length === 0 || syncMutation.isPending || !hasPermission}
                        loading={syncMutation.isPending}
                        onClick={async () => {
                            for(const id of selectedFolders) await syncMutation.mutateAsync(id);
                            setSelectedFolders([]);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 border-none"
                    >
                        Migrate Selected Folders ({selectedFolders.length})
                    </Button>
                </div>
            }
            className="bg-zinc-900 border-zinc-800 shadow-sm overflow-hidden"
            styles={{ body: { padding: '12px' } }}
        >
            {loadingFolders ? (
                <div className="p-12 text-center text-zinc-400">
                    <InfinityLoader size="lg" className="mx-auto mb-4" />
                    Loading folder structure...
                </div>
            ) : (displayFolders.length > 0 || displayFiles.length > 0) ? (
                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {displayFolders.map(folder => (
                        <FolderTreeItem 
                            key={folder.id}
                            scope={scope}
                            contextId={sourceId}
                            folder={folder}
                            allFolders={folders || []}
                            selectedFolders={selectedFolders}
                            onToggle={(id) => setSelectedFolders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                            onSync={(id) => syncMutation.mutate(id)}
                            onSyncFile={(id) => syncFileMutation.mutate(id)}
                            mappings={mappings}
                        />
                    ))}
                    {displayFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between group ml-10 py-1 hover:bg-zinc-800/50 rounded px-2">
                             <Space><FileText className="w-3 h-3 text-blue-400" /><span className="text-sm">{file.name}</span></Space>
                             <Button type="link" size="small" onClick={() => syncFileMutation.mutate(file.id)} className="opacity-0 group-hover:opacity-100">Sync</Button>
                        </div>
                    ))}
                </div>
            ) : (
                <Empty description="No folders found." className="my-12" />
            )}
        </Card>
        </div>
    );
};

export const DocumentMigration = () => {
    const sourceCompanyId = Number(sessionStorage.getItem('source_company_id'));
    const destCompanyId = Number(sessionStorage.getItem('dest_company_id'));
    const sourceCompanyName = sessionStorage.getItem('source_company_name') || 'Source';

    const [sourceProject, setSourceProject] = useState<any>(null);
    const [destProject, setDestProject] = useState<any>(null);

    const items = [
        {
            key: 'company',
            label: (
                <span className="flex items-center gap-2 px-4">
                    <Building2 className="w-4 h-4" />
                    Company Documents
                </span>
            ),
            children: (
                <div className="mt-4">
                    <MigrationTab 
                        scope="company"
                        sourceId={sourceCompanyId}
                        destId={destCompanyId}
                        sourceName={sourceCompanyName}
                    />
                </div>
            )
        },
        {
            key: 'project',
            label: (
                <span className="flex items-center gap-2 px-4">
                    <Briefcase className="w-4 h-4" />
                    Project Documents
                </span>
            ),
            children: (
                <div className="mt-4">
                    <GlobalProjectSelector 
                        sourceCompanyId={String(sourceCompanyId)}
                        destCompanyId={String(destCompanyId)}
                        onSourceProjectChange={setSourceProject}
                        onDestProjectChange={setDestProject}
                    />
                    {sourceProject && destProject ? (
                        <div className="mt-6">
                            <MigrationTab 
                                scope="project"
                                sourceId={Number(sourceProject)}
                                destId={Number(destProject)}
                                sourceName={`Project #${sourceProject}`}
                            />
                        </div>
                    ) : (
                        <Card className="mt-6 bg-zinc-900/50 border-dashed border-zinc-800 text-center py-20">
                            <Text type="secondary">Select projects to migrate project-level documents.</Text>
                        </Card>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="p-8 max-w-6xl mx-auto text-zinc-200">
            <div className="mb-8">
                <Title level={2} className="flex items-center gap-3 !text-zinc-100">
                    <FolderTree className="text-green-500 w-8 h-8" />
                    Global Documents Migration
                </Title>
                <Paragraph className="text-zinc-400">
                    Recursively migrate folders and files at both Company and Project levels.
                </Paragraph>
            </div>

            <Tabs 
                defaultActiveKey="company" 
                items={items} 
                className="document-tabs"
                type="card"
            />

            <div className="mt-12 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
                <div className="flex gap-4">
                    <AlertCircle className="w-6 h-6 text-orange-500 shrink-0" />
                    <div>
                        <Text strong className="text-zinc-200 block mb-1">Deduplication Logic</Text>
                        <Text className="text-zinc-500 text-xs">
                            The migrator checks for existing files by Procore ID (mapping table) and then by name. 
                            Files are only updated if the source version is newer than the destination version.
                        </Text>
                    </div>
                </div>
            </div>
        </div>
    );
};
