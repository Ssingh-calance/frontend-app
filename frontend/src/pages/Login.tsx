import React, { useState } from 'react';
import * as ProcoreHelpers from '@procore/procore-iframe-helpers';
import { Button, Spin, Modal } from 'antd';
import { QuestionCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import logoImg from '../assets/images/logo.png';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Configuration from env (set these in .env)
  console.log("Vite Env:", import.meta.env);
  const clientId = import.meta.env.VITE_PROCORE_CLIENT_ID;
  const procoreLoginUrl = import.meta.env.VITE_PROCORE_LOGIN_URL || 'https://login.procore.com';
  const redirectUri = import.meta.env.VITE_PROCORE_REDIRECT_URI || `${window.location.origin}/callback`;
  
  console.log("Resolved Client ID:", clientId);
  console.log("Resolved Redirect URI:", redirectUri);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const context = ProcoreHelpers.initialize();

      context.authentication.authenticate({
        url: `${procoreLoginUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`,
        onSuccess: (payload: any) => {
          console.log('✅ Auth success, code received');
          if (payload && payload.code) {
            window.location.href = `/callback?code=${payload.code}`;
          }
        },
        onFailure: (error: any) => {
          console.error('❌ Authentication failed:', error);
          setLoading(false);
          Modal.error({
            title: 'Authentication Failed',
            content: 'Failed to authenticate with Procore. Please try again.',
          });
        }
      });

    } catch (error) {
      console.error('❌ Error during login process:', error);
      setLoading(false);
      Modal.error({
        title: 'Error',
        content: 'An error occurred during the login process. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col relative font-sans">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200 p-10 max-w-md w-full text-center space-y-8">
          <div>
            <img src={logoImg} alt="Calance" className="h-16 w-auto object-contain mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Procore Migration</h1>
            <p className="text-zinc-500 mt-3 text-base">Securely migrate your project data between Procore environments.</p>
            
            <div className="mt-6">
              <Link 
                to="/user-guide" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full text-sm font-semibold hover:bg-orange-100 transition-colors border border-orange-100"
              >
                <QuestionCircleOutlined className="text-orange-500" />
                New here? Read the Setup Guide
                <ArrowRightOutlined className="text-xs ml-1" />
              </Link>
            </div>
          </div>

          <div className="border-b border-zinc-100 w-full" />

          {loading ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <Spin size="large" />
              <p className="text-zinc-400 font-medium tracking-wide">Authenticating...</p>
            </div>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-full h-14 text-lg font-semibold bg-[#f47e42] hover:bg-[#dc7e42] border-none rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
              onClick={handleLogin}
            >
              Continue to Login
            </Button>
          )}

          <p className="text-xs text-zinc-400 px-4 leading-relaxed">
            By continuing, you agree to allow this application to access your Procore projects and data for migration purposes.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-zinc-400 text-sm border-t border-zinc-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] mt-auto relative z-10">
          Powered by <span className="font-semibold text-orange-600">Calance Pvt Ltd</span>
      </footer>

      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-orange-50 to-transparent pointer-events-none" />
    </div>
  );
};

export default Login;
