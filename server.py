"""Library Management System - Python (standard library only) + SQLite database."""
import sqlite3,json,hashlib,os,secrets,mimetypes,datetime as dt
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
BASE=os.path.dirname(os.path.abspath(__file__))
DB=os.environ.get('LMS_DB',os.path.join(BASE,'library.db'))
FINE=5;DAYS=14;MAXB=3;SESS={}
today=lambda:dt.date.today().isoformat()
def q(sql,a=()):
    c=sqlite3.connect(DB);c.row_factory=sqlite3.Row
    try:
        cur=c.execute(sql,a);r=[dict(x) for x in cur.fetchall()];c.commit();return r
    finally:c.close()
def hp(p,s=None):
    s=s or secrets.token_hex(8);return s+'$'+hashlib.pbkdf2_hmac('sha256',p.encode(),s.encode(),60000).hex()
class Err(Exception):
    def __init__(s,m,c=400):s.m,s.c=m,c
def init():
    for s in ["create table if not exists users(id text primary key,name text,pw text,role text,email text,phone text,dept text,year text,address text,created text)",
    "create table if not exists books(id integer primary key autoincrement,title text,author text,cat text,isbn text,copies integer)",
    "create table if not exists issues(id integer primary key autoincrement,book_id integer,user_id text,issued text,due text,returned text,fine integer default 0,paid integer default 0,paid_on text,method text,receipt text)",
    "create table if not exists penalties(id integer primary key autoincrement,user_id text,amount integer,reason text,date text,paid integer default 0,paid_on text,method text,receipt text)"]:q(s)
    if q("select 1 from users"):return
    q("insert into users values('admin','Head Librarian',?,'librarian','library@college.edu','9000000000','Library','','Main Library',?)",(hp('admin123'),today()))
    for r in [('s101','Ravi Kumar','pass101','ravi@mail.com','9876543210','CSE','2nd Year','Tirupati'),('s102','Anitha Reddy','pass102','anitha@mail.com','9123456780','ECE','3rd Year','Chittoor')]:
        q("insert into users values(?,?,?,'student',?,?,?,?,?,?)",(r[0],r[1],hp(r[2]))+r[3:]+(today(),))
    for b in [('Introduction to Algorithms','Cormen','Computer Science','9780262033848',4),('Clean Code','Robert Martin','Programming','9780132350884',3),('Wings of Fire','A.P.J. Abdul Kalam','Biography','9788173711466',5),('Discovery of India','Jawaharlal Nehru','History','9780143031031',2),('Database System Concepts','Silberschatz','Computer Science','9780078022159',3),('Concepts of Physics','H.C. Verma','Physics','9788177091878',6),('The Alchemist','Paulo Coelho','Fiction','9780062315007',3),('Operating System Concepts','Galvin','Computer Science','9781118063330',2)]:
        q("insert into books(title,author,cat,isbn,copies) values(?,?,?,?,?)",b)
    d=lambda n:(dt.date.today()+dt.timedelta(days=n)).isoformat()
    q("insert into issues(book_id,user_id,issued,due) values(2,'s101',?,?)",(d(-20),d(-6)))
    q("insert into issues(book_id,user_id,issued,due) values(3,'s102',?,?)",(d(-3),d(11)))
def late(i):
    e=i['returned'] or today();return max(0,(dt.date.fromisoformat(e)-dt.date.fromisoformat(i['due'])).days)
def issues(uid=None,active=False):
    w=[];a=[]
    if uid:w.append('i.user_id=?');a.append(uid)
    if active:w.append('i.returned is null')
    r=q("select i.*,b.title,u.name from issues i join books b on b.id=i.book_id join users u on u.id=i.user_id"+(' where '+' and '.join(w) if w else '')+" order by i.id desc",a)
    for i in r:i['late']=late(i);i['fine_now']=i['fine'] if i['returned'] else i['late']*FINE
    return r
def items(uid=None):
    out=[]
    for i in issues(uid):
        if i['fine_now']>0:out.append(dict(kind='issue',id=i['id'],user_id=i['user_id'],name=i['name'],desc=f"Late return: {i['title']} ({i['late']} day(s) x Rs.{FINE})",amount=i['fine_now'],paid=i['paid'],ready=bool(i['returned']),paid_on=i['paid_on'],method=i['method'],receipt=i['receipt']))
    for p in q("select p.*,u.name from penalties p join users u on u.id=p.user_id"+(" where p.user_id=?" if uid else "")+" order by p.id desc",(uid,) if uid else ()):
        out.append(dict(kind='pen',id=p['id'],user_id=p['user_id'],name=p['name'],desc=p['reason'],amount=p['amount'],paid=p['paid'],ready=True,paid_on=p['paid_on'],method=p['method'],receipt=p['receipt']))
    return out
owed=lambda uid:sum(i['amount'] for i in items(uid) if not i['paid'])
pub=lambda u:{k:v for k,v in u.items() if k!='pw'}
def api(m,p,qs,b,u):
    S=lambda k:str(b.get(k) or '').strip()
    if p=='login':
        if not S('id') or not S('pw'):raise Err('Please enter User ID and Password',401)
        r=q("select * from users where lower(id)=lower(?)",(S('id'),))
        if not r:raise Err('User ID not found',401)
        r=r[0]
        if hp(S('pw'),r['pw'].split('$')[0])!=r['pw']:raise Err('Wrong password',401)
        if r['role']!=S('role'):raise Err(f"This ID is a {r['role']} account. Please select '{r['role'].capitalize()}' in the Role box.",401)
        r=[r]
        t=secrets.token_hex(16);SESS[t]=r[0]['id'];return {'token':t,'user':pub(r[0])}
    if p=='register':
        if any(not S(k) for k in ['id','name','pw','email','phone','dept','year','address']):raise Err('All fields are required')
        if len(S('pw'))<4:raise Err('Password must be at least 4 characters')
        if q("select 1 from users where lower(id)=lower(?)",(S('id'),)):raise Err('Student ID already exists')
        q("insert into users values(?,?,?,'student',?,?,?,?,?,?)",(S('id'),S('name'),hp(S('pw')),S('email'),S('phone'),S('dept'),S('year'),S('address'),today()));return {'ok':1}
    if not u:raise Err('Please login first',401)
    L=u['role']=='librarian'
    def lib():
        if not L:raise Err('Librarian access only',403)
    if p=='books' and m=='GET':
        s='%'+qs.get('q','')+'%'
        r=q("select * from books where title like ? or author like ? or cat like ? or isbn like ? order by title",(s,s,s,s))
        for x in r:x['avail']=x['copies']-q("select count(*) c from issues where book_id=? and returned is null",(x['id'],))[0]['c']
        return r
    if p=='books':
        lib()
        if not S('title'):raise Err('Title is required')
        q("insert into books(title,author,cat,isbn,copies) values(?,?,?,?,?)",(S('title'),S('author'),S('cat'),S('isbn'),max(1,int(b.get('copies') or 1))));return {'ok':1}
    if p=='books/delete':
        lib()
        if q("select 1 from issues where book_id=?",(b.get('id'),)):raise Err('Book has issue history and cannot be deleted')
        q("delete from books where id=?",(b.get('id'),));return {'ok':1}
    if p=='issue':
        lib();uid,bid=S('user_id'),b.get('book_id')
        if not q("select 1 from users where id=? and role='student'",(uid,)) or not q("select 1 from books where id=?",(bid,)):raise Err('Invalid student or book')
        bk=q("select * from books where id=?",(bid,))[0]
        if bk['copies']-q("select count(*) c from issues where book_id=? and returned is null",(bid,))[0]['c']<1:raise Err('No copies available')
        if len(issues(uid,True))>=MAXB:raise Err(f'Student already holds {MAXB} books (limit)')
        o=owed(uid)
        if o>0 and not b.get('force'):raise Err(f'UNPAID:{o}')
        q("insert into issues(book_id,user_id,issued,due) values(?,?,?,?)",(bid,uid,today(),(dt.date.today()+dt.timedelta(days=DAYS)).isoformat()));return {'ok':1}
    if p=='return':
        lib();r=[i for i in issues(None,True) if i['id']==b.get('id')]
        if not r:raise Err('Issue record not found')
        i=r[0];f=i['late']*FINE;q("update issues set returned=?,fine=?,paid=? where id=?",(today(),f,int(f==0),i['id']));return {'fine':f,'late':i['late']}
    if p=='my':
        uid=qs.get('uid',u['id']) if L else u['id'];return {'issues':issues(uid),'items':items(uid),'owed':owed(uid)}
    if p=='issues':lib();return issues(None,True)
    if p=='students':
        lib();r=q("select * from users where role='student' order by name")
        for x in r:x.pop('pw');x['held']=len(issues(x['id'],True));x['owed']=owed(x['id'])
        return r
    if p=='fines':lib();return items()
    if p=='penalty':
        lib()
        try:a=int(b.get('amount'))
        except:a=0
        if a<=0 or not S('reason'):raise Err('Enter a valid amount and reason')
        if not q("select 1 from users where id=? and role='student'",(S('user_id'),)):raise Err('Select a student')
        q("insert into penalties(user_id,amount,reason,date) values(?,?,?,?)",(S('user_id'),a,S('reason'),today()));return {'ok':1}
    if p=='pay':
        k=b.get('kind');t='issues' if k=='issue' else 'penalties'
        r=q(f"select * from {t} where id=?",(b.get('id'),))
        if not r or (not L and r[0]['user_id']!=u['id']):raise Err('Record not found',404)
        r=r[0]
        if r['paid']:raise Err('Already paid')
        if k=='issue' and not r['returned']:raise Err('Book must be returned before paying the fine')
        rc='RCPT'+secrets.token_hex(3).upper();amt=r['fine'] if k=='issue' else r['amount']
        q(f"update {t} set paid=1,paid_on=?,method=?,receipt=? where id=?",(today(),S('method') or 'Cash',rc,r['id']));return {'receipt':rc,'amount':amt}
    if p=='stats':
        lib();a=issues(None,True);it=items()
        return {'titles':q("select count(*) c from books")[0]['c'],'students':q("select count(*) c from users where role='student'")[0]['c'],'issued':len(a),'overdue':len([i for i in a if i['late']]),'pending':sum(i['amount'] for i in it if not i['paid']),'collected':sum(i['amount'] for i in it if i['paid'])}
    raise Err('Not found',404)
class H(BaseHTTPRequestHandler):
    def send(s,c,b,t='application/json'):
        s.send_response(c);s.send_header('Content-Type',t);s.send_header('Content-Length',str(len(b)));s.end_headers();s.wfile.write(b)
    def go(s,m):
        u=urlparse(s.path)
        if u.path.startswith('/api/'):
            try:
                n=int(s.headers.get('Content-Length',0));b=json.loads(s.rfile.read(n)) if n else {}
                uid=SESS.get(s.headers.get('X-Token',''));usr=q("select * from users where id=?",(uid,))[0] if uid else None
                s.send(200,json.dumps(api(m,u.path[5:],{k:v[0] for k,v in parse_qs(u.query).items()},b,usr)).encode())
            except Err as e:s.send(e.c,json.dumps({'error':e.m}).encode())
            except Exception as e:s.send(500,json.dumps({'error':'Server error: '+str(e)}).encode())
        else:
            root=os.path.join(BASE,'static');f=os.path.normpath(os.path.join(root,'index.html' if u.path=='/' else u.path.lstrip('/')))
            if not f.startswith(root) or not os.path.isfile(f):return s.send(404,b'Not found','text/plain')
            s.send(200,open(f,'rb').read(),mimetypes.guess_type(f)[0] or 'text/plain')
    def do_GET(s):s.go('GET')
    def do_POST(s):s.go('POST')
    def log_message(s,*a):pass
if __name__=='__main__':
    init();port=int(os.environ.get('PORT',8000))
    print(f'Library Management System running at http://localhost:{port}  (Ctrl+C to stop)')
    ThreadingHTTPServer(('0.0.0.0',port),H).serve_forever()
