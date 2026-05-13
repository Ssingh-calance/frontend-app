import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as ProcoreHelpers from '@procore/procore-iframe-helpers';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Spin, Modal } from 'antd';

export const Callback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const setIsAdmin = useAuthStore((s) => s.setIsAdmin);
  const [error, setError] = useState<string | null>(null);
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const code = params.get('code');
    if (!code) {
      setError('No authorization code found in URL');
      return;
    }

    // Initialize helpers to notify success (this will close the popup if we're in one)
    try {
      const context = ProcoreHelpers.initialize();
      context.authentication.notifySuccess({ code });
      
      // If we are in a popup, we can stop here. The parent window will handle the redirect.
      // But we'll let the code exchange continue just in case or if this is the main window.
    } catch (e) {
      console.warn('Procore IFrame helper initialization failed or not in a popup context:', e);
    }

    const exchangeCode = async () => {
      try {
        const { companyId, companyName, organizationId } = useAuthStore.getState();
        const response = await apiClient.post('/auth/exchange', {
          code: code,
          company_id: companyId,
          company_name: companyName,
          organization_id: organizationId
        });

        const { access_token, refresh_token, user_email, user_name, user_id, company_logo, is_admin, allowed_apps } = response.data;

        // Store identity token
        setToken(access_token, refresh_token);
        if (setUserProfile) setUserProfile(user_email, user_name, undefined, user_id, allowed_apps);
        if (setIsAdmin) setIsAdmin(is_admin);
        
        if (company_logo) {
            sessionStorage.setItem('source_company_logo', company_logo);
        }

        // Redirect to next step
        navigate('/company-setup');
      } catch (err: any) {
        console.error('Code exchange failed:', err);
        setError(err.response?.data?.detail || 'Failed to verify account with backend');
        Modal.error({
          title: 'Verification Failed',
          content: 'We could not verify your Procore account. Please try logging in again.',
          onOk: () => navigate('/login')
        });
      }
    };

    exchangeCode();
  }, [params, navigate, setToken, setUserProfile, setIsAdmin]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
      <div className="text-center space-y-4">
        <Spin size="large" />
        <h2 className="text-xl font-semibold text-zinc-800">Verifying your account...</h2>
        <p className="text-zinc-500">Connecting to Procore services</p>
        {error && <p className="text-red-500 font-medium">{error}</p>}
      </div>
    </div>
  );
};

export default Callback;
