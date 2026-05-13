import React, { useEffect, useState } from 'react';
import { Table, Tag, Typography, Card, Input, Breadcrumb, Button, Space, Tooltip } from 'antd';
import { SearchOutlined, FileSyncOutlined, HomeOutlined, SyncOutlined, DownloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

const { Title, Text } = Typography;

interface SyncedRecord {
    id: number;
    sync_job_id: string;
    app_name?: string;
    entity_type: string;
    source_id: string;
    dest_id: string;
    dest_project_id: number;
    name?: string;
    status: string;
    sync_count?: number;
    error_message?: string;
    synced_at: string;
}

export const MigrationReport: React.FC = () => {
    const [records, setRecords] = useState<SyncedRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        fetchRecords();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/sync/records', {
                params: { limit: 1000 }
            });
            setRecords(response.data.records || []);
        } catch (error) {
            console.error('Failed to fetch records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const url = `${apiClient.defaults.baseURL}/sync/records/download`;
        window.open(url, '_blank');
    };

    const columns = [
        {
            title: 'App',
            dataIndex: 'app_name',
            key: 'app_name',
            render: (app: string) => <Tag color="purple">{app || 'Other'}</Tag>,
            sorter: (a: any, b: any) => (a.app_name || '').localeCompare(b.app_name || ''),
        },
        {
            title: 'Entity Type',
            dataIndex: 'entity_type',
            key: 'entity_type',
            render: (type: string) => <Tag color="blue">{type.replace(/_/g, ' ').toUpperCase()}</Tag>,
            filters: [
                { text: 'Action Plan', value: 'action_plan' },
                { text: 'Plan Section', value: 'action_plan_section' },
                { text: 'Plan Item', value: 'action_plan_item' },
                { text: 'RFI', value: 'rfi' },
                { text: 'RFI Reply', value: 'rfi_reply' },
            ],
            onFilter: (value: any, record: any) => record.entity_type === value,
        },
        {
            title: 'Item Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => name ? <Text strong>{name}</Text> : <Text type="secondary">N/A</Text>,
            sorter: (a: any, b: any) => (a.name || '').localeCompare(b.name || ''),
        },
        {
            title: 'Source ID',
            dataIndex: 'source_id',
            key: 'source_id',
            render: (id: string) => <Text code>{id}</Text>,
        },
        {
            title: 'Dest ID',
            dataIndex: 'dest_id',
            key: 'dest_id',
            render: (id: string) => <Text code>{id || 'N/A'}</Text>,
        },
        {
            title: 'Syncs',
            dataIndex: 'sync_count',
            key: 'sync_count',
            render: (count: number) => (
                <Tooltip title="Number of times this item has been synced">
                    <Tag color="cyan">{count || 1}</Tag>
                </Tooltip>
            ),
            sorter: (a: any, b: any) => (a.sync_count || 0) - (b.sync_count || 0),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const color = status === 'success' ? 'green' : status === 'failed' ? 'red' : 'orange';
                return <Tag color={color}>{status.toUpperCase()}</Tag>;
            },
        },
        {
            title: 'Synced At',
            dataIndex: 'synced_at',
            key: 'synced_at',
            render: (date: string) => new Date(date).toLocaleString(),
            sorter: (a: any, b: any) => new Date(a.synced_at).getTime() - new Date(b.synced_at).getTime(),
        },
        {
            title: 'Details',
            key: 'details',
            render: (_: any, record: any) => (
                record.error_message ? 
                <Text type="danger" style={{ fontSize: '12px' }}>{record.error_message}</Text> : 
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    Job: {record.sync_job_id ? record.sync_job_id.split('-')[0] : 'N/A'}...
                </Text>
            )
        }
    ];

    const filteredRecords = records.filter(r => 
        r.entity_type.toLowerCase().includes(searchText.toLowerCase()) ||
        (r.name && r.name.toLowerCase().includes(searchText.toLowerCase())) ||
        r.source_id.includes(searchText) ||
        r.dest_id?.includes(searchText)
    );

    return (
        <div style={{ padding: '0 24px' }}>
            <Breadcrumb style={{ margin: '16px 0' }}>
                <Breadcrumb.Item><Link to="/dashboard"><HomeOutlined /> Dashboard</Link></Breadcrumb.Item>
                <Breadcrumb.Item>Migration Report</Breadcrumb.Item>
            </Breadcrumb>

            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        <FileSyncOutlined style={{ marginRight: 12, color: '#f47e42' }} />
                        Migration Report
                    </Title>
                    <Text type="secondary">View detailed synchronization history for all project entities.</Text>
                </div>
                <Space size="middle">
                    <Button 
                        icon={<DownloadOutlined />} 
                        onClick={handleDownload}
                        type="primary"
                        ghost
                    >
                        Download CSV
                    </Button>
                    <Button 
                        icon={<SyncOutlined />} 
                        onClick={fetchRecords}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                    <Input
                        placeholder="Search by ID or Type..."
                        prefix={<SearchOutlined />}
                        style={{ width: 300 }}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </Space>
            </div>

            <Card className="shadow-sm">
                <Table 
                    columns={columns} 
                    dataSource={filteredRecords} 
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                    size="middle"
                />
            </Card>
        </div>
    );
};
