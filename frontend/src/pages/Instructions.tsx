import React from 'react';
import { Card, Typography, Divider, List, Space, Tag, Button } from 'antd';
import { 
  BookOutlined, 
  SettingOutlined, 
  GlobalOutlined, 
  SafetyCertificateOutlined, 
  RocketOutlined, 
  CheckCircleFilled,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Paragraph, Text } = Typography;

export const Instructions: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 text-center">
        <Title level={1} className="!mb-2 bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
          App Setup & Migration Guide
        </Title>
        <Paragraph className="text-zinc-500 text-lg">
          Follow these simple steps to configure the Procore Migration Utility and start moving your data.
        </Paragraph>
      </div>

      <Space direction="vertical" size="large" className="w-full">
        {/* Step 1: Organization Handle */}
        <Card className="shadow-sm border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <SettingOutlined className="text-2xl" />
            </div>
            <div className="flex-1">
              <Title level={3} className="!mt-0 !mb-1">1. Define your Organization Handle</Title>
              <Paragraph className="text-zinc-600">
                The migration utility uses a unique <Text strong>Organization Handle</Text> to securely group your configurations and sync history.
              </Paragraph>
              <List
                size="small"
                dataSource={[
                  'Navigate to the Admin Panel in this app.',
                  'Create a unique Handle for your company (e.g., "acme-construction").',
                  'This ID will be used in your Procore App configuration to link your account.'
                ]}
                renderItem={(item) => (
                  <List.Item className="!border-none !py-1 text-zinc-500">
                    <CheckCircleFilled className="text-emerald-500 mr-2" /> {item}
                  </List.Item>
                )}
              />
            </div>
          </div>
        </Card>

        {/* Step 2: Company Connection */}
        <Card className="shadow-sm border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <GlobalOutlined className="text-2xl" />
            </div>
            <div className="flex-1">
              <Title level={3} className="!mt-0 !mb-1">2. Select Source & Destination</Title>
              <Paragraph className="text-zinc-600">
                Data is always moved from a <Text italic>Source</Text> company to a <Text italic>Destination</Text> company.
              </Paragraph>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <Tag color="blue" className="mb-2">Source Company</Tag>
                  <Text className="block text-xs text-zinc-400 mb-1">DATA FLOW START</Text>
                  <Paragraph className="!mb-0 text-sm font-medium">The existing account containing the records you wish to move.</Paragraph>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <Tag color="emerald" className="mb-2">Destination Company</Tag>
                  <Text className="block text-xs text-zinc-400 mb-1">DATA FLOW END</Text>
                  <Paragraph className="!mb-0 text-sm font-medium">The new or target account where the records will be recreated.</Paragraph>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Step 3: Permissions */}
        <Card className="shadow-sm border-zinc-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <SafetyCertificateOutlined className="text-2xl" />
            </div>
            <div className="flex-1">
              <Title level={3} className="!mt-0 !mb-1">3. Grant App Permissions</Title>
              <Paragraph className="text-zinc-600">
                Ensure the Migration Utility app is installed in <Text strong>both</Text> companies within Procore.
              </Paragraph>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
                <Text type="warning" strong className="block mb-2 text-amber-800">Required Procore Access:</Text>
                <div className="flex flex-wrap gap-2">
                  <Tag className="!bg-white !border-amber-200 !text-amber-700">Company Level Read/Write</Tag>
                  <Tag className="!bg-white !border-amber-200 !text-amber-700">Project Level Read/Write</Tag>
                  <Tag className="!bg-white !border-amber-200 !text-amber-700">Admin access (for initial setup)</Tag>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Step 4: Migration Process */}
        <Card className="shadow-sm border-orange-100 rounded-2xl overflow-hidden bg-gradient-to-br from-white to-orange-50/30">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <RocketOutlined className="text-2xl" />
            </div>
            <div className="flex-1">
              <Title level={3} className="!mt-0 !mb-1">4. How to Migrate Data</Title>
              <Paragraph className="text-zinc-600">
                Once configured, migrating your data is a simple two-stage process.
              </Paragraph>
              
              <div className="space-y-4 mt-6">
                <div className="relative pl-8 before:content-['1'] before:absolute before:left-0 before:top-0 before:w-6 before:h-6 before:bg-orange-600 before:text-white before:rounded-full before:flex before:items-center before:justify-center before:text-xs before:font-bold">
                  <Title level={4} className="!mt-0 !mb-1 text-sm uppercase tracking-wider text-orange-700">Discovery Phase</Title>
                  <Paragraph className="text-sm !mb-0 text-zinc-500">
                    Select a tool (e.g., Photos, RFIs) and click <Text strong>Discover</Text>. The app will find all records in the source and cross-reference them with the destination to prevent duplicates.
                  </Paragraph>
                </div>
                
                <div className="relative pl-8 before:content-['2'] before:absolute before:left-0 before:top-0 before:w-6 before:h-6 before:bg-orange-600 before:text-white before:rounded-full before:flex before:items-center before:justify-center before:text-xs before:font-bold">
                  <Title level={4} className="!mt-0 !mb-1 text-sm uppercase tracking-wider text-orange-700">Sync Phase</Title>
                  <Paragraph className="text-sm !mb-0 text-zinc-500">
                    Select the specific items you wish to move and click <Text strong>Sync</Text>. You can track real-time progress through the status bar at the top of the page.
                  </Paragraph>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-center pt-8">
          <Button 
            type="primary" 
            size="large" 
            icon={<ArrowRightOutlined />} 
            className="h-12 px-8 rounded-full bg-zinc-900 border-0 hover:!bg-orange-600 shadow-xl shadow-zinc-200"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
          >
            {isAuthenticated ? 'Go to Migration Dashboard' : 'Back to Login'}
          </Button>
        </div>
      </Space>

      <Divider className="my-12 border-zinc-100" />
      
      <div className="text-center text-zinc-400 text-sm">
        <Paragraph>
          Need additional assistance? Please contact your <Text strong className="text-zinc-500">Calance Account Manager</Text> or visit our support portal.
        </Paragraph>
      </div>
    </div>
  );
};

export default Instructions;
