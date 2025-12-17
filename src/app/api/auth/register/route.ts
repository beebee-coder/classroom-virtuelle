// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit avoir au moins 6 caractères." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà." },
        { status: 409 } // 409 Conflict
      );
    }

    // Déterminer le rôle et le statut
    const existingTeacher = await prisma.user.findFirst({
      where: { role: Role.PROFESSEUR },
    });

    const isFirstUser = !existingTeacher;
    const role = isFirstUser ? Role.PROFESSEUR : Role.ELEVE;
    const validationStatus = isFirstUser ? ValidationStatus.VALIDATED : ValidationStatus.PENDING;

    console.log(`[API/REGISTER] Création utilisateur: ${email}, Rôle: ${role}`);

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        validationStatus,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        validationStatus: true,
      },
    });

    // Créer l'état de l'élève associé
    if (user.role === Role.ELEVE) {
      await prisma.etatEleve.create({
        data: {
          eleveId: user.id,
        },
      });
    }

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("Erreur inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription." },
      { status: 500 }
    );
  }
}
