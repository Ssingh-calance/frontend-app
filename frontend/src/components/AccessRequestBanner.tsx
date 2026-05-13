import React from 'react';
import { Card, Button, Typography, Space, message, Tag } from 'antd';
import { ShieldAlert, Send, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

interface AccessRequestBannerProps {
    appSlug: string;
    companyId: string | number;
    title?: string;
    description?: string;
}

interface AccessRequest {
    id: number;
    status: 'pending' | 'approved' | 'denied';
    app_slug: string;
}

export const AccessRequestBanner: React.FC<AccessRequestBannerProps> = ({ 
    appSlug, 
    companyId,
    title = "Access Required",
    description = "You don't have permission to perform migrations with this tool."
}) => {
    const queryClient = useQueryClient();
    const { userId, userEmail, userName } = useAuthStore();
    const normalizedSlug = appSlug.replace('_', '-');

    // Fetch user's current requests for this company
    const { data: myRequests, isLoading } = useQuery({
        queryKey: ['my-requests', companyId],
        queryFn: async () => {
            const res = await apiClient.get('/admin/my-requests', {
                params: { company_id: companyId }
            });
            return res.data as AccessRequest[];
        },
        enabled: !!companyId
    });

    const requestMutation = useMutation({
        mutationFn: async () => {
            return await apiClient.post('/admin/request-access', {
                user_id: userId || 'unknown',
                user_email: userEmail || 'unknown',
                user_name: userName || 'User',
                company_id: Number(companyId),
                app_slug: normalizedSlug
            });
        },
        onSuccess: () => {
            message.success('Access request submitted successfully');
            queryClient.invalidateQueries({ queryKey: ['my-requests'] });
        },
        onError: () => {
            message.error('Failed to submit access request');
        }
    });

    const currentRequest = myRequests?.find(r => r.app_slug === normalizedSlug);

    if (isLoading) return null;

    // Determine state
    let state: 'none' | 'pending' | 'denied' = 'none';
    if (currentRequest) {
        if (currentRequest.status === 'pending') state = 'pending';
        else if (currentRequest.status === 'denied') state = 'denied';
    }

    return (
        <Card className="mb-6 border-orange-100 bg-orange-50/30 overflow-hidden relative shadow-sm hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <ShieldAlert size={120} className="text-orange-500" />
            </div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <Space size={16} align="start">
                    <div className="p-3 bg-orange-100 rounded-xl text-orange-600 shadow-sm shadow-orange-200/50 mt-1">
                        {state === 'pending' ? <Clock size={24} /> : <ShieldAlert size={24} />}
                    </div>
                    <div>
                        <Title level={4} className="!mb-1 flex items-center gap-2">
                            {state === 'pending' ? "Access Request Pending" : title}
                            {state === 'denied' && (
                                <Tag color="error" className="ml-2 font-bold">DENIED</Tag>
                            )}
                        </Title>
                        <Text type="secondary" className="text-zinc-500 max-w-lg block">
                            {state === 'pending' 
                                ? "Your request is being reviewed by an administrator. You will be notified once access is granted."
                                : state === 'denied'
                                ? "Your previous request for this tool was denied. Please contact your organization administrator for more details."
                                : description}
                        </Text>
                    </div>
                </Space>

                <div className="shrink-0 w-full md:w-auto">
                    {state === 'none' && (
                        <Button 
                            type="primary" 
                            size="large"
                            icon={<Send size={18} className="mr-2" />}
                            className="bg-orange-600 hover:bg-orange-700 h-12 px-8 rounded-xl font-bold shadow-lg shadow-orange-200 border-none w-full md:w-auto"
                            onClick={() => requestMutation.mutate()}
                            loading={requestMutation.isPending}
                        >
                            Request Access
                        </Button>
                    )}
                    {state === 'pending' && (
                        <Button 
                            disabled
                            size="large"
                            icon={<Clock size={18} className="mr-2" />}
                            className="h-12 px-8 rounded-xl font-bold border-orange-200 text-orange-400 bg-white w-full md:w-auto"
                        >
                            Pending Approval
                        </Button>
                    )}
                    {state === 'denied' && (
                        <Button 
                            type="primary"
                            danger
                            size="large"
                            icon={<Send size={18} className="mr-2" />}
                            className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-red-200 w-full md:w-auto"
                            onClick={() => requestMutation.mutate()}
                            loading={requestMutation.isPending}
                        >
                            Re-request Access
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};
