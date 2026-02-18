module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[project]/components/ui/sonner.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-themes/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-ssr] (ecmascript)");
'use client';
;
;
;
const Toaster = ({ ...props })=>{
    const { theme = 'system' } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$themes$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Toaster"], {
        theme: theme,
        className: "toaster group",
        style: {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)'
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/components/ui/sonner.tsx",
        lineNumber: 10,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
;
}),
"[project]/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "auth",
    ()=>auth,
    "clearTokens",
    ()=>clearTokens,
    "getTokens",
    ()=>getTokens,
    "projects",
    ()=>projects,
    "setTokens",
    ()=>setTokens,
    "tasks",
    ()=>tasks,
    "teams",
    ()=>teams,
    "users",
    ()=>users
]);
const API_BASE = "https://corsair-taskflow.site/api/v1";
function getTokens() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
    const raw = undefined;
}
function setTokens(data) {
    localStorage.setItem("tf_tokens", JSON.stringify(data));
}
function clearTokens() {
    localStorage.removeItem("tf_tokens");
    localStorage.removeItem("tf_user");
}
let refreshPromise = null;
async function refreshTokens() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async ()=>{
        const tokens = getTokens();
        if (!tokens?.refresh_token) {
            throw new Error("No refresh token");
        }
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                refresh_token: tokens.refresh_token
            })
        });
        if (!res.ok) {
            clearTokens();
            window.location.href = "/login";
            throw new Error("Refresh failed");
        }
        const data = await res.json();
        const newTokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at
        };
        setTokens(newTokens);
        return newTokens;
    })();
    try {
        return await refreshPromise;
    } finally{
        refreshPromise = null;
    }
}
function shouldRefresh() {
    const tokens = getTokens();
    if (!tokens?.expires_at) return false;
    const expiresAt = new Date(tokens.expires_at).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    return expiresAt - now < fiveMinutes;
}
class ApiError extends Error {
    status;
    detail;
    constructor(status, detail){
        super(detail);
        this.status = status;
        this.detail = detail;
    }
}
async function request(path, options = {}) {
    // Proactively refresh token if about to expire
    if (shouldRefresh()) {
        try {
            await refreshTokens();
        } catch  {
        // Will be caught by 401 handler below
        }
    }
    const tokens = getTokens();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };
    if (tokens?.access_token) {
        headers["Authorization"] = `Bearer ${tokens.access_token}`;
    }
    let res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
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
                    headers
                });
            }
        } catch  {
            clearTokens();
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            throw new ApiError(401, "Session expired");
        }
    }
    if (!res.ok) {
        let detail = "Unknown error";
        try {
            const body = await res.json();
            detail = body.detail || body.message || JSON.stringify(body);
        } catch  {
            detail = res.statusText;
        }
        throw new ApiError(res.status, detail);
    }
    // Handle empty responses (204, etc.)
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
}
const auth = {
    register: (data)=>request("/auth/register", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    login: (data)=>request("/auth/login", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    verifyTelegram: (data)=>request("/auth/verify-telegram", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    refresh: (refresh_token)=>request("/auth/refresh", {
            method: "POST",
            body: JSON.stringify({
                refresh_token
            })
        }),
    logout: ()=>request("/auth/logout", {
            method: "POST"
        }),
    logoutAll: ()=>request("/auth/logout-all", {
            method: "POST"
        }),
    recoveryInitiate: (username)=>request("/auth/recovery/initiate", {
            method: "POST",
            body: JSON.stringify({
                username
            })
        }),
    recoveryReset: (data)=>request("/auth/recovery/reset", {
            method: "POST",
            body: JSON.stringify(data)
        })
};
const users = {
    me: ()=>request("/users/me"),
    updateMe: (data)=>request("/users/me", {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    changePassword: (data)=>request("/users/me/change-password", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    updateTheme: (data)=>request("/users/me/theme", {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    updateNotifications: (data)=>request("/users/me/notifications", {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    sessions: ()=>request("/users/me/sessions"),
    deleteSession: (sessionId)=>request(`/users/me/sessions/${sessionId}`, {
            method: "DELETE"
        }),
    getByUsername: (username)=>request(`/users/by-username/${username}`)
};
const teams = {
    list: ()=>request("/teams"),
    get: (slug)=>request(`/teams/${slug}`),
    create: (data)=>request("/teams", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (slug, data)=>request(`/teams/${slug}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    delete: (slug)=>request(`/teams/${slug}`, {
            method: "DELETE"
        }),
    members: (slug, include_inactive)=>request(`/teams/${slug}/members${include_inactive ? "?include_inactive=true" : ""}`),
    addMember: (slug, data)=>request(`/teams/${slug}/members`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    updateMember: (slug, username, role)=>request(`/teams/${slug}/members/${username}`, {
            method: "PUT",
            body: JSON.stringify({
                role
            })
        }),
    removeMember: (slug, username)=>request(`/teams/${slug}/members/${username}`, {
            method: "DELETE"
        }),
    transferOwnership: (slug, new_owner_username)=>request(`/teams/${slug}/transfer-ownership`, {
            method: "POST",
            body: JSON.stringify({
                new_owner_username
            })
        }),
    getInviteCode: (slug, refresh)=>request(`/teams/${slug}/invite-code${refresh ? "?refresh=true" : ""}`),
    joinByCode: (invite_code)=>request("/teams/join-by-code", {
            method: "POST",
            body: JSON.stringify({
                invite_code
            })
        }),
    createInvitation: (slug, data)=>request(`/teams/${slug}/invitations`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    myInvitations: ()=>request("/teams/invitations"),
    teamInvitations: (slug, status)=>request(`/teams/${slug}/invitations${status ? `?status=${status}` : ""}`),
    acceptInvitation: (id)=>request(`/teams/invitations/${id}/accept`, {
            method: "POST"
        }),
    declineInvitation: (id)=>request(`/teams/invitations/${id}/decline`, {
            method: "POST"
        }),
    cancelInvitation: (id)=>request(`/teams/invitations/${id}`, {
            method: "DELETE"
        }),
    stats: (slug)=>request(`/teams/${slug}/stats`),
    search: (query, limit, offset)=>{
        const params = new URLSearchParams();
        if (query) params.set("query", query);
        if (limit) params.set("limit", String(limit));
        if (offset) params.set("offset", String(offset));
        const qs = params.toString();
        return request(`/teams/search${qs ? `?${qs}` : ""}`);
    }
};
const projects = {
    list: (include_archived)=>request(`/projects${include_archived ? "?include_archived=true" : ""}`),
    byTeam: (teamSlug, include_archived)=>request(`/projects/team/${teamSlug}${include_archived ? "?include_archived=true" : ""}`),
    get: (slug)=>request(`/projects/${slug}`),
    create: (data)=>request("/projects", {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (slug, data)=>request(`/projects/${slug}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    updateSettings: (slug, settings)=>request(`/projects/${slug}/settings`, {
            method: "PUT",
            body: JSON.stringify({
                settings
            })
        }),
    delete: (slug)=>request(`/projects/${slug}`, {
            method: "DELETE"
        }),
    archive: (slug)=>request(`/projects/${slug}/archive`, {
            method: "POST"
        }),
    restore: (slug)=>request(`/projects/${slug}/restore`, {
            method: "POST"
        }),
    members: (slug, include_inactive)=>request(`/projects/${slug}/members${include_inactive ? "?include_inactive=true" : ""}`),
    addMember: (slug, data)=>request(`/projects/${slug}/members`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    updateMember: (slug, username, role)=>request(`/projects/${slug}/members/${username}`, {
            method: "PUT",
            body: JSON.stringify({
                role
            })
        }),
    removeMember: (slug, username)=>request(`/projects/${slug}/members/${username}`, {
            method: "DELETE"
        }),
    transferOwnership: (slug, new_owner_username)=>request(`/projects/${slug}/transfer-ownership`, {
            method: "POST",
            body: JSON.stringify({
                new_owner_username
            })
        }),
    createInvitation: (slug, data)=>request(`/projects/${slug}/invitations`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    myInvitations: ()=>request("/projects/invitations"),
    acceptInvitation: (id)=>request(`/projects/invitations/${id}/accept`, {
            method: "POST"
        }),
    declineInvitation: (id)=>request(`/projects/invitations/${id}/decline`, {
            method: "POST"
        }),
    stats: (slug)=>request(`/projects/${slug}/stats`)
};
const tasks = {
    list: (projectSlug, params)=>{
        const sp = new URLSearchParams();
        if (params?.status_name) sp.set("status_name", params.status_name);
        if (params?.assignee_username) sp.set("assignee_username", params.assignee_username);
        if (params?.creator_username) sp.set("creator_username", params.creator_username);
        if (params?.limit) sp.set("limit", String(params.limit));
        if (params?.offset) sp.set("offset", String(params.offset));
        const qs = sp.toString();
        return request(`/projects/${projectSlug}/tasks${qs ? `?${qs}` : ""}`);
    },
    get: (projectSlug, taskId)=>request(`/projects/${projectSlug}/tasks/${taskId}`),
    create: (projectSlug, data)=>request(`/projects/${projectSlug}/tasks`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    update: (projectSlug, taskId, data)=>request(`/projects/${projectSlug}/tasks/${taskId}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    changeStatus: (projectSlug, taskId, status)=>request(`/projects/${projectSlug}/tasks/${taskId}/status`, {
            method: "POST",
            body: JSON.stringify({
                status
            })
        }),
    delete: (projectSlug, taskId)=>request(`/projects/${projectSlug}/tasks/${taskId}`, {
            method: "DELETE"
        }),
    events: (projectSlug, taskId, limit)=>request(`/projects/${projectSlug}/tasks/${taskId}/events${limit ? `?limit=${limit}` : ""}`),
    graph: (projectSlug)=>request(`/projects/${projectSlug}/tasks/graph`),
    saveGraph: (projectSlug, data)=>request(`/projects/${projectSlug}/tasks/graph`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),
    createDependency: (projectSlug, taskId, data)=>request(`/projects/${projectSlug}/tasks/${taskId}/dependencies`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    getDependencies: (projectSlug, taskId)=>request(`/projects/${projectSlug}/tasks/${taskId}/dependencies`),
    deleteDependency: (projectSlug, dependencyId)=>request(`/projects/${projectSlug}/tasks/dependencies/${dependencyId}`, {
            method: "DELETE"
        }),
    addAction: (projectSlug, dependencyId, data)=>request(`/projects/${projectSlug}/tasks/dependencies/${dependencyId}/actions`, {
            method: "POST",
            body: JSON.stringify(data)
        }),
    deleteAction: (projectSlug, actionId)=>request(`/projects/${projectSlug}/tasks/dependencies/actions/${actionId}`, {
            method: "DELETE"
        }),
    stats: (projectSlug)=>request(`/projects/${projectSlug}/tasks/stats`),
    userStats: (projectSlug, username)=>request(`/projects/${projectSlug}/tasks/stats/user/${username}`)
};
;
}),
"[project]/lib/auth-context.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(null);
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const refreshUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            const tokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getTokens"])();
            if (!tokens?.access_token) {
                setUser(null);
                setIsLoading(false);
                return;
            }
            const me = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["users"].me();
            setUser(me);
        } catch  {
            setUser(null);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearTokens"])();
        } finally{
            setIsLoading(false);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        refreshUser();
    }, [
        refreshUser
    ]);
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (username, password)=>{
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"].login({
            username,
            password
        });
        if (res.requires_verification) {
            return {
                type: "verification_required",
                user_id: res.user_id,
                tg_code: res.tg_code
            };
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setTokens"])({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            expires_at: res.expires_at
        });
        const me = res.user || await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["users"].me();
        setUser(me);
        return {
            type: "success",
            user: me
        };
    }, []);
    const register = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (data)=>{
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"].register(data);
        return {
            user_id: res.user_id,
            tg_code: res.tg_code
        };
    }, []);
    const verifyTelegram = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (userId, code)=>{
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"].verifyTelegram({
            user_id: userId,
            code
        });
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setTokens"])({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            expires_at: res.expires_at
        });
        setUser(res.user);
    }, []);
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"].logout();
        } catch  {
        // ignore
        } finally{
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["clearTokens"])();
            setUser(null);
        }
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            verifyTelegram,
            logout,
            refreshUser
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/lib/auth-context.tsx",
        lineNumber: 128,
        columnNumber: 5
    }, this);
}
function useAuth() {
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
}),
"[project]/lib/swr-provider.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SWRProvider",
    ()=>SWRProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/swr/dist/index/index.mjs [app-ssr] (ecmascript) <locals>");
"use client";
;
;
function SWRProvider({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["SWRConfig"], {
        value: {
            revalidateOnFocus: false,
            shouldRetryOnError: true,
            errorRetryCount: 3,
            dedupingInterval: 5000
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/lib/swr-provider.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__691fec2f._.js.map