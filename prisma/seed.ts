
import { PrismaClient, Role, TaskType, TaskCategory, TaskDifficulty, ValidationType } from '@prisma/client';

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
      nom: 'Classe 5ème B',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classB.nom}`);

  // Créer des élèves
  const student1 = await prisma.user.create({
    data: {
      email: 'student1@example.com',
      name: 'Alice',
      role: 'ELEVE',
      classroomId: classA.id,
      ambition: 'Devenir Astronaute',
    },
  });
   await prisma.etatEleve.create({ data: { eleveId: student1.id } });
  console.log(`🎓 Created student: ${student1.name}`);

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@example.com',
      name: 'Bob',
      role: 'ELEVE',
      classroomId: classA.id,
      ambition: 'Explorer les fonds marins'
    },
  });
  await prisma.etatEleve.create({ data: { eleveId: student2.id } });
  console.log(`🎓 Created student: ${student2.name}`);
  
  const student3 = await prisma.user.create({
    data: {
      email: 'student3@example.com',
      name: 'Charlie',
      role: 'ELEVE',
      classroomId: classB.id,
      ambition: 'Créer des jeux vidéo'
    },
  });
  await prisma.etatEleve.create({ data: { eleveId: student3.id } });
  console.log(`🎓 Created student: ${student3.name}`);
  
  const student4 = await prisma.user.create({
    data: {
      email: 'student4@example.com',
      name: 'Diana',
      role: 'ELEVE',
      classroomId: classB.id,
      ambition: 'Devenir chef cuisinier'
    },
  });
  await prisma.etatEleve.create({ data: { eleveId: student4.id } });
  console.log(`🎓 Created student: ${student4.name}`);

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
