import {
  auditRepository,
  flattenExpectedTree,
  normalizePath
} from './structure-audit.js';

const baseStatus = document.querySelector('#base-status');
const baseSummary = document.querySelector('#base-summary');
const form = document.querySelector('#audit-form');
const repoUrlInput = document.querySelector('#repo-url');
const tokenInput = document.querySelector('#github-token');
const message = document.querySelector('#message');
const reportStatus = document.querySelector('#report-status');
const reportSummary = document.querySelector('#report-summary');
const reportSections = document.querySelector('#report-sections');

let expectedEntries = [];
let allowedExtraUnder = [];

init();

async function init() {
  try {
    const response = await fetch('expected-structure.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('No fue posible cargar la estructura base.');
    }

    const reference = await response.json();
    expectedEntries = flattenExpectedTree(reference.tree);
    allowedExtraUnder = reference.allowedExtraUnder ?? [];
    renderBaseStatus();
  } catch (error) {
    setStatus(baseStatus, 'Error', 'bad');
    baseSummary.innerHTML = '';
    showMessage(error.message, true);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage('Revisando repositorio...');
  setStatus(reportStatus, 'Revisando', '');
  reportSummary.innerHTML = '';
  reportSections.innerHTML = '';
  form.querySelector('button').disabled = true;

  try {
    const repo = parseGitHubUrl(repoUrlInput.value);
    const token = tokenInput.value.trim();
    const actualEntries = await fetchRepositoryTree(repo, token);
    const report = auditRepository(expectedEntries, actualEntries, { allowedExtraUnder });

    renderReport(report);
    showMessage(`Revisión completada para ${repo.owner}/${repo.name}.`);
  } catch (error) {
    setStatus(reportStatus, 'Error', 'bad');
    showMessage(error.message, true);
  } finally {
    form.querySelector('button').disabled = false;
  }
});

function renderBaseStatus() {
  const report = auditRepository(expectedEntries, expectedEntries, { allowedExtraUnder });
  renderSummary(baseSummary, report.summary);
  setStatus(baseStatus, 'Referencia lista', 'ok');
}

function renderReport(report) {
  renderSummary(reportSummary, report.summary);
  const statusClass = report.summary.missing === 0 && report.summary.typeMismatches === 0
    ? report.summary.extra === 0 ? 'ok' : 'warn'
    : 'bad';
  const statusText = statusClass === 'ok'
    ? 'Cumple'
    : statusClass === 'warn'
      ? 'Revisar extras'
      : 'Requiere cambios';

  setStatus(reportStatus, statusText, statusClass);
  reportSections.innerHTML = [
    renderList('Faltantes', report.missing, 'No hay elementos faltantes.'),
    renderList('Tipos incorrectos', report.typeMismatches.map(({ expected, actual }) => ({
      path: `${expected.path} debe ser ${expected.type}, pero figura como ${actual.type}.`
    })), 'No hay tipos incorrectos.'),
    renderList('Fuera de estructura', report.extra, 'No hay archivos o carpetas fuera de estructura.'),
    renderList('Correctos', report.correct, 'No hay elementos correctos.')
  ].join('');
}

function renderSummary(container, summary) {
  const metrics = [
    ['Cumplimiento', `${summary.compliance}%`],
    ['Esperados', summary.expected],
    ['Correctos', summary.correct],
    ['Faltantes', summary.missing],
    ['Extras', summary.extra]
  ];

  container.innerHTML = metrics.map(([label, value]) => `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join('');
}

function renderList(title, entries, emptyMessage) {
  const body = entries.length === 0
    ? `<p class="empty-state">${emptyMessage}</p>`
    : `<ul>${entries.map((entry) => `<li>${escapeHtml(entry.path)}</li>`).join('')}</ul>`;

  return `
    <article class="report-list">
      <h3>${title}</h3>
      ${body}
    </article>
  `;
}

function parseGitHubUrl(value) {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Ingresa una URL válida de GitHub.');
  }

  if (url.hostname !== 'github.com') {
    throw new Error('La URL debe pertenecer a github.com.');
  }

  const [owner, name] = url.pathname.split('/').filter(Boolean);
  if (!owner || !name) {
    throw new Error('La URL debe incluir usuario u organización y nombre del repositorio.');
  }

  return {
    owner,
    name: name.replace(/\.git$/, '')
  };
}

async function fetchRepositoryTree(repo, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const repoResponse = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}`, { headers });

  if (!repoResponse.ok) {
    throwGitHubError(repoResponse);
  }

  const repoInfo = await repoResponse.json();
  const branch = repoInfo.default_branch;
  const treeResponse = await fetch(
    `https://api.github.com/repos/${repo.owner}/${repo.name}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers }
  );

  if (!treeResponse.ok) {
    throwGitHubError(treeResponse);
  }

  const treeInfo = await treeResponse.json();
  if (treeInfo.truncated) {
    showMessage('GitHub entregó un árbol truncado; el reporte puede estar incompleto.');
  }

  return treeInfo.tree
    .filter((entry) => entry.type === 'tree' || entry.type === 'blob')
    .map((entry) => ({
      path: normalizePath(entry.path),
      type: entry.type === 'tree' ? 'directory' : 'file'
    }));
}

function throwGitHubError(response) {
  if (response.status === 404) {
    throw new Error('No se encontró el repositorio o requiere un token con permisos.');
  }

  if (response.status === 403) {
    throw new Error('GitHub rechazó la solicitud. Puede ser límite de API o falta de permisos.');
  }

  throw new Error(`GitHub respondió con estado ${response.status}.`);
}

function setStatus(element, text, className) {
  element.textContent = text;
  element.className = `status-pill ${className}`.trim();
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
