// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { broadcastNewPendingStudent } from '@/lib/actions/ably-session.actions';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log("➡️ [API /register] - Début du processus d'inscription.");
  try {
    const { name, email, password } = await req.json();
    console.log(`  -> Données reçues: { name: "${name}", email: "${email}" }`);

    if (!email || !password || !name) {
      console.warn("  -> ⚠️ Validation échouée: Champs manquants.");
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.warn("  -> ⚠️ Validation échouée: Mot de passe trop court.");
      return NextResponse.json(
        { error: "Le mot de passe doit avoir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.warn(`  -> ⚠️ Validation échouée: L'email "${email}" existe déjà.`);
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      );
    }

    const ownerEmail = process.env.OWNER_EMAIL?.toLowerCase().trim();
    const userEmail = email.toLowerCase().trim();
    const isOwner = ownerEmail && userEmail === ownerEmail;

    const existingTeacher = await prisma.user.findFirst({
      where: { role: "PROFESSEUR" },
    });
    const isTeacherSetup = !!existingTeacher;

    let role: "PROFESSEUR" | "ELEVE" = "ELEVE";
    let validationStatus: "VALIDATED" | "PENDING" = "PENDING";

    if (!isTeacherSetup && isOwner) {
      console.log("  -> 👑 C'est le premier utilisateur et il est propriétaire. Assignation du rôle PROFESSEUR.");
      role = "PROFESSEUR";
      validationStatus = "VALIDATED";
    } else {
      console.log("  -> 🧑‍🎓 Assignation du rôle ELEVE avec statut PENDING.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    console.log("  -> 🔑 Mot de passe haché.");

    const user = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        password: hashedPassword,
        role,
        validationStatus,
        emailVerified: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        validationStatus: true,
      },
    });

    console.log(`  -> ✅ Utilisateur créé en BDD avec l'ID: ${user.id}`);
    
    // Si c'est un élève, on diffuse l'événement.
    if (user.role === 'ELEVE' && user.name && user.email) {
      console.log("  -> 🔔 Appel de broadcastNewPendingStudent pour notifier les professeurs.");
      await broadcastNewPendingStudent({
        id: user.id,
        name: user.name,
        email: user.email,
      });
    }

    console.log("✅ [API /register] - Inscription terminée avec succès.");
    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("💥 [API /register] - Erreur serveur critique:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
