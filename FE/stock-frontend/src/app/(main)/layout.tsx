'use client';

import Navbar from '@/components/Navbar';
import { WebSocketProvider } from '@/provider/WebSocketProvider';
import { SWRConfig } from 'swr';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 10000,
        revalidateOnFocus: false,
        keepPreviousData: true,
        onError: (err) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[SWR]', err);
          }
        },
      }}
    >
      <WebSocketProvider>
        <Navbar />
        {children}
      </WebSocketProvider>
    </SWRConfig>
  );
}