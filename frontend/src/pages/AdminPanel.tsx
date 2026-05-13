import React, { useMemo, useState } from 'react';
import { Card, Table, Tag, Button, Switch, message, Space, Typography, Divider, Tabs, Avatar, Badge, Tooltip, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  User,
  ShieldCheckIcon,
  RefreshCwIcon,
  CheckCircle,
  XCircle,
  LayoutDashboard,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

interface ProcoreUser {
  id: string;
  name: string;
  email: string;
  allowed_apps: string[];
  is_admin: boolean;
}

interface AccessRequest {
  id: number;
  user_id: string;
  user_email: string;
  user_name?: string;
  app_slug: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

interface AppKey {
  key: string;
  label: string;
}

const appKeys: AppKey[] = [
  { key: 'project-admin', label: 'Project Mapping' },
  { key: 'action-plans', label: 'Action Plans' },
  { key: 'documents', label: 'Documents' },
  { key: 'daily-log', label: 'Daily Log' },
  { key: 'inspections', label: 'Inspections' },
  { key: 'rfis', label: 'RFIs' },
  { key: 'submittals', label: 'Submittals' },
  { key: 'specifications', label: 'Specs' },
  { key: 'correspondence', label: 'Correspondence' },
  { key: 'photos', label: 'Photos' },
  { key: 'drawings', label: 'Drawings' },
  { key: 'rfp', label: 'RFP' },
  { key: 'pcos', label: 'PCOs' },
  { key: 'prime-contracts', label: 'Prime Contracts' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'budgets', label: 'Budgets' }
];

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { companyId: sessionCompanyId } = useAuthStore();
  const destCompanyId = sessionStorage.getItem('dest_company_id');
  const targetCompanyId = destCompanyId || sessionCompanyId;
  const targetCompanyName = sessionStorage.getItem('dest_company_name') || sessionStorage.getItem('CompanyName') || 'This Company';

  const [searchText, setSearchText] = useState('');

  const {
    data: users = [],
    isLoading: loading,
    refetch: refetchUsers
  } = useQuery<ProcoreUser[]>({
    queryKey: ['admin-users', targetCompanyId],
    enabled: !!targetCompanyId,
    queryFn: async () => {
      const response = await apiClient.get('/admin/users', {
        params: { company_id: targetCompanyId }
      });
      return response.data as ProcoreUser[];
    }
  });

  const {
    data: requests = [],
    isLoading: reqLoading,
    refetch: refetchRequests
  } = useQuery<AccessRequest[]>({
    queryKey: ['admin-access-requests', targetCompanyId],
    enabled: !!targetCompanyId,
    queryFn: async () => {
      const response = await apiClient.get('/admin/access-requests', {
        params: { company_id: targetCompanyId, status: 'pending' }
      });
      return response.data as AccessRequest[];
    }
  });

  const handlePermissionToggle = async (userId: string, appKey: string, checked: boolean) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    let newAllowed = [...user.allowed_apps];
    if (checked) {
      if (!newAllowed.includes(appKey)) newAllowed.push(appKey);
    } else {
      newAllowed = newAllowed.filter((a) => a !== appKey);
    }

    try {
      await apiClient.put('/admin/permissions', {
        user_id: userId,
        company_id: parseInt(String(targetCompanyId || '0'), 10),
        allowed_apps: newAllowed
      });

      message.success(`Permission updated for ${user.name}`);
      await Promise.all([refetchUsers(), refetchRequests()]);
    } catch {
      message.error('Failed to update permission');
    }
  };

  const handleResolveRequest = async (requestId: number, status: 'approved' | 'denied') => {
    try {
      await apiClient.post(
        `/admin/access-requests/resolve/${requestId}`,
        { status },
        { params: { company_id: targetCompanyId } }
      );

      message.success(`Request ${status} successfully`);
      await refetchRequests();
      if (status === 'approved') await refetchUsers();
    } catch {
      message.error('Failed to resolve request');
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchText.toLowerCase()) ||
          user.email.toLowerCase().includes(searchText.toLowerCase())
      ),
    [users, searchText]
  );

  const columns: ColumnsType<ProcoreUser> = [
    {
      title: 'User',
      key: 'user',
      fixed: 'left',
      width: 250,
      render: (_value: unknown, record: ProcoreUser) => (
        <Space>
          <Avatar icon={<User className="w-3 h-3" />} size="small" />
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{record.name}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">{record.email}</div>
          </div>
          {record.is_admin && <Tag color="orange" className="ml-1 text-[10px]">ADMIN</Tag>}
        </Space>
      )
    },
    ...appKeys.map((app) => ({
      title: app.label,
      key: app.key,
      align: 'center' as const,
      width: 120,
      render: (_value: unknown, record: ProcoreUser) => (
        <div className="flex items-center justify-center gap-2">
          <Switch
            size="small"
            checked={record.allowed_apps.includes(app.key)}
            onChange={(checked: boolean) => void handlePermissionToggle(record.id, app.key, checked)}
          />
          {requests.some((r) => r.user_id === record.id && r.app_slug === app.key && r.status === 'pending') && (
            <Tooltip title="Access Requested">
              <Badge status="processing" color="blue" />
            </Tooltip>
          )}
        </div>
      )
    }))
  ];

  const items = [
    {
      key: 'users',
      label: 'User Permissions',
      children: (
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex justify-between items-center gap-4">
            <div className="flex-1">
              <Title level={4} className="!mb-1">App Access Matrix</Title>
              <Text type="secondary">Toggle access to specific migration tools for each user in your company.</Text>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search users by name or email..."
                prefix={<Search size={16} className="text-zinc-400" />}
                className="max-w-xs"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
              <Button icon={<RefreshCwIcon size={14} className="mr-2" />} onClick={() => void refetchUsers()} loading={loading}>
                Refresh Users
              </Button>
            </div>
          </div>
          <Table
            columns={columns}
            dataSource={filteredUsers}
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 15 }}
            className="border border-zinc-100 rounded-lg"
          />
        </Card>
      )
    },
    {
      key: 'requests',
      label: (
        <Badge count={requests.length} size="small" offset={[10, 0]}>
          <span className="pr-2">Access Requests</span>
        </Badge>
      ),
      children: (
        <Card className="shadow-sm border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Title level={4} className="!mb-1">Access Requests</Title>
              <Text type="secondary">
                Manage pending permissions for: <span className="font-bold">{targetCompanyName || targetCompanyId}</span>
              </Text>
            </div>
            <Button icon={<RefreshCwIcon size={14} className="mr-2" />} onClick={() => void refetchRequests()} loading={reqLoading}>
              Refresh Requests
            </Button>
          </div>
          <Table<AccessRequest>
            dataSource={requests}
            loading={reqLoading}
            rowKey="id"
            columns={[
              {
                title: 'User',
                render: (_value: unknown, r: AccessRequest) => (
                  <Space>
                    <Avatar icon={<User className="w-3 h-3" />} size="small" />
                    <div>
                      <div className="font-medium">{r.user_name || 'Unknown'}</div>
                      <div className="text-xs text-zinc-500">{r.user_email}</div>
                    </div>
                  </Space>
                )
              },
              {
                title: 'App Requested',
                dataIndex: 'app_slug',
                render: (slug: string) => <Tag color="blue">{slug.toUpperCase()}</Tag>
              },
              {
                title: 'Date',
                dataIndex: 'created_at',
                render: (date: string) => <Text type="secondary" className="text-xs">{new Date(date).toLocaleDateString()}</Text>
              },
              {
                title: 'Actions',
                align: 'right',
                render: (_value: unknown, r: AccessRequest) => (
                  <Space>
                    <Button
                      type="primary"
                      size="small"
                      icon={<CheckCircle size={14} className="mr-1" />}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => void handleResolveRequest(r.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<XCircle size={14} className="mr-1" />}
                      onClick={() => void handleResolveRequest(r.id, 'denied')}
                    >
                      Deny
                    </Button>
                  </Space>
                )
              }
            ]}
          />
        </Card>
      )
    },
    {
      key: 'config',
      label: 'Organization Config',
      children: (
        <Card title="Company-wide Settings" className="shadow-sm border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
          <Text type="secondary">Global settings for Company ID: {targetCompanyId}</Text>
          <div className="mt-4 p-8 bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl text-center">
            <Text type="secondary">No global settings configured yet.</Text>
          </div>
        </Card>
      )
    }
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <Space direction="vertical" size={2}>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="text-orange-600 w-8 h-8" />
            <Title level={2} className="!mb-0 uppercase tracking-tight">Admin Control Center</Title>
          </div>
          <Text type="secondary">Centralized management for migration tools and user authorization.</Text>
        </Space>

        <Button
          type="text"
          icon={<LayoutDashboard className="w-4 h-4 mr-2" />}
          className="flex items-center text-zinc-600 hover:text-orange-600 font-bold"
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      <Divider className="!my-0" />

      <Tabs defaultActiveKey="users" items={items} className="admin-tabs" />
    </div>
  );
};

export default AdminPanel;