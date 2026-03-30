# Issues related to storing conversations & messages in Agents API

## 1. `saveMessage` issue

### Root Cause

In `responses.js`, DB save function is called like:

```js
await db.saveMessage(
  req,
  messageData,
  { context: '...' },
);
```
However, `saveMessage` in `packages/data-schemas` destructure their first argument against a strict typed context interface:

```ts
async function saveMessage(
  {
    userId,
    isTemporary,
    interfaceConfig,
  }: {
    userId: string;
    isTemporary?: boolean;
    interfaceConfig?: AppConfig['interfaceConfig'];
  },
  params: Partial<IMessage> & { newMessageId?: string },
  metadata?: { context?: string },
)
```

When `req` is passed, destructuring pulls these three keys directly off the object:

| Key expected | Actual location on `req` | Value when passing `req` |
|---|---|---|
| `userId` | `req.user.id` (nested, different key name) | `undefined` |
| `isTemporary` | `req.body.isTemporary` (nested) | `undefined` |
| `interfaceConfig` | `req.config.interfaceConfig` (nested) | `undefined` |

None of these keys exist at the top level of the Express `req` object. As a result:

1. `userId` is `undefined`
2. The function immediately throws: `Error: User not authenticated`

---

### The Fix: Pass the destructured object

The destructured object maps `req`'s nested structure to the flat shape the function requires:

```js
// ✅ Correct — extracts values into the expected shape
{
  userId: req?.user?.id,
  isTemporary: req?.body?.isTemporary,
  interfaceConfig: req?.config?.interfaceConfig,
}
```

Therefore, the `saveMessage` in `responses.js` is changed to:

```js
await db.saveMessage(
  {
    userId: req?.user?.id,
    isTemporary: req?.body?.isTemporary,
    interfaceConfig: req?.config?.interfaceConfig,
  },
  messageData,
  { context: '...' },
);
```

This is the established pattern across the entire codebase:
- `api/app/clients/BaseClient.js` — `saveMessageToDatabase`
- `api/server/middleware/error.js` — `sendError`
- `api/server/routes/messages.js` — all message routes
- `api/server/routes/convos.js` — conversation update route
- `api/server/services/Threads/manage.js` — `saveUserMessage` / `saveAssistantMessage`

---

### Summary

`saveMessage` / `saveConvo` expect a plain context object `{ userId, isTemporary, interfaceConfig }`, not an Express request. The Express `req` object stores these values at different paths and under different key names, so it can never satisfy the destructuring contract. Always construct the context object explicitly before calling these functions.

---

## 2. Inconsistent `messageId` format

### Root Cause

The Frontend generates UUID v4s client-side for every message. The Agents API uses two
non-UUID formats:

| Source | User message | Assistant message |
|---|---|---|
| Frontend | UUID v4 (`7b15b159-f97e-...`) | UUID v4 (`a5ce9ef7-6cb5-...`) |
| Agents API | `nanoid()` short string (`k_77mUFXUey1yEgBIp09E`) | `resp_`-prefixed (`resp_mnd5cz1uvn2nrv`) |

In `saveInputMessages` (line 161):

```js
messageId: msg.messageId || nanoid(),
```

`nanoid()` produces short alphanumeric strings, not UUIDs. In `saveResponseOutput` (line 204):

```js
messageId: responseId,
```

`responseId` is the OpenAI Responses API ID (`resp_...`), also not a UUID. The rest of the
system — thread building, UI lookups, MeiliSearch indexing — expects UUID-format message IDs.

---

### The Fix: Generate UUID v4 for all message IDs

```js
// saveInputMessages — user message
messageId: msg.messageId || uuidv4(),

// saveResponseOutput — assistant message
messageId: uuidv4(),
```

The provider response ID (`responseId`) can be stored separately (e.g. as a `responseId` field)
if traceability back to the OpenAI response is needed, but `messageId` must be a UUID v4.

---

### Summary

`messageId` must be a UUID v4 throughout LibreChat. Always fall back to `uuidv4()`, never
`nanoid()`, and never pass a provider-native ID directly as `messageId`.

---

## 3. `parentMessageId` always `null`

### Root Cause

Both `saveInputMessages` and `saveResponseOutput` hardcode `parentMessageId: null`:

```js
// saveInputMessages (line 165) and saveResponseOutput (line 204)
parentMessageId: null,
```

LibreChat reconstructs conversation threads by walking the `parentMessageId` linked list. The
root message must have `parentMessageId` set to the null UUID sentinel
`'00000000-0000-0000-0000-000000000000'`, not JS `null`. Assistant messages must point to their
user message's `messageId`.

With `null` on all messages, thread reconstruction returns nothing and conversations appear
empty in the UI.

| Source | Root user `parentMessageId` | Assistant `parentMessageId` |
|---|---|---|
| Frontend | `"00000000-0000-0000-0000-000000000000"` | User message UUID |
| Agents API | `null` | `null` |

---

### The Fix: Set the UUID sentinel and link parent IDs

```js
// saveInputMessages — root user message
parentMessageId: '00000000-0000-0000-0000-000000000000',

// saveResponseOutput — assistant message points to user message
parentMessageId: userMessageId,
```

`userMessageId` must be threaded through from `saveInputMessages` to `saveResponseOutput` so
the chain is `sentinel → userMessage → assistantMessage`.

This is the established pattern:
- `api/server/services/Threads/manage.js` — `saveUserMessage` sets `parentMessageId` to the
  sentinel; `saveAssistantMessage` receives and uses the user message ID as parent.

---

### Summary

Never pass `null` for `parentMessageId`. Root messages use the UUID sentinel
`'00000000-0000-0000-0000-000000000000'`; all subsequent messages point to their logical parent
by UUID. Without this, the thread linked list is broken and the UI cannot render the conversation.

---

## 4. `messages` array always empty on conversation

### Root Cause

In both the streaming path (line 577) and non-streaming path (line 740), `saveConversation` is
called **before** `saveInputMessages` and `saveResponseOutput`:

```js
// Current (broken) order — both streaming and non-streaming paths
await saveConversation(...);   // ← runs first; queries messages → finds []
await saveInputMessages(...);  // ← messages written here, too late
await saveResponseOutput(...); // ← messages written here, too late
```

`saveConvo` in `packages/data-schemas` internally re-queries all messages for the
`conversationId` and sets the `messages` array from the result:

```ts
// packages/data-schemas/src/methods/conversation.ts
const messages = await getMessages({ conversationId }, '_id');
const update = { ...convo, messages, user: userId };
```

Because `saveConversation` fires before any messages exist in the DB, `getMessages` returns `[]`.
The conversation document is stored with `messages: []` and is never updated afterwards.

| Source | `messages` on conversation |
|---|---|
| Frontend | Populated — `[{ $oid: "..." }, { $oid: "..." }]` |
| Agents API | Always empty — `[]` |

---

### The Fix: Save messages before saving the conversation

```js
// ✅ Correct order — messages exist in DB before saveConvo queries them
await saveInputMessages(...);
await saveResponseOutput(...);
await saveConversation(...);
```

This is the established pattern:
- `api/server/services/Threads/manage.js` — `saveUserMessage` / `saveAssistantMessage` are
  called before `saveConvo`.
- `api/app/clients/BaseClient.js` — `saveMessageToDatabase` precedes any conversation update.

---

### Summary

`saveConvo` hydrates the `messages` array by querying existing messages at call time. Always
persist all messages first, then call `saveConvo`.

---

## 5. `text` vs `content` array format mismatch

### Root Cause

The Frontend stores assistant responses in a structured `content` array and leaves `text` empty:

```json
{
  "text": "",
  "content": [{ "type": "text", "text": "Hello! How can I help?" }]
}
```

The Agents API stores the response as a flat `text` string with no `content` array:

```js
// saveResponseOutput (line 204)
{
  text: responseText,   // flat string
  // content field absent
}
```

| Field | Frontend | Agents API |
|---|---|---|
| `text` | `""` (empty) | Full response string |
| `content` | `[{ type: "text", text: "..." }]` | Absent |
| `attachments` | `[]` (present) | Absent |
| `finish_reason` | Absent | `"stop"` |
| `sender` | Agent display name (`"ReAct Agent"`) | Generic `"Agent"` |

Any consumer that reads `content[0].text` — the path used by the frontend render pipeline —
will find `undefined` on Agents API messages.

---

### The Fix: Always populate both `text` and `content`

```js
{
  text: responseText,
  content: [{ type: 'text', text: responseText }],
  attachments: [],
  sender: agent?.name || 'Agent',
}
```

Populating both fields keeps Agents API messages compatible with all existing consumers
regardless of which field they read.

---

### Summary

LibreChat's message schema carries both `text` (legacy, plain string) and `content` (structured
array). The Agents API must populate both. Omitting `content` breaks the frontend render pipeline
for responses sourced from the Responses API.

---

## 6. `agent_id` missing on conversation

### Root Cause

The `saveConversation` helper passes `agentId` as a named field in the data object:

```js
await db.saveConvo(
  { userId: req?.user?.id, ... },
  {
    conversationId,
    endpoint: EModelEndpoint.agents,
    agentId,          // ← camelCase, not the schema field name
    title: agent?.name || 'Open Responses Conversation',
    model: agent?.model,
  },
  ...
);
```

The `IConversation` schema field is `agent_id` (snake_case), not `agentId`. As a result the
agent association is never persisted on the conversation document:

| Field | Frontend | Agents API |
|---|---|---|
| `agent_id` | `"agent_trPij8hKdHgfBURHY5dzH"` | Absent |
| `model` | Absent | `"gpt-5.4"` (base model, not agent ID) |

Any code that resolves the agent from a saved conversation — loading agent config, tool
permissions, UI rendering — does so via `agent_id`. Without it, Agents API conversations are
orphaned from their agent after save.

---

### The Fix: Use the correct field name

```js
{
  conversationId,
  endpoint: EModelEndpoint.agents,
  agent_id: agentId,   // ✅ snake_case matches IConversation schema
  title: agent?.name || 'Open Responses Conversation',
  model: agent?.model,
}
```

---

### Summary

Always use `agent_id` (snake_case) when writing to the conversation document. Passing `agentId`
(camelCase) silently drops the field — `saveConvo` does no camelCase → snake_case mapping.

---

## 7. Minor field gaps

The following fields are absent on Agents API documents but present on Frontend documents. None
are blocking but they cause inconsistencies in analytics, UI defaults, and config resolution.

| Field | Location | Frontend | Agents API | Impact |
|---|---|---|---|---|
| `tokenCount` | User message | Present | Absent | User message token analytics incomplete (assistant message now has `tokenCount` via `response.usage?.output_tokens`) |
| `maxContextTokens` | Conversation | Present | Absent | Falls back to model default |
| `resendFiles` | Conversation | `true` | Absent | File resend behaviour undefined |
| `title` | Conversation | Content-derived (`"Friendly Greeting"`) | Agent name (`"ReAct Agent"`) | Titles are less descriptive |

---

## 8. Image content lost when `input` is a JSON string

### Root Cause

The Chrome extension sends `request.input` as a **JSON-encoded string** rather than a parsed
array when the message contains mixed content (text + image):

```json
"[{\"type\":\"text\",\"text\":\"Describe this image\"},{\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/png;base64,...\"}}]"
```

`convertInputToMessages` checks `typeof input === 'string'` first and, when true, treats the
entire value as a plain-text user message:

```ts
if (typeof input === 'string') {
  return [{ role: 'user', content: input }];  // ← whole JSON string becomes content
}
```

The result is a message with `content` set to the raw JSON string. `saveInputMessages` then
calls `JSON.stringify` on it again, storing the double-encoded string in `text`. The image data
is never parsed into a proper `image_url` content part, so the frontend receives no image.

| What arrived | What was stored in `text` |
|---|---|
| `"[{\"type\":\"text\",...},{\"type\":\"image_url\",...}]"` (string) | The same raw JSON string — image lost |
| `[{type:'text',...},{type:'image_url',...}]` (array) | `[{"type":"text",...},{"type":"image_url",...}]` — image preserved |

---

### The Fix: Parse JSON string inputs before converting

Before passing `request.input` to `convertToInternalMessages`, attempt to parse it as JSON. If
it parses to an array, use the parsed value so the image content parts are handled correctly:

```js
let resolvedInput = request.input;
if (typeof resolvedInput === 'string') {
  try {
    const parsed = JSON.parse(resolvedInput);
    if (Array.isArray(parsed)) {
      resolvedInput = parsed;
    }
  } catch {
    // not JSON — treat as plain text string
  }
}
const inputMessages = convertToInternalMessages(resolvedInput);
```

Plain text strings (e.g. `"hello"`) fail `JSON.parse` or don't produce an array, so they are
passed through unchanged.

---

### Summary

When a client sends `input` as a JSON-encoded string instead of a parsed array, all structured
content parts (images, files) are silently discarded. Always attempt to parse string inputs as
JSON before passing them to `convertToInternalMessages`.
