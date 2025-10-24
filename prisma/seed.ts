// prisma/seed.ts
import { PrismaClient, Role, TaskType, TaskCategory, TaskDifficulty, ValidationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Créer un professeur de test
  const teacher = await prisma.user.create({
    data: {
      id: 'teacher-id',
      name: 'Professeur Test',
      email: 'teacher@example.com',
      role: Role.PROFESSEUR,
    },
  });
  console.log(`Created teacher: ${teacher.name}`);

  // Créer des classes
  const classA = await prisma.classe.create({
    data: {
      id: 'classe-a',
      nom: 'Classe 6ème A',
      professeurId: teacher.id,
    },
  });

  const classB = await prisma.classe.create({
    data: {
      id: 'classe-b',
      nom: 'Classe 6ème B',
      professeurId: teacher.id,
    },
  });
  console.log(`Created classes: ${classA.nom}, ${classB.nom}`);

  // Créer des élèves
  const studentsData = [
    { id: 'student1', name: 'Ahmed', email: 'ahmed@example.com', classeId: classA.id, points: 1250 },
    { id: 'student2', name: 'Bilel', email: 'bilel@example.com', classeId: classA.id, points: 980 },
    { id: 'student3', name: 'Fatima', email: 'fatima@example.com', classeId: classA.id, points: 1500 },
  ];

  for (const studentData of studentsData) {
    await prisma.user.create({
      data: {
        ...studentData,
        role: Role.ELEVE,
      },
    });
  }
  console.log(`Created ${studentsData.length} students.`);

  // Créer des tâches
  const tasksData = [
    { id: '1', title: 'Faire son lit', description: 'Un lit bien fait, une journée bien commencée !', points: 10, type: TaskType.DAILY, category: TaskCategory.HOME, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false },
    { id: '2', title: 'Lire 15 minutes', description: 'Un chapitre par jour pour voyager.', points: 15, type: TaskType.DAILY, category: TaskCategory.LANGUAGE, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false },
    { id: '3', title: 'Ranger sa chambre', description: 'Un espace propre pour des idées claires.', points: 50, type: TaskType.WEEKLY, category: TaskCategory.HOME, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.PARENT, requiresProof: true },
    { id: '4', title: 'Exercice de maths', description: 'Résoudre une série de problèmes complexes.', points: 70, type: TaskType.WEEKLY, category: TaskCategory.MATH, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.PROFESSOR, requiresProof: true },
  ];

  for (const taskData of tasksData) {
      await prisma.task.create({
          data: taskData
      });
  }
  console.log(`Created ${tasksData.length} tasks.`);
  
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
