import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Button, Space, Avatar, Tooltip } from 'antd';
import { LogoutOutlined, SettingOutlined, FileSearchOutlined, BookOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { CompanyVerificationManager } from './CompanyVerificationManager';
import { GlobalLoader } from './GlobalLoader';
import { SyncSideDrawer } from './SyncSideDrawer';
import { Zap, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import logoImg from '../assets/images/logo.png';

export const Layout = () => {
    const { isAuthenticated, logout, userName, userEmail, isAdmin, userId, companyId, userAvatar, setUserProfile } = useAuthStore();
    const { isDarkMode, toggleTheme } = useThemeStore();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const destCompanyName = sessionStorage.getItem('dest_company_name');
    const destCompanyLogo = sessionStorage.getItem('dest_company_logo');
    const sourceCompanyName = sessionStorage.getItem('source_company_name');
    const sourceCompanyLogo = sessionStorage.getItem('source_company_logo');

    const displayName = userName || userEmail || 'User';

    useEffect(() => {
        if (isAuthenticated && companyId && userId && (!userAvatar || !userName)) {
            const fetchProfile = async () => {
                try {
                    const res = await apiClient.get('/auth/me', {
                        params: { user_id: userId, company_id: companyId }
                    });
                    if (res.data) {
                        const fetchedName = res.data.name || userName;
                        const fetchedAvatar = res.data.avatar_url || res.data.avatar || userAvatar;
                        const fetchedPermissions = res.data.allowed_apps || [];
                        setUserProfile(userEmail!, fetchedName!, fetchedAvatar, userId, fetchedPermissions);
                    }
                } catch (e) {
                    console.warn("Failed to fetch extended user profile", e);
                }
            };
            fetchProfile();
        }
    }, [isAuthenticated, companyId, userId, userAvatar, userName, userEmail, setUserProfile]);

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans transition-colors duration-200">
            <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-3 flex items-center justify-between shadow-sm relative z-50 transition-colors duration-200">
                {/* Left: Calance Logo + App Name */}
                <div className="flex items-center gap-2.5">
                    <img src={logoImg} alt="Calance" className="h-9 w-auto object-contain" />
                    <h1 className="font-bold text-zinc-800 dark:text-zinc-100 tracking-tight text-lg">Procore Migration</h1>
                </div>

                {/* Center: Company Context (only when companies are set) */}
                {isAuthenticated && (sourceCompanyName || destCompanyName) && (
                    <div className="hidden md:flex items-center gap-4 px-5 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/50">
                        {sourceCompanyName && (
                            <div className="flex items-center gap-2">
                                {sourceCompanyLogo ? (
                                    <img src={sourceCompanyLogo} alt="" className="w-7 h-7 rounded object-contain" />
                                ) : (
                                    <div className="w-7 h-7 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{sourceCompanyName.charAt(0)}</div>
                                )}
                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{sourceCompanyName}</span>
                            </div>
                        )}
                        {sourceCompanyName && destCompanyName && (
                            <span className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">→</span>
                        )}
                        {destCompanyName && (
                            <div className="flex items-center gap-2">
                                {destCompanyLogo ? (
                                    <img src={destCompanyLogo} alt="" className="w-7 h-7 rounded object-contain" />
                                ) : (
                                    <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">{destCompanyName.charAt(0)}</div>
                                )}
                                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{destCompanyName}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Right: Nav + User Profile */}
                <div className="flex items-center gap-3">
                    {isAuthenticated && (
                        <Space size="middle">
                            <Button 
                                type="text" 
                                icon={isDarkMode ? <Sun className="w-4 h-4 text-orange-400" /> : <Moon className="w-4 h-4 text-zinc-600" />} 
                                onClick={toggleTheme}
                                className="flex items-center justify-center"
                            />
                            {isAdmin && (
                                <Link to="/admin" className="text-zinc-500 hover:text-orange-600 flex items-center gap-1.5 text-sm font-medium transition-colors">
                                    <SettingOutlined />
                                    Admin
                                </Link>
                            )}
                            <Link to="/user-guide" className="text-zinc-500 hover:text-orange-600 flex items-center gap-1.5 text-sm font-medium transition-colors">
                                <BookOutlined />
                                Guide
                            </Link>

                            <Link to="/migration-report" className="text-zinc-500 hover:text-orange-600 flex items-center gap-1.5 text-sm font-medium transition-colors">
                                <FileSearchOutlined />
                                Report
                            </Link>

                            <Button 
                                type="primary"
                                size="small"
                                icon={<Zap className="w-3.5 h-3.5" />}
                                onClick={() => setDrawerOpen(true)}
                                className="bg-zinc-900 border-0 hover:!bg-orange-600 font-bold flex items-center gap-1.5 h-8 rounded-lg shadow-none"
                            >
                                Sync Status
                            </Button>

                            <div className="h-6 w-px bg-zinc-200"></div>

                            {/* User Profile Chip */}
                            <Tooltip title={userEmail || ''}>
                                <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-default">
                                    <Avatar
                                        size={28}
                                        src={userAvatar}
                                        className="bg-gradient-to-br from-orange-400 to-[#f47e42] text-white border border-orange-200 text-xs font-bold"
                                    >
                                        {!userAvatar && (displayName || 'U').charAt(0).toUpperCase()}
                                    </Avatar>
                                    <span className="text-sm font-medium text-zinc-700 max-w-[140px] truncate">{displayName}</span>
                                </div>
                            </Tooltip>

                            <Button
                                type="text"
                                size="small"
                                icon={<LogoutOutlined />}
                                onClick={logout}
                                className="text-zinc-400 hover:!text-red-500"
                            />
                        </Space>
                    )}
                </div>
            </header>

            {/* Silent verification manager */}
            {isAuthenticated && <CompanyVerificationManager />}

            <main className="flex-1 w-full max-w-7xl mx-auto py-8">
                <Outlet />
            </main>
            
            {/* Global UX Components */}
            <GlobalLoader />
            <SyncSideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

            <footer className="w-full text-center py-5 text-zinc-400 text-xs border-t border-zinc-100 bg-white mt-auto">
                Powered by <span className="font-semibold text-orange-600">Calance Pvt Ltd</span>
            </footer>
        </div>
    );
};
