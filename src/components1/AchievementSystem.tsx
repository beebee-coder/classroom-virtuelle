// src/components/AchievementSystem.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Award } from 'lucide-react';
import prisma from '@/lib/prisma';
import * as Icons from 'lucide-react';
import type { Achievement as AchievementType, User, Message } from '@prisma/client';
import { isQuestion } from '@/ai/flows/is-question-flow';

type IconName = keyof typeof Icons;

const Icon = ({ name, ...props }: { name: IconName } & Icons.LucideProps) => {
  const LucideIcon = Icons[name] as React.FC<Icons.LucideProps>;
  if (!LucideIcon) return <Icons.Award {...props} />;
  return <LucideIcon {...props} />;
};

interface AchievementSystemProps {
  studentId: string;
}

// Interface pour étendre le type User avec les relations
interface StudentWithRelations extends User {
  leaderboardEntry?: {
    currentStreak: number;
    totalPoints: number;
    rank: number;
  } | null;
  progress?: Array<{
    id: string;
    status: string;
  }>;
  sessionsParticipees?: Array<{
    id: string;
  }>;
  messages?: Array<Message>;
}

export async function AchievementSystem({ studentId }: AchievementSystemProps) {
  const allAchievements = await prisma.achievement.findMany();

  const student = (await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      leaderboardEntry: {
        select: {
          currentStreak: true,
          totalPoints: true,
          rank: true,
        },
      },
      progress: {
        where: { status: { in: ['COMPLETED', 'VERIFIED'] } },
        select: {
          id: true,
          status: true,
        },
      },
      sessionsParticipees: {
        select: {
          id: true,
        },
      },
      messages: {
        where: {
          classroomId: { not: null },
        },
      },
    },
  })) as StudentWithRelations | null;

  if (!student) return null;

  // Analyse des messages pour les questions
  const questionMessages = await Promise.all(
    (student.messages || []).map(async (message) => {
      // Utilise la nouvelle fonction simple
      return isQuestion(message.message);
    })
  );

  const questionsAskedCount = questionMessages.filter(Boolean).length;

  const getAchievementProgress = (achievement: AchievementType) => {
    const criteria = achievement.criteria as any;
    let progress = 0;
    let target = 1;
    let unlocked = false;

    switch (criteria.type) {
      case 'total_tasks':
        progress = student.progress?.length || 0;
        target = criteria.count || 50;
        break;
      case 'streak':
        progress = student?.leaderboardEntry?.currentStreak ?? 0;
        target = criteria.days || 7;
        break;
      case 'first_task':
        progress = (student.progress?.length || 0) > 0 ? 1 : 0;
        target = 1;
        break;
      case 'group_sessions':
        progress = student.sessionsParticipees?.length || 0;
        target = criteria.count || 10;
        break;
      case 'questions_asked':
        progress = questionsAskedCount;
        target = criteria.count || 20;
        break;
      default:
        progress = 0;
        target = 1;
    }

    unlocked = progress >= target;

    return { progress, target, unlocked };
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return { text: '🥇 Or', className: 'bg-yellow-100 text-yellow-800' };
    if (rank === 2)
      return { text: '🥈 Argent', className: 'bg-gray-200 text-gray-800' };
    if (rank === 3)
      return { text: '🥉 Bronze', className: 'bg-amber-100 text-amber-800' };
    return { text: `#${rank}`, className: 'bg-muted text-muted-foreground' };
  };

  const leaderboardEntry = student?.leaderboardEntry;
  const rankBadge = leaderboardEntry?.rank
    ? getRankBadge(leaderboardEntry.rank)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Système de Récompenses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allAchievements.map((achievement) => {
            const { progress, target, unlocked } =
              getAchievementProgress(achievement);
            const iconName = (achievement.icon as IconName) || 'Award';

            return (
              <div
                key={achievement.id}
                className={`border rounded-lg p-4 ${
                  unlocked
                    ? 'border-yellow-300 bg-yellow-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      unlocked
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <Icon name={iconName} className="h-6 w-6" />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{achievement.name}</h4>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {achievement.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression</span>
                        <span>
                          {progress}/{target}
                        </span>
                      </div>
                      <Progress
                        value={(progress / target) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <div className="flex items-center gap-1 text-sm text-yellow-600">
                        <Award className="h-4 w-4" />
                        {achievement.points} pts
                      </div>
                      {unlocked && (
                        <Badge
                          variant="default"
                          className="bg-green-100 text-green-800"
                        >
                          Débloqué
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Points totaux et classement */}
        {leaderboardEntry && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Points totaux: {leaderboardEntry.totalPoints}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Classé #{leaderboardEntry.rank} dans la classe
                </p>
              </div>
              {rankBadge && (
                <Badge
                  variant="secondary"
                  className={`text-lg ${rankBadge.className}`}
                >
                  {rankBadge.text}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
