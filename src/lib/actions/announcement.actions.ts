// src/lib/actions/announcement.actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/session";
import { Role } from "@prisma/client";

// Obtenir les annonces publiques
export async function getPublicAnnouncements(limit?: number) {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isPublic: true },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      ...(limit && { take: limit }),
    });
    return announcements;
  } catch (error) {
    console.error("Error fetching public announcements:", error);
    return [];
  }
}

// Obtenir les annonces pour un élève (publiques + celles de sa classe)
export async function getStudentAnnouncements(studentId: string) {
    try {
        const student = await prisma.user.findUnique({
            where: { id: studentId },
            select: { classeId: true }
        });

        if (!student) {
            return getPublicAnnouncements();
        }

        const announcements = await prisma.announcement.findMany({
            where: {
                OR: [
                    { isPublic: true },
                    { classroomId: student.classeId }
                ]
            },
            include: { author: true },
            orderBy: { createdAt: "desc" },
            take: 10
        });
        return announcements;
    } catch (error) {
        console.error("Error fetching student announcements:", error);
        return [];
    }
}


// Obtenir les annonces pour une classe spécifique
export async function getClassAnnouncements(classroomId: string) {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { classroomId: classroomId },
          { isPublic: true }
        ]
      },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return announcements;
  } catch (error) {
    console.error(`Error fetching announcements for class ${classroomId}:`, error);
    return [];
  }
}

// Créer une annonce
export async function createAnnouncement(formData: FormData) {
  const session = await getAuthSession();
  if (session?.user.role !== Role.PROFESSEUR) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const target = formData.get("target") as string;
  const attachmentUrl = formData.get("attachmentUrl") as string | undefined;

  const data: any = {
    title,
    content,
    authorId: session.user.id,
    isPublic: target === "public",
    attachmentUrl: attachmentUrl || null,
  };

  if (target !== "public") {
    data.classroomId = target;
  }

  try {
    await prisma.announcement.create({ data });
    
    // Revalidation
    if (data.isPublic) {
      revalidatePath("/");
      revalidatePath("/teacher");
    } else {
      revalidatePath(`/teacher/class/${data.classroomId}`);
    }
  } catch (error) {
    console.error("Error creating announcement:", error);
    throw new Error("Failed to create announcement.");
  }
}
