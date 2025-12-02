// src/lib/ably/types.ts
import type { Role } from "@prisma/client";

/**
 * @fileoverview Defines shared types for Ably real-time communication.
 */

/**
 * Represents the data structure for a member in an Ably presence set.
 */
export interface AblyPresenceMember {
  id: string;
  name: string;
  role: Role;
  image: string | null;
  data?: any; // For additional custom data
}
