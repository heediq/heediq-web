import {
  SourceSchema,
  ExtractedItemSchema,
  ContextSchema,
  ConversationSchema,
  ChatMessageSchema,
  type Source,
  type ExtractedItem,
  type Context,
  type Conversation,
  type ChatMessage,
} from '@heediq/shared'
import type { ContextTreeNode } from '../../src/features/contexts/contexts-api'
import { ORG_ID, ACCOUNT, SOURCE_ID, CONTEXT_ID, CONVERSATION_ID } from '../support/ids'

/**
 * Domain-object fixtures for the flow tier (D-155). Each builder `parse`s through the real
 * `@heediq/shared` schema, so a fixture that drifts from the contract fails at construction — the
 * "mocks parsed through Zod so they can't drift" guarantee, applied at the object level.
 */
const NOW = '2026-06-01T00:00:00.000Z'

export function source(overrides: Partial<Source> = {}): Source {
  return SourceSchema.parse({
    sourceId: SOURCE_ID,
    orgId: ORG_ID,
    userId: ACCOUNT.admin,
    title: 'Q2 planning notes',
    status: 'ready',
    sourceType: 'text',
    labels: [],
    classification: 'pending_review',
    proposedClassification: {
      proposedContextId: CONTEXT_ID,
      domain: 'work',
      labels: [],
      confidence: 0.9,
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  })
}

export function extractedItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  return ExtractedItemSchema.parse({
    itemId: '00000000-0000-4000-8000-0000000001a0',
    sourceId: SOURCE_ID,
    orgId: ORG_ID,
    category: 'decision',
    text: 'Ship the analytics taxonomy in Q2',
    confidence: 0.88,
    status: 'proposed',
    createdAt: NOW,
    ...overrides,
  })
}

export function context(overrides: Partial<Context> = {}): Context {
  return ContextSchema.parse({
    contextId: CONTEXT_ID,
    orgId: ORG_ID,
    userId: ACCOUNT.admin,
    domain: 'work',
    name: 'Product Planning',
    visibility: 'personal',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  })
}

export function contextTree(nodes: Context[] = [context()]): ContextTreeNode[] {
  return nodes.map((c) => ({ ...c, children: [] }))
}

export function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return ConversationSchema.parse({
    conversationId: CONVERSATION_ID,
    contextId: CONTEXT_ID,
    orgId: ORG_ID,
    userId: ACCOUNT.admin,
    title: 'Planning chat',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  })
}

export function chatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return ChatMessageSchema.parse({
    messageId: '00000000-0000-4000-8000-0000000000d0',
    conversationId: CONVERSATION_ID,
    sk: `${NOW}#00000000-0000-4000-8000-0000000000d0`,
    role: 'user',
    content: 'What did we decide?',
    createdAt: NOW,
    ...overrides,
  })
}
