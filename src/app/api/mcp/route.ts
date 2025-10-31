// src/app/api/mcp/route.ts
// THIS FILE IS NO LONGER USED AND WILL BE REPLACED BY GENKIT
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ error: 'This endpoint is deprecated.' }, { status: 410 });
}
