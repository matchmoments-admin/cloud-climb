import { NextResponse } from 'next/server';
import { getSalesforceClient, testSalesforceConnection } from '@/lib/salesforce/client';
import { getCacheStats } from '@/lib/cache/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sfClient = getSalesforceClient();
    const sfStatus = sfClient.getStatus();
    const sfConnectionOk = await testSalesforceConnection();
    const cacheStats = await getCacheStats();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      salesforce: {
        ...sfStatus,
        connected: sfConnectionOk,
      },
      cache: cacheStats,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    }, { status: 500 });
  }
}
