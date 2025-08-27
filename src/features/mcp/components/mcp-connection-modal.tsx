'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { useCreateMcpConnection, useUpdateMcpConnection } from '../hooks/use-mcp-connections';
import { MCP_PROVIDER_PRESETS, McpConnectionWithCreator, McpProviderPreset } from '../types';

const formSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  server_url: z.string().url('Please enter a valid URL'),
  server_label: z.string().min(1, 'Server label is required'),
  auth_headers: z.record(z.string(), z.string()).optional(),
  require_approval: z.boolean(),
  allowed_tools: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface McpConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  mode: 'create' | 'edit';
  connection?: McpConnectionWithCreator | null;
}

export function McpConnectionModal({
  open,
  onOpenChange,
  workspaceId,
  mode,
  connection,
}: McpConnectionModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<McpProviderPreset | null>(null);
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [newToolName, setNewToolName] = useState('');

  const createMutation = useCreateMcpConnection(workspaceId);
  const updateMutation = useUpdateMcpConnection(workspaceId, connection?.id || '');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: '',
      name: '',
      description: '',
      server_url: '',
      server_label: '',
      auth_headers: {},
      require_approval: false,
      allowed_tools: [],
    },
  });

  // Reset form when modal opens/closes or connection changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && connection) {
        form.reset({
          provider: connection.provider,
          name: connection.name,
          description: connection.description || '',
          server_url: connection.server_url,
          server_label: connection.server_label,
          require_approval: connection.require_approval,
        });
        setAuthHeaders(connection.auth_headers || {});
        setAllowedTools(connection.allowed_tools || []);
      } else {
        form.reset();
        setAuthHeaders({});
        setAllowedTools([]);
        setSelectedPreset(null);
      }
    }
  }, [open, mode, connection, form]);

  const handlePresetSelect = (preset: McpProviderPreset) => {
    setSelectedPreset(preset);
    form.setValue('provider', preset.id);
    form.setValue('name', preset.name);
    form.setValue('server_url', preset.server_url);
    form.setValue('server_label', `${preset.id}-${Date.now()}`);
    setAllowedTools(preset.common_tools || []);
  };

  const addAuthHeader = (key: string, value: string) => {
    if (key && value) {
      const newHeaders = { ...authHeaders, [key]: value };
      setAuthHeaders(newHeaders);
    }
  };

  const removeAuthHeader = (key: string) => {
    const newHeaders = { ...authHeaders };
    delete newHeaders[key];
    setAuthHeaders(newHeaders);
  };

  const addTool = () => {
    if (newToolName && !allowedTools.includes(newToolName)) {
      setAllowedTools([...allowedTools, newToolName]);
      setNewToolName('');
    }
  };

  const removeTool = (tool: string) => {
    setAllowedTools(allowedTools.filter((t) => t !== tool));
  };

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      auth_headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
      allowed_tools: allowedTools.length > 0 ? allowedTools : undefined,
      // Add OAuth config for OAuth providers
      oauth_config: selectedPreset?.auth_type === 'oauth' ? { 
        scopes: ['read', 'write', 'issues:create'] 
      } : undefined,
    };

    if (mode === 'create') {
      createMutation.mutate(payload, {
        onSuccess: (response) => {
          // Check if this is an OAuth response
          if (response && 'oauth' in response) {
            // Redirect to OAuth authorization URL
            window.location.href = response.oauth.authorization_url;
          } else {
            onOpenChange(false);
            form.reset();
          }
        },
      });
    } else if (mode === 'edit' && connection) {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
        },
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add MCP Connection' : 'Edit MCP Connection'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Connect your agents to external tools via Model Context Protocol'
              : 'Update your MCP connection settings'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue={mode === 'create' ? 'presets' : 'custom'} className="w-full">
              {mode === 'create' && (
                <>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="presets">Popular Services</TabsTrigger>
                    <TabsTrigger value="custom">Custom Server</TabsTrigger>
                  </TabsList>

                  <TabsContent value="presets" className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MCP_PROVIDER_PRESETS.filter((p) => p.id !== 'custom').map((preset) => (
                        <Card
                          key={preset.id}
                          className={`cursor-pointer transition-all hover:bg-muted/50 ${
                            selectedPreset?.id === preset.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => handlePresetSelect(preset)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{preset.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-xs">
                              {preset.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {selectedPreset && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Authentication Setup</CardTitle>
                          <CardDescription className="text-xs">
                            {selectedPreset.auth_instructions}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedPreset.auth_type === 'oauth' ? (
                            <div className="text-sm text-muted-foreground">
                              OAuth authentication will be handled automatically when you create the connection.
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder={
                                  selectedPreset.auth_type === 'bearer' ? 'Bearer Token' : 'API Key'
                                }
                                onChange={(e) => {
                                  const headerKey =
                                    selectedPreset.auth_type === 'bearer'
                                      ? 'Authorization'
                                      : 'X-API-Key';
                                  const headerValue =
                                    selectedPreset.auth_type === 'bearer'
                                      ? `Bearer ${e.target.value}`
                                      : e.target.value;
                                  if (e.target.value) {
                                    addAuthHeader(headerKey, headerValue);
                                  } else {
                                    removeAuthHeader(headerKey);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </>
              )}

              <TabsContent value="custom" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., linear, github" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Connection Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Linear Production" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this connection is used for"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="server_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://mcp.example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="server_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Label</FormLabel>
                        <FormControl>
                          <Input placeholder="unique-server-id" {...field} />
                        </FormControl>
                        <FormDescription>Unique identifier for OpenAI API</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Auth Headers */}
                <div className="space-y-3">
                  <FormLabel>Authentication Headers</FormLabel>
                  <div className="space-y-2">
                    {Object.entries(authHeaders).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Input value={key} disabled className="w-1/3" />
                        <Input value={value} disabled className="flex-1" />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeAuthHeader(key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Header name"
                        className="w-1/3"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const key = e.currentTarget.value;
                            const valueInput = e.currentTarget.parentElement?.querySelector(
                              'input:nth-child(2)',
                            ) as HTMLInputElement;
                            if (valueInput) {
                              addAuthHeader(key, valueInput.value);
                              e.currentTarget.value = '';
                              valueInput.value = '';
                            }
                          }
                        }}
                      />
                      <Input
                        placeholder="Header value"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = e.currentTarget.value;
                            const keyInput = e.currentTarget.parentElement?.querySelector(
                              'input:first-child',
                            ) as HTMLInputElement;
                            if (keyInput) {
                              addAuthHeader(keyInput.value, value);
                              keyInput.value = '';
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const container = document.querySelector('.auth-headers-container');
                          const keyInput = container?.querySelector(
                            'input:nth-last-child(3)',
                          ) as HTMLInputElement;
                          const valueInput = container?.querySelector(
                            'input:nth-last-child(2)',
                          ) as HTMLInputElement;
                          if (keyInput && valueInput) {
                            addAuthHeader(keyInput.value, valueInput.value);
                            keyInput.value = '';
                            valueInput.value = '';
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Allowed Tools */}
                <div className="space-y-3">
                  <FormLabel>Allowed Tools (Optional)</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {allowedTools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="px-2 py-1">
                        {tool}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1 p-0"
                          onClick={() => removeTool(tool)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tool name"
                      value={newToolName}
                      onChange={(e) => setNewToolName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTool();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTool}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormDescription>Leave empty to allow all tools from the server</FormDescription>
                </div>

                <FormField
                  control={form.control}
                  name="require_approval"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Require Approval</FormLabel>
                        <FormDescription>
                          Require manual approval for each tool call from this connection
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? mode === 'create'
                    ? 'Creating...'
                    : 'Updating...'
                  : mode === 'create'
                    ? 'Create Connection'
                    : 'Update Connection'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
