# 📚 Library Management System (Full Stack)

**Stack:** Node.js + Express (backend REST API) · SQLite (database) · HTML/CSS/JavaScript (frontend)

## Features
- Student and Librarian login (passwords hashed with PBKDF2)
- Student registration with full details (name, ID, email, phone, department, year, address)
- Search books by title, author, category or ISBN with live availability
- Librarian: add/delete books, issue/return books, register students, dashboard statistics
- Late-return penalty: ₹5/day after 14 days (automatic) + manual penalties (lost/damaged books)
- Pay penalties (Cash/UPI/Card) with receipt numbers; max 3 books per student

## Run
```bash
npm install
npm start
```
Open **http://localhost:8000**. The database file `library.db` is created automatically.

## Demo logins
| Role | User ID | Password |
|---|---|---|
| Librarian | admin | admin123 |
| Student | s101 | pass101 |
| Student | s102 | pass102 |

## Structure
```
server.js     Express server, REST API, SQLite database logic
public/       Frontend (index.html, app.js, style.css)
package.json  Dependencies and start script
```
Change `FINE`, `DAYS`, `MAXB` at the top of `server.js` for fine per day, loan days and book limit.
