// src/app/api/session/[id]/spotlight/route.ts
// THIS FILE IS NO LONGER USED AND CAN BE DELETED.
// The logic has been moved to a direct server action call in SessionClient.tsx
// to improve stability and performance.

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
    console.warn(`[API SPOTLIGHT] - DEPRECATED: This API route is no longer in use. Called for session ${params.id}.`);
    
    // Return a 410 Gone status to indicate that this endpoint is permanently unavailable.
    return new NextResponse('This endpoint is deprecated and no longer available.', { status: 410 });
}
