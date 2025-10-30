// src/app/api/auth/[...nextauth]/route.ts
import { auth } from "@/auth";

export const { GET, POST } = auth;
