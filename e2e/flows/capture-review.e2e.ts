import { test, expect, emitWs } from '../support/test'
import { buildWsEvent } from '@heediq/shared'
import { meResponse } from '../fixtures/me'
import { source, extractedItem, contextTree } from '../fixtures/domain'
import { ACCOUNT, ORG_ID, SOURCE_ID, JOB_ID, CONTEXT_ID } from '../support/ids'

/**
 * Capture → processing → review → filing journey (D-155 Tier 1). The core product funnel: drop a
 * text file, watch it become a Source, get the async classification over the (faked) WS, review the
 * extracted items, and file them into a Context. Asserts the full D-154 funnel taxonomy fires with
 * the right entity ids — `capture_started → source_created → capture_submitted →
 * source_detail_opened → source_ready (WS-driven) → review_opened → items_kept`.
 */
test.describe('capture → review → filing', () => {
  test('captures a text file, receives classification, reviews and files it', async ({ page, api, analytics }) => {
    api.on('GET', '/me', meResponse('admin'))
    api.on('GET', '/contexts/tree', { tree: contextTree() })

    // Capture: POST /sources (shell) → POST /sources/:id/text (enqueue).
    api.on('POST', '/sources', { source: source() })
    api.on('POST', `/sources/${SOURCE_ID}/text`, { jobId: JOB_ID })

    // Detail + review data. Summary 404s until the summarizer runs (a normal not-ready state).
    api.on('GET', `/sources/${SOURCE_ID}`, { source: source() })
    api.onError('GET', `/sources/${SOURCE_ID}/summary`, 404, { code: 'NOT_FOUND', message: 'not ready' })
    api.on('GET', `/sources/${SOURCE_ID}/items`, { items: [extractedItem()] })
    api.on('POST', `/sources/${SOURCE_ID}/review`, { keptCount: 1, discardedCount: 0 })

    await page.goto('/capture')
    await expect(page).toHaveURL(/\/capture$/)

    // Scope to the text-ingest Card (the file input's parent) — the Record form also has a Title field.
    const textCard = page.locator('input[type="file"][accept*=".txt"]').locator('..')

    // Drop a text file into the (sr-only) file input — this reads it in-browser and reveals the form.
    await textCard.locator('input[type="file"]').setInputFiles({
      name: 'q2-planning.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('We decided to ship the analytics taxonomy in Q2.'),
    })

    // Title auto-fills from the filename; submit pushes it to the library.
    await expect(textCard.getByLabel('Title')).toHaveValue('q2-planning')
    await textCard.getByRole('button', { name: 'Add to library' }).click()

    // Routed to the new Source's detail page → the detail-open + capture funnel events fired.
    await expect(page).toHaveURL(new RegExp(`/sources/${SOURCE_ID}$`))
    const started = await analytics.waitForEvent('capture_started', { method: 'text' })
    expect(started.user_id).toBe(ACCOUNT.admin)
    const created = await analytics.waitForEvent('source_created', { sourceId: SOURCE_ID, method: 'text' })
    expect(created.user_id).toBe(ACCOUNT.admin)
    await analytics.waitForEvent('capture_submitted', { method: 'text' })
    await analytics.waitForEvent('source_detail_opened', { sourceId: SOURCE_ID })

    // Async classification lands over the WS framework → AnalyticsBridge maps it to `source_ready`.
    await emitWs(
      page,
      buildWsEvent({
        scope: { kind: 'org', orgId: ORG_ID },
        type: 'classification_ready',
        payload: {
          sourceId: SOURCE_ID,
          proposedContextId: CONTEXT_ID,
          domain: 'work',
          labels: [],
          confidence: 0.9,
        },
      }),
    )
    await analytics.waitForEvent('source_ready', { sourceId: SOURCE_ID })

    // The Review affordance shows (classification === 'pending_review') → open the wizard.
    await page.getByRole('button', { name: 'Review' }).click()
    await expect(page).toHaveURL(new RegExp(`/sources/${SOURCE_ID}/review$`))
    await analytics.waitForEvent('review_opened', { sourceId: SOURCE_ID })

    // Placement step seeds the proposed context → advance to items → confirm filing.
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByRole('button', { name: /^File/ }).click()

    const kept = await analytics.waitForEvent('items_kept', {
      sourceId: SOURCE_ID,
      contextId: CONTEXT_ID,
      keptCount: 1,
    })
    expect(kept.user_id).toBe(ACCOUNT.admin)
  })
})
