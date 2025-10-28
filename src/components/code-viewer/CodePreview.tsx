import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Copy, FileCode } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CodePreviewProps {
  code: any;
  projectId: string;
}

export default function CodePreview({ code: initialCode, projectId }: CodePreviewProps) {
  const [code, setCode] = useState<any>(initialCode);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(!initialCode);

  useEffect(() => {
    if (!initialCode && projectId) {
      loadCode();
    } else if (initialCode) {
      setFiles(initialCode.files || []);
    }
  }, [initialCode, projectId]);

  const loadCode = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_code')
        .select('*')
        .eq('project_id', projectId)
        .order('version', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  const handleDownload = () => {
    files.forEach(file => {
      const blob = new Blob([file.file_content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    toast({
      title: "Success",
      description: "Files downloaded successfully",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No code generated yet for this project.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Generated Bot Code</CardTitle>
            <CardDescription>
              {files.length} file{files.length !== 1 ? 's' : ''} generated
            </CardDescription>
          </div>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={files[0]?.file_name} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {files.map((file) => (
              <TabsTrigger key={file.id} value={file.file_name}>
                <FileCode className="h-4 w-4 mr-2" />
                {file.file_name}
              </TabsTrigger>
            ))}
          </TabsList>
          {files.map((file) => (
            <TabsContent key={file.id} value={file.file_name} className="space-y-4">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(file.file_content)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto">
                <code className="text-sm">{file.file_content}</code>
              </pre>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
