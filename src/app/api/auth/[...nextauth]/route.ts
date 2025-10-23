// src/app/api/auth/[...nextauth]/route.ts
// import NextAuth from 'next-auth';
// import { authOptions } from '@/lib/auth-options';

// const handler = NextAuth(authOptions);

// export { handler as GET, handler as POST };

import {NextResponse} from 'next/server';

export async function GET() {
  return NextResponse.json({message: 'Auth endpoint disabled'});
}

export async function POST() {
  return NextResponse.json({message: 'Auth endpoint disabled'});
}
