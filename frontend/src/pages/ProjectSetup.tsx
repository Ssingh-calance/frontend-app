import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Typography, Card, Table, Select, message, Tag, Space, Alert } from 'antd';
import { Network, Link2 } from 'lucide-react';
import { apiClient } from '../api/client';

const { Title, Paragraph, Text } = Typography;

interface ProjectData {
  id: number;
  name: string;
  is_active: boolean;
}

interface MappingInfo {
  dest_id: number | string;
  [key: string]: unknown;
}

interface MapPayload {
  source_project_id: number;
  dest_project_id: number;
  source_name: string;
  dest_name: string;
}

export const ProjectSetup: React.FC = () => {
  const sourceCompanyId = sessionStorage.getItem('source_company_id');
  const destCompanyId = sessionStorage.getItem('dest_company_id');
  const sourceCompanyName = sessionStorage.getItem('source_company_name');
  const destCompanyName = sessionStorage.getItem('dest_company_name');

  // Fetch Source Projects
  const { data: sourceProjects, isLoading: loadingSource } = useQuery({
    queryKey: ['projects', sourceCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/company/${sourceCompanyId}`);
      return res.data as ProjectData[];
    },
    enabled: !!sourceCompanyId
  });

  // Fetch Dest Projects
  const { data: destProjects, isLoading: loadingDest } = useQuery({
    queryKey: ['projects', destCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/company/${destCompanyId}`);
      return res.data as ProjectData[];
    },
    enabled: !!destCompanyId
  });

  // Fetch Global Central Mappings
  const { data: mappings = {}, refetch: refetchMappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['project-mappings', destCompanyId],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/mappings`, {
        params: { dest_company_id: destCompanyId }
      });
      return res.data as Record<string, MappingInfo>;
    },
    enabled: !!destCompanyId
  });

  const mapMutation = useMutation({
    mutationFn: async (payload: MapPayload) => {
      return await apiClient.post('/projects/map', {
        source_company_id: Number(sourceCompanyId),
        dest_company_id: Number(destCompanyId),
        source_project_id: payload.source_project_id,
        dest_project_id: payload.dest_project_id,
        source_project_name: payload.source_name,
        dest_project_name: payload.dest_name
      });
    },
    onSuccess: () => {
      message.success('Project mapped successfully');
      refetchMappings();
    },
    onError: (err: unknown) => {
      const errorMessage =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Failed to map project';

      message.error(errorMessage);
    }
  });

  const columns = [
    {
      title: 'Source Project (From)',
      dataIndex: 'name',
      key: 'name',
      width: '35%',
      render: (text: string, record: ProjectData) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-zinc-200">{text}</Text>
          <Text type="secondary" className="text-xs">ID: {record.id}</Text>
        </Space>
      )
    },
    {
      title: 'Global Mapping Status',
      key: 'status',
      width: '15%',
      render: (_: unknown, record: ProjectData) => {
        const isMapped = mappings[record.id.toString()];
        return isMapped ? (
          <Tag color="success" icon={<Link2 size={12} className="mr-1 inline" />}>Mapped</Tag>
        ) : (
          <Tag color="default">Unmapped</Tag>
        );
      }
    },
    {
      title: 'Destination Project (To)',
      key: 'destination',
      width: '35%',
      render: (_: unknown, record: ProjectData) => {
        const mappingInfo = mappings[record.id.toString()];
        const mappedDestId = mappingInfo ? Number(mappingInfo.dest_id) : undefined;
        const activeDestProjects = (destProjects || []).filter((p) => p.is_active);

        return (
          <Select
            className="w-full"
            placeholder="Select destination project"
            value={mappedDestId}
            options={activeDestProjects.map((p) => ({
              label: p.name,
              value: p.id
            }))}
            onChange={(val: number) => {
              const selectedProject = activeDestProjects.find((p) => p.id === val);
              if (!selectedProject) return;

              mapMutation.mutate({
                source_project_id: record.id,
                dest_project_id: val,
                source_name: record.name,
                dest_name: selectedProject.name
              });
            }}
            loading={mapMutation.isPending && mapMutation.variables?.source_project_id === record.id}
          />
        );
      }
    }
  ];

  if (!sourceCompanyId || !destCompanyId) {
    return (
      <div className="p-8">
        <Alert
          type="error"
          message="Migration Not Configured"
          description="Please select source and destination companies in the Company Setup page first."
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto text-zinc-200">
      <div className="mb-8">
        <Title level={2} className="flex items-center gap-3 !text-zinc-100">
          <Network className="text-indigo-500" />
          Centralized Project Mapping
        </Title>
        <Paragraph className="text-zinc-400">
          Map your source projects from <Tag color="orange">{sourceCompanyName}</Tag> to existing projects in <Tag color="blue">{destCompanyName}</Tag>.
          This is a global mapping: once mapped here, the destination project is locked and automatically applied across all migration sub-tools (Action Plans, RFIs, etc.).
        </Paragraph>
      </div>

      <Card
        className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden rounded-xl"
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={sourceProjects}
          columns={columns}
          rowKey="id"
          loading={loadingSource || loadingDest || loadingMappings}
          pagination={{ pageSize: 20 }}
          className="custom-table"
        />
      </Card>
    </div>
  );
};