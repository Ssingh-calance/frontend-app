import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ArrowRight } from 'lucide-react';
import { Select, Alert, Row, Col, Typography } from 'antd';

const { Text } = Typography;

interface GlobalProjectSelectorProps {
    sourceCompanyId: string;
    destCompanyId: string;
    onSourceProjectChange: (id: number | null) => void;
    onDestProjectChange: (id: number | null) => void;
}

export const GlobalProjectSelector = ({ 
    sourceCompanyId, 
    destCompanyId, 
    onSourceProjectChange, 
    onDestProjectChange 
}: GlobalProjectSelectorProps) => {
    const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
    const queryClient = useQueryClient();

    const { data: sourceProjects, isLoading: loadingSource } = useQuery({
        queryKey: ['projects-source', sourceCompanyId],
        queryFn: async () => {
            const res = await apiClient.get(`/projects/company/${sourceCompanyId}`);
            return res.data;
        }
    });

    const { data: destProjects, isLoading: loadingDest } = useQuery({
        queryKey: ['projects-dest', destCompanyId],
        queryFn: async () => {
            const res = await apiClient.get(`/projects/company/${destCompanyId}`);
            return res.data;
        }
    });

    const { data: mappings } = useQuery({
        queryKey: ['project-mappings', destCompanyId],
        queryFn: async () => {
            const res = await apiClient.get(`/projects/mappings`, {
                params: { dest_company_id: destCompanyId }
            });
            return res.data;
        },
        enabled: !!destCompanyId
    });

    const mapMutation = useMutation({
        mutationFn: async ({ sourceId, destId }: { sourceId: number, destId: number }) => {
            const sourceName = sourceProjects?.find((p: any) => p.id === sourceId)?.name;
            const destName = destProjects?.find((p: any) => p.id === destId)?.name;
            const res = await apiClient.post('/projects/map', {
                source_project_id: sourceId,
                dest_project_id: destId,
                dest_company_id: Number(destCompanyId),
                source_project_name: sourceName,
                dest_project_name: destName
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-mappings'] });
        }
    });

    const mappedDestId = selectedSourceId && mappings ? mappings[selectedSourceId.toString()]?.dest_id : null;
    const isMapped = !!mappedDestId;

    useEffect(() => {
        if (selectedSourceId) {
            onDestProjectChange(mappedDestId ? Number(mappedDestId) : null);
        }
    }, [selectedSourceId, mappedDestId, onDestProjectChange]);

    const handleSourceChange = (val: number) => {
        setSelectedSourceId(val);
        onSourceProjectChange(val);
    };

    const handleDestChange = (val: number) => {
        if (!selectedSourceId) return;
        mapMutation.mutate({ sourceId: selectedSourceId, destId: val });
        onDestProjectChange(val);
    };

    return (
        <div className="mb-6">
            <Row gutter={16}>
                <Col span={11}>
                    <Text type="secondary" className="block mb-2 text-xs uppercase font-bold tracking-wider">Source Project</Text>
                    <Select
                        placeholder="Select source project"
                        className="w-full h-11"
                        showSearch
                        loading={loadingSource}
                        onChange={handleSourceChange}
                        options={sourceProjects?.map((p: any) => ({ label: p.name, value: p.id }))}
                        filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                </Col>
                <Col span={2} className="flex items-center justify-center pt-6">
                    <ArrowRight className="text-zinc-300 w-5 h-5" />
                </Col>
                <Col span={11}>
                    <Text type="secondary" className="block mb-2 text-xs uppercase font-bold tracking-wider">
                        {isMapped ? "Destination Project (Locked)" : "Select Destination to Map"}
                    </Text>
                    <Select
                        placeholder={isMapped ? "Mapped Destination" : "Select to map project"}
                        className="w-full h-11"
                        disabled={isMapped || !selectedSourceId}
                        value={mappedDestId ? Number(mappedDestId) : undefined}
                        loading={loadingDest || mapMutation.isPending}
                        onChange={handleDestChange}
                        showSearch
                        options={destProjects?.map((p: any) => ({ label: p.name, value: p.id }))}
                        filterOption={(input, option) => String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                </Col>
            </Row>
            {selectedSourceId && !isMapped && (
                <div className="mt-4">
                    <Alert 
                        type="info" 
                        showIcon 
                        message="Project Not Mapped" 
                        description="This source project is not globally mapped yet. Select a destination project above to create a permanent mapping."
                    />
                </div>
            )}
        </div>
    );
};
