import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as ProcoreHelpers from '@procore/procore-iframe-helpers';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Spin, Modal } from 'antd';

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === 'string'
  ) {
    return (err as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? fallback;
  }

  if (err instanceof Error && err.message) return err.message;
  return fallback;
};

export const Callback: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const setIsAdmin = useAuthStore((s) => s.setIsAdmin);
  const initialized = React.useRef(false);

  const code = params.get('code');

  useEffect(() => {
    if (!code || initialized.current) return;
    initialized.current = true;

    try {
      const context = ProcoreHelpers.initialize();
      context.authentication.notifySuccess({ code });
    } catch (e) {
      console.warn('Procore IFrame helper initialization failed or not in a popup context:', e);
    }

    const exchangeCode = async () => {
      try {
        const { companyId, companyName, organizationId } = useAuthStore.getState();
        const response = await apiClient.post('/auth/exchange', {
          code,
          company_id: companyId,
          company_name: companyName,
          organization_id: organizationId
        });

        const {
          access_token,
          refresh_token,
          user_email,
          user_name,
          user_id,
          company_logo,
          is_admin,
          allowed_apps
        } = response.data;

        setToken(access_token, refresh_token);
        if (setUserProfile) setUserProfile(user_email, user_name, undefined, user_id, allowed_apps);
        if (setIsAdmin) setIsAdmin(is_admin);

        if (company_logo) {
          sessionStorage.setItem('source_company_logo', company_logo);
        }

        navigate('/company-setup');
      } catch (err: unknown) {
        console.error('Code exchange failed:', err);
        Modal.error({
          title: 'Verification Failed',
          content: getErrorMessage(err, 'We could not verify your Procore account. Please try logging in again.'),
          onOk: () => navigate('/login')
        });
      }
    };

    void exchangeCode();
  }, [code, navigate, setToken, setUserProfile, setIsAdmin]);

  if (!code) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-zinc-800">Verification failed</h2>
          <p className="text-red-500 font-medium">No authorization code found in URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
      <div className="text-center space-y-4">
        <Spin size="large" />
        <h2 className="text-xl font-semibold text-zinc-800">Verifying your account...</h2>
        <p className="text-zinc-500">Connecting to Procore services</p>
      </div>
    </div>
  );
};

export default Callback;