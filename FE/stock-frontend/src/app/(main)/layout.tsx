'use client';

import { SWRConfig } from 'swr';
import Navbar from '@/components/Navbar';

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
      <Navbar />
      {children}
    </SWRConfig>
  );
}