// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";

console.log("🔵 [route.ts] - Module en cours d'évaluation. Type de handlers:", typeof handlers);

if (handlers === undefined) {
    console.error("❌ [route.ts] - ERREUR CRITIQUE: L'objet 'handlers' importé depuis @/auth est undefined !");
}

export const { GET, POST } = handlers;
