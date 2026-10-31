// Parses the preset patch with the same YAML library the loader uses, so a
// broken doc (comment edits included) fails here instead of at profile boot.
const fs = require('fs')
const path = require('path')

const moduleRoot = process.argv[2]
const patch = process.argv[3]
const report = process.argv[4]

const { createRequire } = require('module')
const req = createRequire(path.join(moduleRoot, 'noop.js'))

const out = []
try {
  const YAML = req('yaml')
  const doc = YAML.parse(fs.readFileSync(patch, 'utf8'))
  const inserted = doc[0].insert[0]
  const rows = inserted.config.plugins
  out.push(`yaml_ok preset_id=${inserted.config.id} name=${inserted.config.name} order=${inserted.config.order}`)
  out.push(`top_level_rows=${rows.length}`)
  const nested = rows.filter((row) => Array.isArray(row.config)).map((row) => `${row.id}:${row.config.length}`)
  out.push(`group_rows=${nested.join(', ')}`)
  const flat = []
  const walk = (list) => { for (const row of list) { flat.push(row); if (Array.isArray(row.config)) walk(row.config) } }
  walk(rows)
  out.push(`all_rows_incl_children=${flat.length}`)
} catch (error) {
  out.push('yaml_fail ' + error.message)
}
fs.writeFileSync(report, out.join('\n'), 'utf8')