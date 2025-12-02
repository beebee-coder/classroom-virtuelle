'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, FileJson, Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { performToolInclusionCheck } from '@/app/actions';

type CheckResult = {
  includedTools: string[];
  missingTools: string[];
};

export default function ToolInclusionChecker() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckResult | null>(null);
  const { toast } = useToast();

  const handleRunCheck = () => {
    startTransition(async () => {
      setResult(null);
      const response = await performToolInclusionCheck();
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.error || 'Failed to perform tool inclusion check.',
        });
      }
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="bg-muted p-3 rounded-md">
            <FileJson className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <CardTitle className="font-headline">AI Tool Inclusion Check</CardTitle>
            <CardDescription className="mt-1">Verify tool integration against documentation.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {isPending ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Analyzing files...</p>
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Included Tools:</h3>
              <ul className="list-none space-y-1">
                {result.includedTools.map((tool) => (
                  <li key={tool} className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{tool}</span>
                  </li>
                ))}
                {result.includedTools.length === 0 && (
                     <p className='text-sm text-muted-foreground'>No included tools found.</p>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Missing Tools:</h3>
              <ul className="list-none space-y-1">
                {result.missingTools.map((tool) => (
                  <li key={tool} className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{tool}</span>
                  </li>
                ))}
                {result.missingTools.length === 0 && (
                     <p className='text-sm text-muted-foreground'>No missing tools found.</p>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
            <FileJson className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">Click "Run Check" to analyze your tools.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleRunCheck} disabled={isPending} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
          {isPending ? 'Checking...' : result ? 'Run Again' : 'Run Check'}
        </Button>
      </CardFooter>
    </Card>
  );
}
