import { Typography, Tag, Space } from 'antd';
import { ArrowRight } from 'lucide-react';
import { GlobalProjectSelector } from '../components/GlobalProjectSelector';
import { useState } from 'react';

const { Title, Paragraph } = Typography;

interface PlaceholderMigrationAppProps {
    appName: string;
    appIcon: React.ReactNode;
    description: string;
}

export const PlaceholderMigrationApp = ({ appName, appIcon, description }: PlaceholderMigrationAppProps) => {
    const sourceCompanyId = sessionStorage.getItem('source_company_id');
    const destCompanyId = sessionStorage.getItem('dest_company_id');
    const sourceCompanyName = sessionStorage.getItem('source_company_name');
    const destCompanyName = sessionStorage.getItem('dest_company_name');

    const [srcProjId, setSrcProjId] = useState<number | null>(null);
    const [dstProjId, setDstProjId] = useState<number | null>(null);

    if (!sourceCompanyId || !destCompanyId) return null;

    return (
        <div className="p-8 max-w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Title level={2} className="flex items-center gap-3 mb-1">
                        {appIcon}
                        {appName}
                    </Title>
                    <Paragraph className="text-zinc-500 m-0">{description}</Paragraph>
                </div>
                <Space className="bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                    <Tag color="orange" className="m-0 border-none font-bold">{sourceCompanyName}</Tag>
                    <ArrowRight className="w-4 h-4 text-zinc-300" />
                    <Tag color="blue" className="m-0 border-none font-bold">{destCompanyName}</Tag>
                </Space>
            </div>

            <GlobalProjectSelector
                sourceCompanyId={sourceCompanyId}
                destCompanyId={destCompanyId}
                onSourceProjectChange={setSrcProjId}
                onDestProjectChange={setDstProjId}
            />

            {srcProjId && dstProjId ? (
                <div className="py-20 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                    <div className="text-4xl mb-4">🚧</div>
                    <h3 className="text-xl font-bold text-zinc-700 mb-2">{appName} Migration</h3>
                    <p className="text-zinc-400 max-w-md mx-auto">
                        This module is under development. Project mapping is configured and ready.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-200 text-sm text-zinc-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Project mapped: {srcProjId} → {dstProjId}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-zinc-400">
                    {appIcon}
                    <p className="mt-4">Select both source and destination projects above to begin migration.</p>
                </div>
            )}
        </div>
    );
};
