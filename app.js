const STORAGE_BOOKS = "librasmart_books_v1";
const STORAGE_LOANS = "librasmart_loans_v1";

const seedBooks = [
  {id:1,title:"Clean Code",author:"Robert C. Martin",category:"Programming",isbn:"9780132350884",total:3,available:2},
  {id:2,title:"Java: The Complete Reference",author:"Herbert Schildt",category:"Java",isbn:"9781260440232",total:4,available:3},
  {id:3,title:"Database System Concepts",author:"Abraham Silberschatz",category:"Database",isbn:"9780078022159",total:3,available:3},
  {id:4,title:"Operating System Concepts",author:"Abraham Silberschatz",category:"Operating Systems",isbn:"9781119456339",total:2,available:1},
  {id:5,title:"Computer Networks",author:"Andrew S. Tanenbaum",category:"Networks",isbn:"9780132126953",total:3,available:3},
  {id:6,title:"Head First Java",author:"Kathy Sierra",category:"Java",isbn:"9780596009205",total:4,available:4},
  {id:7,title:"Artificial Intelligence: A Modern Approach",author:"Stuart Russell",category:"AI",isbn:"9780134610993",total:2,available:2},
  {id:8,title:"Web Development with HTML & CSS",author:"Jon Duckett",category:"Web Development",isbn:"9781118008188",total:3,available:3}
];

let books = JSON.parse(localStorage.getItem(STORAGE_BOOKS)) || seedBooks;
let loans = JSON.parse(localStorage.getItem(STORAGE_LOANS)) || [
  {id:101,bookId:1,username:"student",issueDate:"2026-09-01",dueDate:"2026-09-15",returnDate:null},
  {id:102,bookId:4,username:"student",issueDate:"2026-09-20",dueDate:"2026-10-04",returnDate:null}
];
let currentRole = "student";
let currentUser = "";

function save(){localStorage.setItem(STORAGE_BOOKS,JSON.stringify(books));localStorage.setItem(STORAGE_LOANS,JSON.stringify(loans));}
function $(id){return document.getElementById(id)}
function today(){return new Date().toISOString().slice(0,10)}
function formatDate(d){if(!d)return "—"; return new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}
function diffDays(later, earlier){return Math.max(0,Math.floor((new Date(later+"T00:00:00")-new Date(earlier+"T00:00:00"))/86400000))}
function penalty(loan){
  const end = loan.returnDate || today();
  return diffDays(end,loan.dueDate)*5;
}
function bookById(id){return books.find(b=>b.id===Number(id))}
function showToast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}
function totalPenaltyForUser(user){return loans.filter(l=>l.username===user).reduce((s,l)=>s+penalty(l),0)}
function isOverdue(l){return !l.returnDate && diffDays(today(),l.dueDate)>0}

document.querySelectorAll(".role-tab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".role-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active"); currentRole=btn.dataset.role;
  });
});

$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  const u=$("username").value.trim(), p=$("password").value;
  const ok=(currentRole==="student" && u==="student" && p==="student123") ||
           (currentRole==="librarian" && u==="librarian" && p==="admin123");
  if(!ok){showToast("Invalid username or password");return}
  currentUser=u;
  $("loginPage").classList.add("hidden");$("appPage").classList.remove("hidden");
  $("welcomeUser").textContent="Hi, "+u;
  $("roleBadge").textContent=currentRole==="student"?"Student":"Librarian";
  document.querySelectorAll(".student-only").forEach(x=>x.style.display=currentRole==="student"?"block":"none");
  document.querySelectorAll(".librarian-only").forEach(x=>x.style.display=currentRole==="librarian"?"block":"none");
  document.querySelector(".student-only-section").style.display=currentRole==="student"?"block":"none";
  document.querySelector(".librarian-only-section").style.display=currentRole==="librarian"?"block":"none";
  renderAll();
});

$("logoutBtn").addEventListener("click",()=>{
  $("appPage").classList.add("hidden");$("loginPage").classList.remove("hidden");
  $("loginForm").reset();currentUser="";
});

document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>openSection(btn.dataset.section)));
document.querySelectorAll("[data-section-link]").forEach(btn=>btn.addEventListener("click",()=>openSection(btn.dataset.sectionLink)));
function openSection(id){
  document.querySelectorAll(".page-section").forEach(s=>s.classList.remove("active"));
  $(id).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.section===id));
  renderAll();
}

$("dashboardSearchBtn").addEventListener("click",()=>{
  $("bookSearch").value=$("dashboardSearch").value;openSection("books");renderBooks();
});
$("dashboardSearch").addEventListener("keydown",e=>{if(e.key==="Enter")$("dashboardSearchBtn").click()});
$("bookSearch").addEventListener("input",renderBooks);
$("categoryFilter").addEventListener("change",renderBooks);
$("availabilityFilter").addEventListener("change",renderBooks);

function renderAll(){
  $("totalBooks").textContent=books.reduce((s,b)=>s+b.total,0);
  $("availableBooks").textContent=books.reduce((s,b)=>s+b.available,0);
  const relevant=loans.filter(l=>currentRole==="librarian"||l.username===currentUser);
  $("activeLoans").textContent=relevant.filter(l=>!l.returnDate).length;
  $("totalPenalty").textContent="₹"+totalPenaltyForUser(currentUser);
  $("dashboardGreeting").textContent=currentRole==="librarian"?"Manage books, loans and penalties from one place.":"Search books, check your loans and monitor late penalties.";
  renderRecent();renderCategories();renderBooks();renderLoans();renderPenalties();renderManage();
}
function renderRecent(){
  $("recentBooks").innerHTML=books.slice(0,4).map(book=>`
    <div class="book-card"><div class="book-icon">📘</div><h3>${escapeHtml(book.title)}</h3>
    <div class="author">${escapeHtml(book.author)}</div><span class="category">${escapeHtml(book.category)}</span>
    <div class="book-meta"><span>${book.available} available</span><span>${book.total} copies</span></div></div>`).join("");
}
function renderCategories(){
  const cats=[...new Set(books.map(b=>b.category))].sort();
  $("categoryFilter").innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
}
function renderBooks(){
  const q=$("bookSearch").value.toLowerCase().trim(), cat=$("categoryFilter").value, av=$("availabilityFilter").value;
  const result=books.filter(b=>{
    const text=(b.title+" "+b.author+" "+b.category+" "+b.isbn).toLowerCase();
    return (!q||text.includes(q))&&(!cat||b.category===cat)&&(!av||(av==="available"?b.available>0:b.available===0));
  });
  $("bookGrid").innerHTML=result.length?result.map(b=>`
    <div class="book-card"><div class="book-icon">📚</div><h3>${escapeHtml(b.title)}</h3>
    <div class="author">by ${escapeHtml(b.author)}</div><span class="category">${escapeHtml(b.category)}</span>
    <div class="book-meta"><span>ISBN: ${escapeHtml(b.isbn)}</span><span>${b.available}/${b.total} free</span></div>
    ${currentRole==="student"?`<button class="primary-btn" onclick="issueBook(${b.id})" ${b.available===0?"disabled":""}>${b.available?"Issue Book":"Not Available"}</button>`:""}
    </div>`).join(""):'<div class="empty">No books found.</div>';
}
function issueBook(id){
  const book=bookById(id); if(!book||book.available<1)return;
  if(loans.some(l=>l.bookId===id&&l.username===currentUser&&!l.returnDate)){showToast("You already have this book.");return}
  const issue=new Date(); const due=new Date(issue); due.setDate(due.getDate()+14);
  const iso=d=>d.toISOString().slice(0,10);
  loans.push({id:Date.now(),bookId:id,username:currentUser,issueDate:iso(issue),dueDate:iso(due),returnDate:null});
  book.available--;save();showToast("Book issued successfully.");renderAll();
}
function returnBook(id){
  const loan=loans.find(l=>l.id===id);if(!loan||loan.returnDate)return;
  loan.returnDate=today();const b=bookById(loan.bookId);if(b)b.available++;
  save();showToast("Book returned. Penalty: ₹"+penalty(loan));renderAll();
}
function renderLoans(){
  const data=loans.filter(l=>currentRole==="librarian"||l.username===currentUser);
  $("loanTable").innerHTML=data.length?data.map(l=>{
    const b=bookById(l.bookId), late=isOverdue(l), pen=penalty(l);
    const status=l.returnDate?"Returned":late?"Overdue":"Active";
    return `<tr><td><b>${escapeHtml(b?.title||"Unknown")}</b></td><td>${escapeHtml(l.username)}</td><td>${formatDate(l.issueDate)}</td><td>${formatDate(l.dueDate)}</td><td>${formatDate(l.returnDate)}</td><td><span class="status ${status.toLowerCase()}">${status}</span></td><td>₹${pen}</td><td>${!l.returnDate&&currentRole==="student"&&l.username===currentUser?`<button class="small-btn" onclick="returnBook(${l.id})">Return</button>`:"—"}</td></tr>`
  }).join(""):'<tr><td colspan="8" class="empty">No loan records.</td></tr>';
  $("loanDescription").textContent=currentRole==="librarian"?"View all student loan records and late penalties.":"Track your issued books and due dates.";
}
function renderPenalties(){
  if(currentRole!=="student")return;
  const data=loans.filter(l=>l.username===currentUser&&penalty(l)>0);
  const total=data.reduce((s,l)=>s+penalty(l),0);
  $("penaltyPageTotal").textContent="₹"+total;
  $("penaltyTable").innerHTML=data.length?data.map(l=>{
    const b=bookById(l.bookId), end=l.returnDate||today(), days=diffDays(end,l.dueDate);
    return `<tr><td>${escapeHtml(b?.title||"Unknown")}</td><td>${formatDate(l.dueDate)}</td><td>${formatDate(l.returnDate)}</td><td>${days}</td><td>₹5/day</td><td><b>₹${penalty(l)}</b></td></tr>`
  }).join(""):'<tr><td colspan="6" class="empty">No penalties. Great job! 🎉</td></tr>';
}
function renderManage(){
  if(currentRole!=="librarian")return;
  $("manageTotal").textContent=books.reduce((s,b)=>s+b.total,0);
  $("manageAvailable").textContent=books.reduce((s,b)=>s+b.available,0);
  $("manageIssued").textContent=books.reduce((s,b)=>s+(b.total-b.available),0);
  $("managePenalty").textContent="₹"+loans.reduce((s,l)=>s+penalty(l),0);
  $("manageBookTable").innerHTML=books.map(b=>`<tr><td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td><td>${escapeHtml(b.category)}</td><td>${escapeHtml(b.isbn)}</td><td>${b.available}</td><td>${b.total}</td></tr>`).join("");
}
$("addBookForm").addEventListener("submit",e=>{
  e.preventDefault();
  const copies=Number($("newCopies").value);
  books.push({id:Date.now(),title:$("newTitle").value.trim(),author:$("newAuthor").value.trim(),category:$("newCategory").value.trim(),isbn:$("newIsbn").value.trim(),total:copies,available:copies});
  save();e.target.reset();$("newCopies").value=1;showToast("Book added successfully.");renderAll();
});
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
save();
