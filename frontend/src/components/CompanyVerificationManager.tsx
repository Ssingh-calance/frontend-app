import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

/**
 * Headless component that manages company verification from session storage.
 * Synchronizes session IDs with the global auth store and verifies access.
 */
export const CompanyVerificationManager = () => {
    const { setContext } = useAuthStore();
    
    const validateSource = useMutation({
        mutationFn: async (cid: number) => {
            const res = await apiClient.post('/data/validate-user', { company_id: cid });
            return res.data;
        },
        onSuccess: (data, cid) => {
            sessionStorage.setItem('source_company_id', cid.toString());
            sessionStorage.setItem('source_company_name', data.company_name);
        }
    });

    const validateDest = useMutation({
        mutationFn: async (cid: number) => {
            const res = await apiClient.post('/data/validate-user', { company_id: cid });
            return res.data;
        },
        onSuccess: (data, cid) => {
            sessionStorage.setItem('dest_company_id', cid.toString());
            sessionStorage.setItem('dest_company_name', data.company_name);
            setContext(cid.toString(), data.company_name, sessionStorage.getItem('OrganizationId'));
        }
    });

    useEffect(() => {
        const sId = sessionStorage.getItem('source_company_id');
        const dId = sessionStorage.getItem('dest_company_id');

        if (sId && !sessionStorage.getItem('source_company_name')) {
            validateSource.mutate(parseInt(sId, 10));
        }

        if (dId && (!sessionStorage.getItem('dest_company_name') || !useAuthStore.getState().companyId)) {
            validateDest.mutate(parseInt(dId, 10));
        }
    }, []);

    return null; // Headless
};
