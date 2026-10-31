// Lists the prompt template variables the installed agent-loop registers.
// A persona template naming anything else fails at render, before any model
// request is sent, so this is the one string check worth making mechanical.
const fs = require('fs')
const path = require('path')

const moduleRoot = process.argv[2]
const report = process.argv[3]

const collect = (dir, found = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) collect(full, found)
    else if (/\.(js|mjs|cjs)$/.test(entry.name)) found.push(full)
  }
  return found
}

const names = new Set()
for (const pkg of ['dsh-agent-loop', 'dsh-system-prompt']) {
  const dir = path.join(moduleRoot, '@deepseek-ai', pkg, 'lib')
  if (!fs.existsSync(dir)) continue
  for (const file of collect(dir)) {
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(/variable\(\s*["']([A-Za-z0-9_.-]+)["']/g)) names.add(match[1])
    for (const match of text.matchAll(/registerVariable\(\s*["']([A-Za-z0-9_.-]+)["']/g)) names.add(match[1])
  }
}

fs.writeFileSync(report, `variables=${[...names].sort().join(',')}\n`, 'utf8')