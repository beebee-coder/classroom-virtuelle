
import { PrismaClient, Role, TaskType, TaskCategory, TaskDifficulty, ValidationType } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Créer un professeur
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@example.com',
      name: 'Professeur Test',
      role: 'PROFESSEUR',
    },
  });
  console.log(`👨‍🏫 Created teacher: ${teacher.name} (${teacher.email})`);

  // Créer des classes
  const classA = await prisma.classroom.create({
    data: {
      nom: 'Classe 6ème A',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classA.nom}`);

  const classB = await prisma.classroom.create({
    data: {
      nom: 'Classe 6ème B',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classB.nom}`);

  const classC = await prisma.classroom.create({
    data: {
      nom: 'Classe 5ème A',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classC.nom}`);


  // Créer des élèves
  const students = [
    // Classe A
    { name: 'Ahmed', classroomId: classA.id, ambition: 'Devenir Astronaute' },
    { name: 'Bilel', classroomId: classA.id, ambition: 'Explorer les fonds marins' },
    { name: 'Fatima', classroomId: classA.id, ambition: 'Créer des jeux vidéo' },
    { name: 'Khadija', classroomId: classA.id, ambition: 'Devenir chef cuisinier' },
    { name: 'Youssef', classroomId: classA.id, ambition: 'Être un grand artiste' },
    { name: 'Amina', classroomId: classA.id, ambition: 'Protéger la nature' },
    { name: 'Omar', classroomId: classA.id, ambition: 'Construire des robots' },
    { name: 'Leila', classroomId: classA.id, ambition: 'Soigner les animaux' },
    { name: 'Ibrahim', classroomId: classA.id, ambition: 'Devenir pompier' },
    { name: 'Nora', classroomId: classA.id, ambition: 'Voyager dans le temps' },
    // Classe B
    { name: 'Ali', classroomId: classB.id, ambition: 'Piloter des avions' },
    { name: 'Sofia', classroomId: classB.id, ambition: 'Écrire des histoires' },
    { name: 'Mehdi', classroomId: classB.id, ambition: 'Devenir un champion de sport' },
    { name: 'Yasmina', classroomId: classB.id, ambition: 'Inventer de nouvelles choses' },
    { name: 'Karim', classroomId: classB.id, ambition: 'Être détective' },
    { name: 'Sara', classroomId: classB.id, ambition: 'Guérir les maladies' },
    { name: 'Hassan', classroomId: classB.id, ambition: 'Explorer des grottes' },
    { name: 'Ines', classroomId: classB.id, ambition: 'Parler toutes les langues' },
    { name: 'Rachid', classroomId: classB.id, ambition: 'Construire des ponts' },
    { name: 'Samira', classroomId: classB.id, ambition: 'Chanter sur scène' },
    // Classe C
    { name: 'Zayd', classroomId: classC.id, ambition: 'Découvrir des trésors' },
    { name: 'Lina', classroomId: classC.id, ambition: 'Dessiner des mangas' },
    { name: 'Adil', classroomId: classC.id, ambition: 'Créer des applications' },
    { name: 'Dounia', classroomId: classC.id, ambition: 'Devenir photographe' },
    { name: 'Anis', classroomId: classC.id, ambition: 'Comprendre les étoiles' },
    { name: 'Nadia', classroomId: classC.id, ambition: 'Faire le tour du monde' },
    { name: 'Ismail', classroomId: classC.id, ambition: 'Construire des cabanes' },
    { name: 'Rania', classroomId: classC.id, ambition: 'Aider les autres' },
    { name: 'Malik', classroomId: classC.id, ambition: 'Être un super-héros' },
    { name: 'Zahra', classroomId: classC.id, ambition: 'Cultiver un jardin magique' },
  ];

  for (const [index, studentData] of students.entries()) {
    const student = await prisma.user.create({
      data: {
        email: `${studentData.name.toLowerCase()}${index}@example.com`,
        name: studentData.name,
        role: 'ELEVE',
        classroomId: studentData.classroomId,
        ambition: studentData.ambition,
      },
    });
    await prisma.etatEleve.create({ data: { eleveId: student.id } });
    console.log(`🎓 Created student: ${student.name}`);
  }


  // Créer des métiers
  const metiers = [
    { nom: 'Pompier', description: 'Sauve des vies et combat le feu.', icon: 'Flame', theme: { backgroundColor: 'from-red-500 to-orange-500', textColor: 'text-white', primaryColor: '22 84% 44%', accentColor: '45 93% 47%', cursor: 'cursor-crosshair' } },
    { nom: 'Astronaute', description: 'Explore l\'espace et les étoiles.', icon: 'Rocket', theme: { backgroundColor: 'from-blue-800 to-indigo-900', textColor: 'text-white', primaryColor: '217 91% 60%', accentColor: '262 84% 60%', cursor: 'cursor-pointer' } },
    { nom: 'Vétérinaire', description: 'Soigne les animaux.', icon: 'Stethoscope', theme: { backgroundColor: 'from-green-400 to-teal-500', textColor: 'text-white', primaryColor: '142 76% 36%', accentColor: '160 84% 39%', cursor: 'cursor-help' } },
    { nom: 'DevJeux', description: 'Crée des mondes virtuels.', icon: 'Gamepad2', theme: { backgroundColor: 'from-purple-600 to-blue-600', textColor: 'text-white', primaryColor: '250 84% 60%', accentColor: '280 84% 60%', cursor: 'cursor-grab' } },
    { nom: 'Chef', description: 'Invente des plats délicieux.', icon: 'ChefHat', theme: { backgroundColor: 'from-yellow-400 to-amber-500', textColor: 'text-black', primaryColor: '38 92% 50%', accentColor: '24 98% 52%', cursor: 'cursor-cell' } },
    { nom: 'Artiste', description: 'Exprime sa créativité.', icon: 'Paintbrush', theme: { backgroundColor: 'from-pink-500 to-rose-500', textColor: 'text-white', primaryColor: '320 84% 60%', accentColor: '340 84% 60%', cursor: 'cursor-alias' } },
    { nom: 'Écologiste', description: 'Protège la planète.', icon: 'Leaf', theme: { backgroundColor: 'from-lime-500 to-emerald-600', textColor: 'text-white', primaryColor: '120 73% 40%', accentColor: '140 73% 40%', cursor: 'cursor-zoom-in' } },
  ];
  
  const metiersData = metiers.map(metier => ({
    ...metier,
    theme: JSON.stringify(metier.theme),
  }));

  await prisma.metier.createMany({ data: metiersData });
  console.log('🛠️ Created default careers');


  // Créer des tâches
  const tasks = [
    // Tâches quotidiennes
    { title: 'Faire son lit', description: 'Un lit bien fait, une journée bien commencée !', points: 10, type: 'DAILY', category: 'HOME', difficulty: 'EASY', validationType: 'PARENT' },
    { title: 'Lire 15 minutes', description: 'Un chapitre par jour pour voyager.', points: 15, type: 'DAILY', category: 'LANGUAGE', difficulty: 'EASY', validationType: 'PARENT' },
    // Tâches hebdomadaires
    { title: 'Ranger sa chambre', description: 'Un espace propre pour des idées claires.', points: 50, type: 'WEEKLY', category: 'HOME', difficulty: 'MEDIUM', validationType: 'PARENT', requiresProof: true },
    { title: 'Exercice de maths', description: 'Résoudre une série de problèmes complexes.', points: 70, type: 'WEEKLY', category: 'MATH', difficulty: 'MEDIUM', validationType: 'PROFESSOR', requiresProof: true },
    // Tâches mensuelles
    { title: 'Projet créatif mensuel', description: 'Réaliser une recette de cuisine et la présenter.', points: 200, type: 'MONTHLY', category: 'ART', difficulty: 'HARD', validationType: 'PARENT', requiresProof: true },
    { title: 'Exposé scientifique', description: 'Préparer et présenter un sujet scientifique.', points: 250, type: 'MONTHLY', category: 'SCIENCE', difficulty: 'HARD', validationType: 'PROFESSOR', requiresProof: true },
  ];

  await prisma.task.createMany({ data: tasks as any });
  console.log('📝 Created default tasks');

  // Créer des annonces
  await prisma.announcement.create({
    data: {
      title: 'Bienvenue sur Classroom Connector !',
      content: 'C\'est la plateforme où l\'apprentissage devient une aventure. Participez, gagnez des points et explorez votre avenir !',
      authorId: teacher.id,
      // Annonce publique (pas de classeId)
    }
  });
  await prisma.announcement.create({
    data: {
      title: 'Rappel pour la 6ème A',
      content: 'N\'oubliez pas de préparer vos questions pour la session de demain sur les volcans.',
      authorId: teacher.id,
      classeId: classA.id,
    }
  });
   console.log('📢 Created default announcements');

  console.log('✅ Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
