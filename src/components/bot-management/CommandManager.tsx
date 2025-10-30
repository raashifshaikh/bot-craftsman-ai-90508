import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Wand2, Save, GripVertical } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Command {
  id?: string;
  command: string;
  description: string;
  response_type: string;
  response_content: string;
  response_metadata?: any;
  order_index: number;
  is_active: boolean;
}

interface CommandManagerProps {
  projectId: string;
  botDescription: string;
}

export default function CommandManager({ projectId, botDescription }: CommandManagerProps) {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCommands();
  }, [projectId]);

  const loadCommands = async () => {
    const { data, error } = await supabase
      .from('bot_commands')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load commands',
        variant: 'destructive',
      });
      return;
    }

    setCommands(data || []);
    setLoading(false);
  };

  const addCommand = () => {
    const newCommand: Command = {
      command: '/newcommand',
      description: '',
      response_type: 'text',
      response_content: '',
      order_index: commands.length,
      is_active: true,
    };
    setCommands([...commands, newCommand]);
  };

  const normalizeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    return trimmed.startsWith('/') ? trimmed : '/' + trimmed;
  };

  const updateCommand = (index: number, field: keyof Command, value: any) => {
    const updated = [...commands];
    updated[index] = { ...updated[index], [field]: value };
    setCommands(updated);
  };

  const deleteCommand = async (index: number) => {
    const command = commands[index];
    if (command.id) {
      const { error } = await supabase
        .from('bot_commands')
        .delete()
        .eq('id', command.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete command',
          variant: 'destructive',
        });
        return;
      }
    }

    const updated = commands.filter((_, i) => i !== index);
    setCommands(updated);
    
    toast({
      title: 'Success',
      description: 'Command deleted',
    });
  };

  const saveCommands = async () => {
    // Validate commands before saving
    const invalidCommands = commands.filter(c => 
      !c.command.trim() || 
      !c.description.trim() || 
      !c.response_content.trim()
    );
    
    if (invalidCommands.length > 0) {
      toast({
        title: 'Validation Error',
        description: `${invalidCommands.length} command(s) have empty fields. Please fill all required fields.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Normalize all commands to have / prefix
      const normalizedCommands = commands.map(c => ({
        ...c,
        command: normalizeCommand(c.command)
      }));
      
      setCommands(normalizedCommands);

      // Separate new and existing commands
      const newCommands = normalizedCommands.filter(c => !c.id);
      const existingCommands = normalizedCommands.filter(c => c.id);

      // Insert new commands
      if (newCommands.length > 0) {
        const { error: insertError } = await supabase
          .from('bot_commands')
          .insert(
            newCommands.map(c => ({
              project_id: projectId,
              command: c.command,
              description: c.description,
              response_type: c.response_type,
              response_content: c.response_content,
              response_metadata: c.response_metadata || {},
              order_index: c.order_index,
              is_active: c.is_active,
            }))
          );

        if (insertError) throw insertError;
      }

      // Update existing commands
      for (const cmd of existingCommands) {
        const { error: updateError } = await supabase
          .from('bot_commands')
          .update({
            command: cmd.command,
            description: cmd.description,
            response_type: cmd.response_type,
            response_content: cmd.response_content,
            response_metadata: cmd.response_metadata || {},
            order_index: cmd.order_index,
            is_active: cmd.is_active,
          })
          .eq('id', cmd.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Success',
        description: 'Commands saved successfully',
      });

      // Reload to get IDs for new commands
      await loadCommands();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save commands',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateResponse = async (index: number) => {
    const command = commands[index];
    if (!command.description) {
      toast({
        title: 'Error',
        description: 'Please add a description first',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-response', {
        body: {
          command: command.command,
          commandDescription: command.description,
          botContext: botDescription,
        },
      });

      if (error) throw error;

      updateCommand(index, 'response_content', data.response);
      
      toast({
        title: 'Success',
        description: 'Response generated with AI',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate response',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getSuggestions = async () => {
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-commands', {
        body: {
          botDescription,
          existingCommands: commands,
        },
      });

      if (error) throw error;

      const newCommands = data.suggestions.map((s: any, i: number) => ({
        command: s.command,
        description: s.description,
        response_type: 'text',
        response_content: s.response,
        order_index: commands.length + i,
        is_active: true,
      }));

      setCommands([...commands, ...newCommands]);
      
      toast({
        title: 'Success',
        description: `Added ${newCommands.length} suggested commands`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to get suggestions',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading commands...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bot Commands</h3>
        <div className="flex gap-2">
          <Button onClick={getSuggestions} disabled={generating} variant="outline">
            <Wand2 className="w-4 h-4 mr-2" />
            AI Suggestions
          </Button>
          <Button onClick={addCommand} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Command
          </Button>
          <Button onClick={saveCommands} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            Save All
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {commands.map((cmd, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <Input
                    value={cmd.command}
                    onChange={(e) => updateCommand(index, 'command', e.target.value)}
                    onBlur={(e) => updateCommand(index, 'command', normalizeCommand(e.target.value))}
                    placeholder="/command"
                    className="w-40"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCommand(index)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Description</Label>
                <Input
                  value={cmd.description}
                  onChange={(e) => updateCommand(index, 'description', e.target.value)}
                  placeholder="What does this command do?"
                />
              </div>

              <div>
                <Label>Response Type</Label>
                <Select
                  value={cmd.response_type}
                  onValueChange={(value) => updateCommand(index, 'response_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="buttons">Buttons</SelectItem>
                    <SelectItem value="ai">AI Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Response</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => generateResponse(index)}
                    disabled={generating}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                </div>
                <Textarea
                  value={cmd.response_content}
                  onChange={(e) => updateCommand(index, 'response_content', e.target.value)}
                  placeholder="Bot's response message"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {commands.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="mb-4">No commands yet. Add your first command to get started!</p>
            <Button onClick={addCommand}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Command
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
