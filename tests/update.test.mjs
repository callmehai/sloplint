// The update notice compares versions correctly and stays off where it must.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newer, checkForUpdate, currentVersion } from '../skills/sloplint/checker/update.mjs'

test('newer compares release tags with the package version', () => {
  assert.equal(newer('v0.3.0', '0.2.0'), true)
  assert.equal(newer('v0.2.1', '0.2.0'), true)
  assert.equal(newer('v1.0.0', '0.9.9'), true)
  assert.equal(newer('v0.2.0', '0.2.0'), false)
  assert.equal(newer('v0.1.9', '0.2.0'), false)
  assert.equal(newer('v0.10.0', '0.9.0'), true)
})

test('the running version comes from package.json', () => {
  assert.match(currentVersion(), /^\d+\.\d+\.\d+/)
})

test('no check in CI or when turned off', async () => {
  assert.equal(await checkForUpdate({ CI: 'true' }), undefined)
  assert.equal(await checkForUpdate({ SLOPLINT_NO_UPDATE_CHECK: '1' }), undefined)
})
