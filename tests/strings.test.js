const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const { loadQmlJs } = require('./load-qml-js.js')

const Strings = loadQmlJs('Strings.js')
const EN = Strings.STRINGS.en
const PT = Strings.STRINGS.pt
// Every language but English, each checked against the English.
const TRANSLATIONS = Object.entries(Strings.STRINGS).filter(([lang]) => lang !== 'en')

test('tr looks a key up in the language', () => {
  assert.equal(Strings.tr('en', 'quick.create'), 'Create')
  assert.equal(Strings.tr('pt', 'quick.create'), 'Criar')
})

test('tr falls back to English, then to the key itself', () => {
  assert.equal(Strings.tr('pt', 'unit.min', [5]), '5 min')
  assert.equal(Strings.tr('xx', 'quick.create'), 'Create')
  assert.equal(Strings.tr('fr', 'unit.min', [5]), '5 min')
  assert.equal(Strings.tr(undefined, 'quick.create'), 'Create')
  assert.equal(Strings.tr('pt', 'no.such.key'), 'no.such.key')
})

test('tr fills %1 %2 from an array or a single value, and leaves missing ones', () => {
  assert.equal(Strings.tr('en', 'unit.hmin', [1, 30]), '1 h 30 min')
  assert.equal(Strings.tr('en', 'toast.created', 'Standup'), 'Created: Standup')
  assert.equal(Strings.tr('en', 'toast.created', 0), 'Created: 0')
  assert.equal(Strings.tr('en', 'unit.hmin', [1]), '1 h %2 min')
  assert.equal(Strings.tr('en', 'toast.created'), 'Created: %1')
})

test('tr does not expand placeholders found inside arguments', () => {
  assert.equal(Strings.tr('en', 'bar.soon', ['%2 sale', 'in 5 min']), '%2 sale in in 5 min')
})

test('trn picks one or other, with the count as %1 by default', () => {
  assert.equal(Strings.trn('pt', 'summary.tasks', 1), '1 tarefa')
  assert.equal(Strings.trn('pt', 'summary.tasks', 3), '3 tarefas')
  assert.equal(Strings.trn('en', 'summary.tasks', 0), '0 tasks')
  assert.equal(Strings.trn('pt', 'rel.left', 1, ['1 min']), 'agora · falta 1 min')
  assert.equal(Strings.trn('en', 'settings.syncEvents', 2, [2, 'gws']), '2 events from gws')
})

test('trn uses the singular for 0 in French only', () => {
  assert.equal(Strings.trn('fr', 'summary.tasks', 0), '0 tâche')
  assert.equal(Strings.trn('fr', 'summary.tasks', 1), '1 tâche')
  assert.equal(Strings.trn('fr', 'summary.tasks', 2), '2 tâches')
  assert.equal(Strings.trn('es', 'summary.tasks', 0), '0 tareas')
  assert.equal(Strings.trn('de', 'summary.tasks', 0), '0 Aufgaben')
  assert.equal(Strings.trn('pt', 'summary.tasks', 0), '0 tarefas')
})

test('trFor uses the gendered form a language has, else the plain key', () => {
  assert.equal(Strings.trFor('pt', 'repeat.weekly', 'm', ['sábado']), 'Toda semana no sábado')
  assert.equal(Strings.trFor('pt', 'repeat.weekly', 'f', ['sexta-feira']), 'Toda semana na sexta-feira')
  assert.equal(Strings.trFor('en', 'repeat.weekly', '', ['Friday']), 'Weekly on Friday')
  assert.equal(Strings.trFor('en', 'repeat.weekly', 'f', ['Friday']), 'Weekly on Friday')
  assert.equal(Strings.trFor('fr', 'repeat.weekly', '', ['vendredi']), 'Toutes les semaines le vendredi')
})

test('weekdayGender is Portuguese grammar only', () => {
  assert.deepEqual([0, 1, 5, 6].map(d => Strings.weekdayGender('pt', d)), ['m', 'f', 'f', 'm'])
  for (const lang of ['en', 'fr', 'es', 'de']) assert.equal(Strings.weekdayGender(lang, 1), '', lang)
})

test('resolveLanguage: explicit settings win, auto follows the system locale', () => {
  assert.equal(Strings.resolveLanguage('en', 'pt_BR'), 'en')
  assert.equal(Strings.resolveLanguage('pt', 'en_US'), 'pt')
  assert.equal(Strings.resolveLanguage('auto', 'pt_BR'), 'pt')
  assert.equal(Strings.resolveLanguage('auto', 'pt-PT'), 'pt')
  assert.equal(Strings.resolveLanguage('auto', 'en_GB'), 'en')
  assert.equal(Strings.resolveLanguage('auto', 'fr_FR'), 'fr')
  assert.equal(Strings.resolveLanguage('auto', 'fr_CA'), 'fr')
  assert.equal(Strings.resolveLanguage('auto', 'es_MX'), 'es')
  assert.equal(Strings.resolveLanguage('auto', 'de_DE'), 'de')
  assert.equal(Strings.resolveLanguage('auto', 'de_AT'), 'de')
  assert.equal(Strings.resolveLanguage('auto', 'it_IT'), 'en')
  assert.equal(Strings.resolveLanguage('de', 'fr_FR'), 'de')
  assert.equal(Strings.resolveLanguage('en', 'es_ES'), 'en')
  assert.equal(Strings.resolveLanguage(undefined, 'pt_BR'), 'pt')
  assert.equal(Strings.resolveLanguage('klingon', 'C'), 'en')
  assert.equal(Strings.resolveLanguage('PT-BR', ''), 'pt')
})

test('localeName gives the Qt.locale name for each language', () => {
  assert.equal(Strings.localeName('pt'), 'pt_BR')
  assert.equal(Strings.localeName('en'), 'en_US')
  assert.equal(Strings.localeName('fr'), 'fr_FR')
  assert.equal(Strings.localeName('es'), 'es_ES')
  assert.equal(Strings.localeName('de'), 'de_DE')
  assert.equal(Strings.localeName('xx'), 'en_US')
})

test('languageOptions names each language in itself', () => {
  assert.deepEqual(Strings.languageOptions('pt'), [
    { value: 'auto', label: 'Automático' },
    { value: 'en', label: 'English' },
    { value: 'pt', label: 'Português (Brasil)' },
    { value: 'fr', label: 'Français' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' }
  ])
  assert.equal(Strings.languageOptions('en')[0].label, 'Automatic')
  assert.equal(Strings.languageOptions('de')[0].label, 'Automatisch')
})

test('every language has a string table, a locale and date patterns', () => {
  assert.deepEqual(Object.keys(Strings.STRINGS).sort(), [...Strings.LANGUAGES].sort())
  for (const lang of Strings.LANGUAGES) {
    assert.ok(Strings.LANGUAGE_NAMES[lang], lang)
    assert.ok(Strings.LOCALE_NAMES[lang].startsWith(lang + '_'), lang)
    assert.deepEqual(Object.keys(Strings.datePatterns(lang)).sort(), ['hero', 'long', 'month', 'short'], lang)
  }
  assert.equal(Strings.datePatterns('de').hero, 'd. MMMM')
  assert.equal(Strings.datePatterns('xx').hero, 'MMMM d')
})

const placeholders = (text) => [...new Set(text.match(/%\d/g) || [])].sort()
const baseOf = (key) => key.replace(/\.(one|other|m|f)$/, '')

// Keys that read the same in every language. A translation may still
// override one (German says "KW" for the week column).
const LANGUAGE_NEUTRAL = [
  'bar.more', 'form.meet', 'grid.week', 'life.mementoMori',
  'settings.minutes', 'unit.h', 'unit.hmin', 'unit.min'
]

test('every translated key exists in English, or is a form of one', () => {
  const enBases = new Set(Object.keys(EN).map(baseOf))
  for (const [lang, table] of TRANSLATIONS) {
    const orphans = Object.keys(table).filter(key => !(key in EN) && !enBases.has(baseOf(key)) && !key.startsWith('weekday.gender.'))
    assert.deepEqual(orphans, [], lang)
  }
})

test('each language translates everything but the language-neutral keys', () => {
  for (const key of LANGUAGE_NEUTRAL) assert.ok(key in EN, key)
  for (const [lang, table] of TRANSLATIONS) {
    const bases = new Set(Object.keys(table).map(baseOf))
    const untranslated = Object.keys(EN).filter(key => !(key in table) && !bases.has(key) && !LANGUAGE_NEUTRAL.includes(key))
    assert.deepEqual(untranslated, [], lang)
  }
})

test('Portuguese leaves every language-neutral key to English', () => {
  assert.deepEqual(LANGUAGE_NEUTRAL.filter(key => key in PT), [])
})

test('translations use the same placeholders as the English', () => {
  for (const [lang, table] of TRANSLATIONS) {
    for (const [key, text] of Object.entries(table)) {
      const english = EN[key] || EN[baseOf(key)] || EN[baseOf(key) + '.other']
      if (english === undefined) continue
      assert.deepEqual(placeholders(text), placeholders(english), `${lang} ${key}`)
    }
  }
})

test('plural keys come in complete pairs', () => {
  for (const [lang, table] of Object.entries(Strings.STRINGS)) {
    for (const key of Object.keys(table)) {
      if (key.endsWith('.one')) assert.ok(key.replace(/one$/, 'other') in table, `${lang} ${key}`)
      if (key.endsWith('.other')) assert.ok(key.replace(/other$/, 'one') in table, `${lang} ${key}`)
    }
  }
})

test('gendered keys come in complete pairs', () => {
  for (const [lang, table] of TRANSLATIONS) {
    for (const key of Object.keys(table)) {
      if (key.endsWith('.m')) assert.ok(key.replace(/m$/, 'f') in table, `${lang} ${key}`)
      if (key.endsWith('.f')) assert.ok(key.replace(/f$/, 'm') in table, `${lang} ${key}`)
    }
  }
})

test('every literal key Model.js asks for exists', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'Model.js'), 'utf8')
  const calls = [...source.matchAll(/Strings\.(tr|trn|trFor)\(lang, "([^"]+)"[,)]/g)]
  assert.ok(calls.length > 20)
  for (const [, fn, key] of calls) {
    if (fn === 'trn') {
      assert.ok(`${key}.one` in EN && `${key}.other` in EN, key)
      for (const [lang, table] of TRANSLATIONS) assert.ok(`${key}.one` in table, `${lang} ${key}`)
    }
    else assert.ok(key in EN || `${key}.other` in EN, key)
  }
})

test('weekday, month and ordinal names exist in every language', () => {
  for (const [lang, table] of Object.entries(Strings.STRINGS)) {
    for (let i = 0; i < 7; i++) assert.ok(`weekday.${i}` in table, `${lang} weekday.${i}`)
    for (let i = 0; i < 12; i++) assert.ok(`month.${i}` in table, `${lang} month.${i}`)
    for (const n of [1, 2, 3, 4, -1]) {
      const key = `ordinal.${n}`
      assert.ok(key in table || (`${key}.m` in table && `${key}.f` in table), `${lang} ${key}`)
    }
  }
})
