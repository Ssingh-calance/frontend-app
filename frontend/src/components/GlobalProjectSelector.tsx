import { useState, useEffect, useMemo } from 'react';
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

interface Project {
  id: number;
  name: string;
  is_active?: boolean;
}

interface ProjectMapping {
  dest_id?: number | string;
  [key: string]: unknown;
}

type ProjectMappings = Record<string, ProjectMapping>;

export const GlobalProjectSelector = ({
  sourceCompanyId,
  destCompanyId,
  onSourceProjectChange,
  onDestProjectChange
}: GlobalProjectSelectorProps) => {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: sourceProjects, isLoading: loadingSource } = useQuery<Project[]>({
    queryKey: ['projects-source', sourceCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/company/${sourceCompanyId}`);
      return res.data as Project[];
    }
  });

  const { data: destProjects, isLoading: loadingDest } = useQuery<Project[]>({
    queryKey: ['projects-dest', destCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/company/${destCompanyId}`);
      return res.data as Project[];
    }
  });

  const { data: mappings } = useQuery<ProjectMappings>({
    queryKey: ['project-mappings', destCompanyId],
    queryFn: async () => {
      const res = await apiClient.get('/projects/mappings', {
        params: { dest_company_id: destCompanyId }
      });
      return res.data as ProjectMappings;
    },
    enabled: !!destCompanyId
  });

  const mapMutation = useMutation({
    mutationFn: async ({ sourceId, destId }: { sourceId: number; destId: number }) => {
      const sourceName = sourceProjects?.find((p) => p.id === sourceId)?.name;
      const destName = destProjects?.find((p) => p.id === destId)?.name;

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

  const mappedDestId = useMemo(() => {
    if (!selectedSourceId || !mappings) return null;
    return mappings[String(selectedSourceId)]?.dest_id ?? null;
  }, [selectedSourceId, mappings]);

  const isMapped = !!mappedDestId;

  useEffect(() => {
    if (!selectedSourceId) return;
    onDestProjectChange(mappedDestId ? Number(mappedDestId) : null);
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
          <Text type="secondary" className="block mb-2 text-xs uppercase font-bold tracking-wider">
            Source Project
          </Text>
          <Select
            placeholder="Select source project"
            className="w-full h-11"
            showSearch
            loading={loadingSource}
            onChange={handleSourceChange}
            options={sourceProjects?.map((p) => ({ label: p.name, value: p.id }))}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Col>

        <Col span={2} className="flex items-center justify-center pt-6">
          <ArrowRight className="text-zinc-300 w-5 h-5" />
        </Col>

        <Col span={11}>
          <Text type="secondary" className="block mb-2 text-xs uppercase font-bold tracking-wider">
            {isMapped ? 'Destination Project (Locked)' : 'Select Destination to Map'}
          </Text>
          <Select
            placeholder={isMapped ? 'Mapped Destination' : 'Select to map project'}
            className="w-full h-11"
            disabled={isMapped || !selectedSourceId}
            value={mappedDestId ? Number(mappedDestId) : undefined}
            loading={loadingDest || mapMutation.isPending}
            onChange={handleDestChange}
            showSearch
            options={destProjects?.map((p) => ({ label: p.name, value: p.id }))}
            filterOption={(input, option) =>
              String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
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