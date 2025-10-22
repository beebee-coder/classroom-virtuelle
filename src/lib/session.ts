// src/lib/session.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";

export const getAuthSession = () => getServerSession(authOptions);
