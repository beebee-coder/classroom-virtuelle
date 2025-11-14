'use server';

import { z } from 'zod';
import prisma from '@/lib/db';

const emailSchema = z.string().email({ message: "Invalid email address." });

export type FormState = {
  message: string;
  success: boolean;
};

export async function joinWaitlist(prevState: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email');

  const validatedEmail = emailSchema.safeParse(email);

  if (!validatedEmail.success) {
    // This is a simple way to handle the form state without resetting the input
    // The client component will show this error message
    return {
      message: validatedEmail.error.errors[0].message,
      success: false
    };
  }

  try {
    await prisma.waitlistEntry.create({
      data: {
        email: validatedEmail.data,
      },
    });

    return {
      message: "Thank you for joining the waitlist!",
      success: true
    };
  } catch (error: any) {
    // Check for unique constraint violation (email already exists)
    if (error.code === 'P2002') {
      return {
        message: 'This email is already on the waitlist.',
        success: false,
      };
    }
    // Handle other potential errors
    return {
      message: 'An unexpected error occurred. Please try again later.',
      success: false
    };
  }
}
