import React, { useState } from 'react';
import { Typography, Card, Steps, Button, Divider, Space, Tag, Alert, Layout, Anchor, Select, Spin } from 'antd';
import { 
  RocketOutlined, 
  LoginOutlined, 
  ApartmentOutlined, 
  SafetyCertificateOutlined, 
  CameraOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import logoImg from '../assets/images/logo.png';
import { FolderOpen, RefreshCw, Search } from 'lucide-react';

const { Title, Paragraph, Text } = Typography;
const { Content, Sider } = Layout;

export const UserGuide: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const isInstructionsRoute = location.pathname === '/instructions';

    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    const [selectedAlbums, setSelectedAlbums] = useState<Set<number>>(new Set([1, 2]));
    const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set([1, 2]));

    const toggleAlbum = (id: number) => {
        const next = new Set(selectedAlbums);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedAlbums(next);
    };

    const togglePhoto = (id: number) => {
        const next = new Set(selectedPhotos);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedPhotos(next);
    };

    const handleCompanySelect = (val: string) => {
        setSelectedCompany(val);
        setIsVerifying(true);
        setIsVerified(false);
        setTimeout(() => {
            setIsVerifying(false);
            setIsVerified(true);
        }, 1500);
    };

    const allSections = [
        ...(isInstructionsRoute ? [{ title: 'Organization Setup', id: 'org' }] : []),
        { title: 'Login & Selection', id: 'login' },
        { title: 'Launching the App', id: 'launch' },
        { title: 'Authentication', id: 'auth' },
        { title: 'Setup & Mapping', id: 'mapping' },
        { title: 'Accessing Objects', id: 'access' },
        { title: 'Photos Migration', id: 'tools' }
    ];

    let sections;
    if (isInstructionsRoute) {
        sections = allSections;
    } else if (!isAuthenticated) {
        sections = allSections.slice(2);
    } else {
        sections = allSections.slice(3);
    }
    
    // Helper to get dynamic section numbers so they always start at 1
    const getSectionNum = (id: string) => sections.findIndex(s => s.id === id) + 1;

    return (
        <Layout className="min-h-screen bg-white">
            <Sider 
                width={280} 
                theme="light" 
                className="hidden lg:block border-r border-zinc-100 sticky top-0 h-screen overflow-auto px-4 py-8"
            >
                <div className="mb-8 px-4">
                    <Title level={4} className="!mb-0 text-zinc-400 uppercase tracking-widest text-xs font-bold">On This Page</Title>
                </div>
                <Anchor
                    replace
                    items={sections.map((s, idx) => ({ key: s.id, href: `#${s.id}`, title: `${idx + 1}. ${s.title}` }))}
                    className="custom-anchor"
                />
            </Sider>

            <Content className="px-6 md:px-12 py-12 max-w-4xl">
                <div className="mb-12">
                    <Tag color="orange" className="mb-4">User Guide</Tag>
                    <Title level={1} className="!mb-4 text-zinc-900 tracking-tight text-5xl font-extrabold">
                        Procore Migration: <span className="bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">Usage Guide</span>
                    </Title>
                    <Paragraph className="text-zinc-500 text-xl leading-relaxed">
                        This guide walks you through the day-to-day operations of the Procore Migration App, from initial login to successfully syncing your project data.
                    </Paragraph>
                </div>

                <Divider className="my-12" />

                <div className="w-full flex flex-col gap-[100px]">
                    {sections.some(s => s.id === 'org') && (
                        <section id="org" className="scroll-mt-24">
                            <div className="flex gap-4 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('org')}</div>
                                <Title level={2} className="!mb-0">Define your Organization Handle</Title>
                            </div>
                            <Paragraph className="text-zinc-600 text-lg">
                                The migration utility uses a unique <Text strong>Organization Handle</Text> to securely group your configurations and sync history.
                            </Paragraph>
                            <Alert
                                title="Admin Setup Required"
                                description="Navigate to the Admin Panel in this app to create a unique Handle for your company (e.g., 'acme-construction'). This ID will be used in your Procore App configuration to link your account."
                                type="warning"
                                showIcon
                                className="bg-amber-50 border-amber-100 rounded-xl mb-6"
                            />
                        </section>
                    )}

                    {sections.some(s => s.id === 'login') && (
                        <section id="login" className="scroll-mt-24">
                                <div className="flex gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('login')}</div>
                                    <Title level={2} className="!mb-0">Login to Procore</Title>
                                </div>
                                <Paragraph className="text-zinc-600 text-lg">
                                    To begin, log in to your <Text strong>Destination Company (Company 2)</Text> on the Procore platform using your standard credentials.
                                </Paragraph>
                                <Alert 
                                    title="Company Selection" 
                                    description="Ensure you select 'Company 2' from the company dropdown menu in Procore immediately after logging in."
                                    type="info"
                                    showIcon
                                    icon={<InfoCircleOutlined />}
                                    className="bg-blue-50/50 border-blue-100 rounded-xl mb-6"
                                />
                                <div className="bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-center p-12 overflow-hidden shadow-inner">
                                    <div className="bg-white rounded border border-zinc-200 shadow-lg p-8 max-w-[320px] w-full text-center">
                                        <div className="text-2xl font-black tracking-tight mb-8">PROCORE</div>
                                        <div className="text-zinc-600 text-sm mb-4">Log in to your account</div>
                                        <div className="bg-zinc-100 rounded h-10 w-full mb-3 border border-zinc-200"></div>
                                        <div className="bg-zinc-100 rounded h-10 w-full mb-4 border border-zinc-200"></div>
                                        <div className="bg-[#f47e42] h-10 rounded w-full flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/20">Continue</div>
                                    </div>
                                </div>
                            </section>
                    )}

                    {sections.some(s => s.id === 'launch') && (
                        <section id="launch" className="scroll-mt-24">
                            {/* Section 2: Launch App */}
                                <div className="flex gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('launch')}</div>
                                    <Title level={2} className="!mb-0">Select "Migration App"</Title>
                                </div>
                                <Paragraph className="text-zinc-600 text-lg">
                                    Navigate to the <Text strong>Apps</Text> dropdown in the top right corner of the Procore header. Find and select <Text strong>"Migration App by Calance"</Text>.
                                </Paragraph>
                                <div className="bg-zinc-900 rounded-2xl p-6 text-white border border-zinc-800 shadow-2xl mb-8">
                                     <div className="flex items-center gap-4 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                        <div className="ml-4 h-6 px-3 bg-zinc-800 rounded text-[10px] flex items-center text-zinc-500">app.procore.com</div>
                                     </div>
                                     <div className="flex justify-end p-4 border border-zinc-700/50 rounded-lg">
                                        <div className="bg-zinc-800 px-4 py-2 rounded border border-zinc-700 text-sm font-medium">Apps ▼</div>
                                     </div>
                                     <div className="mt-4 p-4 border border-orange-500/30 bg-orange-500/10 rounded-lg animate-pulse">
                                        <Text className="text-orange-400 font-bold">Migration App by Calance</Text>
                                     </div>
                                </div>
                            </section>
                    )}

                    {sections.some(s => s.id === 'auth') && (
                        <section id="auth" className="scroll-mt-24">
                            {/* Section 3: Auth */}
                                <div className="flex gap-4 mb-6">
                                    <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('auth')}</div>
                                    <Title level={2} className="!mb-0">Continue to Login</Title>
                                </div>
                                <Paragraph className="text-zinc-600 text-lg">
                                    The app will open a landing page. Click <Text strong>"Continue to Login"</Text>. This will automatically synchronize your authenticated Procore session with the migration utility.
                                </Paragraph>
                                <Card className="max-w-sm mx-auto shadow-2xl border-zinc-100 rounded-3xl p-8 text-center bg-white">
                                    <img src={logoImg} className="h-8 mx-auto mb-6" alt="Calance" />
                                    <Title level={4} className="!mb-6">Procore Migration</Title>
                                    <Button type="primary" size="large" className="w-full h-12 bg-orange-600 border-0 rounded-xl font-bold">Continue to Login</Button>
                                </Card>
                            </section>
                    )}

                    {/* Section 4: Mapping */}
                    <section id="mapping" className="scroll-mt-24">
                        <div className="flex gap-4 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('mapping')}</div>
                            <Title level={2} className="!mb-0">Initialize Mapping</Title>
                        </div>
                        <Paragraph className="text-zinc-600 text-lg">
                            Select the <Text strong>Source Company</Text> from the dropdown. This is the account where your existing data currently resides. The destination company (<Text italic>Company 2</Text>) will be automatically detected.
                        </Paragraph>

                        {/* UI Mockup matching the screenshot */}
                        <div className="bg-white rounded-3xl p-10 max-w-2xl mx-auto border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-10">
                            {/* Header */}
                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-16 h-16 rounded-2xl bg-[#FFF6EF] flex items-center justify-center mb-6">
                                    <ApartmentOutlined className="text-2xl text-[#f47e42]" />
                                </div>
                                <Title level={2} className="!mb-2 font-black tracking-tight text-3xl">Company Configuration</Title>
                                <Paragraph className="text-zinc-500 text-base mb-4">
                                    Select your source company and confirm destination.
                                </Paragraph>
                                <div className="px-4 py-1.5 bg-zinc-100/80 text-zinc-600 rounded-full text-xs font-medium border border-zinc-200/60">
                                    Logged in as: Migration Admin
                                </div>
                            </div>

                            {/* Source Company Block */}
                            <div className="rounded-2xl border-2 border-green-500 bg-white p-5 mb-4 relative z-10">
                                <div className="flex justify-between items-center mb-3">
                                    <Text className="text-zinc-600 text-sm font-medium">Source Company</Text>
                                    <RefreshCw className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-zinc-800 transition-colors" />
                                </div>
                                <div className="flex gap-4">
                                    <div className={`flex-1 border-2 rounded-lg h-[46px] relative ${selectedCompany ? 'border-[#1B75FF] shadow-[0_0_0_4px_rgba(27,117,255,0.1)]' : 'border-zinc-200'}`}>
                                        <Select
                                            className={`w-full h-full [&_.ant-select-selector]:!rounded-lg [&_.ant-select-selector]:!border-0 [&_.ant-select-selector]:!h-[42px] [&_.ant-select-selection-item]:text-zinc-600 [&_.ant-select-selection-item]:flex [&_.ant-select-selection-item]:items-center ${!selectedCompany ? '[&_.ant-select-selection-item]:leading-[42px] [&_.ant-select-selection-placeholder]:line-height-[42px]' : ''}`}
                                            placeholder="Select Company"
                                            value={selectedCompany}
                                            onChange={handleCompanySelect}
                                            options={[
                                                { 
                                                    value: 'Example Company A', 
                                                    label: (
                                                        <div className="flex items-center gap-2 h-full py-1.5">
                                                            <div className="w-6 h-6 border border-zinc-200 rounded bg-white overflow-hidden flex flex-col items-center justify-center shadow-sm">
                                                                <span className="text-[5px] text-green-600 font-bold border-t border-blue-500 leading-none pt-0.5 mt-0.5 w-[80%] text-center">COMP<br/>A</span>
                                                            </div>
                                                            <span className="font-medium text-sm">Example Company A</span>
                                                        </div>
                                                    )
                                                },
                                                { 
                                                    value: 'Example Company C', 
                                                    label: (
                                                        <div className="flex items-center gap-2 h-full py-1.5">
                                                            <div className="w-6 h-6 border border-zinc-200 rounded bg-white overflow-hidden flex flex-col items-center justify-center shadow-sm">
                                                                <span className="text-[5px] text-orange-600 font-bold border-t border-blue-500 leading-none pt-0.5 mt-0.5 w-[80%] text-center">COMP<br/>C</span>
                                                            </div>
                                                            <span className="font-medium text-sm">Example Company C</span>
                                                        </div>
                                                    )
                                                },
                                                { 
                                                    value: 'Example Company D', 
                                                    label: (
                                                        <div className="flex items-center gap-2 h-full py-1.5">
                                                            <div className="w-6 h-6 border border-zinc-200 rounded bg-white overflow-hidden flex flex-col items-center justify-center shadow-sm">
                                                                <span className="text-[5px] text-purple-600 font-bold border-t border-blue-500 leading-none pt-0.5 mt-0.5 w-[80%] text-center">COMP<br/>D</span>
                                                            </div>
                                                            <span className="font-medium text-sm">Example Company D</span>
                                                        </div>
                                                    )
                                                }
                                            ]}
                                        />
                                    </div>
                                    <Button 
                                        className={`h-[46px] px-6 rounded-lg font-bold flex items-center gap-2 transition-all ${
                                            isVerified 
                                                ? 'border border-green-200 bg-[#F8FFF9] text-green-600 hover:bg-green-50'
                                                : isVerifying
                                                    ? 'border border-blue-200 bg-blue-50 text-blue-600'
                                                    : 'border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
                                        }`}
                                    >
                                        {isVerified ? (
                                            <><CheckCircleOutlined /> Selected</>
                                        ) : isVerifying ? (
                                            <><Spin size="small" /> Verifying...</>
                                        ) : (
                                            "Select company"
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Destination Company Block */}
                            <div className="rounded-2xl border-2 border-green-500 bg-white p-5 mb-4 relative z-0">
                                <Text className="text-zinc-600 text-sm font-medium block mb-3">Destination Company ID</Text>
                                <div className="flex gap-4">
                                    <div className="flex-1 border border-zinc-200 rounded-lg h-[46px] px-3 flex items-center bg-zinc-50 shadow-inner">
                                        <Text className="text-zinc-500">1234567890</Text>
                                    </div>
                                    <Button className="h-[46px] px-6 border border-green-200 rounded-lg bg-[#F8FFF9] text-green-600 font-bold hover:bg-green-50 flex items-center gap-2">
                                        <CheckCircleOutlined /> Verified
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mb-8 px-2">
                                <div className="w-6 h-6 border border-zinc-200 rounded bg-white overflow-hidden flex flex-col items-center justify-center bg-black">
                                    <div className="text-[6px] text-white font-black tracking-widest mt-0.5">PRO<span className="text-[#F47E42]">●</span>RE</div>
                                </div>
                                <Text className="text-zinc-800 font-medium">Example Company B</Text>
                            </div>

                            <Button type="primary" size="large" className="w-full h-14 bg-[#F47E42] border-0 rounded-xl font-bold text-lg hover:bg-[#E56A2F] shadow-lg shadow-orange-500/20">
                                Initialize Mapping <ArrowRightOutlined />
                            </Button>
                        </div>
                    </section>

                    {/* Section 5: Access */}
                    <section id="access" className="scroll-mt-24">
                        <div className="flex gap-4 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('access')}</div>
                            <Title level={2} className="!mb-0">Access to Permitted Objects</Title>
                        </div>
                        <Paragraph className="text-zinc-600 text-lg">
                            The migration tools are organized into "Objects" (e.g., Photos, Action Plans, Drawings). You will only see tools for which you have been granted access.
                        </Paragraph>
                        <Alert 
                            title="Permission Management" 
                            description="Other objects will be disabled by default. You can request access for additional objects through your account manager."
                            type="warning"
                            showIcon
                            className="rounded-xl border-amber-100"
                        />
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                            {['Action Plans', 'Photos', 'Daily Log', 'Drawings'].map((item) => (
                                <div key={item} className={`group relative p-6 rounded-2xl border transition-all cursor-pointer overflow-hidden ${item === 'Photos' ? 'border-orange-200 bg-orange-50/30 hover:border-orange-500 hover:shadow-xl hover:-translate-y-1' : 'border-zinc-100 bg-zinc-50 opacity-60 hover:opacity-100 hover:border-amber-200 hover:shadow-md hover:-translate-y-1'} flex flex-col items-center justify-center gap-3`}>
                                    <ApartmentOutlined className={item === 'Photos' ? 'text-orange-500 text-2xl' : 'text-zinc-400 text-2xl transition-colors group-hover:text-amber-500'} />
                                    <Text strong className={item === 'Photos' ? 'text-orange-900 group-hover:text-orange-600' : 'text-zinc-400 group-hover:text-zinc-800'}>{item}</Text>
                                    {item !== 'Photos' && <Tag size="small" className="group-hover:opacity-0 transition-opacity">Locked</Tag>}
                                    
                                    <div className={`absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${item === 'Photos' ? '' : 'border border-amber-200 rounded-2xl'}`}>
                                        {item === 'Photos' ? (
                                            <Button type="primary" size="middle" className="bg-orange-600 border-0 font-bold shadow-lg shadow-orange-500/20">Launch App <ArrowRightOutlined /></Button>
                                        ) : (
                                            <Button size="small" className="text-orange-600 border-orange-500 text-xs font-semibold px-3 shadow-none">Request Access</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Section 6: Tools */}
                    <section id="tools" className="scroll-mt-24">
                        <div className="flex gap-4 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">{getSectionNum('tools')}</div>
                            <Title level={2} className="!mb-0">Migrating Photos</Title>
                        </div>
                        
                        <div className="space-y-12">
                            <div>
                                <Title level={4} className="mb-2">1. Launch the App</Title>
                                <Paragraph className="text-zinc-600">
                                    Click <Text strong>"Launch App"</Text> on the Photos object from the dashboard.
                                </Paragraph>
                                <div className="mt-6 p-8 rounded-2xl border border-orange-200 bg-orange-50/50 flex flex-col items-center justify-center gap-4 w-64 max-w-full relative group cursor-pointer hover:border-orange-500 hover:shadow-xl transition-all shadow-sm">
                                    <CameraOutlined className="text-orange-500 text-4xl" />
                                    <Text strong className="text-orange-900 text-lg">Photos</Text>
                                    <Text className="text-xs text-orange-600/70 text-center">Migrate project photo albums and images.</Text>
                                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center rounded-2xl duration-300">
                                        <Button type="primary" size="large" className="bg-orange-600 font-bold border-0 shadow-lg shadow-orange-500/20 px-6">Launch App <ArrowRightOutlined /></Button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Title level={4} className="mb-2">2. Map Projects</Title>
                                <Paragraph className="text-zinc-600">
                                    Select the <Text strong>Source Project</Text> dropdown to choose your origin.
                                    Select the <Text strong>Destination Project</Text> dropdown to choose the target.
                                    The system will automatically discover the albums in the source project and check if they exist in the destination.
                                </Paragraph>
                                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center shadow-sm">
                                    <div className="flex-1 w-full flex flex-col gap-3">
                                        <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Source Project</Text>
                                        <Select 
                                            placeholder="Select Source Project" 
                                            className="w-full h-12 [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-zinc-300" 
                                            options={[
                                                { value: 'project1', label: 'Project 1 (Main Office)' },
                                                { value: 'project2', label: 'Project 2 (Warehouse Expansion)' },
                                                { value: 'project3', label: 'Project 3 (Site B)' }
                                            ]} 
                                        />
                                    </div>
                                    <div className="h-px w-full md:w-px md:h-12 bg-zinc-200 relative flex items-center justify-center">
                                        <ArrowRightOutlined className="text-zinc-400 bg-zinc-50 flex items-center justify-center rot md:rotate-0 rotate-90 w-8 h-8 rounded-full border border-zinc-200 shadow-sm absolute" />
                                    </div>
                                    <div className="flex-1 w-full flex flex-col gap-3">
                                        <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Destination Project</Text>
                                        <Select 
                                            placeholder="Select Destination Project" 
                                            className="w-full h-12 [&_.ant-select-selector]:!rounded-xl [&_.ant-select-selector]:!border-zinc-300" 
                                            options={[
                                                { value: 'projectA', label: 'New Project Alpha' },
                                                { value: 'projectB', label: 'New Project Beta' },
                                            ]} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Title level={4} className="mb-2">3. Select and Migrate Albums</Title>
                                <ul className="list-disc pl-5 text-zinc-600 space-y-2 mb-4">
                                    <li>Use the <Text strong>search bar</Text> to find specific albums.</li>
                                    <li>Select single or multiple albums from the list.</li>
                                    <li>Click the <Text strong>"Migrate Selected Albums"</Text> button.</li>
                                </ul>

                                <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-zinc-50 p-3 border-b border-zinc-200 flex justify-between items-center">
                                        <div className="bg-white px-3 py-1.5 border border-zinc-200 rounded-md text-sm text-zinc-400 w-64 shadow-inner">🔍 Search albums...</div>
                                        <Button type="primary" className={`${selectedAlbums.size > 0 ? 'bg-orange-600' : 'bg-zinc-400'} font-bold border-0 hidden sm:block`}>
                                            {selectedAlbums.size > 0 ? `Migrate Selected Albums (${selectedAlbums.size})` : 'Select to migrate'}
                                        </Button>
                                    </div>
                                    <div 
                                        className={`p-4 border-b border-zinc-100 flex items-center gap-3 cursor-pointer transition-colors ${selectedAlbums.has(1) ? 'bg-orange-50/50' : 'bg-white hover:bg-zinc-50'}`}
                                        onClick={() => toggleAlbum(1)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={selectedAlbums.has(1)} 
                                            onChange={() => {}} 
                                            className="accent-orange-600 w-4 h-4 cursor-pointer" 
                                        />
                                        <span className="p-2 rounded-lg bg-amber-50">
                                            <FolderOpen className="text-amber-500 w-4 h-4" />
                                        </span>
                                        <div className="flex flex-col">
                                            <Text strong className="text-sm">Album 1 (Site Survey)</Text>
                                            <Text className="text-[10px] text-zinc-400">12 photos</Text>
                                        </div>
                                    </div>
                                    <div 
                                        className={`p-4 flex items-center gap-3 cursor-pointer transition-colors ${selectedAlbums.has(2) ? 'bg-orange-50/50' : 'bg-white hover:bg-zinc-50'}`}
                                        onClick={() => toggleAlbum(2)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={selectedAlbums.has(2)} 
                                            onChange={() => {}} 
                                            className="accent-orange-600 w-4 h-4 cursor-pointer" 
                                        />
                                        <span className="p-2 rounded-lg bg-amber-50">
                                            <FolderOpen className="text-amber-500 w-4 h-4" />
                                        </span>
                                        <div className="flex flex-col">
                                            <Text strong className="text-sm">Album 2 (Current Progress)</Text>
                                            <Text className="text-[10px] text-zinc-400">45 photos</Text>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Title level={4} className="mb-2">4. Migrate Individual Photos</Title>
                                <Paragraph className="text-zinc-600">
                                    If you want to migrate individual images instead of the whole album:
                                </Paragraph>
                                <ul className="list-disc pl-5 text-zinc-600 space-y-2 mb-4">
                                    <li>Click on any single album to view the individual photos inside.</li>
                                    <li>Select the specific images you wish to migrate.</li>
                                    <li>Click the <Text strong>"Migrate Selected"</Text> button.</li>
                                </ul>

                                <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-zinc-50 p-3 flex items-center gap-3 border-b border-zinc-200">
                                        <span className="text-zinc-400 cursor-pointer hover:text-zinc-900 border border-zinc-200 rounded px-2 bg-white flex items-center justify-center font-bold pb-0.5">↓</span>
                                        <span className="p-1.5 rounded-lg bg-amber-50">
                                            <FolderOpen className="text-amber-500 w-4 h-4" />
                                        </span>
                                        <Text strong className="text-sm">Album 1 (Site Survey)</Text>
                                    </div>
                                    <div className="bg-zinc-50/50 p-3 border-b border-zinc-200 flex justify-between items-center px-4">
                                        <div className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
                                            <input 
                                                type="checkbox" 
                                                className="accent-orange-600 w-4 h-4 cursor-pointer" 
                                                checked={selectedPhotos.size >= 2}
                                                onChange={() => {
                                                    if (selectedPhotos.size >= 2) setSelectedPhotos(new Set());
                                                    else setSelectedPhotos(new Set([1, 2]));
                                                }}
                                            /> Select All 
                                        </div>
                                        <Button type="primary" size="small" className={`${selectedPhotos.size > 0 ? 'bg-[#1b5df2]' : 'bg-zinc-400'} font-bold border-0`}>
                                            {selectedPhotos.size > 0 ? `Migrate Selected (${selectedPhotos.size})` : 'Select to migrate'}
                                        </Button>
                                    </div>
                                    
                                    <div 
                                        className={`p-3 border-b border-zinc-100 flex items-center gap-4 transition-colors cursor-pointer ${selectedPhotos.has(1) ? 'bg-blue-50/50' : 'bg-white hover:bg-zinc-50'}`}
                                        onClick={() => togglePhoto(1)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPhotos.has(1)} 
                                            onChange={() => {}} 
                                            className="accent-orange-600 w-4 h-4 cursor-pointer" 
                                        />
                                        <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 shadow-inner">
                                            <CameraOutlined className="text-xl" />
                                        </div>
                                        <div>
                                            <Text className="block text-sm font-semibold">Photo 1_front_entrance.jpg</Text>
                                            <Text className="text-[11px] text-zinc-400">ID: 15152</Text>
                                        </div>
                                        <Tag className="ml-auto m-0 flex items-center gap-1" color="success" icon={<CheckCircleOutlined />}>Synced</Tag>
                                    </div>
                                    
                                    <div 
                                        className={`p-3 flex items-center gap-4 border-l-2 border-orange-500 relative overflow-hidden cursor-pointer transition-colors ${selectedPhotos.has(2) ? 'bg-orange-50/40' : 'bg-orange-50/10 hover:bg-orange-50/20'}`}
                                        onClick={() => togglePhoto(2)}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={selectedPhotos.has(2)} 
                                            onChange={() => {}} 
                                            className="accent-orange-600 w-4 h-4 relative z-10 cursor-pointer" 
                                        />
                                        <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 shadow-inner relative z-10">
                                            <CameraOutlined className="text-xl" />
                                        </div>
                                        <div className="relative z-10">
                                            <Text className="block text-sm font-semibold">Photo 2_electrical.jpg</Text>
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500 w-[65%] rounded-full animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                                                </div>
                                                <Text className="text-[11px] text-orange-600 font-bold tracking-tight">Syncing... 65%</Text>
                                            </div>
                                        </div>
                                        <div className="ml-auto relative z-10 hidden sm:flex gap-2 items-center">
                                            <Button size="small" type="text" className="text-xs font-semibold text-zinc-500 hover:text-zinc-800">Cancel</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <Title level={4} className="mb-2">5. Successfully Synced</Title>
                                <Paragraph className="text-zinc-600">
                                    Once the progress bar completes, the item will immediately display a green <Text strong className="text-green-600">Synced</Text> tag.
                                </Paragraph>

                                <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white p-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                                    <input type="checkbox" className="accent-orange-600 w-4 h-4 cursor-pointer" />
                                    <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center justify-center text-zinc-400 shadow-inner">
                                        <CameraOutlined className="text-xl" />
                                    </div>
                                    <div>
                                        <Text className="block text-sm font-semibold text-zinc-800">Photo 2_electrical.jpg</Text>
                                        <Text className="text-[10px] text-zinc-400">ID: 80941 • Updated: 4/16/2026</Text>
                                    </div>
                                    <div className="flex gap-2 items-center ml-auto">
                                        <Tag className="m-0 flex items-center gap-1" color="success" icon={<CheckCircleFilled />}>Synced</Tag>
                                        <Button size="small" icon={<RefreshCw className="w-3 h-3" />} className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 hover:text-orange-600 border-zinc-200">
                                            Resync
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Alert
                                title="Keeping Data Updated"
                                description="If photo data changes in the source company after your initial migration, you can sync the new data by using the 'Re-sync' option that appears next to synced items."
                                type="success"
                                showIcon
                                className="bg-emerald-50/50 border-emerald-100 rounded-xl mt-6"
                            />
                        </div>
                    </section>

                    <div className="text-center pb-24">
                        <Title level={3}>Ready to start?</Title>
                        <Button 
                            type="primary" 
                            size="large" 
                            className="bg-zinc-900 h-14 px-12 rounded-full border-0 font-bold hover:!bg-orange-600 shadow-xl transition-all"
                            onClick={() => navigate('/dashboard')}
                        >
                            Return to Dashboard
                        </Button>
                    </div>
                </div>
            </Content>
        </Layout>
    );
};

export default UserGuide;
