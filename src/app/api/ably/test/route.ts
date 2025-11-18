
// app/api/ably/test/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      success: true,
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      authConfigured: !!process.env.ABLY_API_KEY,
      authUrl: process.env.NEXTAUTH_URL
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

    