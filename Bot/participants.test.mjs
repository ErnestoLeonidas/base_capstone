import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditGroupRepository, findGroupByRepository } from './participants.mjs';
import { flattenExpectedTree } from './auditor.mjs';

const folder = 'Fase 1/Evidencias Individuales';
const suffix = '1.1_APT122_AutoevaluacionCompetenciasFase1.docx';
const expected = [
  { path: `${folder}/Apellido_Nombre_${suffix}`, type: 'file', perParticipant: true },
  { path: 'README.md', type: 'file' }
];
const group = { id: 1, repository: 'https://github.com/ocielescobar/Capstone.OE.ST.git', participants: [
  { id: 1, lastNames: 'ESCOBAR FERRADA', firstNames: 'OCIEL ANDRES', username: 'oci.escobar' },
  { id: 2, lastNames: 'TORRES RIOS', firstNames: 'SEBASTIAN MARCO' }
] };
const file = (name, extra = {}) => ({ path: `${folder}/${name}_${suffix}`, type: 'file', size: 100, ...extra });
const audit = (entries, roster = group) => auditGroupRepository(expected,
  [{ path: 'README.md', type: 'file' }, ...entries], roster, { allowedExtraUnder: [folder] });

test('detects a registered repository despite case, .git and trailing slash', () => {
  assert.equal(findGroupByRepository([group], 'https://github.com/OCIELESCOBAR/capstone.oe.st.git/'), group);
  assert.equal(findGroupByRepository([group], 'https://example.com/ocielescobar/Capstone.OE.ST'), null);
  assert.equal(findGroupByRepository([group], 'https://github.com/other/Capstone.OE.ST'), null);
});

test('requires a separate document for each participant and keeps shared requirements', () => {
  const result = audit([file('Escobar_Ociel')]);
  assert.equal(result.summary.expected, 3);
  assert.equal(result.summary.correct, 2);
  assert.equal(result.summary.missing, 1);
  assert.equal(result.missing[0].participantId, 2);
  assert.equal(result.summary.compliance, 67);
});

test('accepts full names, accents, separators and explicit institutional usernames', () => {
  const result = audit([file('oci.escobar'), file('Tórres-Ríos Sebastián Marco')]);
  assert.equal(result.summary.compliance, 100);
  assert.equal(result.summary.missing, 0);
});

test('blank templates and foreign participants cannot satisfy individual requirements', () => {
  const result = audit([file('Apellido_Nombre'), file('Escobar_Pedro')]);
  assert.equal(result.summary.missing, 2);
  assert.equal(result.individualWarnings.length, 2);
});

test('wrong folders, document kinds and extensions cannot satisfy a requirement', () => {
  const result = audit([
    file('Escobar_Ociel', { path: `Fase 2/Evidencias Individuales/Escobar_Ociel_${suffix}` }),
    file('Torres_Sebastian', { path: `${folder}/Torres_Sebastian_${suffix.replace('.docx', '.pdf')}` }),
    file('Escobar_Ociel', { path: `${folder}/Escobar_Ociel_1.2_APT122_DiarioReflexionFase1.docx` })
  ]);
  assert.equal(result.summary.missing, 2);
});

test('multiple matching names are reported as duplicates instead of double credit', () => {
  const result = audit([file('Escobar_Ociel'), file('Escobar_Ferrada_Ociel_Andres'), file('Torres_Sebastian')]);
  assert.equal(result.summary.duplicates, 1);
  assert.equal(result.summary.correct, 2);
  assert.equal(result.individuals[0].documents[0].status, 'duplicate');
});

test('an empty file or a directory named as a document is invalid', () => {
  const result = audit([file('Escobar_Ociel', { size: 0 }), file('Torres_Sebastian', { type: 'directory' })]);
  assert.equal(result.summary.invalid, 2);
  assert.equal(result.summary.correct, 1);
});

test('missing participant names remain pending and cannot produce 100 percent', () => {
  const result = audit([file('Gamboa')], { id: 9, participants: [{ id: 24, lastNames: 'GAMBOA', firstNames: '' }] });
  assert.equal(result.summary.pending, 1);
  assert.equal(result.summary.compliance, 50);
  assert.equal(result.individuals[0].documents[0].status, 'pending');
});

test('ambiguous aliases cannot credit the same file to two people', () => {
  const result = audit([file('Torres_Sebastian')], { id: 1, participants: [
    { id: 1, lastNames: 'TORRES RIOS', firstNames: 'SEBASTIAN MARCO' },
    { id: 2, lastNames: 'TORRES PEREZ', firstNames: 'SEBASTIAN ANDRES' }
  ] });
  assert.equal(result.summary.correct, 1);
  assert.equal(result.summary.missing, 2);
  assert.equal(result.individualWarnings[0].reason, 'ambiguous');
});

test('compound surnames retain their meaningful surname and reject a particle alone', () => {
  const roster = { id: 7, participants: [{ id: 17, lastNames: 'DE SINIS TUDOR MUTIS', firstNames: 'GIANLUCA' }] };
  assert.equal(audit([file('De_Gianluca')], roster).summary.missing, 1);
  assert.equal(audit([file('De_Sinis_Tudor_Gianluca')], roster).summary.missing, 0);
});

test('the configured roster covers 12 groups and 30 participants with five individual requirements', async () => {
  const reference = JSON.parse(await readFile(new URL('../index.json', import.meta.url), 'utf8'));
  assert.equal(reference.groups.length, 12);
  assert.equal(reference.groups.flatMap(g => g.participants).length, 30);
  assert.equal(new Set(reference.groups.flatMap(g => g.participants.map(p => p.id))).size, 30);
  const entries = flattenExpectedTree(reference.tree);
  assert.equal(entries.filter(entry => entry.perParticipant).length, 5);
  for (const roster of reference.groups) {
    assert.equal(findGroupByRepository(reference.groups, roster.repository), roster);
    const result = auditGroupRepository(entries, [], roster, reference);
    assert.equal(result.summary.expected, 28 + roster.participants.length * 5);
  }
});
