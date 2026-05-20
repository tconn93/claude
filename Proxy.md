# Standalone Anthropic-to-OpenAI Proxy Documentation

This standalone proxy allows you to use agents and tools built for the **Anthropic Messages API** with **OpenAI** models. It acts as a translation layer, converting Claude-formatted requests into OpenAI-formatted requests on the fly.

## 🚀 Getting Started

### 1. Environment Configuration
The proxy requires an API key and optional configuration for the target URL and model.

```bash
# Required: Your API Key (OpenAI or Grok/xAI)
export OPENAI_API_KEY="sk-..." 
# OR
export XAI_API_KEY="xai-..."

# Optional: Target API URL (Defaults to OpenAI)
# For Grok (xAI):
export TARGET_API_URL="https://api.x.ai/v1/chat/completions"

# Optional: Target Model (Defaults to gpt-4o)
# For Grok:
export TARGET_MODEL="grok-4.3"

# Optional: Port to listen on (default is 8081)
export PROXY_PORT=8081
```

### 2. Launching the Proxy
```bash
go run proxy/cmd/proxy/main.go
```

You should see: 
`Standalone Anthropic-to-OpenAI Proxy starting on :8081`
`Target API URL: https://api.x.ai/v1/chat/completions`

---

## 🛠 Usage & Integration

To use the proxy with any agent (like Claude Code, Aider, or custom SDK scripts), change the **Base URL** from `https://api.anthropic.com` to your local proxy address.

### Example: Grok (xAI) Integration
1. Set your `XAI_API_KEY`.
2. Set `TARGET_API_URL="https://api.x.ai/v1/chat/completions"`.
3. Set `TARGET_MODEL="grok-beta"`.
4. Run the proxy and point your tool to `http://localhost:8081/v1`.

### Example: Using with cURL
```bash
curl http://localhost:8081/v1/messages \
     -H "Content-Type: application/json" \
     -d '{
       "model": "claude-3-5-sonnet-20241022",
       "max_tokens": 1024,
       "messages": [{"role": "user", "content": "Hello, OpenAI via Claude API!"}]
     }'
```

### Example: Using with Anthropic SDK (Python)
```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:8081/v1",
    api_key="not-needed-here" # The proxy uses the env var
)

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1000,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

## 🔍 Features & Translation Logic

| Feature | Translation Detail |
| :--- | :--- |
| **Endpoint** | Maps `POST /v1/messages` to OpenAI's `/v1/chat/completions` |
| **Roles** | Maps `user` and `assistant` roles directly. |
| **System Prompt** | Converts Anthropic's top-level `system` field into an OpenAI `system` role message. |
| **Tools/Functions** | Translates Anthropic `tools` JSON schema into OpenAI `functions` format. |
| **Content Blocks** | Merges multiple Anthropic content blocks into a single OpenAI string. |

## 🚧 Current Limitations
- **Streaming:** The standalone proxy currently supports standard (non-streaming) responses. SSE streaming translation is planned for a future update.
- **Model Mapping:** By default, it routes requests to `gpt-4o`. You can modify `proxy/cmd/proxy/main.go` to change the default mapping.
