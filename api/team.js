// Vercel serverless function: shared team board stored in Neon Postgres.
// Connect a Neon database from the Vercel Storage / Marketplace tab and Vercel adds
// DATABASE_URL for you. The tables are created automatically on the first request.

const { neon } = require('@neondatabase/serverless');

const STATUSES = ['todo', 'doing', 'done'];
const MAX_TASKS = 2000;
const MAX_MEMBERS = 100;

let sql = null;
let ready = null;

const connectionString = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

function getSql() {
  if (!sql) sql = neon(connectionString());
  return sql;
}

function ensureSchema() {
  if (!ready) {
    const q = getSql();
    ready = (async () => {
      await q`CREATE TABLE IF NOT EXISTS doable_meta (key text PRIMARY KEY, value text NOT NULL)`;
      await q`CREATE TABLE IF NOT EXISTS doable_members (id text PRIMARY KEY, name text NOT NULL, color integer NOT NULL, created bigint NOT NULL)`;
      await q`CREATE TABLE IF NOT EXISTS doable_tasks (id text PRIMARY KEY, title text NOT NULL, assignee text, status text NOT NULL DEFAULT 'todo', due text NOT NULL DEFAULT '', created bigint NOT NULL)`;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const clean = (s, n) => String(s == null ? '' : s).trim().slice(0, n);
const validDue = (s) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s);
const validId = (s) => typeof s === 'string' && /^[\w-]{1,40}$/.test(s);
const bad = (msg, status) => Object.assign(new Error(msg), { status: status || 400 });

async function getState() {
  const q = getSql();
  const [meta, members, tasks] = await Promise.all([
    q`SELECT value FROM doable_meta WHERE key = 'name'`,
    q`SELECT id, name, color, created FROM doable_members ORDER BY created, id`,
    q`SELECT id, title, assignee, status, due, created FROM doable_tasks ORDER BY created, id`,
  ]);
  return {
    mode: 'shared',
    name: meta.length ? meta[0].value : '',
    members: members.map((m) => ({ id: m.id, name: m.name, color: Number(m.color), created: Number(m.created) })),
    tasks: tasks.map((t) => ({
      id: t.id, title: t.title, assignee: t.assignee || '', status: t.status, due: t.due || '', created: Number(t.created),
    })),
  };
}

async function memberExists(q, id) {
  if (!validId(id)) return false;
  const rows = await q`SELECT 1 AS ok FROM doable_members WHERE id = ${id}`;
  return rows.length > 0;
}

async function act(a) {
  const q = getSql();
  switch (a.action) {
    case 'setName': {
      const v = clean(a.name, 80);
      await q`INSERT INTO doable_meta (key, value) VALUES ('name', ${v}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      return;
    }
    case 'addMember': {
      const name = clean(a.name, 40);
      if (!name) throw bad('name required');
      const rows = await q`SELECT count(*)::int AS n FROM doable_members`;
      const n = rows[0].n;
      if (n >= MAX_MEMBERS) throw bad('too many members');
      await q`INSERT INTO doable_members (id, name, color, created) VALUES (${uid()}, ${name}, ${n % 6}, ${Date.now()})`;
      return;
    }
    case 'removeMember': {
      if (!validId(a.id)) throw bad('bad id');
      await q`UPDATE doable_tasks SET assignee = NULL WHERE assignee = ${a.id}`;
      await q`DELETE FROM doable_members WHERE id = ${a.id}`;
      return;
    }
    case 'addTask': {
      const title = clean(a.title, 200);
      if (!title) throw bad('title required');
      const due = validDue(clean(a.due, 10)) ? clean(a.due, 10) : '';
      const rows = await q`SELECT count(*)::int AS n FROM doable_tasks`;
      if (rows[0].n >= MAX_TASKS) throw bad('too many tasks');
      const assignee = (await memberExists(q, a.assignee)) ? a.assignee : null;
      await q`INSERT INTO doable_tasks (id, title, assignee, status, due, created) VALUES (${uid()}, ${title}, ${assignee}, 'todo', ${due}, ${Date.now()})`;
      return;
    }
    case 'updateTask': {
      if (!validId(a.id)) throw bad('bad id');
      const rows = await q`SELECT status, assignee, due FROM doable_tasks WHERE id = ${a.id}`;
      if (!rows.length) throw bad('not found', 404);
      let { status, assignee, due } = rows[0];
      if (STATUSES.includes(a.status)) status = a.status;
      if (typeof a.assignee === 'string') assignee = (await memberExists(q, a.assignee)) ? a.assignee : null;
      if (typeof a.due === 'string' && validDue(a.due)) due = a.due;
      await q`UPDATE doable_tasks SET status = ${status}, assignee = ${assignee}, due = ${due || ''} WHERE id = ${a.id}`;
      return;
    }
    case 'deleteTask': {
      if (!validId(a.id)) throw bad('bad id');
      await q`DELETE FROM doable_tasks WHERE id = ${a.id}`;
      return;
    }
    default:
      throw bad('unknown action');
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!connectionString()) return res.status(503).json({ error: 'not_configured' });
  try {
    await ensureSchema();
    if (req.method === 'GET') return res.status(200).json(await getState());
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') body = body ? JSON.parse(body) : {};
      await act(body || {});
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    const status = e && e.status ? e.status : 500;
    if (status === 500) console.error('karya api error:', e && e.message);
    return res.status(status).json({ error: status === 500 ? 'server_error' : 'bad_request' });
  }
};
