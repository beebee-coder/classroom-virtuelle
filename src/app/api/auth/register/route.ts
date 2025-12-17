// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Role, ValidationStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma"; // Utiliser l'instance Prisma configurée

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit avoir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const userEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Déterminer le rôle et le statut
    const teacherCount = await prisma.user.count({ where: { role: "PROFESSEUR" } });
    const isFirstUser = teacherCount === 0;

    const role = isFirstUser ? Role.PROFESSEUR : Role.ELEVE;
    const validationStatus = isFirstUser ? ValidationStatus.VALIDATED : ValidationStatus.PENDING;

    console.log(`[REGISTER API] Création utilisateur: ${name} (${userEmail}) avec Rôle: ${role}, Statut: ${validationStatus}`);

    // La création de l'utilisateur va maintenant déclencher automatiquement la notification
    // via le middleware Prisma si c'est un élève en attente.
    const user = await prisma.user.create({
      data: {
        name,
        email: userEmail,
        password: hashedPassword,
        role,
        validationStatus,
        emailVerified: new Date(), // Marquer l'email comme vérifié à l'inscription
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        validationStatus: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("Erreur inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  }
}
