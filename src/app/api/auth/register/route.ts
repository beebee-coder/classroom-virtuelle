// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // 🔹 LOG 1: Requête reçue
    console.log("[REGISTER] Requête reçue", { name, email });

    if (!email || !password || !name) {
      console.warn("[REGISTER] Champs manquants", { name: !!name, email: !!email, password: !!password });
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.warn("[REGISTER] Mot de passe trop court", { email });
      return NextResponse.json(
        { error: "Le mot de passe doit avoir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.warn("[REGISTER] Email déjà utilisé", { email });
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // 🔹 LOG 2: Vérification du professeur existant
    const existingTeacher = await prisma.user.findFirst({
      where: { role: Role.PROFESSEUR },
    });
    console.log("[REGISTER] Professeur existant ?", { hasTeacher: !!existingTeacher });

    let userRole: Role = Role.ELEVE;
    let userStatus: ValidationStatus = ValidationStatus.PENDING;

    if (!existingTeacher) {
      userRole = Role.PROFESSEUR;
      userStatus = ValidationStatus.VALIDATED;
      console.log("[REGISTER] Attribution du rôle PROFESSEUR (premier utilisateur)", { email });
    } else {
      console.log("[REGISTER] Attribution du rôle ELEVE (professeur déjà présent)", { email });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole,
        validationStatus: userStatus,
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

    // 🔹 LOG 3: Utilisateur créé avec succès
    console.log("[REGISTER] Utilisateur créé", {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.validationStatus,
    });

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    // 🔹 LOG 4: Erreur détaillée
    console.error("[REGISTER] Erreur critique lors de l'inscription", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  }
}