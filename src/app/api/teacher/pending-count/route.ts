// src/app/api/teacher/pending-count/route.ts
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== "PROFESSEUR") {
      console.warn("[PENDING_COUNT/API] Accès refusé – non professeur");
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const count = await prisma.user.count({
      where: {
        role: "ELEVE",
        validationStatus: "PENDING",
      },
    });

    console.log("[PENDING_COUNT/API] Compteur récupéré", { count });
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[PENDING_COUNT/API] Erreur serveur", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
