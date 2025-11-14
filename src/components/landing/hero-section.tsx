'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { joinWaitlist, type FormState } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';

const initialState: FormState = {
  message: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? 'Joining...' : 'Join Waitlist'}
      {!pending && <ArrowRight className="ml-2 h-4 w-4" />}
    </Button>
  );
}

export function HeroSection() {
  const [state, formAction] = useFormState(joinWaitlist, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? 'Success!' : 'Oops!',
        description: state.message,
        variant: state.success ? 'default' : 'destructive',
      });
      if (state.success) {
        formRef.current?.reset();
      }
    }
  }, [state, toast]);

  return (
    <section className="py-20 md:py-32">
      <div className="container text-center">
        <h1 className="text-4xl md:text-6xl font-bold font-headline tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
          Build Your Next Idea with Aura
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          A beautifully designed, composable, and ready-to-use landing page template to kickstart your project.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <form ref={formRef} action={formAction} className="flex gap-2">
            <Input
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              className="flex-1"
              aria-label="Email for waitlist"
            />
            <SubmitButton />
          </form>
          {!state.success && state.message && (
             <p className="mt-2 text-sm text-destructive text-left">{state.message}</p>
          )}
        </div>
      </div>
    </section>
  );
}
