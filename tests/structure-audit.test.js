import test from 'node:test';
import assert from 'node:assert/strict';

import {
  auditRepository,
  flattenExpectedTree,
  normalizePath
} from '../assets/structure-audit.js';

const expectedTree = [
  {
    path: 'Fase 2',
    type: 'directory',
    children: [
      {
        path: 'Evidencias de documentación',
        type: 'directory',
        children: [
          {
            path: '.gitkeep',
            type: 'file',
            gitkeepForEmptyDirectory: true
          }
        ]
      },
      {
        path: 'Evidencias Grupales',
        type: 'directory',
        children: [
          {
            path: 'PLANILLA DE EVALUACIÓN FINAL FASE 2.xlsx',
            type: 'file'
          }
        ]
      }
    ]
  }
];

test('normalizePath keeps evidence names and normalizes separators', () => {
  assert.equal(
    normalizePath(' Fase 2\\Evidencias Grupales\\PLANILLA DE EVALUACIÓN FINAL FASE 2.xlsx '),
    'Fase 2/Evidencias Grupales/PLANILLA DE EVALUACIÓN FINAL FASE 2.xlsx'
  );
});

test('flattenExpectedTree preserves ordered full paths', () => {
  const entries = flattenExpectedTree(expectedTree);

  assert.deepEqual(
    entries.map((entry) => entry.path),
    [
      'Fase 2',
      'Fase 2/Evidencias de documentación',
      'Fase 2/Evidencias de documentación/.gitkeep',
      'Fase 2/Evidencias Grupales',
      'Fase 2/Evidencias Grupales/PLANILLA DE EVALUACIÓN FINAL FASE 2.xlsx'
    ]
  );
});

test('auditRepository reports a complete repository', () => {
  const expected = flattenExpectedTree(expectedTree);
  const actual = expected.map(({ path, type }) => ({ path, type }));

  const report = auditRepository(expected, actual);

  assert.equal(report.summary.missing, 0);
  assert.equal(report.summary.extra, 0);
  assert.equal(report.summary.correct, expected.length);
  assert.equal(report.summary.compliance, 100);
});

test('auditRepository reports missing required entries', () => {
  const expected = flattenExpectedTree(expectedTree);
  const actual = [
    { path: 'Fase 2', type: 'directory' },
    { path: 'Fase 2/Evidencias Grupales', type: 'directory' }
  ];

  const report = auditRepository(expected, actual);

  assert.deepEqual(
    report.missing.map((entry) => entry.path),
    [
      'Fase 2/Evidencias de documentación',
      'Fase 2/Evidencias de documentación/.gitkeep',
      'Fase 2/Evidencias Grupales/PLANILLA DE EVALUACIÓN FINAL FASE 2.xlsx'
    ]
  );
});

test('auditRepository reports entries outside the base structure', () => {
  const expected = flattenExpectedTree(expectedTree);
  const actual = [
    ...expected.map(({ path, type }) => ({ path, type })),
    { path: 'Fase 4', type: 'directory' },
    { path: 'app.js', type: 'file' }
  ];

  const report = auditRepository(expected, actual);

  assert.deepEqual(
    report.extra.map((entry) => entry.path),
    ['Fase 4', 'app.js']
  );
});

test('auditRepository accepts a preserved empty folder when it contains project files', () => {
  const expected = flattenExpectedTree(expectedTree);
  const actual = [
    { path: 'Fase 2', type: 'directory' },
    { path: 'Fase 2/Evidencias de documentación', type: 'directory' },
    { path: 'Fase 2/Evidencias de documentación/Documento avance.pdf', type: 'file' },
    { path: 'Fase 2/Evidencias Grupales', type: 'directory' },
    { path: 'Fase 2/Evidencias Grupales/PLANILLA DE EVALUACIÓN FINAL FASE 2.xlsx', type: 'file' }
  ];

  const report = auditRepository(expected, actual);

  assert.equal(report.missing.some((entry) => entry.path.endsWith('.gitkeep')), false);
});
