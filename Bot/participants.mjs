import { auditRepository, normalizePath } from './auditor.mjs';

function repositoryKey(value) {
  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() !== 'github.com' || !['https:', 'http:'].includes(url.protocol)) return '';
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return '';
    return `${parts[0]}/${parts[1].replace(/\.git$/i, '')}`.toLowerCase();
  } catch {
    return '';
  }
}

export function findGroupByRepository(groups, value) {
  const key = repositoryKey(value);
  return key ? groups.find(group => repositoryKey(group.repository) === key) ?? null : null;
}

function folded(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function identityKey(value) {
  return folded(value).replace(/[^a-z0-9]/g, '');
}

function aliasesFor(person) {
  if (!person.firstNames?.trim() || !person.lastNames?.trim()) return new Set();
  const first = person.firstNames.trim();
  const last = person.lastNames.trim();
  const parts = last.split(/\s+/);
  const particles = new Set(['de', 'del', 'la', 'las', 'los']);
  let surnameLength = 1;
  while (surnameLength < parts.length && particles.has(folded(parts[surnameLength - 1]))) surnameLength++;
  const surnames = [last, parts.slice(0, surnameLength).join(' ')];
  if (surnameLength > 1 && parts.length > surnameLength) surnames.push(parts.slice(0, -1).join(' '));
  const aliases = new Set();
  for (const surname of surnames) {
    for (const name of [first, first.split(/\s+/)[0]]) {
      aliases.add(identityKey(`${surname} ${name}`));
      aliases.add(identityKey(`${name} ${surname}`));
    }
  }
  if (person.username) aliases.add(identityKey(person.username));
  return aliases;
}

function filenameKey(value) {
  return folded(value).replace(/[\s_-]+/g, '_');
}

export function auditGroupRepository(expectedEntries, actualEntries, group, options = {}) {
  if (!group?.participants?.length) throw new Error('Selecciona un grupo con participantes.');
  const templates = expectedEntries.filter(entry => entry.perParticipant && entry.required !== false);
  const shared = expectedEntries.filter(entry => !entry.perParticipant);
  const base = auditRepository(shared, actualEntries, options);
  const actual = actualEntries.map(entry => ({ ...entry, path: normalizePath(entry.path) }));
  const identities = group.participants.map(person => ({ person, aliases: aliasesFor(person) }));
  const individuals = identities.map(({ person, aliases }) => ({
    ...person,
    displayName: `${person.firstNames || '(Nombre pendiente)'} ${person.lastNames}`,
    identityComplete: aliases.size > 0,
    documents: []
  }));
  const individualWarnings = [];
  const missing = [...base.missing];
  let correct = 0;
  let pending = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const template of templates) {
    const path = normalizePath(template.path);
    const slash = path.lastIndexOf('/');
    const folder = path.slice(0, slash);
    const suffix = path.slice(slash + 1).replace(/^Apellido_Nombre_/, '');
    const ending = `_${filenameKey(suffix)}`;
    const matches = identities.map(() => []);

    // Match the complete identity and document suffix within the required folder.
    // Ambiguous aliases are never assigned to more than one participant.
    for (const entry of actual) {
      const split = entry.path.lastIndexOf('/');
      if (entry.path.slice(0, split) !== folder) continue;
      const name = filenameKey(entry.path.slice(split + 1));
      if (!name.endsWith(ending)) continue;
      const prefix = identityKey(name.slice(0, -ending.length));
      const owners = identities.flatMap(({ aliases }, index) => aliases.has(prefix) ? [index] : []);
      if (owners.length === 1) {
        matches[owners[0]].push(entry);
      } else {
        individualWarnings.push({
          path: entry.path,
          reason: prefix === 'apellidonombre' ? 'template' : owners.length > 1 ? 'ambiguous' : 'unassigned'
        });
      }
    }

    individuals.forEach((person, index) => {
      const name = `${person.lastNames}_${person.firstNames?.split(/\s+/)[0] || 'NombrePendiente'}`.replace(/\s+/g, '_');
      const expectedPath = `${folder}/${name}_${suffix}`;
      const files = matches[index];
      let status;
      if (!person.identityComplete) { status = 'pending'; pending++; }
      else if (files.length > 1) { status = 'duplicate'; duplicates++; }
      else if (!files.length) {
        status = 'missing';
        missing.push({ path: expectedPath, type: 'file', participantId: person.id, participantName: person.displayName });
      } else if (files[0].type !== 'file' || files[0].size === 0) { status = 'invalid'; invalid++; }
      else { status = 'correct'; correct++; }
      person.documents.push({ path: expectedPath, suffix, status, matches: files.map(file => file.path) });
    });
  }

  const expected = base.summary.expected + templates.length * individuals.length;
  const totalCorrect = base.summary.correct + correct;
  return {
    ...base,
    missing,
    individuals,
    individualWarnings,
    summary: {
      ...base.summary,
      expected,
      correct: totalCorrect,
      missing: missing.length,
      pending,
      duplicates,
      invalid,
      compliance: expected ? Math.round(100 * totalCorrect / expected) : 100
    }
  };
}
