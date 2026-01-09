// src/app/api/teacher/pending-students/route.ts
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getAuthSession();
    
    if (!session?.user || session.user.role !== "PROFESSEUR") {
      console.warn("[PENDING_STUDENTS/API] Accès refusé – non professeur");
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const students = await prisma.user.findMany({
      where: {
        role: "ELEVE",
        validationStatus: "PENDING",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }, // plus récents en premier
    });

    console.log("[PENDING_STUDENTS/API] Liste récupérée", { count: students.length });
    return NextResponse.json({ students });
  } catch (error) {
    console.error("[PENDING_STUDENTS/API] Erreur serveur", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
