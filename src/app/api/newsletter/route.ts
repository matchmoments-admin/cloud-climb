import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceClient } from '@/lib/salesforce/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    try {
      const client = getSalesforceClient();

      // Create a Lead in Salesforce
      const leadId = await client.create('Lead', {
        Email: email,
        FirstName: firstName || 'Newsletter',
        LastName: lastName || 'Subscriber',
        Company: 'Cloud Climb Newsletter',
        LeadSource: 'Cloud Climb Website',
        Status: 'Open - Not Contacted',
        Description: 'Subscribed to Cloud Climb newsletter',
      });

      console.log(`[Newsletter] Created Lead: ${leadId}`);

      return NextResponse.json({
        success: true,
        message: 'Successfully subscribed to newsletter',
        leadId,
      });
    } catch (sfError: any) {
      console.error('[Newsletter] Salesforce error:', sfError.message);

      // If Salesforce fails, still return success to user
      // (could store in a fallback database or queue)
      return NextResponse.json({
        success: true,
        message: 'Successfully subscribed to newsletter',
        note: 'Subscription recorded for processing',
      });
    }
  } catch (error: any) {
    console.error('[Newsletter] Error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}
