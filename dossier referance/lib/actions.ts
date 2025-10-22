// This file is the single source of truth for all server actions.
// It is recommended to create a file for each action category.
// e.g. src/lib/actions/auth.actions.ts
// and export all actions from this file.
// For more information, see https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

import prisma from './prisma';

export * from './actions/class.actions';
export * from './actions/session.actions';
export * from './actions/student.actions';
export * from './actions/task.actions';
export * from './actions/conversation.actions';
export * from './actions/announcement.actions';
export * from './actions/chat.actions';
export * from './actions/teacher.actions';
export * from './actions/activity.actions';
export * from './actions/parent.actions';
export * from './actions/user.actions';
