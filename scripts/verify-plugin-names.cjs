// Runs under Electron-as-Node so Node's fs can see inside app.asar.
// Writes its report to a file: child stdout capture is unreliable in this sandbox.
const fs = require('fs')
const path = require('path')

const patch = process.argv[2]
const moduleRoot = process.argv[3]
const report = process.argv[4]

const out = []
const say = (line) => out.push(line)

const text = fs.readFileSync(patch, 'utf8')
const names = [...new Set([...text.matchAll(/^\s*name:\s*'([^']+)'/gm)].map((m) => m[1]))]

let failures = 0
for (const name of names.sort()) {
  if (name.startsWith('cordis:') || name.startsWith('./') || name.startsWith('../')) {
    say(`SKIP     ${name}`)
    continue
  }
  const parts = name.split('/')
  const pkg = parts.slice(0, 2).join('/')
  const subpath = parts.length > 2 ? `./${parts.slice(2).join('/')}` : undefined
  const dir = path.join(moduleRoot, ...pkg.split('/'))
  const manifestPath = path.join(dir, 'package.json')
  if (!fs.existsSync(manifestPath)) {
    failures += 1
    say(`MISSING  ${name}`)
    continue
  }
  if (subpath === undefined) {
    say(`OK       ${name}`)
    continue
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const exportsMap = manifest.exports
  const exported = exportsMap === undefined
    ? false
    : typeof exportsMap === 'string'
      ? true
      : Object.keys(exportsMap).includes(subpath)
  if (!exported) failures += 1
  say(`${exported ? 'OK      ' : 'NOEXP   '} ${name}`)
}

say('')
say(`checked=${names.length} failures=${failures}`)
fs.writeFileSync(report, out.join('\n'), 'utf8')