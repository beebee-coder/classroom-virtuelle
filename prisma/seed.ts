
import { PrismaClient, Role, TaskType, TaskCategory, TaskDifficulty, ValidationType } from '@prisma/client';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Nettoyer la base de données dans le bon ordre pour respecter les contraintes de clé étrangère
  console.log('🧹 Cleaning database...');
  
  // D'abord supprimer les données qui ont des dépendances vers d'autres tables
  await prisma.reaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.studentProgress.deleteMany();
  await prisma.etatEleve.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.coursSession.deleteMany();
  
  // Ensuite supprimer les classes qui dépendent des utilisateurs (professeurs)
  await prisma.classroom.deleteMany();
  
  // Maintenant on peut supprimer les utilisateurs
  await prisma.user.deleteMany();

  // Et enfin les tables sans dépendances sortantes majeures
  await prisma.task.deleteMany();
  await prisma.metier.deleteMany();

  console.log('✅ Database cleaned successfully');

  // Hacher le mot de passe commun
  const hashedPassword = await bcrypt.hash('password', 10);
  console.log('🔑 Mot de passe commun haché.');

  // Créer le professeur d'abord
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@example.com',
      name: 'Professeur Test',
      role: 'PROFESSEUR' as Role,
      password: hashedPassword,
    },
  });
  console.log(`👨‍🏫 Created teacher: ${teacher.name} (${teacher.email})`);

  // Créer des classes
  const classA = await prisma.classroom.create({
    data: {
      id: 'classe-6eme-a',
      nom: 'Classe 6ème A',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classA.nom}`);

  const classB = await prisma.classroom.create({
    data: {
      id: 'classe-6eme-b',
      nom: 'Classe 6ème B',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classB.nom}`);

  const classC = await prisma.classroom.create({
    data: {
      id: 'classe-5eme-a',
      nom: 'Classe 5ème A',
      professeurId: teacher.id,
    },
  });
  console.log(`🏫 Created class: ${classC.nom}`);

  // Créer des élèves
  const students = [
    // Classe A
    { name: 'Ahmed', classeId: classA.id, ambition: 'Devenir Astronaute' },
    { name: 'Hafedh', classeId: classA.id, ambition: 'Explorer les fonds marins' },
    { name: 'Mohamed-Amin', classeId: classA.id, ambition: 'Créer des jeux vidéo' },
    { name: 'Samar', classeId: classA.id, ambition: 'Devenir chef cuisinier' },
    { name: 'Youssef', classeId: classA.id, ambition: 'Être un grand artiste' },
    { name: 'Amina', classeId: classA.id, ambition: 'Protéger la nature' },
    { name: 'Tarek', classeId: classA.id, ambition: 'Construire des robots' },
    { name: 'Leila', classeId: classA.id, ambition: 'Soigner les animaux' },
    { name: 'Ibrahim', classeId: classA.id, ambition: 'Devenir pompier' },
    { name: 'Nora', classeId: classA.id, ambition: 'Voyager dans le temps' },
    // Classe B
    { name: 'Ali', classeId: classB.id, ambition: 'Piloter des avions' },
    { name: 'Sofia', classeId: classB.id, ambition: 'Écrire des histoires' },
    { name: 'Mehdi', classeId: classB.id, ambition: 'Devenir un champion de sport' },
    { name: 'Yasmina', classeId: classB.id, ambition: 'Inventer de nouvelles choses' },
    { name: 'Karim', classeId: classB.id, ambition: 'Être détective' },
    { name: 'Sara', classeId: classB.id, ambition: 'Guérir les maladies' },
    { name: 'Hassan', classeId: classB.id, ambition: 'Explorer des grottes' },
    { name: 'Ines', classeId: classB.id, ambition: 'Parler toutes les langues' },
    { name: 'Rachid', classeId: classB.id, ambition: 'Construire des ponts' },
    { name: 'Samira', classeId: classB.id, ambition: 'Chanter sur scène' },
    // Classe C
    { name: 'Zayd', classeId: classC.id, ambition: 'Découvrir des trésors' },
    { name: 'Lina', classeId: classC.id, ambition: 'Dessiner des mangas' },
    { name: 'Adil', classeId: classC.id, ambition: 'Créer des applications' },
    { name: 'Dounia', classeId: classC.id, ambition: 'Devenir photographe' },
    { name: 'Anis', classeId: classC.id, ambition: 'Comprendre les étoiles' },
    { name: 'Nadia', classeId: classC.id, ambition: 'Faire le tour du monde' },
    { name: 'Ismail', classeId: classC.id, ambition: 'Construire des cabanes' },
    { name: 'Rania', classeId: classC.id, ambition: 'Aider les autres' },
    { name: 'Malik', classeId: classC.id, ambition: 'Être un super-héros' },
    { name: 'Zahra', classeId: classC.id, ambition: 'Cultiver un jardin magique' },
  ];

  for (const [index, studentData] of students.entries()) {
    const email = studentData.name === 'Ahmed' 
      ? 'ahmed0@example.com' 
      : `${studentData.name.toLowerCase()}${index}@example.com`;
      
    const student = await prisma.user.create({
      data: {
        email: email,
        name: studentData.name,
        role: 'ELEVE' as Role,
        classeId: studentData.classeId,
        ambition: studentData.ambition,
        password: hashedPassword, // Assigner le mot de passe haché
      },
    });

    // Créer l'état de l'élève
    await prisma.etatEleve.create({
      data: { eleveId: student.id }
    });
    console.log(`🎓 Created student: ${student.name}`);
  }

  // Créer des métiers
  const metiers = [
    { 
      id: 'metier-pompier',
      nom: 'Pompier', 
      description: 'Sauve des vies et combat le feu.', 
      icon: 'Flame', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-red-500 to-orange-500', 
        textColor: 'text-white', 
        primaryColor: '22 84% 44%', 
        accentColor: '45 93% 47%', 
        cursor: 'cursor-crosshair' 
      })
    },
    { 
      id: 'metier-astronaute',
      nom: 'Astronaute', 
      description: 'Explore l\'espace et les étoiles.', 
      icon: 'Rocket', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-blue-800 to-indigo-900', 
        textColor: 'text-white', 
        primaryColor: '217 91% 60%', 
        accentColor: '262 84% 60%', 
        cursor: 'cursor-pointer' 
      })
    },
    { 
      id: 'metier-veterinaire',
      nom: 'Vétérinaire', 
      description: 'Soigne les animaux.', 
      icon: 'Stethoscope', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-green-400 to-teal-500', 
        textColor: 'text-white', 
        primaryColor: '142 76% 36%', 
        accentColor: '160 84% 39%', 
        cursor: 'cursor-help' 
      })
    },
    { 
      id: 'metier-devjeux',
      nom: 'DevJeux', 
      description: 'Crée des mondes virtuels.', 
      icon: 'Gamepad2', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-purple-600 to-blue-600', 
        textColor: 'text-white', 
        primaryColor: '250 84% 60%', 
        accentColor: '280 84% 60%', 
        cursor: 'cursor-grab' 
      })
    },
    { 
      id: 'metier-chef',
      nom: 'Chef', 
      description: 'Invente des plats délicieux.', 
      icon: 'ChefHat', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-yellow-400 to-amber-500', 
        textColor: 'text-black', 
        primaryColor: '38 92% 50%', 
        accentColor: '24 98% 52%', 
        cursor: 'cursor-cell' 
      })
    },
    { 
      id: 'metier-artiste',
      nom: 'Artiste', 
      description: 'Exprime sa créativité.', 
      icon: 'Paintbrush', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-pink-500 to-rose-500', 
        textColor: 'text-white', 
        primaryColor: '320 84% 60%', 
        accentColor: '340 84% 60%', 
        cursor: 'cursor-alias' 
      })
    },
    { 
      id: 'metier-ecologiste',
      nom: 'Écologiste', 
      description: 'Protège la planète.', 
      icon: 'Leaf', 
      theme: JSON.stringify({ 
        backgroundColor: 'from-lime-500 to-emerald-600', 
        textColor: 'text-white', 
        primaryColor: '120 73% 40%', 
        accentColor: '140 73% 40%', 
        cursor: 'cursor-zoom-in' 
      })
    },
  ];
  
  for (const metier of metiers) {
    await prisma.metier.create({
      data: {
        id: metier.id,
        nom: metier.nom,
        description: metier.description,
        icon: metier.icon,
        theme: metier.theme,
      }
    });
    console.log(`🛠️ Created metier: ${metier.nom}`);
  }

  // Créer des tâches
  const tasks = [
    // Tâches quotidiennes
    { 
      id: 'task-daily-bed',
      title: 'Faire son lit', 
      description: 'Un lit bien fait, une journée bien commencée !', 
      points: 10, 
      type: TaskType.DAILY, 
      category: TaskCategory.HOME, 
      difficulty: TaskDifficulty.EASY, 
      validationType: ValidationType.PARENT 
    },
    { 
      id: 'task-daily-reading',
      title: 'Lire 15 minutes', 
      description: 'Un chapitre par jour pour voyager.', 
      points: 15, 
      type: TaskType.DAILY, 
      category: TaskCategory.LANGUAGE, 
      difficulty: TaskDifficulty.EASY, 
      validationType: ValidationType.PARENT 
    },
    // Tâches hebdomadaires
    { 
      id: 'task-weekly-clean',
      title: 'Ranger sa chambre', 
      description: 'Un espace propre pour des idées claires.', 
      points: 50, 
      type: TaskType.WEEKLY, 
      category: TaskCategory.HOME, 
      difficulty: TaskDifficulty.MEDIUM, 
      validationType: ValidationType.PARENT, 
      requiresProof: true 
    },
    { 
      id: 'task-weekly-math',
      title: 'Exercice de maths', 
      description: 'Résoudre une série de problèmes complexes.', 
      points: 70, 
      type: TaskType.WEEKLY, 
      category: TaskCategory.MATH, 
      difficulty: TaskDifficulty.MEDIUM, 
      validationType: ValidationType.PROFESSOR, 
      requiresProof: true 
    },
    // Tâches mensuelles
    { 
      id: 'task-monthly-creative',
      title: 'Projet créatif mensuel', 
      description: 'Réaliser une recette de cuisine et la présenter.', 
      points: 200, 
      type: TaskType.MONTHLY, 
      category: TaskCategory.ART, 
      difficulty: TaskDifficulty.HARD, 
      validationType: ValidationType.PARENT, 
      requiresProof: true 
    },
    { 
      id: 'task-monthly-science',
      title: 'Exposé scientifique', 
      description: 'Préparer et présenter un sujet scientifique.', 
      points: 250, 
      type: TaskType.MONTHLY, 
      category: TaskCategory.SCIENCE, 
      difficulty: TaskDifficulty.HARD, 
      validationType: ValidationType.PROFESSOR, 
      requiresProof: true 
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: task
    });
    console.log(`📝 Created task: ${task.title}`);
  }

  // Créer des annonces
  await prisma.announcement.create({
    data: {
      id: 'announcement-welcome',
      title: 'Bienvenue sur Classroom Connector !',
      content: 'C\'est la plateforme où l\'apprentissage devient une aventure. Participez, gagnez des points et explorez votre avenir !',
      authorId: teacher.id,
    }
  });
  
  await prisma.announcement.create({
    data: {
      id: 'announcement-reminder-6a',
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
