import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useSyncQueueStore } from '../store/syncQueueStore';
import { useSyncProgress } from '../hooks/useSyncProgress';
import {
    Camera,
    ChevronRight,
    ChevronDown,
    Image,
    ArrowRight,
    RefreshCw,
    Search,
    LayoutGrid,
    List,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    FolderOpen,
} from 'lucide-react';
import { InfinityLoader } from '../components/InfinityLoader';
import {
    Button,
    Card,
    Typography,
    message,
    Space,
    Tag,
    Input,
    Tooltip,
    Empty,
    Spin,
    Checkbox,
} from 'antd';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { AccessRequestBanner } from '../components/AccessRequestBanner';

const { Title, Paragraph, Text } = Typography;

interface PhotoAlbum {
    id: number;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    count?: number;
}

interface Photo {
    id: number;
    name: string;
    filename?: string;
    url: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    content_type?: string;
}

// ─── Reusable migrate button ────────────────────────────────────────────────
const MigrateBtn = ({ isSynced, loading, onClick, size = 'small', text, progress }: {
    isSynced: boolean; loading: boolean; onClick: () => void; size?: 'small' | 'middle'; text?: string; progress?: number;
}) => {
    if (progress !== undefined && progress > 0 && loading) {
        return (
            <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <Text className="text-[10px] text-orange-600 font-bold">{Math.round(progress)}%</Text>
            </div>
        );
    }
    
    return (
        <Tooltip title={isSynced ? 'Re-migrate' : 'Migrate to destination'}>
            <Button
                type={isSynced ? 'default' : 'primary'}
                size={size}
                onClick={e => { e.stopPropagation(); onClick(); }}
                icon={loading ? <InfinityLoader size="xs" variant="rotate" /> : <ArrowRight className="w-3 h-3" />}
                disabled={loading}
                className={isSynced
                    ? 'border-green-400 text-green-600 hover:border-green-500'
                    : 'bg-orange-600 hover:bg-orange-700 border-orange-600 flex items-center gap-2'}
            >
                {text || (loading ? 'Syncing...' : (isSynced ? 'Re-sync' : 'Migrate'))}
            </Button>
        </Tooltip>
    );
};

// ─── Single Photo Row (inside expanded album) ────────────────────────────────
const PhotoRow = ({
    photo, mapping, migrating, onMigrate, viewMode, selected, onSelect,
    sourceProjectId, destProjectId, sourceCompanyId, destCompanyId
}: {
    photo: Photo; mapping: any; migrating: boolean; onMigrate: () => void; viewMode: 'list' | 'grid';
    selected: boolean; onSelect: (id: number, checked: boolean) => void;
    sourceProjectId: number; destProjectId: number; sourceCompanyId: string | null; destCompanyId: string | null;
}) => {
    const isSynced = !!mapping;
    const syncedAt = mapping?.synced_at ? new Date(mapping.synced_at).toLocaleString() : null;
    const displayName = photo.filename || photo.name || `Photo #${photo.id}`;
    
    const jobId = `phot_s_${photo.id}`;
    const { percentage, isRunning, isWaiting } = useSyncProgress(jobId);
    
    const { addJob } = useSyncQueueStore();
    const queryClient = useQueryClient();

    const handleMigrate = () => {
        addJob(jobId, async () => {
            await apiClient.post('/sync/migrate/photo', {
                source_project_id: sourceProjectId,
                dest_project_id: destProjectId,
                source_photo_id: photo.id,
                source_company_id: sourceCompanyId,
                dest_company_id: destCompanyId,
            });
            message.success('Photo migrated!');
            queryClient.invalidateQueries({ queryKey: ['photos-photo-mappings', destProjectId] });
        });
        onMigrate(); // Still call onMigrate to allow parent to visually know it started (if needed)
    };

    const isLoading = isRunning || isWaiting || migrating;
    const displayProgress = isWaiting ? 0 : percentage;

    if (viewMode === 'grid') {
        return (
            <div className={`relative rounded-xl overflow-hidden border transition-all ${selected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-zinc-200 dark:border-zinc-700'} bg-zinc-50 dark:bg-zinc-800 group hover:shadow-lg`} onClick={() => onSelect(photo.id, !selected)}>
                {photo.url ? (
                    <img src={photo.url} alt={displayName} className="w-full h-28 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-28 flex items-center justify-center bg-zinc-200 dark:bg-zinc-700">
                        <Image className="w-8 h-8 text-zinc-400" />
                    </div>
                )}
                
                <div className="absolute top-2 left-2" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected} onChange={e => onSelect(photo.id, e.target.checked)} />
                </div>

                {isSynced && (
                    <Tooltip title={`Synced at ${syncedAt}`}>
                        <div className="absolute top-2 right-2 bg-white/80 dark:bg-black/60 backdrop-blur-sm rounded-full p-0.5">
                            <CheckCircle2 className="w-4 h-4 text-green-500 drop-shadow" />
                        </div>
                    </Tooltip>
                )}
                <div className="p-2">
                    <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate block" title={displayName}>
                        {displayName}
                    </Text>
                    {isSynced && syncedAt && (
                        <Text className="text-[9px] text-zinc-400 truncate block mt-0.5">Synced: {syncedAt}</Text>
                    )}
                    {isWaiting && <Text className="text-[9px] text-orange-500 block mt-0.5 font-medium">Waiting in queue...</Text>}
                    <div className={`mt-1 flex justify-end ${isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                        <MigrateBtn isSynced={isSynced} loading={isLoading} onClick={handleMigrate} progress={displayProgress} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-3 py-1.5 px-3 rounded-lg transition-colors group cursor-pointer ${selected ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`} onClick={() => onSelect(photo.id, !selected)}>
            <div onClick={e => e.stopPropagation()}>
                <Checkbox checked={selected} onChange={e => onSelect(photo.id, e.target.checked)} />
            </div>
            {photo.url ? (
                <img src={photo.url} alt={displayName} className="w-9 h-9 object-cover rounded border border-zinc-200 dark:border-zinc-700 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
                <div className="w-9 h-9 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded shrink-0">
                    <Image className="w-4 h-4 text-zinc-400" />
                </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col">
                <Text className="text-sm text-zinc-700 dark:text-zinc-300 truncate block" title={displayName}>
                    {displayName}
                </Text>
                <div className="flex items-center gap-2 mt-0.5">
                    {photo.updated_at && !isSynced && !isWaiting && !isRunning && (
                        <Text className="text-[10px] text-zinc-400 dark:text-zinc-600">
                            Updated: {new Date(photo.updated_at).toLocaleDateString()}
                        </Text>
                    )}
                    {isSynced && syncedAt && (
                        <Text className="text-[10px] text-green-600 dark:text-green-500">
                            Synced: {syncedAt}
                        </Text>
                    )}
                    {isWaiting && (
                        <Text className="text-[10px] text-orange-600 font-medium bg-orange-100 px-1.5 rounded">
                            Waiting...
                        </Text>
                    )}
                </div>
            </div>
            {isSynced && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
            <div className={`shrink-0 ${isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                <MigrateBtn isSynced={isSynced} loading={isLoading} onClick={handleMigrate} progress={displayProgress} />
            </div>
        </div>
    );
};

// ─── Expandable Album Item ───────────────────────────────────────────────────
const AlbumItem = ({
    album, albumMapping, migratingAlbum, onMigrateAlbum,
    sourceProjectId, destProjectId, sourceCompanyId, destCompanyId,
    viewMode, photoMappings, destAlbums, 
    selected, onSelect, selectedPhotos, onSelectPhoto, onMigrateSelectedPhotos
}: {
    album: PhotoAlbum;
    albumMapping: any;
    migratingAlbum: boolean;
    onMigrateAlbum: () => void;
    sourceProjectId: number;
    destProjectId: number;
    sourceCompanyId: string | null;
    destCompanyId: string | null;
    viewMode: 'list' | 'grid';
    photoMappings: Record<string, any>;
    destAlbums: PhotoAlbum[] | undefined;
    selected: boolean;
    onSelect: (id: number, checked: boolean) => void;
    selectedPhotos: Set<number>;
    onSelectPhoto: (id: number, checked: boolean) => void;
    onMigrateSelectedPhotos: (photoIds: number[]) => void;
}) => {
    const [expanded, setExpanded] = useState(false);
    const queryClient = useQueryClient();
    const { jobs, addJob } = useSyncQueueStore();
    
    const albumJobId = `phot_m_${album.id}`;
    const { percentage: albumPercentage, isRunning: isAlbumRunning, isWaiting: isAlbumWaiting } = useSyncProgress(albumJobId);

    const { data: photos, isLoading: loadingPhotos } = useQuery<Photo[]>({
        queryKey: ['album-photos', sourceProjectId, album.id],
        queryFn: async () => {
            const res = await apiClient.get(
                `/data/projects/${sourceProjectId}/photos/albums/${album.id}/photos`,
                { params: { company_id: sourceCompanyId, dest_company_id: destCompanyId } }
            );
            return res.data;
        },
        enabled: expanded,
    });

    // Helper function to process parent "Migrate Album" request using the queue
    const handleMigrateAlbum = () => {
        addJob(albumJobId, async () => {
            await apiClient.post('/sync/migrate/photos', {
                source_project_id: sourceProjectId,
                dest_project_id: destProjectId,
                source_resource_id: album.id,
                source_company_id: sourceCompanyId,
                dest_company_id: destCompanyId,
            });
            message.success('Album and photos migrated!');
            queryClient.invalidateQueries({ queryKey: ['photos-photo-mappings', destProjectId] });
        });
        onMigrateAlbum();
    };

    const handleMigrateSelectedPhotos = (photoIds: number[]) => {
        photoIds.forEach(id => {
            addJob(`phot_s_${id}`, async () => {
                await apiClient.post('/sync/migrate/photo', {
                    source_project_id: sourceProjectId,
                    dest_project_id: destProjectId,
                    source_photo_id: id,
                    source_company_id: sourceCompanyId,
                    dest_company_id: destCompanyId,
                });
                message.success('Photo migrated!');
                queryClient.invalidateQueries({ queryKey: ['photos-photo-mappings', destProjectId] });
            }, albumJobId);
        });
    };

    // Compute sync state and parent progress
    const photoCount = album.count ?? photos?.length;
    let syncState: 'Synced' | 'Partial' | 'Not Synced' = 'Not Synced';
    let isAlbumMapped = !!albumMapping || (destAlbums?.some(da => da.name.toLowerCase().trim() === album.name.toLowerCase().trim()) ?? false);
    
    let displayProgress = albumPercentage;
    let computedLoading = isAlbumRunning || isAlbumWaiting || migratingAlbum;

    if (photos) {
        const syncedCount = photos.filter(p => !!photoMappings[p.id]).length;
        if (photos.length > 0 && syncedCount === photos.length) syncState = 'Synced';
        else if (syncedCount > 0 || isAlbumMapped) syncState = 'Partial';
        
        // Calculate child aggregation if album is not running directly via backend
        if (!isAlbumRunning && !isAlbumWaiting) {
            let totalPercent = 0;
            let activeCount = 0;
            photos.forEach(p => {
                const isSyncedRow = !!photoMappings[p.id];
                const job = jobs[`phot_s_${p.id}`];
                
                if (isSyncedRow) {
                    totalPercent += 100;
                    activeCount++;
                } else if (job) {
                    activeCount++;
                    if (job.status === 'completed') totalPercent += 100;
                    else if (job.status === 'running') totalPercent += job.percentage;
                }
            });

            if (activeCount > 0) {
                const totalPossiblePercent = photos.length * 100;
                displayProgress = (totalPercent / totalPossiblePercent) * 100;
                if (activeCount < photos.length || displayProgress < 100) {
                    computedLoading = true;
                }
            }
        }
    } else {
        syncState = isAlbumMapped ? 'Synced' : 'Not Synced';
        
        // Handle progress calculation when collapsed
        if (!isAlbumRunning && !isAlbumWaiting) {
            const childJobs = Object.values(jobs).filter(j => j.parentId === albumJobId);
            if (childJobs.length > 0) {
                let totalPercent = 0;
                childJobs.forEach(j => {
                    if (j.status === 'completed') totalPercent += 100;
                    else if (j.status === 'running') totalPercent += j.percentage;
                });
                
                const totalCount = album.count || childJobs.length;
                displayProgress = totalPercent / totalCount;
                computedLoading = true;
            }
        }
    }
    
    // Album selection photos logic
    const albumPhotoIds = photos?.map(p => p.id) || [];
    const selectedPhotosInAlbum = albumPhotoIds.filter(id => selectedPhotos.has(id));
    
    const toggleSelectAllPhotos = (checked: boolean) => {
        if (!photos) return;
        photos.forEach(p => onSelectPhoto(p.id, checked));
    };

    const isFullySynced = syncState === 'Synced';

    const getTagColor = () => {
        if (syncState === 'Synced') return 'success';
        if (syncState === 'Partial') return 'warning';
        return 'default';
    };

    if (viewMode === 'grid') {
        return (
            <div className={`group rounded-xl border ${selected ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-zinc-200 dark:border-zinc-700'} overflow-hidden hover:shadow-md transition-all bg-white dark:bg-zinc-900 flex flex-col h-full`}>
                {/* Album card */}
                <div
                    className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex-1"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-start gap-3 mb-3">
                        <div onClick={e => e.stopPropagation()} className="mt-0.5">
                            <Checkbox checked={selected} onChange={e => onSelect(album.id, e.target.checked)} />
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                            <FolderOpen className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <Text strong className="text-sm text-zinc-800 dark:text-zinc-200 truncate block">{album.name}</Text>
                            {photoCount !== undefined && (
                                <Text className="text-[10px] text-zinc-400">{photoCount} photo{photoCount !== 1 ? 's' : ''}</Text>
                            )}
                        </div>
                        {expanded ? <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between">
                        {album.updated_at && (
                            <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                                <Clock className="w-3 h-3" />
                                {new Date(album.updated_at).toLocaleDateString()}
                            </span>
                        )}
                        <Tag color={getTagColor()} className="text-[10px] m-0">
                            {syncState}
                        </Tag>
                    </div>
                </div>
                <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2 flex justify-between items-center">
                    <span className="text-[9px] text-zinc-400">{isFullySynced ? (albumMapping?.synced_at ? `Last synced: ${new Date(albumMapping.synced_at).toLocaleDateString()}` : '') : ''}</span>
                    <div className={`${computedLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                        <MigrateBtn isSynced={isFullySynced} loading={computedLoading} onClick={handleMigrateAlbum} progress={displayProgress} />
                    </div>
                </div>

                {/* Expanded photos grid */}
                {expanded && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-800/30">
                        {loadingPhotos ? (
                            <div className="flex justify-center py-4"><InfinityLoader size="sm" /></div>
                        ) : photos && photos.length > 0 ? (
                            <>
                                <div className="flex justify-between items-center mb-3">
                                    <Checkbox 
                                        onChange={e => toggleSelectAllPhotos(e.target.checked)} 
                                        checked={selectedPhotosInAlbum.length === albumPhotoIds.length && albumPhotoIds.length > 0}
                                        indeterminate={selectedPhotosInAlbum.length > 0 && selectedPhotosInAlbum.length < albumPhotoIds.length}
                                    >
                                        <Text className="text-xs">Select All</Text>
                                    </Checkbox>
                                    {selectedPhotosInAlbum.length > 0 && (
                                        <Button 
                                            size="small" 
                                            type="primary" 
                                            onClick={(e) => { e.stopPropagation(); handleMigrateSelectedPhotos(selectedPhotosInAlbum); }}
                                            className="bg-orange-500 hover:bg-orange-600 border-none text-xs"
                                        >
                                            Migrate Selected ({selectedPhotosInAlbum.length})
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {photos.map(photo => (
                                        <PhotoRow
                                            key={photo.id}
                                            photo={photo}
                                            mapping={photoMappings[photo.id]}
                                            migrating={false}
                                            onMigrate={() => {}} // Disabled as the row uses queue internally now
                                            viewMode="grid"
                                            selected={selectedPhotos.has(photo.id)}
                                            onSelect={onSelectPhoto}
                                            sourceProjectId={sourceProjectId}
                                            destProjectId={destProjectId}
                                            sourceCompanyId={sourceCompanyId}
                                            destCompanyId={destCompanyId}
                                        />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <Text type="secondary" className="text-xs italic">No photos in this album.</Text>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── List mode ──
    return (
        <div className={`border ${selected ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-zinc-100 dark:border-zinc-800'} rounded-xl overflow-hidden mb-1 bg-white dark:bg-zinc-900 transition-all`}>
            {/* Album row */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group"
                onClick={() => setExpanded(!expanded)}
            >
                <div onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selected} onChange={e => onSelect(album.id, e.target.checked)} />
                </div>
                <span className="text-zinc-400 w-4 shrink-0">
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 shrink-0">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <Text strong className="text-sm text-zinc-800 dark:text-zinc-200 block truncate">{album.name}</Text>
                    <div className="flex items-center gap-3 mt-0.5">
                        {photoCount !== undefined && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Camera className="w-3 h-3" />{photoCount} photo{photoCount !== 1 ? 's' : ''}
                            </span>
                        )}
                        {album.updated_at && (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{new Date(album.updated_at).toLocaleDateString()}
                            </span>
                        )}
                        {albumMapping?.synced_at && isFullySynced && (
                            <span className="text-[10px] text-green-600 dark:text-green-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />Synced {new Date(albumMapping.synced_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
                <Tag color={getTagColor()} className="text-[10px] shrink-0">
                    {syncState}
                </Tag>
                <div className={`shrink-0 ${computedLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`} onClick={e => e.stopPropagation()}>
                    <MigrateBtn isSynced={isFullySynced} loading={computedLoading} onClick={handleMigrateAlbum} progress={displayProgress} />
                </div>
            </div>

            {/* Expanded photos list */}
            {expanded && (
                <div className="border-t border-zinc-100 dark:border-zinc-800 ml-10 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-800/20">
                    {loadingPhotos ? (
                        <div className="flex items-center gap-2 py-2 text-zinc-400 text-xs">
                            <InfinityLoader size="xs" /> Loading photos...
                        </div>
                    ) : photos && photos.length > 0 ? (
                        <div className="space-y-1">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <Checkbox 
                                    onChange={e => toggleSelectAllPhotos(e.target.checked)} 
                                    checked={selectedPhotosInAlbum.length === albumPhotoIds.length && albumPhotoIds.length > 0}
                                    indeterminate={selectedPhotosInAlbum.length > 0 && selectedPhotosInAlbum.length < albumPhotoIds.length}
                                >
                                    <Text className="text-xs">Select All</Text>
                                </Checkbox>
                                {selectedPhotosInAlbum.length > 0 && (
                                    <Button 
                                        size="small" 
                                        type="primary" 
                                        onClick={(e) => { e.stopPropagation(); handleMigrateSelectedPhotos(selectedPhotosInAlbum); }}
                                        className="bg-orange-500 hover:bg-orange-600 border-none text-xs"
                                    >
                                        Migrate Selected ({selectedPhotosInAlbum.length})
                                    </Button>
                                )}
                            </div>
                            {photos.map(photo => (
                                <PhotoRow
                                    key={photo.id}
                                    photo={photo}
                                    mapping={photoMappings[photo.id]}
                                    migrating={false}
                                    onMigrate={() => {}}
                                    viewMode="list"
                                    selected={selectedPhotos.has(photo.id)}
                                    onSelect={onSelectPhoto}
                                    sourceProjectId={sourceProjectId}
                                    destProjectId={destProjectId}
                                    sourceCompanyId={sourceCompanyId}
                                    destCompanyId={destCompanyId}
                                />
                            ))}
                        </div>
                    ) : (
                        <Text type="secondary" className="text-xs italic py-2 block">No photos in this album.</Text>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export const PhotosMigration = () => {
    const [sourceProjectId, setSourceProjectId] = useState<number | null>(null);
    const [destProjectId, setDestProjectId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    
    // Selection state
    const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set());
    const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set());
    const [migratingAlbums, setMigratingAlbums] = useState<Set<number>>(new Set());
    
    const queryClient = useQueryClient();

    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const destCompanyId = sessionStorage.getItem('dest_company_id');

    const { data: sourceAlbums, isLoading: loadingSource, refetch: refetchSource } = useQuery<PhotoAlbum[]>({
        queryKey: ['photos-albums-source', sourceProjectId],
        queryFn: async () => {
            const res = await apiClient.get(`/data/projects/${sourceProjectId}/photos/albums`, {
                params: { company_id: sourceCompanyId, dest_company_id: destCompanyId }
            });
            return res.data;
        },
        enabled: !!sourceProjectId,
    });

    const { data: destAlbums, refetch: refetchDest } = useQuery<PhotoAlbum[]>({
        queryKey: ['photos-albums-dest', destProjectId],
        queryFn: async () => {
            const res = await apiClient.get(`/data/projects/${destProjectId}/photos/albums`, {
                params: { company_id: destCompanyId, dest_company_id: destCompanyId }
            });
            return res.data;
        },
        enabled: !!destProjectId,
    });

    const { data: albumMappings, refetch: refetchAlbumMappings } = useQuery<Record<string, any>>({
        queryKey: ['photos-mappings', destProjectId],
        queryFn: async () => {
            const res = await apiClient.get('/sync/mappings', {
                params: { dest_project_id: destProjectId, dest_company_id: destCompanyId, entity_type: 'photo_album' }
            });
            return res.data.mappings ?? {};
        },
        enabled: !!destProjectId,
    });

    const { data: photoMappings } = useQuery<Record<string, any>>({
        queryKey: ['photos-photo-mappings', destProjectId],
        queryFn: async () => {
            const res = await apiClient.get('/sync/mappings', {
                params: { dest_project_id: destProjectId, dest_company_id: destCompanyId, entity_type: 'photo' }
            });
            return res.data.mappings ?? {};
        },
        enabled: !!destProjectId,
    });

    const migrateAlbumMutation = useMutation({
        mutationFn: async (albumId: number) => {
            setMigratingAlbums(prev => new Set(prev).add(albumId));
            return apiClient.post('/sync/migrate/photos', {
                source_project_id: sourceProjectId,
                dest_project_id: destProjectId,
                source_resource_id: albumId,
                source_company_id: sourceCompanyId,
                dest_company_id: destCompanyId,
            });
        },
        onSuccess: (_, albumId) => {
            message.success('Album and photos migrated!');
            setMigratingAlbums(prev => { const s = new Set(prev); s.delete(albumId); return s; });
            setSelectedAlbums(prev => { const s = new Set(prev); s.delete(albumId); return s; });
            refetchAlbumMappings();
            queryClient.invalidateQueries({ queryKey: ['photos-photo-mappings', destProjectId] });
        },
        onError: (err: any, albumId) => {
            message.error(`Album migration failed: ${err.response?.data?.detail || err.message}`);
            setMigratingAlbums(prev => { const s = new Set(prev); s.delete(albumId); return s; });
        },
    });

    const photoMigrateMutation = useMutation({
        mutationFn: async (photoId: number) => {
            return apiClient.post('/sync/migrate/photo', {
                source_project_id: sourceProjectId,
                dest_project_id: destProjectId,
                source_photo_id: photoId,
                source_company_id: sourceCompanyId,
                dest_company_id: destCompanyId,
            });
        },
        onSuccess: (_, photoId) => {
            setSelectedPhotos(prev => { const s = new Set(prev); s.delete(photoId); return s; });
            queryClient.invalidateQueries({ queryKey: ['photos-photo-mappings', destProjectId] });
        },
        onError: (err: any) => {
            message.error(`Photo migration failed: ${err.response?.data?.detail || err.message}`);
        },
    });

    const filteredAlbums = useMemo(() =>
        (sourceAlbums ?? []).filter(a => a.name.toLowerCase().includes(search.toLowerCase())),
        [sourceAlbums, search]
    );

    const isAlbumFullySynced = (album: PhotoAlbum) => {
        return !!albumMappings?.[String(album.id)]; // Approx, precise dynamically in Item
    };

    const syncedCount = filteredAlbums.filter(isAlbumFullySynced).length;

    const { data: myPermissions } = useQuery({
        queryKey: ['my-permissions', destProjectId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-permissions', {
                params: { company_id: destCompanyId }
            });
            return res.data as string[];
        },
        enabled: !!destCompanyId
    });

    const hasPermission = myPermissions?.includes('photos');

    const handleSelectAlbum = (id: number, checked: boolean) => {
        setSelectedAlbums(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const handleSelectPhoto = (id: number, checked: boolean) => {
        setSelectedPhotos(prev => {
            const next = new Set(prev);
            if (checked) next.add(id);
            else next.delete(id);
            return next;
        });
    };

    const handleSelectAllFilteredAlbums = (checked: boolean) => {
        if (checked) {
            setSelectedAlbums(new Set(filteredAlbums.map(a => a.id)));
        } else {
            setSelectedAlbums(new Set());
        }
    };

    const migrateSelectedAlbums = () => {
        selectedAlbums.forEach(albumId => {
            if (!migratingAlbums.has(albumId)) {
                migrateAlbumMutation.mutate(albumId);
            }
        });
    };

    const migrateSelectedPhotos = async (photoIds: number[]) => {
        message.info(`Migrating ${photoIds.length} photo(s)...`);
        for (const pid of photoIds) {
            await photoMigrateMutation.mutateAsync(pid).catch(() => {});
        }
        message.success(`Completed migrating ${photoIds.length} photo(s)!`);
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <Title level={2} className="!text-zinc-900 dark:!text-zinc-100 flex items-center gap-3 !mb-1">
                    <Camera className="w-8 h-8 text-rose-500" />
                    Photos Migration
                </Title>
                <Paragraph className="text-zinc-500 dark:text-zinc-400 !mb-0">
                    Browse albums, preview photos, and selectively migrate individual photos or entire albums.
                </Paragraph>
            </div>

            <div className="mb-6">
                {!hasPermission && (
                    <AccessRequestBanner 
                        appSlug="photos" 
                        companyId={destCompanyId || ''} 
                        title="Photos Migration Access Restricted"
                        description="You need 'Photos' migration permissions to perform this operation."
                    />
                )}
            </div>

            <GlobalProjectSelector
                sourceCompanyId={String(sourceCompanyId)}
                destCompanyId={String(destCompanyId)}
                onSourceProjectChange={setSourceProjectId}
                onDestProjectChange={setDestProjectId}
            />

            {sourceProjectId && destProjectId ? (
                <Card
                    className="mt-8 border-zinc-200 dark:border-zinc-800 shadow-lg overflow-hidden flex flex-col"
                    styles={{ body: { padding: 0 } }}
                >
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
                        <div className="flex items-center gap-3">
                            <Checkbox 
                                onChange={e => handleSelectAllFilteredAlbums(e.target.checked)}
                                checked={selectedAlbums.size === filteredAlbums.length && filteredAlbums.length > 0}
                                indeterminate={selectedAlbums.size > 0 && selectedAlbums.size < filteredAlbums.length}
                            />
                            <Input
                                placeholder="Search albums..."
                                prefix={<Search className="w-4 h-4 text-zinc-400" />}
                                allowClear
                                onChange={e => setSearch(e.target.value)}
                                className="w-64 h-9"
                            />
                        </div>
                        <Space>
                            {selectedAlbums.size > 0 && (
                                <Button 
                                    type="primary" 
                                    className="bg-orange-600 hover:bg-orange-700 border-none"
                                    onClick={migrateSelectedAlbums}
                                    loading={migrateAlbumMutation.isPending}
                                    disabled={migrateAlbumMutation.isPending || !hasPermission}
                                >
                                    Migrate Selected Albums ({selectedAlbums.size})
                                </Button>
                            )}
                            <Button
                                icon={<RefreshCw className={`w-4 h-4 ${loadingSource ? 'animate-spin' : ''}`} />}
                                type="text"
                                onClick={() => { refetchSource(); refetchDest(); refetchAlbumMappings(); }}
                            />
                            <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                >
                                    <List className="w-3.5 h-3.5" /> List
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1.5 flex items-center gap-1.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" /> Grid
                                </button>
                            </div>
                        </Space>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {loadingSource ? (
                            <div className="flex justify-center items-center py-20">
                                <Spin size="large" />
                            </div>
                        ) : filteredAlbums.length === 0 ? (
                            <Empty description="No photo albums found." className="py-16" />
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredAlbums.map(album => (
                                    <AlbumItem
                                        key={album.id}
                                        album={album}
                                        albumMapping={albumMappings?.[album.id]}
                                        destAlbums={destAlbums}
                                        migratingAlbum={migratingAlbums.has(album.id)}
                                        onMigrateAlbum={() => migrateAlbumMutation.mutate(album.id)}
                                        sourceProjectId={sourceProjectId}
                                        destProjectId={destProjectId}
                                        sourceCompanyId={sourceCompanyId}
                                        destCompanyId={destCompanyId}
                                        viewMode="grid"
                                        photoMappings={photoMappings ?? {}}
                                        selected={selectedAlbums.has(album.id)}
                                        onSelect={handleSelectAlbum}
                                        selectedPhotos={selectedPhotos}
                                        onSelectPhoto={handleSelectPhoto}
                                        onMigrateSelectedPhotos={migrateSelectedPhotos}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredAlbums.map(album => (
                                    <AlbumItem
                                        key={album.id}
                                        album={album}
                                        albumMapping={albumMappings?.[album.id]}
                                        destAlbums={destAlbums}
                                        migratingAlbum={migratingAlbums.has(album.id)}
                                        onMigrateAlbum={() => migrateAlbumMutation.mutate(album.id)}
                                        sourceProjectId={sourceProjectId}
                                        destProjectId={destProjectId}
                                        sourceCompanyId={sourceCompanyId}
                                        destCompanyId={destCompanyId}
                                        viewMode="list"
                                        photoMappings={photoMappings ?? {}}
                                        selected={selectedAlbums.has(album.id)}
                                        onSelect={handleSelectAlbum}
                                        selectedPhotos={selectedPhotos}
                                        onSelectPhoto={handleSelectPhoto}
                                        onMigrateSelectedPhotos={migrateSelectedPhotos}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stats footer */}
                    {filteredAlbums.length > 0 && (
                        <div className="px-5 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 flex items-center gap-4 text-xs text-zinc-400 mt-auto">
                            <span className="flex items-center gap-1"><FolderOpen className="w-3 h-3" /> {filteredAlbums.length} albums</span>
                            <span className="flex items-center gap-1 text-green-500"><CheckCircle2 className="w-3 h-3" /> {syncedCount} completed albums</span>
                            <div className="ml-auto flex items-center gap-3">
                                <Button
                                    size="small"
                                    type="default"
                                    icon={<ArrowUpRight className="w-3 h-3" />}
                                    onClick={() => filteredAlbums.filter(a => !isAlbumFullySynced(a)).forEach(a => migrateAlbumMutation.mutate(a.id))}
                                    disabled={syncedCount === filteredAlbums.length}
                                >
                                    Migrate All Pending
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            ) : (
                <Card className="mt-8 border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="py-16 text-center max-w-sm mx-auto">
                        <Camera className="w-14 h-14 mx-auto text-zinc-300 dark:text-zinc-700 mb-4" />
                        <Title level={4} className="!text-zinc-500 dark:!text-zinc-400">Select Projects to Begin</Title>
                        <Text type="secondary">Choose a source and destination project to compare and migrate photo albums.</Text>
                    </div>
                </Card>
            )}
        </div>
    );
};
