'use strict';
/* Gestor Docente: PWA de gestão da carreira docente.
   Dados: IndexedDB no aparelho (funciona offline) + arquivo JSON no Google Drive (sincronização).
   Escopo do Google: drive.file (o app só enxerga arquivos e pastas que ele mesmo criou). */

const APP_VERSION = '1.1.0';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const ROOT_NAME = 'Gestor Docente';
const DATA_NAME = 'gestor-docente-dados.json';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const EIXOS = ['Ensino', 'Pesquisa', 'Extensão', 'Gestão', 'Orientação', 'Bancas e pareceres', 'Palestras e eventos', 'Funcional'];
const PASTAS = {
  'Ensino': '01 Ensino',
  'Pesquisa': '02 Pesquisa',
  'Extensão': '03 Extensão',
  'Gestão': '04 Gestão e representação',
  'Orientação': '05 Orientações',
  'Bancas e pareceres': '06 Bancas e pareceres',
  'Palestras e eventos': '07 Palestras e eventos',
  'Funcional': '09 Documentos funcionais'
};
const PASTA_DOSSIE = '08 Dossiê de progressão';
const CATEGORIAS = {
  'Ensino': ['Disciplina na graduação', 'Disciplina na pós-graduação', 'Orientação de estágio', 'Monitoria', 'Material didático', 'Plano de ensino'],
  'Pesquisa': ['Artigo publicado', 'Artigo submetido', 'Capítulo de livro', 'Livro', 'Projeto de pesquisa', 'Grupo de pesquisa', 'Trabalho em evento', 'Proposta a edital'],
  'Extensão': ['Projeto de extensão', 'Curso de extensão', 'Ação de extensão', 'Evento organizado', 'Coordenação de programa'],
  'Gestão': ['Comissão', 'Coordenação', 'Representação em colegiado', 'Portaria de designação', 'Câmara ou conselho'],
  'Orientação': ['Mestrado', 'Doutorado', 'Iniciação científica', 'Trabalho de conclusão de curso', 'Pós-doutorado', 'Coorientação'],
  'Bancas e pareceres': ['Banca de mestrado', 'Banca de doutorado', 'Banca de qualificação', 'Banca de TCC', 'Banca de concurso', 'Parecer para periódico', 'Parecer de projeto', 'Parecer de extensão'],
  'Palestras e eventos': ['Palestra proferida', 'Mesa-redonda', 'Minicurso ministrado', 'Oficina ministrada', 'Participação em evento', 'Comissão científica de evento'],
  'Funcional': ['Portaria', 'Título acadêmico', 'Avaliação de desempenho', 'Progressão', 'Estágio probatório']
};
const COLS = ['atividades', 'orientandos', 'projetos', 'producao', 'metas'];

const SCHEMAS = {
  atividades: {
    titulo: 'Atividades', novo: 'Registrar atividade', editar: 'Editar atividade',
    fields: [
      { k: 'descricao', label: 'O que foi feito', type: 'textarea', req: true, ph: 'Ex.: Banca de qualificação de mestrado de Fulana, PPGECM/UFPE' },
      { k: 'eixo', label: 'Eixo', type: 'select', options: EIXOS, req: true },
      { k: 'categoria', label: 'Categoria', type: 'text', list: 'dl-categoria', hint: 'Escolha uma sugestão ou escreva outra.' },
      { k: 'data', label: 'Data de início', type: 'date', req: true, half: true },
      { k: 'dataFim', label: 'Data de término', type: 'date', half: true },
      { k: 'emAndamento', label: 'Em andamento (ainda sem data de término)', type: 'checkbox' },
      { k: 'local', label: 'Instituição, programa ou evento', type: 'text' },
      { k: 'papel', label: 'Seu papel', type: 'text', ph: 'Coordenador, membro, orientador, palestrante...', half: true },
      { k: 'cargaHoraria', label: 'Carga horária (h)', type: 'number', half: true },
      { k: 'comprovanteStatus', label: 'Comprovante', type: 'select', options: ['Pendente', 'Arquivado', 'Não se aplica'], def: 'Pendente', half: true },
      { k: 'lattes', label: 'Já está no Lattes', type: 'checkbox' },
      { k: 'obs', label: 'Observações', type: 'textarea' }
    ]
  },
  orientandos: {
    titulo: 'Orientandos', novo: 'Novo orientando', editar: 'Editar orientando',
    fields: [
      { k: 'nome', label: 'Nome', type: 'text', req: true },
      { k: 'nivel', label: 'Nível', type: 'select', options: ['Mestrado', 'Doutorado', 'Iniciação científica', 'Trabalho de conclusão de curso', 'Pós-doutorado', 'Coorientação'], req: true, half: true },
      { k: 'programa', label: 'Programa ou curso', type: 'text', half: true },
      { k: 'tema', label: 'Tema ou título provisório', type: 'text' },
      { k: 'ingresso', label: 'Ingresso', type: 'date', half: true },
      { k: 'fase', label: 'Fase atual', type: 'select', options: ['Disciplinas', 'Projeto', 'Qualificação', 'Produção de dados', 'Escrita', 'Defesa marcada', 'Concluído'], half: true },
      { k: 'proximoMarco', label: 'Próximo marco', type: 'text', ph: 'Ex.: entregar texto de qualificação' },
      { k: 'prazoMarco', label: 'Prazo do marco', type: 'date', half: true },
      { k: 'prazoDefesa', label: 'Prazo final de defesa', type: 'date', half: true },
      { k: 'situacao', label: 'Situação', type: 'select', options: ['Ativo', 'Concluído', 'Desligado'], def: 'Ativo' },
      { k: 'obs', label: 'Observações', type: 'textarea' }
    ]
  },
  projetos: {
    titulo: 'Projetos e vínculos', novo: 'Novo projeto ou vínculo', editar: 'Editar projeto ou vínculo',
    fields: [
      { k: 'nome', label: 'Nome', type: 'text', req: true },
      { k: 'tipo', label: 'Tipo', type: 'select', options: ['Pesquisa', 'Extensão', 'Ensino', 'Gestão', 'Grupo de pesquisa', 'Vínculo com programa'], req: true, half: true },
      { k: 'papel', label: 'Seu papel', type: 'text', half: true },
      { k: 'financiamento', label: 'Financiamento ou edital', type: 'text' },
      { k: 'inicio', label: 'Início', type: 'date', half: true },
      { k: 'fim', label: 'Término', type: 'date', half: true },
      { k: 'situacao', label: 'Situação', type: 'select', options: ['Proposta', 'Em andamento', 'Concluído', 'Suspenso'], def: 'Em andamento' },
      { k: 'obs', label: 'Observações', type: 'textarea' }
    ]
  },
  producao: {
    titulo: 'Produção bibliográfica', novo: 'Nova produção', editar: 'Editar produção',
    fields: [
      { k: 'titulo', label: 'Título', type: 'textarea', req: true },
      { k: 'tipo', label: 'Tipo', type: 'select', options: ['Artigo', 'Capítulo de livro', 'Livro', 'Trabalho completo em evento', 'Produto educacional', 'Outro'], req: true, half: true },
      { k: 'ano', label: 'Ano', type: 'number', half: true },
      { k: 'veiculo', label: 'Periódico, editora ou evento', type: 'text' },
      { k: 'situacao', label: 'Situação', type: 'select', options: ['Em elaboração', 'Submetido', 'Em avaliação', 'Em correção', 'Aceito', 'Publicado', 'Recusado'], def: 'Em elaboração', half: true },
      { k: 'dataSituacao', label: 'Data da situação', type: 'date', half: true, hint: 'Ex.: data da submissão. Serve para avisar quando a revista demora a responder.' },
      { k: 'doi', label: 'DOI ou link', type: 'text' },
      { k: 'lattes', label: 'Já está no Lattes', type: 'checkbox' },
      { k: 'obs', label: 'Observações', type: 'textarea' }
    ]
  },
  metas: {
    titulo: 'Metas', novo: 'Nova meta', editar: 'Editar meta',
    fields: [
      { k: 'meta', label: 'Meta', type: 'textarea', req: true },
      { k: 'eixo', label: 'Eixo', type: 'select', options: EIXOS.concat(['Carreira']), half: true },
      { k: 'prazo', label: 'Prazo', type: 'date', half: true },
      { k: 'situacao', label: 'Situação', type: 'select', options: ['Aberta', 'Em andamento', 'Concluída'], def: 'Aberta' },
      { k: 'obs', label: 'Observações', type: 'textarea' }
    ]
  }
};

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const now = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function fmtDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString('pt-BR') : '';
}
function fmtMonth(d) { return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''); }
function today() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function daysUntil(s) { const d = parseDate(s); return d ? Math.round((d - today()) / 86400000) : null; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function isoDay(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function live(col) { return (S[col] || []).filter(r => !r.del); }
function toast(msg, ms = 3200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- Armazenamento local (IndexedDB, com localStorage de reserva) ---------- */
const store = (() => {
  let dbp = null;
  function open() {
    if (!dbp) dbp = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('gestor-docente', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return dbp;
  }
  async function get(k) {
    try {
      const db = await open();
      return await new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    } catch (e) {
      try { const v = localStorage.getItem('gd-' + k); return v ? JSON.parse(v) : undefined; } catch (_) { return undefined; }
    }
  }
  async function set(k, v) {
    try {
      const db = await open();
      await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    } catch (e) {
      try { localStorage.setItem('gd-' + k, JSON.stringify(v)); } catch (_) { toast('Não consegui salvar neste aparelho. Exporte um backup.'); }
    }
  }
  return { get, set };
})();

/* ---------- Estado ---------- */
let S = null; // dados sincronizados
let L = { clientId: '', rootId: '', dataFileId: '', folders: {}, lastSync: null, dirty: false, connected: false }; // só deste aparelho
let changeSeq = 0;

function seed() {
  // Nenhum dado pessoal fica no código, que é público. Os dados chegam pela sincronização com o Drive ou por "Restaurar backup".
  return {
    schema: 1,
    config: { inicioIntersticio: '2025-08-01', duracaoMeses: 24, upd: '2000-01-01T00:00:00.000Z' },
    atividades: [], orientandos: [], projetos: [], producao: [], metas: []
  };
}

async function load() {
  S = await store.get('state');
  const loc = await store.get('local');
  if (loc) L = Object.assign(L, loc);
  if (!S || !S.schema) { S = seed(); await store.set('state', S); }
  for (const c of COLS) if (!Array.isArray(S[c])) S[c] = [];
  if (!S.config) S.config = { inicioIntersticio: '2025-08-01', duracaoMeses: 24, upd: now() };
}
async function saveLocal() { await store.set('local', L); }
async function commit(msg) {
  changeSeq++;
  L.dirty = true;
  await store.set('state', S);
  await saveLocal();
  render();
  if (msg) toast(msg);
  scheduleSync();
}

function upsert(col, rec) {
  rec.upd = now();
  const i = S[col].findIndex(r => r.id === rec.id);
  if (i >= 0) S[col][i] = rec; else S[col].push(rec);
}
function removeRec(col, id) {
  const i = S[col].findIndex(r => r.id === id);
  if (i >= 0) S[col][i] = { id, del: true, upd: now() };
}

/* ---------- Google: login e Drive ---------- */
let tokenClient = null, token = null, tokenExp = 0, pending = null, syncing = false, syncTimer = null;
const hasToken = () => !!token && Date.now() < tokenExp;
const gisReady = () => !!(window.google && google.accounts && google.accounts.oauth2);
window.__gisLoaded = () => { updateSyncUI(); };

function initTokenClient() {
  if (!L.clientId || !gisReady()) return false;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: L.clientId,
    scope: SCOPE,
    callback: (r) => {
      const p = pending; pending = null;
      if (!p) return;
      if (r.error) { p.rej(new Error(r.error)); return; }
      token = r.access_token;
      tokenExp = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
      L.connected = true; saveLocal();
      p.res(token);
    },
    error_callback: (e) => { const p = pending; pending = null; if (p) p.rej(new Error(e && e.type ? e.type : 'popup')); }
  });
  return true;
}
function requestToken() {
  return new Promise((res, rej) => {
    if (!tokenClient && !initTokenClient()) {
      rej(new Error(gisReady() ? 'noclient' : 'nogis'));
      return;
    }
    pending = { res, rej };
    tokenClient.requestAccessToken({ prompt: L.connected ? '' : 'consent' });
  });
}
function signOut() {
  if (token && gisReady()) { try { google.accounts.oauth2.revoke(token, () => {}); } catch (_) {} }
  token = null; tokenExp = 0; L.connected = false; saveLocal(); updateSyncUI(); render();
}

async function api(url, opts = {}) {
  const headers = Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + token });
  const res = await fetch(url, Object.assign({}, opts, { headers }));
  if (res.status === 401) { token = null; tokenExp = 0; const e = new Error('auth'); e.status = 401; throw e; }
  if (!res.ok) { const e = new Error('http ' + res.status + ' ' + (await res.text()).slice(0, 200)); e.status = res.status; throw e; }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const txt = await res.text();
  try { return JSON.parse(txt); } catch (_) { return txt; }
}
const qEsc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function findOne(q) {
  const r = await api(DRIVE + '/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=5&spaces=drive');
  return (r.files && r.files[0]) || null;
}
async function createFolder(name, parent) {
  return api(DRIVE + '/files?fields=id', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parent] })
  });
}
async function ensureRoot() {
  if (L.rootId) {
    try {
      const f = await api(DRIVE + '/files/' + L.rootId + '?fields=id,trashed');
      if (!f.trashed) return L.rootId;
    } catch (e) { if (e.status !== 404) throw e; }
    L.rootId = ''; L.folders = {}; L.dataFileId = '';
  }
  const f = await findOne(`name='${qEsc(ROOT_NAME)}' and mimeType='${FOLDER_MIME}' and trashed=false`);
  L.rootId = f ? f.id : (await createFolder(ROOT_NAME, 'root')).id;
  await saveLocal();
  return L.rootId;
}
async function ensureFolder(name) {
  await ensureRoot();
  if (L.folders[name]) return L.folders[name];
  const f = await findOne(`name='${qEsc(name)}' and '${L.rootId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`);
  L.folders[name] = f ? f.id : (await createFolder(name, L.rootId)).id;
  await saveLocal();
  return L.folders[name];
}
async function multipartUpload(meta, blob, contentType) {
  const b = 'gd' + Math.random().toString(36).slice(2);
  const body = new Blob([
    `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${contentType}\r\n\r\n`,
    blob,
    `\r\n--${b}--`
  ]);
  return api(UPLOAD + '/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body
  });
}

function merge(a, b) {
  const out = { schema: 1 };
  for (const c of COLS) {
    const m = new Map();
    for (const r of (a[c] || [])) m.set(r.id, r);
    for (const r of (b[c] || [])) {
      const x = m.get(r.id);
      if (!x || (r.upd || '') > (x.upd || '')) m.set(r.id, r);
    }
    out[c] = [...m.values()];
  }
  const ca = a.config || {}, cb = b.config || {};
  out.config = (cb.upd || '') > (ca.upd || '') ? cb : ca;
  return out;
}

async function connect() {
  if (!L.clientId) { location.hash = 'config'; toast('Cole o ID do cliente OAuth para ativar o Google Drive.'); return false; }
  if (!navigator.onLine) { toast('Sem internet. Os dados ficam salvos neste aparelho.'); return false; }
  try { await requestToken(); return true; }
  catch (e) {
    const m = e.message;
    if (m === 'nogis') toast('O login do Google não carregou. Verifique a internet e recarregue.');
    else if (m === 'popup_closed' || m === 'popup') toast('Login cancelado.');
    else if (m === 'popup_failed_to_open') toast('O navegador bloqueou a janela de login. Libere pop-ups para este site.');
    else toast('Não foi possível entrar: ' + m);
    setStatus('error');
    return false;
  }
}

async function syncNow(interactive) {
  if (syncing) return;
  if (!navigator.onLine) { setStatus(L.dirty ? 'pending' : 'offline'); return; }
  if (!hasToken()) {
    if (!interactive) { setStatus(L.dirty ? 'pending' : 'idle'); return; }
    if (!(await connect())) return;
  }
  syncing = true; setStatus('syncing');
  const seqAtStart = changeSeq;
  try {
    await ensureRoot();
    if (!L.dataFileId) {
      const f = await findOne(`name='${qEsc(DATA_NAME)}' and '${L.rootId}' in parents and trashed=false`);
      if (f) L.dataFileId = f.id;
    }
    let remote = null;
    if (L.dataFileId) {
      try { remote = await api(DRIVE + '/files/' + L.dataFileId + '?alt=media'); }
      catch (e) { if (e.status === 404) L.dataFileId = ''; else throw e; }
    }
    if (remote && typeof remote === 'object' && remote.schema) S = merge(S, remote);
    const body = JSON.stringify(S);
    if (L.dataFileId) {
      await api(UPLOAD + '/files/' + L.dataFileId + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
    } else {
      const r = await multipartUpload({ name: DATA_NAME, parents: [L.rootId], mimeType: 'application/json' }, new Blob([body], { type: 'application/json' }), 'application/json');
      L.dataFileId = r.id;
    }
    L.dirty = changeSeq !== seqAtStart;
    L.lastSync = now();
    await store.set('state', S);
    await saveLocal();
    setStatus(L.dirty ? 'pending' : 'ok');
    render();
    if (interactive) toast('Sincronizado com o Google Drive.');
    if (L.dirty) scheduleSync();
  } catch (e) {
    if (e.status === 401) { setStatus('pending'); if (interactive) toast('A sessão do Google expirou. Toque em sincronizar de novo.'); }
    else { setStatus('error'); toast('Falha ao sincronizar. Os dados continuam salvos aqui. (' + e.message.slice(0, 80) + ')', 5000); }
  } finally { syncing = false; }
}
function scheduleSync() {
  clearTimeout(syncTimer);
  if (hasToken() && navigator.onLine) syncTimer = setTimeout(() => syncNow(false), 2000);
  else setStatus('pending');
}

let syncState = 'idle';
function setStatus(s) { syncState = s; updateSyncUI(); }
function updateSyncUI() {
  const dot = $('#syncDot'), lab = $('#syncLabel');
  if (!dot) return;
  let cls = '', txt = 'Local';
  if (!L.clientId) { txt = 'Só neste aparelho'; }
  else if (syncState === 'syncing') { cls = 'syncing'; txt = 'Sincronizando'; }
  else if (syncState === 'error') { cls = 'error'; txt = 'Erro: tocar p/ tentar'; }
  else if (!navigator.onLine) { cls = L.dirty ? 'pending' : ''; txt = 'Offline'; }
  else if (L.dirty) { cls = 'pending'; txt = 'Sincronizar'; }
  else if (L.lastSync) { cls = 'ok'; txt = 'Em dia'; }
  else { txt = 'Conectar Drive'; }
  dot.className = 'dot ' + cls; lab.textContent = txt;
}

/* ---------- Comprovantes ---------- */
let anexarId = null;
async function startAnexar(id) {
  if (!navigator.onLine) { toast('Para enviar comprovantes é preciso internet.'); return; }
  if (!hasToken()) {
    const ok = await connect();
    if (ok) toast('Conectado ao Google. Toque em "Anexar comprovante" de novo.');
    return;
  }
  anexarId = id;
  const inp = $('#fileComprovante'); inp.value = ''; inp.click();
}
async function uploadComprovante(file) {
  const rec = S.atividades.find(r => r.id === anexarId);
  if (!rec || !file) return;
  if (file.size > 25 * 1024 * 1024) { toast('Arquivo acima de 25 MB. Reduza e tente de novo.'); return; }
  toast('Enviando comprovante...', 10000);
  try {
    const folder = await ensureFolder(PASTAS[rec.eixo] || '00 Outros');
    const ext = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0];
    const nome = `${rec.data || 'sem-data'} ${rec.categoria || rec.eixo} ${String(rec.descricao).slice(0, 60)}`.replace(/[\\/:*?"<>|]/g, '-').trim() + ext;
    const r = await multipartUpload({ name: nome, parents: [folder] }, file, file.type || 'application/octet-stream');
    const novo = Object.assign({}, rec, { comprovanteStatus: 'Arquivado', comprovanteId: r.id, comprovanteLink: r.webViewLink || '', comprovanteNome: r.name || nome });
    upsert('atividades', novo);
    await commit('Comprovante salvo em "' + (PASTAS[rec.eixo] || 'Outros') + '".');
  } catch (e) {
    if (e.status === 404) { L.folders = {}; await saveLocal(); }
    toast(e.status === 401 ? 'A sessão do Google expirou. Toque em anexar de novo.' : 'O envio falhou. Tente de novo. (' + e.message.slice(0, 60) + ')', 5000);
  } finally { anexarId = null; }
}

/* ---------- Cálculos ---------- */
function intersticio() {
  const ini = parseDate(S.config.inicioIntersticio) || parseDate('2025-08-01');
  const meses = Number(S.config.duracaoMeses) || 24;
  const fim = addMonths(ini, meses);
  const total = fim - ini, dec = Math.min(Math.max(today() - ini, 0), total);
  return { ini, fim, meses, pct: Math.round((dec / total) * 100), restamDias: Math.max(0, Math.round((fim - today()) / 86400000)) };
}
function noPeriodo(r, ini, fim) {
  const d = parseDate(r.data); if (!d) return false;
  const f = r.emAndamento ? today() : (parseDate(r.dataFim) || d);
  return f >= ini && d < fim;
}
function alertas() {
  const out = [];
  for (const a of live('atividades')) {
    if (a.comprovanteStatus === 'Pendente') out.push({ nivel: 'warn', ord: 2, txt: 'Comprovante pendente', sub: a.descricao, col: 'atividades', id: a.id });
  }
  for (const o of live('orientandos')) {
    if (o.situacao !== 'Ativo') continue;
    const d = daysUntil(o.prazoMarco);
    if (d !== null && d <= 45) out.push({ nivel: d < 0 ? 'crit' : 'warn', ord: d < 0 ? 0 : 1, txt: `${o.nome}: ${o.proximoMarco || 'próximo marco'}`, sub: d < 0 ? `Venceu há ${-d} dias` : `Em ${d} dias (${fmtDate(o.prazoMarco)})`, col: 'orientandos', id: o.id });
    if (!o.prazoMarco && !o.prazoDefesa) out.push({ nivel: 'info', ord: 3, txt: `${o.nome}: sem prazos cadastrados`, sub: 'Complete o próximo marco e o prazo de defesa.', col: 'orientandos', id: o.id });
  }
  for (const m of live('metas')) {
    if (m.situacao === 'Concluída') continue;
    const d = daysUntil(m.prazo);
    if (d !== null && d <= 60) out.push({ nivel: d < 0 ? 'crit' : 'warn', ord: d < 0 ? 0 : 1, txt: m.meta, sub: d < 0 ? `Prazo venceu há ${-d} dias` : `Prazo em ${d} dias`, col: 'metas', id: m.id });
  }
  for (const p of live('producao')) {
    if (!['Submetido', 'Em avaliação'].includes(p.situacao)) continue;
    const d = daysUntil(p.dataSituacao);
    if (d !== null && d <= -90) out.push({ nivel: 'info', ord: 2, txt: `Sem resposta há ${-d} dias`, sub: p.titulo, col: 'producao', id: p.id });
  }
  return out.sort((a, b) => a.ord - b.ord);
}

/* ---------- Renderização ---------- */
const VIEWS = ['inicio', 'atividades', 'orientandos', 'dossie', 'mais', 'projetos', 'producao', 'metas', 'config'];
const TAB_OF = { projetos: 'mais', producao: 'mais', metas: 'mais', config: 'mais' };
let filtro = { q: '', eixo: '', modo: 'todas' };
let dossiePeriodo = null;

function currentView() { const h = location.hash.replace('#', ''); return VIEWS.includes(h) ? h : 'inicio'; }
function render() {
  if (!S) return;
  const v = currentView();
  const tab = TAB_OF[v] || v;
  document.querySelectorAll('.tabbar a').forEach(a => a.setAttribute('aria-current', a.dataset.tab === tab ? 'page' : 'false'));
  const fab = $('#fab');
  fab.hidden = !['inicio', 'atividades', 'orientandos', 'projetos', 'producao', 'metas'].includes(v);
  fab.dataset.col = ['orientandos', 'projetos', 'producao', 'metas'].includes(v) ? v : 'atividades';
  fab.setAttribute('aria-label', SCHEMAS[fab.dataset.col].novo);
  const html = ({ inicio: vInicio, atividades: vAtividades, orientandos: () => vLista('orientandos'), dossie: vDossie, mais: vMais, projetos: () => vLista('projetos'), producao: () => vLista('producao'), metas: () => vLista('metas'), config: vConfig })[v]();
  $('#view').innerHTML = html;
  updateSyncUI();
}

function tagStatus(s) {
  const map = { 'Pendente': 'warn', 'Arquivado': 'ok', 'Não se aplica': 'plain', 'Ativo': 'ok', 'Concluído': 'plain', 'Concluída': 'plain', 'Desligado': 'plain', 'Em andamento': 'ok', 'Proposta': 'warn', 'Suspenso': 'crit', 'Aberta': 'warn', 'Publicado': 'ok', 'Aceito': 'ok', 'Recusado': 'crit', 'Submetido': 'warn', 'Em avaliação': 'warn', 'Em correção': 'warn', 'Em elaboração': 'plain' };
  return s ? `<span class="tag ${map[s] || 'plain'}">${esc(s)}</span>` : '';
}

function vInicio() {
  const at = live('atividades');
  const pend = at.filter(a => a.comprovanteStatus === 'Pendente').length;
  const foraLattes = at.filter(a => !a.lattes).length + live('producao').filter(p => !p.lattes && ['Publicado', 'Aceito'].includes(p.situacao)).length;
  const ativos = live('orientandos').filter(o => o.situacao === 'Ativo');
  const metasAbertas = live('metas').filter(m => m.situacao !== 'Concluída').length;
  const it = intersticio();
  const noInt = at.filter(a => noPeriodo(a, it.ini, it.fim));
  const porEixo = EIXOS.map(e => [e, noInt.filter(a => a.eixo === e).length]);
  const max = Math.max(1, ...porEixo.map(x => x[1]));
  const al = alertas().slice(0, 7);
  const recentes = at.slice().sort((a, b) => (b.data || '').localeCompare(a.data || '')).slice(0, 4);
  const vazio = !COLS.some(c => live(c).length);
  const boasVindas = vazio ? `<section class="panel"><h2>Comece por aqui</h2><p class="small">Ainda não há dados neste aparelho. Se você já usa o app em outro aparelho, conecte o Google Drive. Se recebeu um arquivo de dados ou backup, restaure-o.</p><div class="actions" style="display:flex;flex-wrap:wrap;gap:8px"><button class="btn primary" type="button" data-act="importar">Restaurar arquivo de dados</button><a class="btn" href="#config">Conectar Google Drive</a></div></section>` : '';
  return `
  <div class="view-head"><h1>Painel da carreira</h1><p>${esc(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div>
  <div class="tiles">
    <a class="tile ${pend ? 'warn' : 'ok'}" href="#atividades" data-filtro="pendentes"><span class="n">${pend}</span><span class="l">comprovantes pendentes</span></a>
    <a class="tile ${foraLattes ? 'warn' : 'ok'}" href="#atividades" data-filtro="lattes"><span class="n">${foraLattes}</span><span class="l">itens fora do Lattes</span></a>
    <a class="tile" href="#orientandos"><span class="n">${ativos.length}</span><span class="l">orientandos ativos</span></a>
    <a class="tile" href="#metas"><span class="n">${metasAbertas}</span><span class="l">metas abertas</span></a>
  </div>
  ${boasVindas}
  <section class="panel">
    <div class="panel-head"><h2>Interstício atual</h2><span class="muted small">${esc(fmtMonth(it.ini))} a ${esc(fmtMonth(it.fim))}</span></div>
    <div class="progress" role="progressbar" aria-valuenow="${it.pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${it.pct}%"></span></div>
    <p class="small muted">${it.pct}% decorrido. Faltam ${it.restamDias} dias. ${noInt.length} atividades registradas no período.</p>
    <div class="bars">${porEixo.map(([e, n]) => `<div class="bar-row"><span>${esc(e)}</span><span class="track"><span style="width:${Math.round(n / max * 100)}%"></span></span><span class="v">${n}</span></div>`).join('')}</div>
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Precisa de atenção</h2><span class="muted small">${alertas().length} itens</span></div>
    ${al.length ? `<ul class="alerts">${al.map(x => `<li><span class="stripe ${x.nivel === 'crit' ? 'crit' : x.nivel === 'info' ? 'info' : ''}"></span><button type="button" data-act="editar" data-col="${x.col}" data-id="${esc(x.id)}"><strong>${esc(x.txt)}</strong><span class="small muted">${esc(x.sub)}</span></button></li>`).join('')}</ul>` : '<p class="muted">Nada pendente. Bom momento para atualizar o Lattes.</p>'}
  </section>
  <section class="panel">
    <div class="panel-head"><h2>Registros recentes</h2><a class="small" href="#atividades">Ver todos</a></div>
    <div class="list">${recentes.map(cardAtividade).join('') || '<p class="muted">Nenhuma atividade ainda.</p>'}</div>
  </section>`;
}

function periodoTxt(a) {
  if (a.emAndamento) return 'Desde ' + fmtDate(a.data) + ' (em andamento)';
  return fmtDate(a.data) + (a.dataFim ? ' a ' + fmtDate(a.dataFim) : '');
}
function cardAtividade(a) {
  const periodo = periodoTxt(a);
  const sub = [periodo, a.papel, a.local, a.cargaHoraria ? a.cargaHoraria + ' h' : ''].filter(Boolean).map(esc).join(' · ');
  return `<article class="card">
    <div class="row"><span class="title">${esc(a.descricao)}</span></div>
    <span class="sub">${sub}</span>
    <div class="tags"><span class="tag">${esc(a.eixo)}</span>${a.categoria ? `<span class="tag plain">${esc(a.categoria)}</span>` : ''}${tagStatus(a.comprovanteStatus)}${a.lattes ? '<span class="tag ok">No Lattes</span>' : '<span class="tag warn">Fora do Lattes</span>'}</div>
    <div class="actions">
      <button class="btn small" type="button" data-act="editar" data-col="atividades" data-id="${esc(a.id)}">Editar</button>
      ${a.comprovanteLink ? `<a class="btn small" href="${esc(a.comprovanteLink)}" target="_blank" rel="noopener">Ver comprovante</a>` : ''}
      ${a.comprovanteStatus !== 'Não se aplica' ? `<button class="btn small" type="button" data-act="anexar" data-id="${esc(a.id)}">${a.comprovanteLink ? 'Trocar comprovante' : 'Anexar comprovante'}</button>` : ''}
      ${!a.lattes ? `<button class="btn small ghost" type="button" data-act="lattes" data-id="${esc(a.id)}">Marcar como no Lattes</button>` : ''}
    </div>
  </article>`;
}

function vAtividades() {
  let at = live('atividades').sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const q = filtro.q.trim().toLowerCase();
  if (q) at = at.filter(a => [a.descricao, a.local, a.papel, a.categoria, a.obs].join(' ').toLowerCase().includes(q));
  if (filtro.eixo) at = at.filter(a => a.eixo === filtro.eixo);
  if (filtro.modo === 'pendentes') at = at.filter(a => a.comprovanteStatus === 'Pendente');
  if (filtro.modo === 'lattes') at = at.filter(a => !a.lattes);
  const modos = [['todas', 'Todas'], ['pendentes', 'Sem comprovante'], ['lattes', 'Fora do Lattes']];
  return `
  <div class="view-head"><h1>Atividades</h1><p>${live('atividades').length} registros. Toque no + para registrar.</p></div>
  <div class="toolbar">
    <input type="search" id="fBusca" placeholder="Buscar" value="${esc(filtro.q)}" aria-label="Buscar atividades">
    <select id="fEixo" aria-label="Filtrar por eixo"><option value="">Todos os eixos</option>${EIXOS.map(e => `<option ${filtro.eixo === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select>
  </div>
  <div class="chips">${modos.map(([k, l]) => `<button type="button" class="chip-btn" data-act="modo" data-modo="${k}" aria-pressed="${filtro.modo === k}">${l}</button>`).join('')}</div>
  <div class="list" id="listaAtividades">${at.map(cardAtividade).join('') || '<div class="empty">Nenhuma atividade encontrada.</div>'}</div>`;
}

const CARDS = {
  orientandos: o => ({
    title: o.nome,
    sub: [o.nivel, o.programa, o.tema].filter(Boolean).join(' · '),
    extra: o.proximoMarco || o.prazoMarco ? `Próximo marco: ${o.proximoMarco || 'sem descrição'}${o.prazoMarco ? ' até ' + fmtDate(o.prazoMarco) : ''}` : 'Sem próximo marco cadastrado',
    tags: [tagStatus(o.situacao), o.fase ? `<span class="tag plain">${esc(o.fase)}</span>` : '', o.prazoDefesa ? `<span class="tag plain">Defesa até ${esc(fmtDate(o.prazoDefesa))}</span>` : '']
  }),
  projetos: p => ({
    title: p.nome,
    sub: [p.papel, p.financiamento].filter(Boolean).join(' · '),
    extra: p.inicio || p.fim ? `${fmtDate(p.inicio) || '?'} a ${fmtDate(p.fim) || 'atual'}` : '',
    tags: [`<span class="tag">${esc(p.tipo)}</span>`, tagStatus(p.situacao)]
  }),
  producao: p => ({
    title: p.titulo,
    sub: [p.tipo, p.veiculo, p.ano].filter(Boolean).join(' · '),
    extra: p.dataSituacao ? `${p.situacao} em ${fmtDate(p.dataSituacao)}` : '',
    tags: [tagStatus(p.situacao), ['Publicado', 'Aceito'].includes(p.situacao) ? (p.lattes ? '<span class="tag ok">No Lattes</span>' : '<span class="tag warn">Fora do Lattes</span>') : '']
  }),
  metas: m => {
    const d = daysUntil(m.prazo);
    return {
      title: m.meta,
      sub: [m.eixo, m.prazo ? 'Prazo: ' + fmtDate(m.prazo) : ''].filter(Boolean).join(' · '),
      extra: '',
      tags: [tagStatus(m.situacao), d !== null && d < 0 && m.situacao !== 'Concluída' ? '<span class="tag crit">Vencida</span>' : '']
    };
  }
};
const ORDEM = {
  orientandos: (a, b) => (a.situacao === 'Ativo' ? 0 : 1) - (b.situacao === 'Ativo' ? 0 : 1) || (a.prazoMarco || '9999').localeCompare(b.prazoMarco || '9999'),
  projetos: (a, b) => ['Em andamento', 'Proposta', 'Suspenso', 'Concluído'].indexOf(a.situacao) - ['Em andamento', 'Proposta', 'Suspenso', 'Concluído'].indexOf(b.situacao),
  producao: (a, b) => ['Em correção', 'Em avaliação', 'Submetido', 'Aceito', 'Em elaboração', 'Publicado', 'Recusado'].indexOf(a.situacao) - ['Em correção', 'Em avaliação', 'Submetido', 'Aceito', 'Em elaboração', 'Publicado', 'Recusado'].indexOf(b.situacao),
  metas: (a, b) => (a.situacao === 'Concluída' ? 1 : 0) - (b.situacao === 'Concluída' ? 1 : 0) || (a.prazo || '9999').localeCompare(b.prazo || '9999')
};
const INTRO = {
  orientandos: 'Situação, próximo marco e prazos de cada orientação.',
  projetos: 'Projetos, grupo de pesquisa e vínculos com programas.',
  producao: 'Artigos, livros e produtos, com a situação de cada submissão.',
  metas: 'O que você quer alcançar e até quando.'
};
function vLista(col) {
  const recs = live(col).sort(ORDEM[col]);
  const back = col === 'orientandos' ? '' : '<a class="small" href="#mais">Voltar</a>';
  return `
  <div class="view-head">${back}<h1>${esc(SCHEMAS[col].titulo)}</h1><p>${esc(INTRO[col])}</p></div>
  <div class="list">${recs.map(r => {
    const c = CARDS[col](r);
    return `<article class="card">
      <span class="title">${esc(c.title)}</span>
      ${c.sub ? `<span class="sub">${esc(c.sub)}</span>` : ''}
      ${c.extra ? `<span class="sub">${esc(c.extra)}</span>` : ''}
      <div class="tags">${c.tags.join('')}</div>
      ${r.obs ? `<span class="sub">${esc(r.obs)}</span>` : ''}
      <div class="actions"><button class="btn small" type="button" data-act="editar" data-col="${col}" data-id="${esc(r.id)}">Editar</button>
      ${col === 'producao' && r.doi ? `<a class="btn small" href="${esc(/^https?:/.test(r.doi) ? r.doi : 'https://doi.org/' + r.doi)}" target="_blank" rel="noopener">Abrir</a>` : ''}</div>
    </article>`;
  }).join('') || `<div class="empty">Nada cadastrado. Toque no + para adicionar.</div>`}</div>`;
}

function vMais() {
  const item = (h, l, n) => `<a href="#${h}"><span>${l}</span><span class="count">${n ?? ''} ›</span></a>`;
  return `
  <div class="view-head"><h1>Mais</h1></div>
  <nav class="menu">
    ${item('projetos', 'Projetos e vínculos', live('projetos').length)}
    ${item('producao', 'Produção bibliográfica', live('producao').length)}
    ${item('metas', 'Metas', live('metas').length)}
    ${item('config', 'Configurações e Google Drive', '')}
  </nav>
  <p class="small muted">Gestor Docente ${APP_VERSION}. Os dados ficam neste aparelho e, com o Drive conectado, na pasta "${ROOT_NAME}" do seu Google Drive.</p>`;
}

function periodoDossie() {
  if (!dossiePeriodo) { const it = intersticio(); dossiePeriodo = { ini: isoDay(it.ini), fim: isoDay(it.fim) }; }
  return dossiePeriodo;
}
function dadosDossie() {
  const p = periodoDossie();
  const ini = parseDate(p.ini), fim = parseDate(p.fim);
  const at = live('atividades').filter(a => ini && fim && noPeriodo(a, ini, new Date(fim.getTime() + 86400000))).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const a0 = ini ? ini.getFullYear() : 0, a1 = fim ? fim.getFullYear() : 0;
  const prod = live('producao').filter(x => ['Publicado', 'Aceito'].includes(x.situacao) && Number(x.ano) >= a0 && Number(x.ano) <= a1).sort((x, y) => String(x.ano).localeCompare(String(y.ano)));
  const oris = live('orientandos').filter(o => o.situacao !== 'Desligado').sort((x, y) => String(x.nome).localeCompare(String(y.nome)));
  return { p, grupos: EIXOS.map(e => [e, at.filter(a => a.eixo === e)]).filter(g => g[1].length), total: at.length, semComp: at.filter(a => a.comprovanteStatus === 'Pendente').length, prod, oris };
}
function vDossie() {
  const { p, grupos, total, semComp, prod, oris } = dadosDossie();
  return `
  <div class="view-head"><h1>Dossiê de progressão</h1><p>Atividades do período, por eixo, com os comprovantes. Confira os critérios na resolução de progressão da UFRPE.</p></div>
  <section class="panel">
    <div class="grid2">
      <div class="field"><label for="dIni">De</label><input type="date" id="dIni" value="${esc(p.ini)}"></div>
      <div class="field"><label for="dFim">Até</label><input type="date" id="dFim" value="${esc(p.fim)}"></div>
    </div>
    <p class="small ${semComp ? '' : 'muted'}">${total} atividades no período${semComp ? `, <strong>${semComp} sem comprovante</strong>` : ', todas com comprovante ou dispensadas'}.</p>
    <div class="actions" style="display:flex;flex-wrap:wrap;gap:8px">
      <button class="btn primary" type="button" data-act="gerarDoc">Gerar documento no Drive</button>
      <button class="btn" type="button" data-act="csv">Baixar planilha (CSV)</button>
      <button class="btn" type="button" data-act="copiar">Copiar texto</button>
    </div>
  </section>
  ${grupos.map(([e, its]) => `<section class="panel dossie-group"><h3><span>${esc(e)}</span><span class="muted small">${its.length}</span></h3>
    ${its.map(a => `<div class="dossie-item"><span class="d">${esc(fmtDate(a.data))}</span><div><div>${esc(a.descricao)}</div><div class="small muted">${[a.papel, a.local, a.cargaHoraria ? a.cargaHoraria + ' h' : ''].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="tags" style="margin-top:4px">${a.comprovanteLink ? `<a class="tag ok" href="${esc(a.comprovanteLink)}" target="_blank" rel="noopener">Comprovante</a>` : tagStatus(a.comprovanteStatus)}</div></div></div>`).join('')}
  </section>`).join('') || '<div class="empty">Nenhuma atividade no período.</div>'}
  ${prod.length ? `<section class="panel dossie-group"><h3><span>Produção bibliográfica publicada ou aceita</span><span class="muted small">${prod.length}</span></h3>
    ${prod.map(x => `<div class="dossie-item"><span class="d">${esc(x.ano)}</span><div><div>${esc(x.titulo)}</div><div class="small muted">${esc([x.tipo, x.veiculo].filter(Boolean).join(' · '))}</div><div class="tags" style="margin-top:4px">${tagStatus(x.situacao)}</div></div></div>`).join('')}</section>` : ''}
  ${oris.length ? `<section class="panel dossie-group"><h3><span>Orientações</span><span class="muted small">${oris.length}</span></h3>
    ${oris.map(o => `<div class="dossie-item"><span class="d">${esc(o.nivel === 'Coorientação' ? 'Coorient.' : (o.nivel || ''))}</span><div><div>${esc(o.nome)}</div><div class="small muted">${esc([o.tema, o.programa].filter(Boolean).join(' · '))}</div><div class="tags" style="margin-top:4px">${tagStatus(o.situacao)}</div></div></div>`).join('')}</section>` : ''}`;
}
function textoDossie() {
  const { p, grupos, prod, oris } = dadosDossie();
  let t = `DOSSIÊ DE PROGRESSÃO\nPeríodo: ${fmtDate(p.ini)} a ${fmtDate(p.fim)}\n`;
  for (const [e, its] of grupos) {
    t += `\n${e.toUpperCase()} (${its.length})\n`;
    for (const a of its) t += `- ${periodoTxt(a)}: ${a.descricao}${a.papel ? '. Papel: ' + a.papel : ''}${a.local ? '. ' + a.local : ''}${a.cargaHoraria ? '. ' + a.cargaHoraria + ' h' : ''}. Comprovante: ${a.comprovanteLink || a.comprovanteStatus || 'Pendente'}\n`;
  }
  if (prod.length) { t += `\nPRODUÇÃO BIBLIOGRÁFICA PUBLICADA OU ACEITA (${prod.length})\n`; for (const x of prod) t += `- ${x.ano}: ${x.titulo}. ${x.veiculo || ''}. ${x.situacao}.\n`; }
  if (oris.length) { t += `\nORIENTAÇÕES (${oris.length})\n`; for (const o of oris) t += `- ${o.nome} (${o.nivel}, ${o.programa || 'programa não informado'}): ${o.tema || 'tema não informado'}. ${o.situacao}.\n`; }
  return t;
}
function htmlDossie() {
  const { p, grupos, total, prod, oris } = dadosDossie();
  let h = `<html><head><meta charset="utf-8"></head><body style="font-family:Arial;font-size:11pt"><h1>Dossiê de progressão funcional</h1><p>Período: ${esc(fmtDate(p.ini))} a ${esc(fmtDate(p.fim))}. Total de atividades: ${total}.</p>`;
  for (const [e, its] of grupos) {
    h += `<h2>${esc(e)} (${its.length})</h2><table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><tr><th>Data</th><th>Atividade</th><th>Papel</th><th>Local</th><th>CH</th><th>Comprovante</th></tr>`;
    for (const a of its) h += `<tr><td>${esc(periodoTxt(a))}</td><td>${esc(a.descricao)}</td><td>${esc(a.papel || '')}</td><td>${esc(a.local || '')}</td><td>${esc(a.cargaHoraria || '')}</td><td>${a.comprovanteLink ? `<a href="${esc(a.comprovanteLink)}">abrir</a>` : esc(a.comprovanteStatus || 'Pendente')}</td></tr>`;
    h += '</table>';
  }
  if (prod.length) {
    h += `<h2>Produção bibliográfica publicada ou aceita (${prod.length})</h2><table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><tr><th>Ano</th><th>Título</th><th>Tipo</th><th>Veículo</th><th>Situação</th></tr>`;
    for (const x of prod) h += `<tr><td>${esc(x.ano)}</td><td>${esc(x.titulo)}</td><td>${esc(x.tipo)}</td><td>${esc(x.veiculo || '')}</td><td>${esc(x.situacao)}</td></tr>`;
    h += '</table>';
  }
  if (oris.length) {
    h += `<h2>Orientações (${oris.length})</h2><table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"><tr><th>Orientando</th><th>Nível</th><th>Programa</th><th>Tema</th><th>Situação</th></tr>`;
    for (const o of oris) h += `<tr><td>${esc(o.nome)}</td><td>${esc(o.nivel)}</td><td>${esc(o.programa || '')}</td><td>${esc(o.tema || '')}</td><td>${esc(o.situacao)}</td></tr>`;
    h += '</table>';
  }
  return h + '</body></html>';
}
function csvDossie() {
  const { grupos, prod, oris } = dadosDossie();
  const cel = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const linhas = [['Eixo', 'Categoria', 'Data de início', 'Data de término', 'Atividade', 'Papel', 'Local', 'Carga horária', 'Comprovante', 'Link do comprovante', 'No Lattes'].map(cel).join(';')];
  for (const [, its] of grupos) for (const a of its) linhas.push([a.eixo, a.categoria, fmtDate(a.data), a.emAndamento ? 'Em andamento' : fmtDate(a.dataFim), a.descricao, a.papel, a.local, a.cargaHoraria, a.comprovanteStatus, a.comprovanteLink, a.lattes ? 'Sim' : 'Não'].map(cel).join(';'));
  for (const x of prod) linhas.push(['Produção bibliográfica', x.tipo, x.ano, '', x.titulo, '', x.veiculo, '', x.situacao, x.doi, x.lattes ? 'Sim' : 'Não'].map(cel).join(';'));
  for (const o of oris) linhas.push(['Orientação', o.nivel, '', '', o.nome + (o.tema ? ': ' + o.tema : ''), '', o.programa, '', o.situacao, '', ''].map(cel).join(';'));
  return '\ufeff' + linhas.join('\r\n');
}
function baixar(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
}
async function gerarDoc() {
  if (!navigator.onLine) { toast('Sem internet. Use "Baixar planilha" por enquanto.'); return; }
  if (!hasToken()) { const ok = await connect(); if (ok) toast('Conectado. Toque em "Gerar documento" de novo.'); return; }
  toast('Gerando documento no Drive...', 10000);
  try {
    const p = periodoDossie();
    const folder = await ensureFolder(PASTA_DOSSIE);
    const r = await multipartUpload({ name: `Dossiê ${fmtDate(p.ini)} a ${fmtDate(p.fim)}`, parents: [folder], mimeType: 'application/vnd.google-apps.document' }, new Blob([htmlDossie()], { type: 'text/html' }), 'text/html');
    toast('Documento criado na pasta "' + PASTA_DOSSIE + '".', 4000);
    if (r.webViewLink) window.open(r.webViewLink, '_blank', 'noopener');
  } catch (e) { toast(e.status === 401 ? 'A sessão do Google expirou. Tente de novo.' : 'Não consegui gerar o documento. (' + e.message.slice(0, 60) + ')', 5000); }
}

function vConfig() {
  const origem = location.origin;
  return `
  <div class="view-head"><a class="small" href="#mais">Voltar</a><h1>Configurações</h1></div>
  <section class="panel">
    <h2>Google Drive</h2>
    <div class="field"><label for="cClient">ID do cliente OAuth</label>
      <input id="cClient" type="text" autocomplete="off" spellcheck="false" placeholder="000000000000-xxxx.apps.googleusercontent.com" value="${esc(L.clientId)}">
      <span class="hint">Criado uma única vez no Google Cloud. O passo a passo está abaixo.</span></div>
    <div class="actions" style="display:flex;flex-wrap:wrap;gap:8px">
      <button class="btn" type="button" data-act="salvarClient">Salvar ID</button>
      ${hasToken() ? '<button class="btn" type="button" data-act="sair">Desconectar</button>' : '<button class="btn primary" type="button" data-act="sync">Entrar com Google e sincronizar</button>'}
    </div>
    <p class="small muted">${L.lastSync ? 'Última sincronização: ' + esc(new Date(L.lastSync).toLocaleString('pt-BR')) : 'Ainda não sincronizado.'} ${L.dirty ? 'Há alterações só neste aparelho.' : ''}</p>
  </section>
  <section class="panel">
    <h2>Interstício</h2>
    <div class="grid2">
      <div class="field"><label for="cIni">Início do interstício atual</label><input id="cIni" type="date" value="${esc(S.config.inicioIntersticio)}"></div>
      <div class="field"><label for="cMeses">Duração (meses)</label><input id="cMeses" type="number" min="1" max="60" value="${esc(S.config.duracaoMeses)}"></div>
    </div>
    <span class="hint small muted">Confira a duração na resolução de progressão da UFRPE.</span>
    <div><button class="btn" type="button" data-act="salvarInt">Salvar interstício</button></div>
  </section>
  <section class="panel">
    <h2>Backup</h2>
    <p class="small muted">Arquivo com todos os dados, para guardar ou restaurar em outro aparelho.</p>
    <div class="actions" style="display:flex;flex-wrap:wrap;gap:8px">
      <button class="btn" type="button" data-act="exportar">Baixar backup</button>
      <button class="btn" type="button" data-act="importar">Restaurar backup</button>
    </div>
  </section>
  <section class="panel">
    <details>
      <summary>Como ativar o Google Drive (uma vez só)</summary>
      <ol class="steps" style="margin-top:10px">
        <li>No computador, abra <span class="code">console.cloud.google.com</span> com sua conta Google e crie um projeto chamado <span class="code">Gestor Docente</span>.</li>
        <li>Em "APIs e serviços" e depois "Biblioteca", procure <span class="code">Google Drive API</span> e clique em Ativar.</li>
        <li>Em "Tela de permissão OAuth" (ou "Google Auth Platform"), escolha o tipo Externo, preencha nome do app e seu e-mail, e em "Público" adicione seu próprio e-mail como usuário de teste.</li>
        <li>Em "Credenciais", clique em "Criar credenciais", depois "ID do cliente OAuth", tipo "Aplicativo da Web".</li>
        <li>Em "Origens JavaScript autorizadas", adicione exatamente: <span class="code">${esc(origem)}</span></li>
        <li>Copie o "ID do cliente", cole no campo acima e toque em Salvar ID.</li>
        <li>Toque em "Entrar com Google e sincronizar". O Google vai avisar que o app não foi verificado: isso é esperado num app pessoal. Toque em "Continuar".</li>
      </ol>
    </details>
  </section>`;
}

/* ---------- Formulários ---------- */
let editCtx = null, armedDelete = false;
function fieldHTML(f, v) {
  const id = 'f_' + f.k;
  const req = f.req ? ' required' : '';
  let input;
  if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.k}"${req} placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`;
  else if (f.type === 'select') input = `<select id="${id}" name="${f.k}"${req}><option value="">Escolha</option>${f.options.map(o => `<option ${String(v) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  else if (f.type === 'checkbox') return `<div class="field check"><input type="checkbox" id="${id}" name="${f.k}" ${v ? 'checked' : ''}><label for="${id}">${esc(f.label)}</label></div>`;
  else input = `<input id="${id}" name="${f.k}" type="${f.type}"${req} value="${esc(v)}" placeholder="${esc(f.ph || '')}"${f.list ? ` list="${f.list}"` : ''}${f.type === 'number' ? ' inputmode="decimal" step="any"' : ''}>`;
  return `<div class="field"><label for="${id}">${esc(f.label)}${f.req ? ' *' : ''}</label>${input}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
}
function openForm(col, id) {
  const sch = SCHEMAS[col];
  const rec = id ? S[col].find(r => r.id === id) : null;
  editCtx = { col, id: rec ? rec.id : null };
  armedDelete = false;
  const vals = rec || {};
  if (!rec && col === 'atividades') vals.data = isoDay(new Date());
  let html = '', buf = [];
  const flush = () => { if (buf.length) { html += buf.length === 2 ? `<div class="grid2">${buf.join('')}</div>` : buf.join(''); buf = []; } };
  for (const f of sch.fields) {
    const v = vals[f.k] ?? f.def ?? '';
    const h = fieldHTML(f, v);
    if (f.half) { buf.push(h); if (buf.length === 2) flush(); } else { flush(); html += h; }
  }
  flush();
  if (col === 'atividades') html += `<datalist id="dl-categoria"></datalist>`;
  $('#modalTitle').textContent = rec ? sch.editar : sch.novo;
  $('#modalBody').innerHTML = html;
  const del = $('#btnExcluir'); del.hidden = !rec; del.classList.remove('armed'); del.textContent = 'Excluir';
  if (col === 'atividades') atualizaCategorias();
  const dlg = $('#modal');
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  const first = $('#modalBody textarea, #modalBody input, #modalBody select');
  if (first && !rec) setTimeout(() => first.focus(), 50);
}
function atualizaCategorias() {
  const e = $('#f_eixo'); const dl = $('#dl-categoria');
  if (!e || !dl) return;
  dl.innerHTML = (CATEGORIAS[e.value] || []).map(c => `<option value="${esc(c)}"></option>`).join('');
}
function closeForm() { const d = $('#modal'); if (d.open) d.close(); editCtx = null; }
async function submitForm() {
  if (!editCtx) return;
  const { col, id } = editCtx;
  const sch = SCHEMAS[col];
  const base = id ? Object.assign({}, S[col].find(r => r.id === id)) : { id: uid(), criado: now() };
  let ok = true;
  for (const f of sch.fields) {
    const el = document.getElementById('f_' + f.k);
    if (!el) continue;
    let v = f.type === 'checkbox' ? el.checked : el.value.trim();
    if (f.type === 'number' && v !== '') v = Number(String(v).replace(',', '.'));
    const wrap = el.closest('.field');
    if (f.req && (v === '' || v === null)) { ok = false; wrap.classList.add('invalid'); } else wrap.classList.remove('invalid');
    base[f.k] = v;
  }
  if (!ok) { toast('Preencha os campos marcados com *.'); return; }
  if (col === 'atividades' && base.dataFim && base.data && base.dataFim < base.data) { toast('A data de término está antes da data de início.'); return; }
  upsert(col, base);
  closeForm();
  await commit(id ? 'Alterações salvas.' : 'Registro salvo.');
}
async function deleteCurrent() {
  if (!editCtx || !editCtx.id) return;
  const btn = $('#btnExcluir');
  if (!armedDelete) { armedDelete = true; btn.classList.add('armed'); btn.textContent = 'Toque de novo para excluir'; return; }
  removeRec(editCtx.col, editCtx.id);
  closeForm();
  await commit('Registro excluído.');
}

/* ---------- Eventos ---------- */
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-act], [data-filtro]');
  if (!t) return;
  if (t.dataset.filtro) { filtro.modo = t.dataset.filtro; filtro.eixo = ''; filtro.q = ''; return; }
  const act = t.dataset.act;
  if (act === 'novo') { ev.preventDefault(); openForm(t.dataset.col || 'atividades'); }
  else if (act === 'editar') openForm(t.dataset.col, t.dataset.id);
  else if (act === 'fechar') closeForm();
  else if (act === 'excluir') deleteCurrent();
  else if (act === 'sync') syncNow(true);
  else if (act === 'modo') { filtro.modo = t.dataset.modo; render(); }
  else if (act === 'anexar') startAnexar(t.dataset.id);
  else if (act === 'lattes') {
    const r = S.atividades.find(x => x.id === t.dataset.id);
    if (r) { upsert('atividades', Object.assign({}, r, { lattes: true })); await commit('Marcado como lançado no Lattes.'); }
  }
  else if (act === 'gerarDoc') gerarDoc();
  else if (act === 'csv') { const p = periodoDossie(); baixar(`dossie-${p.ini}-a-${p.fim}.csv`, csvDossie(), 'text/csv;charset=utf-8'); }
  else if (act === 'copiar') {
    try { await navigator.clipboard.writeText(textoDossie()); toast('Texto copiado.'); }
    catch (_) { toast('Não consegui copiar. Use "Baixar planilha".'); }
  }
  else if (act === 'salvarClient') {
    const v = $('#cClient').value.trim();
    if (v && !/\.apps\.googleusercontent\.com$/.test(v)) { toast('Esse ID não parece válido. Ele termina em .apps.googleusercontent.com'); return; }
    L.clientId = v; tokenClient = null; token = null; L.rootId = ''; L.dataFileId = ''; L.folders = {};
    await saveLocal(); render(); toast(v ? 'ID salvo. Agora toque em "Entrar com Google".' : 'Sincronização desativada.');
  }
  else if (act === 'sair') signOut();
  else if (act === 'salvarInt') {
    const ini = $('#cIni').value, m = Number($('#cMeses').value);
    if (!ini || !(m > 0)) { toast('Informe a data de início e a duração.'); return; }
    S.config = { inicioIntersticio: ini, duracaoMeses: m, upd: now() };
    dossiePeriodo = null;
    await commit('Interstício salvo.');
  }
  else if (act === 'exportar') baixar(`gestor-docente-backup-${isoDay(new Date())}.json`, JSON.stringify(S, null, 1), 'application/json');
  else if (act === 'importar') { const i = $('#fileBackup'); i.value = ''; i.click(); }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'fBusca') {
    filtro.q = ev.target.value;
    clearTimeout(document._b);
    document._b = setTimeout(() => { const pos = ev.target.selectionStart; render(); const b = $('#fBusca'); if (b) { b.focus(); try { b.setSelectionRange(pos, pos); } catch (_) {} } }, 250);
  }
});
document.addEventListener('change', (ev) => {
  const id = ev.target.id;
  if (id === 'fEixo') { filtro.eixo = ev.target.value; render(); }
  else if (id === 'f_eixo') atualizaCategorias();
  else if (id === 'dIni' || id === 'dFim') {
    const p = periodoDossie(); p[id === 'dIni' ? 'ini' : 'fim'] = ev.target.value; render();
  }
  else if (id === 'fileComprovante') uploadComprovante(ev.target.files[0]);
  else if (id === 'fileBackup') {
    const f = ev.target.files[0]; if (!f) return;
    f.text().then(async txt => {
      try {
        const d = JSON.parse(txt);
        if (!d || !d.schema) throw new Error('formato');
        S = merge(S, d);
        await commit('Backup restaurado e mesclado com os dados atuais.');
      } catch (_) { toast('Esse arquivo não é um backup do Gestor Docente.'); }
    });
  }
});
$('#modalForm').addEventListener('submit', (ev) => { ev.preventDefault(); submitForm(); });
$('#modal').addEventListener('close', () => { editCtx = null; });
window.addEventListener('hashchange', () => { render(); $('#view').focus({ preventScroll: true }); window.scrollTo(0, 0); });
window.addEventListener('online', () => { updateSyncUI(); if (L.dirty) scheduleSync(); });
window.addEventListener('offline', updateSyncUI);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && hasToken() && navigator.onLine) syncNow(false); });

/* ---------- Início ---------- */
(async function boot() {
  await load();
  setStatus(L.dirty ? 'pending' : 'idle');
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
