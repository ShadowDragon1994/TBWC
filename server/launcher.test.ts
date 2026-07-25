import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Windows local launcher', () => {
  it('reports a stopped application without failing when no PID file exists', () => {
    const output = execFileSync('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('scripts/status-zaowutai.ps1'),
    ], {
      cwd: resolve('.'),
      encoding: 'utf8',
      env: { ...process.env, ZAOWUTAI_PORT: '65534' },
    })
    expect(output).toContain('Zaowutai is not running.')
    expect(output).toContain('http://127.0.0.1:65534')
  })
})
