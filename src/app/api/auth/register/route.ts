// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from '@prisma/client';

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

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 409 }
      );
    }

    // Déterminer si le premier utilisateur (professeur) a déjà été configuré
    const existingTeacher = await prisma.user.findFirst({
      where: { role: "PROFESSEUR" },
    });

    let userRole: Role = Role.ELEVE;
    let userStatus: ValidationStatus = ValidationStatus.PENDING;

    // Si aucun professeur n'existe, ce nouvel utilisateur devient le professeur
    if (!existingTeacher) {
      userRole = Role.PROFESSEUR;
      userStatus = ValidationStatus.VALIDATED;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: userRole,
        validationStatus: userStatus,
        emailVerified: new Date(), // Marquer l'email comme vérifié lors de l'inscription manuelle
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
