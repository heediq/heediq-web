import { test, expect } from '../support/test'
import { meResponse } from '../fixtures/me'
import { context, contextTree, conversation, chatMessage } from '../fixtures/domain'
import { ACCOUNT, ORG_ID, CONTEXT_ID, CONVERSATION_ID } from '../support/ids'

/**
 * Context Library + Chat journeys (D-155 Tier 1). The read/query side of the product: browse the
 * Context tree, open a Context (→ `context_opened`), then open a conversation and send a turn
 * (→ `chat_opened` → `chat_sent`). Asserts each D-154 event carries the right entity ids and is
 * attributed to the identified user.
 */
test.describe('context library + chat', () => {
  test('browses the context tree and opens a context', async ({ page, api, analytics }) => {
    api.on('GET', '/me', meResponse('admin'))
    api.on('GET', '/contexts/tree', { tree: contextTree([context()]) })
    api.on('GET', `/contexts/${CONTEXT_ID}`, { context: context() })

    await page.goto('/contexts')
    await analytics.waitForGroup('org', ORG_ID)

    // Select the context from the tree → routes to its detail panel, which fires `context_opened`.
    await page.getByRole('treeitem', { name: 'Product Planning' }).click()
    await expect(page).toHaveURL(new RegExp(`/contexts/${CONTEXT_ID}$`))

    const opened = await analytics.waitForEvent('context_opened', { contextId: CONTEXT_ID })
    expect(opened.user_id).toBe(ACCOUNT.admin)
  })

  test('opens a conversation and sends a chat turn', async ({ page, api, analytics }) => {
    api.on('GET', '/me', meResponse('admin'))
    api.on('GET', '/contexts/tree', { tree: contextTree([context()]) })
    api.on('GET', `/contexts/${CONTEXT_ID}`, { context: context() })
    // One existing conversation → auto-selected, so the thread mounts and fires `chat_opened`.
    api.on('GET', '/conversations', { conversations: [conversation()] })
    api.on('GET', `/conversations/${CONVERSATION_ID}/messages`, { messages: [] })
    api.on('POST', `/conversations/${CONVERSATION_ID}/messages`, {
      message: chatMessage({ content: 'What did we decide about pricing?' }),
    })

    await page.goto(`/contexts/${CONTEXT_ID}/chat`)

    const chatOpened = await analytics.waitForEvent('chat_opened', {
      contextId: CONTEXT_ID,
      conversationId: CONVERSATION_ID,
    })
    expect(chatOpened.user_id).toBe(ACCOUNT.admin)

    // Send a turn → the composer posts the message and fires `chat_sent`.
    await page.getByLabel('Message the assistant…').fill('What did we decide about pricing?')
    await page.getByRole('button', { name: 'Send' }).click()

    const sent = await analytics.waitForEvent('chat_sent', {
      contextId: CONTEXT_ID,
      conversationId: CONVERSATION_ID,
    })
    expect(sent.user_id).toBe(ACCOUNT.admin)
  })
})
