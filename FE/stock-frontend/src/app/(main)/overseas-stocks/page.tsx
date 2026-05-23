import { Suspense } from 'react';
import type { Metadata } from 'next';
import OverseasStockSearchBar from '@/components/overseas/OverseasStockSearchBar';
import ExchangeFilterTabs from '@/components/overseas/ExchangeFilterTabs';
import OverseasSectorFilter from '@/components/overseas/OverseasSectorFilter';
import SortSelect from '@/components/stocks/SortSelect';
import OverseasStockCatalogInfinite from '@/components/overseas/OverseasStockCatalogInfinite';
import { getOverseasStocks, extractOverseasInitialPricesFromCatalog } from '@/services/overseasStockApi';

export const metadata: Metadata = {
  title: '해외 종목 | StockAI',
};

export const revalidate = 60;

async function OverseasStockCatalogContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const exchangeCode = typeof params.exchangeCode === 'string' ? params.exchangeCode : undefined;
  const country = typeof params.country === 'string' ? params.country : undefined;
  const sector = typeof params.sector === 'string' ? params.sector : undefined;
  const sort = typeof params.sort === 'string' ? params.sort : undefined;

  let initialData;
  try {
    initialData = await getOverseasStocks({ page: 0, size: 20, exchangeCode, country, sector, sort });
  } catch {
    initialData = { content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0 };
  }

  const initialPrices = extractOverseasInitialPricesFromCatalog(initialData);

  return (
    <OverseasStockCatalogInfinite
      initialData={initialData}
      initialPrices={initialPrices}
      exchangeCode={exchangeCode}
      country={country}
      sector={sector}
      sort={sort}
    />
  );
}

export default async function OverseasStocksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Suspense fallback={<div className="h-10 animate-pulse bg-surface-soft rounded-full w-full" />}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3 flex-wrap">
              <ExchangeFilterTabs />
              <OverseasSectorFilter />
            </div>
            <div className="flex items-center gap-3">
              <SortSelect basePath="/overseas-stocks" />
              <OverseasStockSearchBar />
            </div>
          </div>
        </Suspense>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-hairline-soft rounded-[32px] p-6 animate-pulse">
                  <div className="h-4 bg-surface-soft rounded w-1/3 mb-2" />
                  <div className="h-6 bg-surface-soft rounded w-2/3 mb-4" />
                  <div className="h-8 bg-surface-soft rounded w-1/2" />
                </div>
              ))}
            </div>
          }
        >
          <OverseasStockCatalogContent searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}