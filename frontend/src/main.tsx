import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { message } from 'antd';
import MainApp from './App.tsx';
import './index.css';

import { BrowserRouter } from 'react-router-dom';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      // Avoid duplicate notifications for axios errors handled in client.ts
      // But query failures often wrap them.
      const errorMsg = error.response?.data?.detail || error.message || 'Query failed';
      message.error(`Load error: ${errorMsg}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      const errorMsg = error.response?.data?.detail || error.message || 'Action failed';
      message.error(`Sync error: ${errorMsg}`);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

import { ConfigProvider, theme } from 'antd';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
          <MainApp />
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
