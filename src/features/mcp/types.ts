export interface OAuthConfig {
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes: string[];
  authorization_url?: string;
  token_url?: string;
}

export interface McpConnection {
  id: string;
  workspace_id: string;
  provider: string;
  name: string;
  description: string | null;
  server_url: string;
  server_label: string;
  auth_headers: Record<string, string> | null;
  oauth_config: OAuthConfig | null;
  require_approval: boolean;
  allowed_tools: string[] | null;
  status: 'active' | 'inactive' | 'error' | 'pending_auth';
  last_tested_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface McpConnectionWithCreator extends McpConnection {
  created_by: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
}

export interface CreateMcpConnectionRequest {
  provider: string;
  name: string;
  description?: string;
  server_url: string;
  server_label: string;
  auth_headers?: Record<string, string>;
  oauth_config?: Partial<OAuthConfig>;
  require_approval?: boolean;
  allowed_tools?: string[];
}

export interface UpdateMcpConnectionRequest {
  name?: string;
  description?: string;
  server_url?: string;
  server_label?: string;
  auth_headers?: Record<string, string>;
  oauth_config?: Partial<OAuthConfig>;
  require_approval?: boolean;
  allowed_tools?: string[];
  status?: 'active' | 'inactive' | 'pending_auth';
}

export interface McpConnectionFilters {
  provider?: string;
  status?: 'active' | 'inactive' | 'error' | 'pending_auth';
  include_inactive?: boolean;
}

export interface OAuthInitiationResponse {
  authorization_url: string;
  state: string;
  connection_id: string;
}

export interface AgentMcpAccess {
  id: string | null;
  agent_id: string;
  mcp_connection_id: string;
  is_enabled: boolean;
  created_at: string | null;
}

export interface AgentMcpAccessWithConnection extends AgentMcpAccess {
  mcp_connection: {
    id: string;
    name: string;
    provider: string;
    server_label: string;
    status: string;
  };
}

export interface UpdateAgentMcpAccessRequest {
  mcp_access: Array<{
    mcp_connection_id: string;
    is_enabled: boolean;
  }>;
}

export interface McpTestResult {
  success: boolean;
  error?: string;
  tools?: Array<{
    name: string;
    description?: string;
  }>;
  tested_at: string;
}

// MCP provider presets for the frontend
export interface McpProviderPreset {
  id: string;
  name: string;
  description: string;
  logo_url?: string;
  server_url: string;
  auth_type: 'bearer' | 'api_key' | 'oauth' | 'none';
  auth_instructions?: string;
  common_tools?: string[];
}

// Form data types
export interface McpConnectionFormData {
  provider: string;
  name: string;
  description: string;
  server_url: string;
  server_label: string;
  auth_headers: Record<string, string>;
  require_approval: boolean;
  allowed_tools: string[];
}

// UI state types
export interface McpConnectionState {
  isLoading: boolean;
  isTestingConnection: boolean;
  testResult: McpTestResult | null;
  error: string | null;
}

export const MCP_PROVIDER_PRESETS: McpProviderPreset[] = [
  {
    id: 'linear',
    name: 'Linear',
    description: 'Access Linear issues, projects, and teams',
    logo_url: '/icons/linear.svg',
    server_url: 'https://mcp.linear.app/sse',
    auth_type: 'oauth',
    auth_instructions: 'Authenticate with your Linear account using OAuth',
    common_tools: ['search_issues', 'create_issue', 'update_issue', 'get_teams'],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories, issues, and pull requests',
    logo_url: '/icons/github.svg',
    server_url: 'https://mcp.github.com',
    auth_type: 'bearer',
    auth_instructions: 'Generate a personal access token from GitHub Settings > Developer settings',
    common_tools: ['search_repos', 'create_issue', 'list_prs', 'get_file_contents'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Access Notion pages, databases, and content',
    logo_url: '/icons/notion.svg',
    server_url: 'https://mcp.notion.so',
    auth_type: 'bearer',
    auth_instructions: 'Create an integration at notion.so/my-integrations and get the secret',
    common_tools: ['search_pages', 'query_database', 'create_page', 'update_page'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Access Slack messages, channels, and users',
    logo_url: '/icons/slack.svg',
    server_url: 'https://mcp.slack.com',
    auth_type: 'bearer',
    auth_instructions: 'Create a Slack app and get the bot token',
    common_tools: ['send_message', 'list_channels', 'search_messages', 'get_user_info'],
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Access Jira issues, projects, and workflows',
    logo_url: '/icons/jira.svg',
    server_url: 'https://mcp.atlassian.com',
    auth_type: 'api_key',
    auth_instructions: 'Generate an API token from Atlassian Account Settings',
    common_tools: ['search_issues', 'create_issue', 'update_issue', 'get_projects'],
  },
  {
    id: 'custom',
    name: 'Custom Server',
    description: 'Connect to a custom MCP server',
    server_url: '',
    auth_type: 'none',
    auth_instructions: 'Enter your custom server URL and authentication details',
    common_tools: [],
  },
];
