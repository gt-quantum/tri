# TRI Real Estate Platform — MCP Server

MCP (Model Context Protocol) server that connects AI clients to the TRI Real Estate Platform API. Runs locally as a stdio process — no hosting required.

## Prerequisites

- Node.js 18+
- A TRI Platform API key (role: `manager` recommended, `admin` for full access)
- The TRI API running (locally via `npm run dev` or deployed on Vercel)

## Install & Build

```bash
cd mcp
npm install
npm run build
```

## Create an API Key

You need an API key with `manager` role (or `admin` for user/invitation/api-key management).

**Option A: Admin UI**
1. Log in to the TRI platform as an admin
2. Go to Settings > API Keys (`/settings/api-keys`)
3. Click "Create API Key", set name and role
4. Copy the `sk_live_...` key (shown once)

**Option B: API**
```bash
curl -X POST https://your-app.vercel.app/api/v1/api-keys \
  -H "Authorization: Bearer <admin-jwt-or-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "MCP Server", "role": "manager"}'
```

## Available Tools (47)

| Category | Tools | Min Role |
|----------|-------|----------|
| System | `health_check`, `get_schema` | viewer / manager |
| Portfolios | `list_portfolios`, `get_portfolio`, `create_portfolio`, `update_portfolio`, `delete_portfolio` | viewer / manager / admin |
| Properties | `list_properties`, `get_property`, `create_property`, `update_property`, `delete_property` | viewer / manager / admin |
| Spaces | `list_spaces`, `get_space`, `create_space`, `update_space`, `delete_space` | viewer / manager / admin |
| Tenants | `list_tenants`, `get_tenant`, `create_tenant`, `update_tenant`, `delete_tenant` | viewer / manager / admin |
| Leases | `list_leases`, `get_lease`, `create_lease`, `update_lease`, `delete_lease` | viewer / manager / admin |
| Users | `list_users`, `get_user`, `change_user_role`, `deactivate_user`, `reactivate_user` | manager / admin |
| Invitations | `list_invitations`, `create_invitation`, `resend_invitation`, `revoke_invitation` | manager / admin |
| Picklists | `list_picklists`, `get_picklist`, `create_picklist`, `update_picklist` | viewer / manager |
| Custom Fields | `list_custom_fields`, `get_custom_field`, `create_custom_field`, `update_custom_field` | viewer / manager |
| Audit Log | `query_audit_log` | viewer |
| API Keys | `list_api_keys`, `get_api_key`, `create_api_key`, `update_api_key`, `revoke_api_key`, `rotate_api_key` | admin |

## Resources

The server also exposes MCP resources for context injection:

- `tri://properties` — All properties
- `tri://tenants` — All tenants
- `tri://leases` — All leases
- `tri://schema` — Full data model

## Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "tri-real-estate": {
      "command": "node",
      "args": ["/absolute/path/to/tri/mcp/dist/index.js"],
      "env": {
        "TRI_API_KEY": "sk_live_your_key_here",
        "TRI_API_URL": "https://your-app.vercel.app"
      }
    }
  }
}
```

### Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "tri-real-estate": {
      "command": "node",
      "args": ["/absolute/path/to/tri/mcp/dist/index.js"],
      "env": {
        "TRI_API_KEY": "sk_live_your_key_here",
        "TRI_API_URL": "https://your-app.vercel.app"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "tri-real-estate": {
      "command": "node",
      "args": ["/absolute/path/to/tri/mcp/dist/index.js"],
      "env": {
        "TRI_API_KEY": "sk_live_your_key_here",
        "TRI_API_URL": "https://your-app.vercel.app"
      }
    }
  }
}
```

### Cline (VS Code)

Add to VS Code settings (`.vscode/settings.json` or global settings):

```json
{
  "cline.mcpServers": {
    "tri-real-estate": {
      "command": "node",
      "args": ["/absolute/path/to/tri/mcp/dist/index.js"],
      "env": {
        "TRI_API_KEY": "sk_live_your_key_here",
        "TRI_API_URL": "https://your-app.vercel.app"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRI_API_KEY` | Yes | API key (`sk_live_...`) — create via admin UI or API |
| `TRI_API_URL` | No | API base URL (default: `http://localhost:3000`) |

## Testing

1. Build the server:
   ```bash
   cd mcp && npm run build
   ```

2. Test connectivity (requires `TRI_API_KEY` and the API running):
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | TRI_API_KEY=sk_live_your_key TRI_API_URL=http://localhost:3000 node dist/index.js
   ```

3. You should see a JSON response with the server's capabilities and tool list.

## How It Works

1. The AI client (Claude Desktop, Claude Code, etc.) spawns this server as a local child process
2. Communication happens over stdin/stdout (stdio transport)
3. Every API request includes `Authorization: Bearer sk_live_...` and `X-Change-Source: mcp`
4. All mutations are fully audited with `change_source: mcp` in the audit log
5. The server respects the API key's role — a `manager` key can read and write but cannot delete or manage users
