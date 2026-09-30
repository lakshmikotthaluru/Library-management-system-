// Library Management System - Node.js + Express + SQLite
const path = require('path'), crypto = require('crypto');
let Database; // better-sqlite3 if installed, otherwise Node's built-in sqlite (Node 22.5+)
try { Database = require('better-sqlite3'); } catch { Database = require('node:sqlite').DatabaseSync; }
const db = new Database(process.env.LMS_DB || path.join(__dirname, 'library.db'));
const FINE = 5, DAYS = 14, MAXB = 3, SESS = {};
const q = (sql, ...a) => { const s = db.prepare(sql); return /^\s*select/i.test(sql) ? s.all(...a) : s.run(...a); };
const today = () => new Date().toISOString().slice(0, 10);
const addDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const hp = (p, s) => { s = s || crypto.randomBytes(8).toString('hex'); return s + '$' + crypto.pbkdf2Sync(p, s, 60000, 32, 'sha256').toString('hex'); };
class Err extends Error { constructor(m, c = 400) { super(m); this.c = c; } }

function init() {
  db.exec(`create table if not exists users(id text primary key,name text,pw text,role text,email text,phone text,dept text,year text,address text,created text);
  create table if not exists books(id integer primary key autoincrement,title text,author text,cat text,isbn text,copies integer);
  create table if not exists issues(id integer primary key autoincrement,book_id integer,user_id text,issued text,due text,returned text,fine integer default 0,paid integer default 0,paid_on text,method text,receipt text);
  create table if not exists penalties(id integer primary key autoincrement,user_id text,amount integer,reason text,date text,paid integer default 0,paid_on text,method text,receipt text);`);
  if (q('select 1 from users').length) return;
  q('insert into users values(?,?,?,?,?,?,?,?,?,?)', 'admin', 'Head Librarian', hp('admin123'), 'librarian', 'library@college.edu', '9000000000', 'Library', '', 'Main Library', today());
  [['s101', 'Ravi Kumar', 'pass101', 'ravi@mail.com', '9876543210', 'CSE', '2nd Year', 'Tirupati'], ['s102', 'Anitha Reddy', 'pass102', 'anitha@mail.com', '9123456780', 'ECE', '3rd Year', 'Chittoor']]
    .forEach(r => q('insert into users values(?,?,?,?,?,?,?,?,?,?)', r[0], r[1], hp(r[2]), 'student', r[3], r[4], r[5], r[6], r[7], today()));
  [['Introduction to Algorithms', 'Cormen', 'Computer Science', '9780262033848', 4], ['Clean Code', 'Robert Martin', 'Programming', '9780132350884', 3], ['Wings of Fire', 'A.P.J. Abdul Kalam', 'Biography', '9788173711466', 5], ['Discovery of India', 'Jawaharlal Nehru', 'History', '9780143031031', 2], ['Database System Concepts', 'Silberschatz', 'Computer Science', '9780078022159', 3], ['Concepts of Physics', 'H.C. Verma', 'Physics', '9788177091878', 6], ['The Alchemist', 'Paulo Coelho', 'Fiction', '9780062315007', 3], ['Operating System Concepts', 'Galvin', 'Computer Science', '9781118063330', 2]]
    .forEach(b => q('insert into books(title,author,cat,isbn,copies) values(?,?,?,?,?)', ...b));
  q('insert into issues(book_id,user_id,issued,due) values(2,?,?,?)', 's101', addDays(-20), addDays(-6));
  q('insert into issues(book_id,user_id,issued,due) values(3,?,?,?)', 's102', addDays(-3), addDays(11));
}
const late = i => Math.max(0, Math.round((Date.parse(i.returned || today()) - Date.parse(i.due)) / 864e5));
function issues(uid, active) {
  const w = [], a = [];
  if (uid) { w.push('i.user_id=?'); a.push(uid); }
  if (active) w.push('i.returned is null');
  const r = q('select i.*,b.title,u.name from issues i join books b on b.id=i.book_id join users u on u.id=i.user_id' + (w.length ? ' where ' + w.join(' and ') : '') + ' order by i.id desc', ...a).map(x => ({ ...x }));
  r.forEach(i => { i.late = late(i); i.fine_now = i.returned ? i.fine : i.late * FINE; });
  return r;
}
function items(uid) {
  const out = [];
  issues(uid).forEach(i => { if (i.fine_now > 0) out.push({ kind: 'issue', id: i.id, user_id: i.user_id, name: i.name, desc: `Late return: ${i.title} (${i.late} day(s) x Rs.${FINE})`, amount: i.fine_now, paid: i.paid, ready: !!i.returned, paid_on: i.paid_on, method: i.method, receipt: i.receipt }); });
  q('select p.*,u.name from penalties p join users u on u.id=p.user_id' + (uid ? ' where p.user_id=?' : '') + ' order by p.id desc', ...(uid ? [uid] : []))
    .forEach(p => out.push({ kind: 'pen', id: p.id, user_id: p.user_id, name: p.name, desc: p.reason, amount: p.amount, paid: p.paid, ready: true, paid_on: p.paid_on, method: p.method, receipt: p.receipt }));
  return out;
}
const owed = uid => items(uid).filter(i => !i.paid).reduce((s, i) => s + i.amount, 0);
const pub = u => { const { pw, ...r } = u; return r; };
const cnt = (sql, ...a) => Number(q(sql, ...a)[0].c);

function api(m, p, qs, b, u) {
  const S = k => String(b[k] ?? '').trim();
  if (p === 'login') {
    if (!S('id') || !S('pw')) throw new Err('Please enter User ID and Password', 401);
    const r = q('select * from users where lower(id)=lower(?)', S('id'))[0];
    if (!r) throw new Err('User ID not found', 401);
    if (hp(S('pw'), r.pw.split('$')[0]) !== r.pw) throw new Err('Wrong password', 401);
    if (r.role !== S('role')) throw new Err(`This ID is a ${r.role} account. Please select '${r.role[0].toUpperCase() + r.role.slice(1)}' in the Role box.`, 401);
    const t = crypto.randomBytes(16).toString('hex'); SESS[t] = r.id; return { token: t, user: pub({ ...r }) };
  }
  if (p === 'register') {
    if (['id', 'name', 'pw', 'email', 'phone', 'dept', 'year', 'address'].some(k => !S(k))) throw new Err('All fields are required');
    if (S('pw').length < 4) throw new Err('Password must be at least 4 characters');
    if (q('select 1 from users where lower(id)=lower(?)', S('id')).length) throw new Err('Student ID already exists');
    q('insert into users values(?,?,?,?,?,?,?,?,?,?)', S('id'), S('name'), hp(S('pw')), 'student', S('email'), S('phone'), S('dept'), S('year'), S('address'), today()); return { ok: 1 };
  }
  if (!u) throw new Err('Please login first', 401);
  const L = u.role === 'librarian', lib = () => { if (!L) throw new Err('Librarian access only', 403); };
  if (p === 'books' && m === 'GET') {
    const s = '%' + (qs.q || '') + '%';
    return q('select * from books where title like ? or author like ? or cat like ? or isbn like ? order by title', s, s, s, s)
      .map(x => ({ ...x, avail: x.copies - cnt('select count(*) c from issues where book_id=? and returned is null', x.id) }));
  }
  if (p === 'books') { lib(); if (!S('title')) throw new Err('Title is required'); q('insert into books(title,author,cat,isbn,copies) values(?,?,?,?,?)', S('title'), S('author'), S('cat'), S('isbn'), Math.max(1, parseInt(b.copies) || 1)); return { ok: 1 }; }
  if (p === 'books/delete') { lib(); if (q('select 1 from issues where book_id=?', b.id).length) throw new Err('Book has issue history and cannot be deleted'); q('delete from books where id=?', b.id); return { ok: 1 }; }
  if (p === 'issue') {
    lib(); const uid = S('user_id'), bid = b.book_id;
    if (!q("select 1 from users where id=? and role='student'", uid).length || !q('select 1 from books where id=?', bid).length) throw new Err('Invalid student or book');
    const bk = q('select * from books where id=?', bid)[0];
    if (bk.copies - cnt('select count(*) c from issues where book_id=? and returned is null', bid) < 1) throw new Err('No copies available');
    if (issues(uid, true).length >= MAXB) throw new Err(`Student already holds ${MAXB} books (limit)`);
    const o = owed(uid); if (o > 0 && !b.force) throw new Err('UNPAID:' + o);
    q('insert into issues(book_id,user_id,issued,due) values(?,?,?,?)', bid, uid, today(), addDays(DAYS)); return { ok: 1 };
  }
  if (p === 'return') {
    lib(); const i = issues(null, true).find(x => x.id === Number(b.id)); if (!i) throw new Err('Issue record not found');
    const f = i.late * FINE; q('update issues set returned=?,fine=?,paid=? where id=?', today(), f, f === 0 ? 1 : 0, i.id); return { fine: f, late: i.late };
  }
  if (p === 'my') { const uid = L ? (qs.uid || u.id) : u.id; return { issues: issues(uid), items: items(uid), owed: owed(uid) }; }
  if (p === 'issues') { lib(); return issues(null, true); }
  if (p === 'students') { lib(); return q("select * from users where role='student' order by name").map(x => { const r = pub({ ...x }); r.held = issues(x.id, true).length; r.owed = owed(x.id); return r; }); }
  if (p === 'fines') { lib(); return items(); }
  if (p === 'penalty') {
    lib(); const a = parseInt(b.amount) || 0;
    if (a <= 0 || !S('reason')) throw new Err('Enter a valid amount and reason');
    if (!q("select 1 from users where id=? and role='student'", S('user_id')).length) throw new Err('Select a student');
    q('insert into penalties(user_id,amount,reason,date) values(?,?,?,?)', S('user_id'), a, S('reason'), today()); return { ok: 1 };
  }
  if (p === 'pay') {
    const k = b.kind, t = k === 'issue' ? 'issues' : 'penalties', r = q(`select * from ${t} where id=?`, b.id)[0];
    if (!r || (!L && r.user_id !== u.id)) throw new Err('Record not found', 404);
    if (r.paid) throw new Err('Already paid');
    if (k === 'issue' && !r.returned) throw new Err('Book must be returned before paying the fine');
    const rc = 'RCPT' + crypto.randomBytes(3).toString('hex').toUpperCase();
    q(`update ${t} set paid=1,paid_on=?,method=?,receipt=? where id=?`, today(), S('method') || 'Cash', rc, r.id); return { receipt: rc, amount: k === 'issue' ? r.fine : r.amount };
  }
  if (p === 'stats') {
    lib(); const a = issues(null, true), it = items();
    return { titles: cnt('select count(*) c from books'), students: cnt("select count(*) c from users where role='student'"), issued: a.length, overdue: a.filter(i => i.late).length, pending: it.filter(i => !i.paid).reduce((s, i) => s + i.amount, 0), collected: it.filter(i => i.paid).reduce((s, i) => s + i.amount, 0) };
  }
  throw new Err('Not found', 404);
}
module.exports = { api, init, q, Err };

if (require.main === module) {
  const express = require('express'), app = express(), PORT = process.env.PORT || 8000;
  app.use(express.json());
  app.all('/api/*', (req, res) => {
    try {
      const uid = SESS[req.get('X-Token') || ''], u = uid ? q('select * from users where id=?', uid)[0] : null;
      res.json(api(req.method, req.path.slice(5), req.query, req.body || {}, u && { ...u }));
    } catch (e) { res.status(e instanceof Err ? e.c : 500).json({ error: e instanceof Err ? e.message : 'Server error: ' + e.message }); }
  });
  app.use(express.static(path.join(__dirname, 'public')));
  init();
  app.listen(PORT, () => console.log(`Library Management System running at http://localhost:${PORT}  (Ctrl+C to stop)`));
}
