// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, ValidationStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  console.log('[API/REGISTER] 🔵 Requête POST reçue');
  try {
    const { name, email, password } = await req.json();
    console.log(`[API/REGISTER] 🔵 Données reçues: ${name}, ${email}`);

    if (!email || !password || !name) {
      console.log('[API/REGISTER] ❌ Erreur: Champs manquants');
      return NextResponse.json(
        { error: "Tous les champs sont requis." },
        { status: 400 }
      );
    }

    // ✅ Vérification critique : OWNER_EMAIL doit être défini
    const ownerEmailEnv = process.env.OWNER_EMAIL;
    if (!ownerEmailEnv) {
      console.error('[API/REGISTER] 💥 ERREUR FATALE: OWNER_EMAIL non défini dans les variables d\'environnement.');
      return NextResponse.json(
        { error: "Configuration serveur manquante. Veuillez contacter l'administrateur." },
        { status: 500 }
      );
    }

    const userEmail = email.toLowerCase().trim();
    const ownerEmail = ownerEmailEnv.toLowerCase().trim();

    // 1. Vérifier si l'email correspond à celui du propriétaire
    if (userEmail !== ownerEmail) {
      console.warn(`[API/REGISTER] ❌ Inscription par formulaire refusée pour: ${userEmail}. Réservé au propriétaire.`);
      return NextResponse.json(
        { error: "L'inscription pour ce compte doit se faire via Google." },
        { status: 403 }
      );
    }
    
    // 2. Vérifier si un compte propriétaire existe déjà
    const ownerCount = await prisma.user.count({
      where: { role: Role.PROFESSEUR }
    });

    if (ownerCount > 0) {
        console.warn(`[API/REGISTER] ❌ Tentative de création d'un second compte professeur.`);
        return NextResponse.json(
          { error: "Un compte professeur existe déjà. Veuillez vous connecter." },
          { status: 409 } // 409 Conflict
        );
    }

    if (password.length < 6) {
      console.log('[API/REGISTER] ❌ Erreur: Mot de passe trop court');
      return NextResponse.json(
        { error: "Le mot de passe doit avoir au moins 6 caractères." },
        { status: 400 }
      );
    }

    const role = Role.PROFESSEUR;
    const validationStatus = ValidationStatus.VALIDATED;

    console.log(`[API/REGISTER] 🔵 Création du compte PROFESSEUR unique pour: ${email}`);

    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('[API/REGISTER] 🔵 Mot de passe haché.');

    const user = await prisma.user.create({
      data: {
        name,
        email: userEmail,
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

    console.log(`[API/REGISTER] ✅ Utilisateur PROFESSEUR créé avec succès: ${user.id}`);
    return NextResponse.json({ user }, { status: 201 });

  } catch (error) {
    console.error("[API/REGISTER] 💥 Erreur inscription:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'inscription." },
      { status: 500 }
    );
  }
}