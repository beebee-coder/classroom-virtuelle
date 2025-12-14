// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
      role = "PROFESSEUR";
      validationStatus = "VALIDATED";
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Création de l'utilisateur avec la syntaxe correcte
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

    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("Erreur inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
