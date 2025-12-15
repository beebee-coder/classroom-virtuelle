// prisma/seed.ts

import { PrismaClient, Role, ValidationStatus, TaskType, TaskCategory, TaskDifficulty, ValidationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'teacher@example.com';
const OWNER_PASSWORD = 'password123';

const METIERS_DATA = [
  { nom: 'Astronaute', description: 'Explore les étoiles et découvre de nouveaux mondes.', icon: 'Rocket', theme: JSON.stringify({ primaryColor: '240 5.9% 10%', accentColor: '210 40% 98%', backgroundColor: 'bg-gray-900', textColor: 'text-white' }) },
  { nom: 'Détective', description: 'Résout des mystères et trouve des indices cachés.', icon: 'Search', theme: JSON.stringify({ primaryColor: '35 100% 50%', accentColor: '10 10% 30%', backgroundColor: 'bg-amber-900', textColor: 'text-white' }) },
  { nom: 'Artiste', description: 'Crée des œuvres d\'art qui inspirent et émeuvent.', icon: 'Palette', theme: JSON.stringify({ primaryColor: '346 84% 61%', accentColor: '346 74% 41%', backgroundColor: 'bg-fuchsia-100', textColor: 'text-gray-800' }) },
  { nom: 'Scientifique', description: 'Fait des expériences et repousse les limites de la connaissance.', icon: 'FlaskConical', theme: JSON.stringify({ primaryColor: '142 76% 36%', accentColor: '142 66% 26%', backgroundColor: 'bg-green-50', textColor: 'text-gray-900' }) },
  { nom: 'Chef Cuisinier', description: 'Invente des recettes délicieuses et régale les papilles.', icon: 'ChefHat', theme: JSON.stringify({ primaryColor: '355 78% 50%', accentColor: '355 68% 40%', backgroundColor: 'bg-red-50', textColor: 'text-gray-900' }) },
];

const TASKS_DATA = [
  { title: 'Faire son lit', description: 'Un lit bien fait pour une journée bien commencée.', points: 5, type: TaskType.DAILY, category: TaskCategory.HOME, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false },
  { title: 'Lire pendant 15 minutes', description: 'Un chapitre de livre, une BD, un article...', points: 10, type: TaskType.DAILY, category: TaskCategory.LANGUAGE, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false },
  { title: 'Exercice de calcul mental', description: 'Faire 10 calculs rapides en ligne.', points: 10, type: TaskType.DAILY, category: TaskCategory.MATH, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.AUTOMATIC, requiresProof: false },
  { title: 'Aider à mettre la table', description: 'Participer aux tâches de la maison.', points: 5, type: TaskType.DAILY, category: TaskCategory.HOME, difficulty: TaskDifficulty.EASY, validationType: ValidationType.PARENT, requiresProof: false },
  { title: 'Ranger sa chambre', description: 'Un espace propre pour des idées claires.', points: 25, type: TaskType.WEEKLY, category: TaskCategory.HOME, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.PARENT, requiresProof: true },
  { title: 'Préparer une recette simple', description: 'Cuisiner un plat ou un dessert avec supervision.', points: 50, type: TaskType.WEEKLY, category: TaskCategory.ART, difficulty: TaskDifficulty.HARD, validationType: ValidationType.PARENT, requiresProof: true },
  { title: 'Faire un dessin sur un thème donné', description: 'Le professeur donnera un thème chaque semaine.', points: 30, type: TaskType.WEEKLY, category: TaskCategory.ART, difficulty: TaskDifficulty.MEDIUM, validationType: ValidationType.PROFESSOR, requiresProof: true },
  { title: 'Présenter un exposé', description: 'Faire un court exposé sur un sujet de son choix.', points: 100, type: TaskType.MONTHLY, category: TaskCategory.LANGUAGE, difficulty: TaskDifficulty.HARD, validationType: ValidationType.PROFESSOR, requiresProof: false },
];

async function main() {
  console.log('🌱 Démarrage du script de seeding...');

  // Étape 1: Nettoyage complet dans une transaction
  console.log('🧹 Nettoyage des anciennes données...');
  await prisma.$transaction(async (tx) => {
    // Ordre de suppression pour respecter les contraintes de clés étrangères
    await tx.reaction.deleteMany();
    await tx.message.deleteMany();
    await tx.studentProgress.deleteMany();
    await tx.etatEleve.deleteMany();
    await tx.announcement.deleteMany();
    await tx.sharedDocument.deleteMany();
    await tx.coursSession.deleteMany();
    await tx.classroom.deleteMany();
    await tx.user.deleteMany({ where: { role: Role.ELEVE } });
    await tx.user.deleteMany({ where: { role: Role.PROFESSEUR } });
    await tx.task.deleteMany();
    await tx.metier.deleteMany();
  });
  console.log('✅ Données nettoyées.');

  // Étape 2: Création des données (hors transaction pour éviter les timeouts)
  
  // 2.1. Création du professeur principal
  console.log('👨‍🏫 Création du professeur principal...');
  const hashedPassword = await bcrypt.hash(OWNER_PASSWORD, 12);
  const teacher = await prisma.user.create({
    data: {
      email: OWNER_EMAIL.toLowerCase(),
      password: hashedPassword,
      name: 'ahmed abbes',
      role: Role.PROFESSEUR,
      validationStatus: ValidationStatus.VALIDATED,
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Professeur créé : ${teacher.name} (${teacher.email})`);

  // 2.2. Création des métiers et des tâches
  console.log('🛠️ Création des métiers et tâches...');
  await prisma.metier.createMany({ data: METIERS_DATA });
  await prisma.task.createMany({ data: TASKS_DATA });
  console.log(`✅ ${METIERS_DATA.length} métiers et ${TASKS_DATA.length} tâches créés.`);
  

  console.log('✅ Seeding terminé avec succès ! Les classes et élèves peuvent être créés via l\'application.');
}

main()
  .catch((e) => {
    console.error('❌ Une erreur est survenue pendant le seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
