// src/middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth;

export const config = {
  // Le matcher ne doit pas inclure la page de login elle-même pour éviter les boucles de redirection.
  matcher: ['/teacher/:path*', '/student/:path*'],
};
