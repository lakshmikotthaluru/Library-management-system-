const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let tok=sessionStorage.tok||'',me=JSON.parse(sessionStorage.me||'null'),tab='',mode='login';
async function api(p,b,quiet){const r=await fetch('/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json','X-Token':tok},body:b?JSON.stringify(b):undefined});const d=await r.json();
 if(!r.ok){if(r.status==401&&tok){logout();}if(!quiet)alert(d.error);throw new Error(d.error)}return d}
const F=[['name','Full Name'],['id','Student ID / Roll No'],['email','Email','email'],['phone','Phone Number'],['dept','Department'],['year','Year / Semester'],['address','Address'],['pw','Password','password']];
const regForm=()=>`<div class="row">${F.map(f=>`<input id="r_${f[0]}" type="${f[2]||'text'}" placeholder="${f[1]}">`).join('')}</div><button class="green" onclick="doReg()">Register Student</button>`;
async function doReg(){const b={};F.forEach(f=>b[f[0]]=$('#r_'+f[0]).value);await api('register',b);alert('Student registered successfully');if(me)render();else{mode='login';login()}}
function login(){$('#app').innerHTML=mode=='login'?`<div class="card login"><h1>📚 Library Login</h1><select id="role"><option value="student">Student</option><option value="librarian">Librarian</option></select>
 <input id="uid" placeholder="User ID" autofocus onkeydown="if(event.key=='Enter')doLogin()"><input id="pw" type="password" placeholder="Password" onkeydown="if(event.key=='Enter')doLogin()"><button id="lb" style="width:100%" onclick="doLogin()">Login</button><p id="err" style="color:#e53935;font-weight:600;margin:6px 0"></p>
 <p>New student? <a href="#" onclick="mode='reg';login()">Register here</a></p><p class="note">Demo → Librarian: admin / admin123<br>Student: s101 / pass101</p></div>`
 :`<div class="card"><h2>📝 Student Registration</h2>${regForm()}<p><a href="#" onclick="mode='login';login()">← Back to login</a></p></div>`}
async function doLogin(){try{const d=await api('login',{role:$('#role').value,id:$('#uid').value.trim(),pw:$('#pw').value},true);tok=d.token;me=d.user;sessionStorage.tok=tok;sessionStorage.me=JSON.stringify(me);tab=me.role=='student'?'Search Books':'Dashboard';render()}catch(e){$('#err').textContent=e.message}}
function logout(){sessionStorage.clear();tok='';me=null;mode='login';login()}
async function render(){if(!me)return login();
 const tabs=me.role=='student'?['Search Books','My Books','My Fines','Profile']:['Dashboard','Books','Issue / Return','Students','Fines'];
 $('#app').innerHTML=`<div class="top"><b>📚 Library Management System</b><span>${esc(me.name)} (${me.role}) <button onclick="logout()">Logout</button></span></div>
 <nav>${tabs.map(t=>`<button class="${t==tab?'on':''}" onclick="tab='${t}';render()">${t}</button>`).join('')}</nav><div class="card" id="main">Loading...</div>`;
 const v={'Search Books':search,'My Books':myBooks,'My Fines':myFines,Profile:profile,Dashboard:dash,Books:books,'Issue / Return':issue,Students:students,Fines:fines}[tab];
 try{$('#main').innerHTML=await v()}catch(e){}}
const L=()=>me.role=='librarian';
const rows=l=>l.map(b=>`<tr><td>${b.id}</td><td>${esc(b.title)}</td><td>${esc(b.author)}</td><td>${esc(b.cat)}</td><td>${esc(b.isbn)}</td><td><span class="badge ${b.avail?'ok':'bad'}">${b.avail?b.avail+' available':'Not available'}</span></td>${L()?`<td><button class="red" onclick="delBook(${b.id})">Delete</button></td>`:''}</tr>`).join('')||'<tr><td colspan=7>No books found</td></tr>';
const head=()=>`<tr><th>ID</th><th>Title</th><th>Author</th><th>Category</th><th>ISBN</th><th>Status</th>${L()?'<th></th>':''}</tr>`;
async function find(v){$('#res').innerHTML=rows(await api('books?q='+encodeURIComponent(v)))}
async function search(){return `<h2>🔍 Search Books</h2><input placeholder="Search by title, author, category or ISBN..." oninput="find(this.value)"><table>${head()}<tbody id="res">${rows(await api('books'))}</tbody></table>`}
async function myBooks(){const d=await api('my');
 return `<h2>📖 My Issued Books</h2><p class="note">Loan period 14 days. Late fine ₹5 per day.</p><table><tr><th>Book</th><th>Issued</th><th>Due</th><th>Returned</th><th>Status</th><th>Fine</th></tr>${d.issues.map(i=>`<tr><td>${esc(i.title)}</td><td>${i.issued}</td><td>${i.due}</td><td>${i.returned||'-'}</td><td>${i.returned?'<span class="badge ok">Returned</span>':i.late?`<span class="badge bad">Overdue ${i.late} day(s)</span>`:'<span class="badge warn">Issued</span>'}</td><td>₹${i.fine_now}</td></tr>`).join('')||'<tr><td colspan=6>No records</td></tr>'}</table>`}
const payCell=it=>it.paid?`<span class="badge ok">Paid</span> <small>${esc(it.method)} · ${esc(it.receipt)}<br>${esc(it.paid_on)}</small>`:!it.ready?'<span class="badge warn">Return book first</span>':`<select id="m${it.kind}${it.id}" style="width:auto"><option>Cash</option><option>UPI</option><option>Card</option></select> <button class="green" onclick="pay('${it.kind}',${it.id})">Pay ₹${it.amount}</button>`;
async function pay(k,id){const r=await api('pay',{kind:k,id,method:$('#m'+k+id).value});alert(`Payment received!\nReceipt: ${r.receipt}\nAmount: ₹${r.amount}`);render()}
const itemTable=(l,who)=>`<table><tr>${who?'<th>Student</th>':''}<th>Details</th><th>Amount</th><th>Payment</th></tr>${l.map(i=>`<tr>${who?`<td>${esc(i.name)} (${esc(i.user_id)})</td>`:''}<td>${esc(i.desc)}</td><td>₹${i.amount}</td><td>${payCell(i)}</td></tr>`).join('')||'<tr><td colspan=4>No penalties 🎉</td></tr>'}</table>`;
async function myFines(){const d=await api('my');return `<h2>💰 My Penalties</h2><div class="stat" style="background:#e53935">Outstanding<b>₹${d.owed}</b></div>${itemTable(d.items)}`}
async function profile(){const u=me;return `<h2>👤 My Profile</h2><table>${[['Name',u.name],['Student ID',u.id],['Email',u.email],['Phone',u.phone],['Department',u.dept],['Year',u.year],['Address',u.address],['Registered',u.created]].map(r=>`<tr><th>${r[0]}</th><td>${esc(r[1])}</td></tr>`).join('')}</table>`}
async function dash(){const s=await api('stats'),c=(bg,t,n)=>`<div class="stat" style="background:${bg}">${t}<b>${n}</b></div>`;
 return `<h2>Dashboard</h2><div class="stats">${c('#6c3fd1','Book Titles',s.titles)}${c('#2e9e5b','Students',s.students)}${c('#f59e0b','Books Issued',s.issued)}${c('#e53935','Overdue',s.overdue)}${c('#0288d1','Fines Pending','₹'+s.pending)}${c('#00897b','Fines Collected','₹'+s.collected)}</div>`}
async function books(){return `<h2>Manage Books</h2><div class="row"><input id="bt" placeholder="Title"><input id="ba" placeholder="Author"><input id="bc" placeholder="Category"><input id="bi" placeholder="ISBN"><input id="bn" type="number" min="1" value="1"><button class="green" onclick="addBook()">Add Book</button></div>
 <input style="margin-top:10px" placeholder="Search books..." oninput="find(this.value)"><table>${head()}<tbody id="res">${rows(await api('books'))}</tbody></table>`}
async function addBook(){await api('books',{title:$('#bt').value,author:$('#ba').value,cat:$('#bc').value,isbn:$('#bi').value,copies:$('#bn').value});render()}
async function delBook(id){if(confirm('Delete this book?')){await api('books/delete',{id});render()}}
async function issue(){const [st,bk,act]=await Promise.all([api('students'),api('books'),api('issues')]);
 return `<h2>Issue Book</h2><div class="row"><select id="is">${st.map(u=>`<option value="${esc(u.id)}">${esc(u.id)} – ${esc(u.name)}</option>`).join('')}</select>
 <select id="ib">${bk.filter(b=>b.avail>0).map(b=>`<option value="${b.id}">${esc(b.title)} (${b.avail})</option>`).join('')}</select><button class="green" onclick="doIssue()">Issue (14 days)</button></div>
 <h2 style="margin-top:20px">Currently Issued</h2><table><tr><th>Student</th><th>Book</th><th>Due</th><th>Late</th><th>Fine</th><th></th></tr>${act.map(i=>`<tr><td>${esc(i.name)}</td><td>${esc(i.title)}</td><td>${i.due}</td><td>${i.late||'-'}</td><td>₹${i.fine_now}</td><td><button onclick="doReturn(${i.id})">Return</button></td></tr>`).join('')||'<tr><td colspan=6>None</td></tr>'}</table>`}
async function doIssue(){const b={user_id:$('#is').value,book_id:+$('#ib').value};
 try{await api('issue',b,true)}catch(e){if(e.message.startsWith('UNPAID:')){if(!confirm('Student has unpaid penalty ₹'+e.message.slice(7)+'. Issue anyway?'))return;await api('issue',{...b,force:1})}else return alert(e.message)}render()}
async function doReturn(id){const r=await api('return',{id});alert(r.fine?`Returned ${r.late} day(s) late. Penalty: ₹${r.fine} (see Fines tab to collect)`:'Returned on time. No fine.');render()}
async function students(){const s=await api('students');
 return `<h2>Register New Student</h2>${regForm()}<h2 style="margin-top:22px">All Students</h2><div style="overflow-x:auto"><table><tr><th>ID</th><th>Name</th><th>Dept / Year</th><th>Email</th><th>Phone</th><th>Address</th><th>Books</th><th>Fine Due</th></tr>${s.map(u=>`<tr><td>${esc(u.id)}</td><td>${esc(u.name)}</td><td>${esc(u.dept)} / ${esc(u.year)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${esc(u.address)}</td><td>${u.held}</td><td>₹${u.owed}</td></tr>`).join('')}</table></div>`}
async function fines(){const [st,it]=await Promise.all([api('students'),api('fines')]);
 return `<h2>➕ Add Penalty</h2><div class="row"><select id="pu">${st.map(u=>`<option value="${esc(u.id)}">${esc(u.id)} – ${esc(u.name)}</option>`).join('')}</select><input id="pa" type="number" min="1" placeholder="Amount ₹"><input id="pr" placeholder="Reason (e.g. lost / damaged book)"><button class="red" onclick="addPen()">Add Penalty</button></div>
 <h2 style="margin-top:20px">Penalty Records</h2><p class="note">Late fine = days late × ₹5 (added automatically). Payment can be collected once the book is returned.</p>${itemTable(it,1)}`}
async function addPen(){await api('penalty',{user_id:$('#pu').value,amount:$('#pa').value,reason:$('#pr').value});render()}
render();
