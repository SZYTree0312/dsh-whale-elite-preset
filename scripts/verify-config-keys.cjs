// Verifies that every config key this preset sets actually exists in the
// installed plugin build. Schemastery drops unknown keys silently, so a typo in
// a config key would leave the row inert without any startup error.
// Runs under Electron-as-Node (asar-aware fs) and writes a report file.
const fs = require('fs')
const path = require('path')

const moduleRoot = process.argv[2]
const report = process.argv[3]

const checks = [
  ['@deepseek-ai/dsh-persona', ['prefix', 'suffix', 'complete', 'includeRuntimeContext']],
  ['@deepseek-ai/dsh-agent-instructions', ['maxBytes']],
  ['@deepseek-ai/dsh-tool-fs-search', ['sampleOverCapGlobResults']],
  ['@deepseek-ai/dsh-tool-str-replace-editor', ['maxOutputChars']],
  ['@deepseek-ai/dsh-plan-mode', ['section']],
  ['@deepseek-ai/dsh-compaction-basic', ['thresholdRatio', 'retainRatio']],
  ['@deepseek-ai/dsh-compaction-tool-result-pruner', ['thresholdChars', 'headChars', 'tailChars']],
  ['@deepseek-ai/dsh-tool-subagent', ['provider', 'toolName', 'modelSelectionSettings']],
  ['@deepseek-ai/dsh-workflow-ptc', ['provider']],
  ['@deepseek-ai/dsh-tool-todo', ['allowParallelInProgress']],
  ['@deepseek-ai/dsh-tool-web', ['fetch', 'searchTimeoutMs']],
  ['@deepseek-ai/dsh-agent-preset', ['id', 'name', 'description', 'order', 'plugins']],
]

const out = []
const readTree = (dir) => {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...readTree(full))
    else if (/\.(js|mjs|cjs|d\.ts)$/.test(entry.name)) files.push(full)
  }
  return files
}

let missing = 0
for (const [pkg, keys] of checks) {
  const dir = path.join(moduleRoot, ...pkg.split('/'))
  const lib = path.join(dir, 'lib')
  const root = fs.existsSync(lib) ? lib : dir
  let text = ''
  try {
    for (const file of readTree(root)) text += fs.readFileSync(file, 'utf8')
  } catch (error) {
    out.push(`ERROR    ${pkg}: ${error.message}`)
    missing += keys.length
    continue
  }
  const absent = keys.filter((key) => !text.includes(key))
  missing += absent.length
  out.push(`${absent.length === 0 ? 'OK      ' : 'ABSENT  '} ${pkg}: ${keys.join(', ')}${absent.length === 0 ? '' : ` -> missing ${absent.join(', ')}`}`)
}

out.push('')
out.push(`packages=${checks.length} missing_keys=${missing}`)
fs.writeFileSync(report, out.join('\n'), 'utf8')