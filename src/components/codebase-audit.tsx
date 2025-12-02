'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCode, Loader2, Terminal, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from './ui/badge';

type AuditResult = {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
};

const mockAuditResults: AuditResult[] = [
  {
    file: 'src/components/header.tsx',
    line: 23,
    rule: 'no-unused-vars',
    message: "'logo' is defined but never used.",
    severity: 'warning',
  },
  {
    file: 'src/app/page.tsx',
    line: 8,
    rule: 'react/jsx-key',
    message: "Missing 'key' prop for element in iterator",
    severity: 'error',
  },
  {
    file: 'src/lib/utils.ts',
    line: 45,
    rule: 'prefer-const',
    message: "'result' is never reassigned. Use 'const' instead.",
    severity: 'warning',
  },
];

export default function CodebaseAudit() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<AuditResult[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleRunAudit = () => {
    startTransition(() => {
      setIsScanning(true);
      setResults(null);
      setTimeout(() => {
        setResults(mockAuditResults);
        setIsScanning(false);
      }, 2000);
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="bg-muted p-3 rounded-md">
            <Terminal className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <CardTitle className="font-headline">Automated Codebase Audit</CardTitle>
            <CardDescription className="mt-1">Scan for code quality issues with ESLint.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Scanning codebase...</p>
          </div>
        ) : results ? (
          <div className="space-y-4">
            <h3 className="font-semibold">Audit Results:</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={result.severity === 'error' ? 'destructive' : 'secondary'}>
                        {result.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.file}:{result.line}
                    </TableCell>
                    <TableCell>{result.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
            <FileCode className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">Click "Run Audit" to scan your codebase.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleRunAudit} disabled={isPending} className="w-full bg-primary hover:bg-primary/90">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Terminal className="mr-2 h-4 w-4" />}
          {isScanning ? 'Scanning...' : results ? 'Run Again' : 'Run Audit'}
        </Button>
      </CardFooter>
    </Card>
  );
}
