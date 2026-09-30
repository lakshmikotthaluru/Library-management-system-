const K='lms_db_v1',FINE=5,DAYS=14,MS=864e5;
const today=()=>new Date().toISOString().slice(0,10);
const addD=(d,n)=>new Date(new Date(d).getTime()+n*MS).toISOString().slice(0,10);
const diff=(a,b)=>Math.round((new Date(a)-new Date(b))/MS);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);
function seed(){
 const B=[['Introduction to Algorithms','Cormen','Computer Science','9780262033848',4],['Clean Code','Robert Martin','Programming','9780132350884',3],['Wings of Fire','A.P.J. Abdul Kalam','Biography','9788173711466',5],['Discovery of India','Jawaharlal Nehru','History','9780143031031',2],['Database System Concepts','Silberschatz','Computer Science','9780078022159',3],['Concepts of Physics','H.C. Verma','Physics','9788177091878',6],['The Alchemist','Paulo Coelho','Fiction','9780062315007',3],['Operating System Concepts','Galvin','Computer Science','9781118063330',2]];
 const d={books:B.map((b,i)=>({id:'B'+(i+1),title:b[0],author:b[1],cat:b[2],isbn:b[3],copies:b[4]})),
  users:[{id:'admin',name:'Head Librarian',pw:'admin123',role:'librarian'},{id:'s101',name:'Ravi Kumar',pw:'pass101',role:'student'},{id:'s102',name:'Anitha Reddy',pw:'pass102',role:'student'}],
  issues:[{id:1,bookId:'B2',userId:'s101',issued:addD(today(),-20),due:addD(today(),-6),returned:null,fine:0,paid:false},
          {id:2,bookId:'B3',userId:'s102',issued:addD(today(),-3),due:addD(today(),11),returned:null,fine:0,paid:false}],nid:3};
 localStorage.setItem(K,JSON.stringify(d));return d}
let db=JSON.parse(localStorage.getItem(K)||'null')||seed();
const save=()=>localStorage.setItem(K,JSON.stringify(db));
let me=JSON.parse(sessionStorage.getItem('me')||'null'),tab='';
const book=id=>db.books.find(b=>b.id==id)||{title:'(deleted)'};
const user=id=>db.users.find(u=>u.id==id)||{name:id};
const avail=b=>b.copies-db.issues.filter(i=>i.bookId==b.id&&!i.returned).length;
const fineOf=i=>i.returned?i.fine:Math.max(0,diff(today(),i.due))*FINE;
const lateDays=i=>Math.max(0,diff(i.returned||today(),i.due));
const owed=uid=>db.issues.filter(i=>i.userId==uid&&!i.paid).reduce((s,i)=>s+fineOf(i),0);

function login(){
 $('#app').innerHTML=`<div class="card login"><h1>📚 Library Login</h1><p class="note">Login as Student or Librarian</p>
 <select id="role"><option value="student">Student</option><option value="librarian">Librarian</option></select>
 <input id="uid" placeholder="User ID"><input id="pw" type="password" placeholder="Password">
 <button style="width:100%" onclick="doLogin()">Login</button><p id="err" style="color:#e53935"></p>
 <p class="note">Demo → Librarian: admin / admin123<br>Student: s101 / pass101</p></div>`}
function doLogin(){
 const u=db.users.find(x=>x.id==$('#uid').value.trim()&&x.pw==$('#pw').value&&x.role==$('#role').value);
 if(!u){$('#err').textContent='Invalid ID, password or role';return}
 me=u;sessionStorage.setItem('me',JSON.stringify(u));tab=u.role=='student'?'Search Books':'Dashboard';render()}
function logout(){sessionStorage.removeItem('me');me=null;login()}
function render(){
 if(!me)return login();
 const tabs=me.role=='student'?['Search Books','My Books','My Fines']:['Dashboard','Books','Issue / Return','Students','Fines'];
 $('#app').innerHTML=`<div class="top"><b>📚 Library Management System</b><span>${esc(me.name)} (${me.role}) <button onclick="logout()">Logout</button></span></div>
 <nav>${tabs.map(t=>`<button class="${t==tab?'on':''}" onclick="tab='${t}';render()">${t}</button>`).join('')}</nav><div class="card" id="main"></div>`;
 const v={'Search Books':search,'My Books':myBooks,'My Fines':myFines,Dashboard:dash,Books:books,'Issue / Return':issue,Students:students,Fines:fines}[tab];
 $('#main').innerHTML=v()}
function rows(q){q=(q||'').toLowerCase();
 return db.books.filter(b=>[b.title,b.author,b.cat,b.isbn,b.id].join(' ').toLowerCase().includes(q)).map(b=>{const a=avail(b);
 return `<tr><td>${b.id}</td><td>${esc(b.title)}</td><td>${esc(b.author)}</td><td>${esc(b.cat)}</td><td>${esc(b.isbn)}</td><td><span class="badge ${a?'ok':'bad'}">${a?a+' available':'Not available'}</span></td>${me.role=='librarian'?`<td><button class="red" onclick="delBook('${b.id}')">Delete</button></td>`:''}</tr>`}).join('')||'<tr><td colspan=7>No books found</td></tr>'}
const head=()=>`<tr><th>ID</th><th>Title</th><th>Author</th><th>Category</th><th>ISBN</th><th>Status</th>${me.role=='librarian'?'<th></th>':''}</tr>`;
function search(){return `<h2>🔍 Search Books</h2><input placeholder="Search by title, author, category or ISBN..." oninput="$('#res').innerHTML=rows(this.value)"><table>${head()}<tbody id="res">${rows('')}</tbody></table>`}
function myBooks(){const l=db.issues.filter(i=>i.userId==me.id);
 return `<h2>📖 My Issued Books</h2><p class="note">Loan period ${DAYS} days. Late fine ₹${FINE}/day.</p><table><tr><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Status</th><th>Fine</th></tr>${l.map(i=>{const late=lateDays(i);
 return `<tr><td>${esc(book(i.bookId).title)}</td><td>${i.issued}</td><td>${i.due}</td><td>${i.returned||'-'}</td><td>${i.returned?'<span class="badge ok">Returned</span>':late?`<span class="badge bad">Overdue ${late} day(s)</span>`:'<span class="badge warn">Issued</span>'}</td><td>₹${fineOf(i)}</td></tr>`}).join('')||'<tr><td colspan=6>No records</td></tr>'}</table>`}
function myFines(){const l=db.issues.filter(i=>i.userId==me.id&&fineOf(i)>0);
 return `<h2>💰 My Penalties</h2><div class="stat" style="background:#e53935">Outstanding fine<b>₹${owed(me.id)}</b></div><table><tr><th>Book</th><th>Due</th><th>Days late</th><th>Fine</th><th>Status</th></tr>${l.map(i=>`<tr><td>${esc(book(i.bookId).title)}</td><td>${i.due}</td><td>${lateDays(i)}</td><td>₹${fineOf(i)}</td><td>${i.paid?'<span class="badge ok">Paid</span>':'<span class="badge bad">Unpaid – pay at library</span>'}</td></tr>`).join('')||'<tr><td colspan=5>No fines 🎉</td></tr>'}</table>`}
function dash(){const act=db.issues.filter(i=>!i.returned),od=act.filter(i=>lateDays(i));
 const s=(c,t,n)=>`<div class="stat" style="background:${c}">${t}<b>${n}</b></div>`;
 return `<h2>Dashboard</h2><div class="stats">${s('#6c3fd1','Total Titles',db.books.length)}${s('#2e9e5b','Students',db.users.filter(u=>u.role=='student').length)}${s('#f59e0b','Books Issued',act.length)}${s('#e53935','Overdue',od.length)}${s('#0288d1','Fines Pending','₹'+db.issues.filter(i=>!i.paid).reduce((a,i)=>a+fineOf(i),0))}</div>`}
function books(){return `<h2>Manage Books</h2><div class="row"><input id="bt" placeholder="Title"><input id="ba" placeholder="Author"><input id="bc" placeholder="Category"><input id="bi" placeholder="ISBN"><input id="bn" type="number" min="1" value="1" placeholder="Copies"><button class="green" onclick="addBook()">Add Book</button></div>
 <input style="margin-top:10px" placeholder="Search books..." oninput="$('#res').innerHTML=rows(this.value)"><table>${head()}<tbody id="res">${rows('')}</tbody></table>`}
function addBook(){const t=$('#bt').value.trim();if(!t)return alert('Title required');
 const n=Math.max(0,...db.books.map(b=>+b.id.slice(1)))+1;db.books.push({id:'B'+n,title:t,author:$('#ba').value,cat:$('#bc').value,isbn:$('#bi').value,copies:+$('#bn').value||1});save();render()}
function delBook(id){if(db.issues.some(i=>i.bookId==id&&!i.returned))return alert('Book is currently issued');if(confirm('Delete book?')){db.books=db.books.filter(b=>b.id!=id);save();render()}}
function issue(){const st=db.users.filter(u=>u.role=='student'),act=db.issues.filter(i=>!i.returned);
 return `<h2>Issue Book</h2><div class="row"><select id="is">${st.map(u=>`<option value="${u.id}">${esc(u.id)} – ${esc(u.name)}</option>`).join('')}</select>
 <select id="ib">${db.books.filter(b=>avail(b)>0).map(b=>`<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select><button class="green" onclick="doIssue()">Issue (${DAYS} days)</button></div>
 <h2 style="margin-top:20px">Currently Issued</h2><table><tr><th>Student</th><th>Book</th><th>Due</th><th>Late</th><th>Fine</th><th></th></tr>${act.map(i=>`<tr><td>${esc(user(i.userId).name)}</td><td>${esc(book(i.bookId).title)}</td><td>${i.due}</td><td>${lateDays(i)||'-'}</td><td>₹${fineOf(i)}</td><td><button onclick="doReturn(${i.id})">Return</button></td></tr>`).join('')||'<tr><td colspan=6>None</td></tr>'}</table>`}
function doIssue(){const u=$('#is').value,b=$('#ib').value;if(!u||!b)return alert('Select student and book');
 if(owed(u)>0&&!confirm('Student has unpaid fine ₹'+owed(u)+'. Issue anyway?'))return;
 db.issues.push({id:db.nid++,bookId:b,userId:u,issued:today(),due:addD(today(),DAYS),returned:null,fine:0,paid:false});save();render()}
function doReturn(id){const i=db.issues.find(x=>x.id==id);i.fine=fineOf(i);i.returned=today();i.paid=i.fine==0;save();
 alert(i.fine?`Returned ${lateDays(i)} day(s) late. Penalty: ₹${i.fine}`:'Returned on time. No fine.');render()}
function students(){return `<h2>Students</h2><div class="row"><input id="sn" placeholder="Name"><input id="si" placeholder="Student ID"><input id="sp" placeholder="Password"><button class="green" onclick="addStu()">Add Student</button></div>
 <table><tr><th>ID</th><th>Name</th><th>Books Held</th><th>Fine Due</th></tr>${db.users.filter(u=>u.role=='student').map(u=>`<tr><td>${esc(u.id)}</td><td>${esc(u.name)}</td><td>${db.issues.filter(i=>i.userId==u.id&&!i.returned).length}</td><td>₹${owed(u.id)}</td></tr>`).join('')}</table>`}
function addStu(){const n=$('#sn').value.trim(),i=$('#si').value.trim(),p=$('#sp').value;if(!n||!i||!p)return alert('Fill all fields');
 if(db.users.some(u=>u.id==i))return alert('ID already exists');db.users.push({id:i,name:n,pw:p,role:'student'});save();render()}
function fines(){const l=db.issues.filter(i=>fineOf(i)>0);
 return `<h2>Penalty Records</h2><p class="note">Fine = days late × ₹${FINE}</p><table><tr><th>Student</th><th>Book</th><th>Due</th><th>Days late</th><th>Fine</th><th>Status</th></tr>${l.map(i=>`<tr><td>${esc(user(i.userId).name)}</td><td>${esc(book(i.bookId).title)}</td><td>${i.due}</td><td>${lateDays(i)}</td><td>₹${fineOf(i)}</td><td>${i.paid?'<span class="badge ok">Paid</span>':i.returned?`<button class="green" onclick="pay(${i.id})">Mark Paid</button>`:'<span class="badge bad">Not returned</span>'}</td></tr>`).join('')||'<tr><td colspan=6>No fines</td></tr>'}</table>`}
function pay(id){db.issues.find(i=>i.id==id).paid=true;save();render()}
if(me){tab=me.role=='student'?'Search Books':'Dashboard'}render();
