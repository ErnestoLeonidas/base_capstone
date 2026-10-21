import {
  flattenExpectedTree,
  normalizePath
} from './auditor.mjs';
import { auditGroupRepository, findGroupByRepository } from './participants.mjs';

const form = document.querySelector('#audit-form');
const repoUrlInput = document.querySelector('#repo-url');
const submitButton = form.querySelector('button');
const message = document.querySelector('#message');
const report = document.querySelector('#report');
const groupSelect = document.querySelector('#group-id');
const roster = document.querySelector('#roster');

let expectedEntries = [];
let allowedExtraUnder = [];
let groups = [];

setFormDisabled(true);
init();

async function init() {
  try {
    const response = await fetch('index.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('No fue posible cargar index.json.');
    }

    const reference = await response.json();
    expectedEntries = flattenExpectedTree(reference.tree);
    allowedExtraUnder = reference.allowedExtraUnder ?? [];
    groups = reference.groups ?? [];
    if (!groups.length) throw new Error('No hay grupos registrados en la configuración.');
    for (const group of groups) {
      const option = document.createElement('option');
      option.value = String(group.id);
      option.textContent = `Grupo ${group.id} · ${group.participants.length} participantes`;
      groupSelect.append(option);
    }
    setFormDisabled(false);
  } catch (error) {
    showMessage(error.message, true);
    setFormDisabled(true);
  }
}

function selectedGroup() {
  return groups.find(group => String(group.id) === groupSelect.value);
}

function updateRoster() {
  const group = selectedGroup();
  roster.hidden = !group;
  roster.innerHTML = group ? group.participants.map(person =>
    `<li>${escapeHtml(`${person.firstNames || '(Nombre pendiente)'} ${person.lastNames}`)}</li>`
  ).join('') : '';
  report.hidden = true;
  showMessage('');
}

groupSelect.addEventListener('change', () => {
  const group = selectedGroup();
  if (group && (!repoUrlInput.value.trim() || findGroupByRepository(groups, repoUrlInput.value))) {
    repoUrlInput.value = group.repository;
  }
  updateRoster();
});

repoUrlInput.addEventListener('input', () => {
  const group = findGroupByRepository(groups, repoUrlInput.value.trim());
  groupSelect.value = group ? String(group.id) : '';
  updateRoster();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  report.hidden = true;
  report.innerHTML = '';
  showMessage('Revisando repositorio...');
  setFormDisabled(true);

  try {
    const repo = parseGitHubUrl(repoUrlInput.value);
    const group = findGroupByRepository(groups, repoUrlInput.value.trim()) ?? selectedGroup();
    if (!group) throw new Error('Selecciona el grupo correspondiente a este repositorio.');
    groupSelect.value = String(group.id);
    const actualEntries = await fetchRepositoryTree(repo);
    const audit = auditGroupRepository(expectedEntries, actualEntries, group, { allowedExtraUnder });

    renderReport(audit, repo, group);
    showMessage('');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    setFormDisabled(false);
  }
});

function setFormDisabled(disabled) {
  groupSelect.disabled = disabled;
  repoUrlInput.disabled = disabled;
  submitButton.disabled = disabled;
}

function parseGitHubUrl(value) {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Ingresa una URL valida de GitHub.');
  }

  if (url.hostname !== 'github.com' || !['http:', 'https:'].includes(url.protocol)) {
    throw new Error('La URL debe pertenecer a github.com.');
  }

  const [owner, name] = url.pathname.split('/').filter(Boolean);
  if (!owner || !name) {
    throw new Error('La URL debe incluir usuario u organizacion y nombre del repositorio.');
  }

  return {
    owner,
    name: name.replace(/\.git$/i, '')
  };
}

async function fetchRepositoryTree(repo) {
  const repoResponse = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}`);

  if (!repoResponse.ok) {
    throwGitHubError(repoResponse);
  }

  const repoInfo = await repoResponse.json();
  const branch = repoInfo.default_branch;
  const treeResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );

  if (!treeResponse.ok) {
    throwGitHubError(treeResponse);
  }

  const treeInfo = await treeResponse.json();
  if (treeInfo.truncated) {
    throw new Error('GitHub entregó una lista incompleta de archivos. No es posible generar un reporte confiable.');
  }

  return treeInfo.tree
    .filter((entry) => entry.type === 'tree' || entry.type === 'blob')
    .map((entry) => ({
      path: normalizePath(entry.path),
      type: entry.type === 'tree' ? 'directory' : 'file',
      size: entry.size
    }));
}

function throwGitHubError(response) {
  if (response.status === 404) {
    throw new Error('No se encontro el repositorio o no es publico.');
  }

  if (response.status === 403) {
    throw new Error('GitHub rechazo la solicitud. Puede ser limite de API.');
  }

  throw new Error(`GitHub respondio con estado ${response.status}.`);
}

function renderReport(audit, repo, group) {
  const { summary } = audit;
  const needsChanges = summary.missing + summary.typeMismatches + summary.extra + summary.duplicates + summary.invalid > 0;
  const state = needsChanges ? 'Requiere cambios' : summary.pending ? 'Identificación pendiente' : 'Cumple mínimos';

  report.hidden = false;
  report.innerHTML = `
    <header class="report-header">
      <p>Grupo ${group.id} · ${escapeHtml(repo.owner)}/${escapeHtml(repo.name)}</p>
      <strong>${state}</strong>
    </header>
    <div class="summary">
      <span><b>${summary.compliance}%</b> cumplimiento</span>
      <span><b>${summary.missing}</b> faltantes</span>
      <span><b>${summary.extra}</b> extras</span>
      <span><b>${summary.typeMismatches}</b> tipos incorrectos</span>
      <span><b>${summary.duplicates}</b> entregas duplicadas</span>
      <span><b>${summary.invalid}</b> archivos inválidos</span>
      <span><b>${summary.pending}</b> identificaciones pendientes</span>
    </div>
    ${renderIndividuals(audit.individuals)}
    ${renderList('Evidencias y carpetas comunes faltantes', audit.missing.filter(entry => !entry.participantId), 'No hay elementos comunes faltantes.')}
    ${renderList('Tipos incorrectos', audit.typeMismatches.map(({ expected, actual }) => ({
      path: `${expected.path} debe ser ${expected.type}, pero figura como ${actual.type}.`
    })), 'No hay tipos incorrectos.')}
    ${renderList('Fuera de estructura', audit.extra, 'No hay archivos o carpetas fuera de estructura.')}
    ${renderList('Observaciones individuales', audit.individualWarnings.map(entry => ({
      path: `${warningLabels[entry.reason]}: ${entry.path}`
    })), 'No hay archivos individuales sin identificar.')}
  `;
}

const statusLabels = {
  correct: 'Presente', missing: 'Faltante', pending: 'Nombre pendiente',
  duplicate: 'Duplicado', invalid: 'Vacío o tipo incorrecto'
};
const warningLabels = {
  template: 'Plantilla sin personalizar', ambiguous: 'Identidad ambigua', unassigned: 'Participante no identificado'
};

function renderIndividuals(individuals) {
  return `<section class="report-list"><h2>Evidencias por participante</h2>${individuals.map(person => {
    const complete = person.documents.filter(doc => doc.status === 'correct').length;
    return `<details class="participant-report" ${complete < person.documents.length ? 'open' : ''}>
      <summary><span>${escapeHtml(person.displayName)}</span><b>${complete}/${person.documents.length}</b></summary>
      <ul>${person.documents.map(doc => `<li class="document-row">
        <span class="document-status status-${doc.status}">${statusLabels[doc.status]}</span>
        <span>${escapeHtml(doc.path)}${doc.matches.length ? `<small>${doc.matches.map(escapeHtml).join('<br>')}</small>` : ''}</span>
      </li>`).join('')}</ul>
    </details>`;
  }).join('')}</section>`;
}

function renderList(title, entries, emptyMessage) {
  const body = entries.length === 0
    ? `<p class="empty">${emptyMessage}</p>`
    : `<ul>${entries.map((entry) => `<li>${escapeHtml(entry.path)}</li>`).join('')}</ul>`;

  return `
    <section class="report-list">
      <h2>${title}</h2>
      ${body}
    </section>
  `;
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? 'message error' : 'message';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
