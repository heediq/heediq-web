import { PERMISSIONS } from '@heediq/shared'
import { describe, it, expect } from 'vitest'
import translation from '../locales/en/translation.json'

describe('permission i18n coverage', () => {
  it('has a rolesSettings.permissions label for every PERMISSIONS entry', () => {
    const labelled = Object.keys(translation.rolesSettings.permissions)

    expect(labelled.sort()).toEqual([...PERMISSIONS].sort())
  })
})
