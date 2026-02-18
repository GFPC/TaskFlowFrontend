const API_BASE = "https://corsair-taskflow.site/api/v1";

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

function getTokens(): TokenData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("tf_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setTokens(data: TokenData) {
  localStorage.setItem("tf_tokens", JSON.stringify(data));
}

function clearTokens() {
  localStorage.removeItem("tf_tokens");
  localStorage.removeItem("tf_user");
}

let refreshPromise: Promise<TokenData> | null = null;

async function refreshTokens(): Promise<TokenData> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const tokens = getTokens();
    if (!tokens?.refresh_token) {
      throw new Error("No refresh token");
    }

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refresh_token }),
    });

    if (!res.ok) {
      clearTokens();
      window.location.href = "/login";
      throw new Error("Refresh failed");
    }

    const data = await res.json();
    const newTokens: TokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    };
    setTokens(newTokens);
    return newTokens;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function shouldRefresh(): boolean {
  const tokens = getTokens();
  if (!tokens?.expires_at) return false;
  const expiresAt = new Date(tokens.expires_at).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return expiresAt - now < fiveMinutes;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Proactively refresh token if about to expire
  if (shouldRefresh()) {
    try {
      await refreshTokens();
    } catch {
      // Will be caught by 401 handler below
    }
  }

  const tokens = getTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (tokens?.access_token) {
    headers["Authorization"] = `Bearer ${tokens.access_token}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If 401, try refresh once
  if (res.status === 401 && tokens?.refresh_token) {
    try {
      await refreshTokens();
      const newTokens = getTokens();
      if (newTokens?.access_token) {
        headers["Authorization"] = `Bearer ${newTokens.access_token}`;
        res = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers,
        });
      }
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired");
    }
  }

  if (!res.ok) {
    let detail = "Unknown error";
    try {
      const body = await res.json();
      detail = body.detail || body.message || JSON.stringify(body);
    } catch {
      detail = res.statusText;
    }
    throw new ApiError(res.status, detail);
  }

  // Handle empty responses (204, etc.)
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// ---- AUTH ----
export const auth = {
  register: (data: {
    first_name: string;
    last_name: string;
    username: string;
    password: string;
    email?: string;
    tg_username?: string;
  }) => request<{
    user_id: number;
    tg_code: string;
    requires_verification: boolean;
    message: string;
  }>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { username: string; password: string }) =>
    request<{
      requires_verification: boolean;
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_at?: string;
      user?: User;
      user_id?: number;
      tg_code?: string;
    }>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  verifyTelegram: (data: { user_id: number; code: string }) =>
    request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_at: string;
      user: User;
    }>("/auth/verify-telegram", { method: "POST", body: JSON.stringify(data) }),

  refresh: (refresh_token: string) =>
    request<{
      access_token: string;
      refresh_token: string;
      expires_at: string;
      user: User;
    }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }),

  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  logoutAll: () =>
    request<{ message: string }>("/auth/logout-all", { method: "POST" }),

  recoveryInitiate: (username: string) =>
    request<{
      success: boolean;
      message: string;
      user_id?: number;
      recovery_code?: string;
      expires_at?: string;
    }>("/auth/recovery/initiate", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),

  recoveryReset: (data: { recovery_code: string; new_password: string }) =>
    request<{ success: boolean; message: string }>("/auth/recovery/reset", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ---- USERS ----
export const users = {
  me: () => request<User>("/users/me"),

  updateMe: (data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    tg_username: string;
  }>) => request<User>("/users/me", { method: "PUT", body: JSON.stringify(data) }),

  changePassword: (data: {
    current_password: string;
    new_password: string;
  }) =>
    request<{ message: string }>("/users/me/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTheme: (data: {
    mode?: string;
    primary_color?: string;
    language?: string;
  }) => request("/users/me/theme", { method: "PUT", body: JSON.stringify(data) }),

  updateNotifications: (data: Record<string, boolean>) =>
    request("/users/me/notifications", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  sessions: () => request<Session[]>("/users/me/sessions"),

  deleteSession: (sessionId: number) =>
    request<{ message: string }>(`/users/me/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  getByUsername: (username: string) =>
    request<PublicUser>(`/users/by-username/${username}`),
};

// ---- TEAMS ----
export const teams = {
  list: () => request<Team[]>("/teams"),

  get: (slug: string) => request<TeamDetail>(`/teams/${slug}`),

  create: (data: { name: string; description?: string }) =>
    request<Team>("/teams", { method: "POST", body: JSON.stringify(data) }),

  update: (slug: string, data: Partial<{ name: string; description: string; avatar: string }>) =>
    request<Team>(`/teams/${slug}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (slug: string) =>
    request<{ message: string }>(`/teams/${slug}`, { method: "DELETE" }),

  members: (slug: string, include_inactive?: boolean) =>
    request<TeamMember[]>(`/teams/${slug}/members${include_inactive ? "?include_inactive=true" : ""}`),

  addMember: (slug: string, data: { username: string; role: string }) =>
    request<TeamMember>(`/teams/${slug}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMember: (slug: string, username: string, role: string) =>
    request<TeamMember>(`/teams/${slug}/members/${username}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  removeMember: (slug: string, username: string) =>
    request<{ message: string }>(`/teams/${slug}/members/${username}`, {
      method: "DELETE",
    }),

  transferOwnership: (slug: string, new_owner_username: string) =>
    request<{ message: string }>(`/teams/${slug}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ new_owner_username }),
    }),

  getInviteCode: (slug: string, refresh?: boolean) =>
    request<{ invite_code: string; expires_at: string }>(
      `/teams/${slug}/invite-code${refresh ? "?refresh=true" : ""}`
    ),

  joinByCode: (invite_code: string) =>
    request<{ message: string; team: Team; member: TeamMember }>(
      "/teams/join-by-code",
      { method: "POST", body: JSON.stringify({ invite_code }) }
    ),

  createInvitation: (
    slug: string,
    data: { username?: string; email?: string; role: string; message?: string }
  ) =>
    request<TeamInvitation>(`/teams/${slug}/invitations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  myInvitations: () => request<TeamInvitation[]>("/teams/invitations"),

  teamInvitations: (slug: string, status?: string) =>
    request<TeamInvitation[]>(
      `/teams/${slug}/invitations${status ? `?status=${status}` : ""}`
    ),

  acceptInvitation: (id: number) =>
    request<{ message: string }>(`/teams/invitations/${id}/accept`, {
      method: "POST",
    }),

  declineInvitation: (id: number) =>
    request<{ message: string }>(`/teams/invitations/${id}/decline`, {
      method: "POST",
    }),

  cancelInvitation: (id: number) =>
    request<{ message: string }>(`/teams/invitations/${id}`, {
      method: "DELETE",
    }),

  stats: (slug: string) => request<TeamStats>(`/teams/${slug}/stats`),

  search: (query?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    const qs = params.toString();
    return request<Team[]>(`/teams/search${qs ? `?${qs}` : ""}`);
  },
};

// ---- PROJECTS ----
export const projects = {
  list: (include_archived?: boolean) =>
    request<Project[]>(`/projects${include_archived ? "?include_archived=true" : ""}`),

  byTeam: (teamSlug: string, include_archived?: boolean) =>
    request<Project[]>(
      `/projects/team/${teamSlug}${include_archived ? "?include_archived=true" : ""}`
    ),

  get: (slug: string) => request<ProjectDetail>(`/projects/${slug}`),

  create: (data: {
    name: string;
    description?: string;
    team_slug: string;
    initial_graph_data?: string;
  }) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }),

  update: (slug: string, data: Partial<{ name: string; description: string; settings: Record<string, unknown> }>) =>
    request<Project>(`/projects/${slug}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  updateSettings: (slug: string, settings: Record<string, unknown>) =>
    request<Project>(`/projects/${slug}/settings`, {
      method: "PUT",
      body: JSON.stringify({ settings }),
    }),

  delete: (slug: string) =>
    request<{ message: string }>(`/projects/${slug}`, { method: "DELETE" }),

  archive: (slug: string) =>
    request<Project>(`/projects/${slug}/archive`, { method: "POST" }),

  restore: (slug: string) =>
    request<Project>(`/projects/${slug}/restore`, { method: "POST" }),

  members: (slug: string, include_inactive?: boolean) =>
    request<ProjectMember[]>(
      `/projects/${slug}/members${include_inactive ? "?include_inactive=true" : ""}`
    ),

  addMember: (slug: string, data: { username: string; role: string }) =>
    request<ProjectMember>(`/projects/${slug}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMember: (slug: string, username: string, role: string) =>
    request<ProjectMember>(`/projects/${slug}/members/${username}`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  removeMember: (slug: string, username: string) =>
    request<{ message: string }>(`/projects/${slug}/members/${username}`, {
      method: "DELETE",
    }),

  transferOwnership: (slug: string, new_owner_username: string) =>
    request<{ message: string }>(`/projects/${slug}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ new_owner_username }),
    }),

  createInvitation: (slug: string, data: { username: string; role: string }) =>
    request(`/projects/${slug}/invitations`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  myInvitations: () => request<ProjectInvitation[]>("/projects/invitations"),

  acceptInvitation: (id: number) =>
    request(`/projects/invitations/${id}/accept`, { method: "POST" }),

  declineInvitation: (id: number) =>
    request(`/projects/invitations/${id}/decline`, { method: "POST" }),

  stats: (slug: string) => request<ProjectStats>(`/projects/${slug}/stats`),
};

// ---- TASKS ----
export const tasks = {
  list: (
    projectSlug: string,
    params?: {
      status_name?: string;
      assignee_username?: string;
      creator_username?: string;
      limit?: number;
      offset?: number;
    }
  ) => {
    const sp = new URLSearchParams();
    if (params?.status_name) sp.set("status_name", params.status_name);
    if (params?.assignee_username) sp.set("assignee_username", params.assignee_username);
    if (params?.creator_username) sp.set("creator_username", params.creator_username);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.offset) sp.set("offset", String(params.offset));
    const qs = sp.toString();
    return request<Task[]>(`/projects/${projectSlug}/tasks${qs ? `?${qs}` : ""}`);
  },

  get: (projectSlug: string, taskId: number) =>
    request<TaskDetail>(`/projects/${projectSlug}/tasks/${taskId}`),

  create: (
    projectSlug: string,
    data: {
      name: string;
      description?: string;
      assignee_username?: string;
      deadline?: string;
      priority?: number;
      position_x?: number;
      position_y?: number;
      metadata?: Record<string, unknown>;
      project_slug: string;
    }
  ) =>
    request<Task>(`/projects/${projectSlug}/tasks`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    projectSlug: string,
    taskId: number,
    data: Partial<{
      name: string;
      description: string;
      assignee_username: string;
      deadline: string;
      priority: number;
      position_x: number;
      position_y: number;
      metadata: Record<string, unknown>;
    }>
  ) =>
    request<Task>(`/projects/${projectSlug}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  changeStatus: (
    projectSlug: string,
    taskId: number,
    status: string
  ) =>
    request<{
      task: Task;
      status_changed: boolean;
      old_status: string;
      new_status: string;
      actions_executed: unknown[];
    }>(`/projects/${projectSlug}/tasks/${taskId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  delete: (projectSlug: string, taskId: number) =>
    request<{ message: string }>(`/projects/${projectSlug}/tasks/${taskId}`, {
      method: "DELETE",
    }),

  events: (projectSlug: string, taskId: number, limit?: number) =>
    request<TaskEvent[]>(
      `/projects/${projectSlug}/tasks/${taskId}/events${limit ? `?limit=${limit}` : ""}`
    ),

  graph: (projectSlug: string) =>
    request<GraphData>(`/projects/${projectSlug}/tasks/graph`),

  saveGraph: (projectSlug: string, data: GraphData) =>
    request<{ message: string }>(`/projects/${projectSlug}/tasks/graph`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  createDependency: (
    projectSlug: string,
    taskId: number,
    data: {
      target_task_id: number;
      dependency_type?: string;
      description?: string;
    }
  ) =>
    request<Dependency>(
      `/projects/${projectSlug}/tasks/${taskId}/dependencies`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  getDependencies: (projectSlug: string, taskId: number) =>
    request<{ incoming: Dependency[]; outgoing: Dependency[] }>(
      `/projects/${projectSlug}/tasks/${taskId}/dependencies`
    ),

  deleteDependency: (projectSlug: string, dependencyId: number) =>
    request<{ message: string }>(
      `/projects/${projectSlug}/tasks/dependencies/${dependencyId}`,
      { method: "DELETE" }
    ),

  addAction: (
    projectSlug: string,
    dependencyId: number,
    data: {
      action_type_code: string;
      target_user_username?: string;
      target_status?: string;
      message_template?: string;
      delay_minutes?: number;
      execute_order?: number;
    }
  ) =>
    request(
      `/projects/${projectSlug}/tasks/dependencies/${dependencyId}/actions`,
      { method: "POST", body: JSON.stringify(data) }
    ),

  deleteAction: (projectSlug: string, actionId: number) =>
    request<{ message: string }>(
      `/projects/${projectSlug}/tasks/dependencies/actions/${actionId}`,
      { method: "DELETE" }
    ),

  stats: (projectSlug: string) =>
    request<TaskStats>(`/projects/${projectSlug}/tasks/stats`),

  userStats: (projectSlug: string, username: string) =>
    request(`/projects/${projectSlug}/tasks/stats/user/${username}`),
};

// ---- HELPER ----
export { getTokens, setTokens, clearTokens };

// ---- TYPES ----
export interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email?: string;
  tg_username?: string;
  tg_verified?: boolean;
  role?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  created_at?: string;
  last_login?: string;
  last_activity?: string;
  theme_preferences?: {
    mode?: string;
    primary_color?: string;
    language?: string;
  };
  notification_settings?: {
    telegram?: boolean;
    email?: boolean;
    task_assigned?: boolean;
    task_completed?: boolean;
    dependency_ready?: boolean;
  };
}

export interface PublicUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  tg_username?: string;
  role?: string;
  created_at?: string;
}

export interface Session {
  id: number;
  token?: string;
  type?: string;
  created_at: string;
  expires_at: string;
  last_used_at?: string;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
  is_current?: boolean;
}

export interface Team {
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  owner_id: number;
  members_count: number;
  projects_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  role_priority: number;
  is_active: boolean;
  joined_at: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
  user_role: string;
  can_manage: boolean;
  can_manage_projects: boolean;
  can_invite_members: boolean;
  can_remove_members: boolean;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  team_name: string;
  invited_by_username: string;
  invited_user_id?: number;
  invited_user_username?: string;
  proposed_role: string;
  status: string;
  created_at: string;
  expires_at: string;
  message?: string;
}

export interface TeamStats {
  team_id: number;
  team_name: string;
  total_members: number;
  by_role: Record<string, number>;
  projects_count: number;
  pending_invitations: number;
  created_at: string;
  owner: string;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  team_id: number;
  team_name: string;
  team_slug: string;
  created_by_id: number;
  created_by_username: string;
  tasks_count: number;
  members_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  role_priority: number;
  is_active: boolean;
  joined_at: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  user_role: string;
  can_manage_members: boolean;
  can_edit_project: boolean;
  can_delete_project: boolean;
  can_create_tasks: boolean;
  settings?: {
    default_task_status?: string;
    notifications_enabled?: boolean;
    allow_guest_comments?: boolean;
  };
}

export interface ProjectInvitation {
  id: number;
  project_id: number;
  project_name: string;
  invited_by_username: string;
  invited_user_username: string;
  proposed_role: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface ProjectStats {
  project_id: number;
  project_name: string;
  total_members: number;
  by_role: Record<string, number>;
  tasks: {
    total: number;
    by_status: Record<string, number>;
    overdue: number;
  };
  created_at: string;
  created_by: string;
  team: string;
}

export interface Task {
  id: number;
  project_id: number;
  project_slug: string;
  name: string;
  description?: string;
  status: string;
  status_color: string;
  assignee_id?: number;
  assignee_username?: string;
  creator_id: number;
  creator_username: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  deadline?: string;
  priority: number;
  position_x: number;
  position_y: number;
  is_ready: boolean;
  metadata?: Record<string, unknown>;
}

export interface TaskDetail extends Task {
  incoming_dependencies: Dependency[];
  outgoing_dependencies: Dependency[];
  events: TaskEvent[];
}

export interface Dependency {
  id: number;
  project_id?: number;
  source_task_id: number;
  source_task_name: string;
  target_task_id: number;
  target_task_name: string;
  dependency_type: string;
  description?: string;
  created_at: string;
  created_by_username?: string;
  actions: DependencyAction[];
}

export interface DependencyAction {
  id: number;
  action_type_code: string;
  target_user_username?: string;
  target_status?: string;
  message_template?: string;
  delay_minutes?: number;
  execute_order?: number;
}

export interface TaskEvent {
  id: number;
  user_username: string;
  event_type: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface GraphNode {
  id: string;
  type: string;
  data: {
    id: number;
    name: string;
    status: string;
    status_color: string;
    assignee?: string;
    creator?: string;
    priority: number;
    deadline?: string;
    is_ready: boolean;
  };
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    actions: { type: string; delay: number }[];
  };
  animated?: boolean;
  label?: string;
}

export interface TaskStats {
  total: number;
  by_status: Record<
    string,
    { count: number; display_name: string; color: string }
  >;
  by_assignee: Record<string, number>;
  overdue: number;
}
