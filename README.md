# 📚 Library Management System

A web application for managing a college library, built with **Python (standard library only)** and **SQLite**. No packages to install.

## Features
- Separate **Student** and **Librarian** login (passwords stored hashed)
- Student self-registration with full details (name, ID, email, phone, department, year, address)
- Search books by title, author, category or ISBN, with live availability
- Librarian: add/delete books, issue and return books, register students, dashboard
- **Late-return penalty**: ₹5/day after the 14-day loan period, calculated automatically
- Librarian can **add manual penalties** (lost/damaged books)
- Students and librarians can **pay penalties** (Cash/UPI/Card) with a receipt number
- Limit of 3 books per student; issuing is warned when fines are unpaid

## Run locally
```bash
python server.py      # Windows: run.bat   |   Mac/Linux: ./run.sh
```
Open **http://localhost:8000**. The database `library.db` is created on first run.

## Demo logins
| Role | User ID | Password |
|---|---|---|
| Librarian | `admin` | `admin123` |
| Student | `s101` | `pass101` |
| Student | `s102` | `pass102` |

## Configuration
Edit `FINE`, `DAYS`, `MAXB` at the top of `server.py` (fine per day, loan days, max books). Set the `PORT` environment variable to change the port.

## Project structure
```
server.py        backend + REST API + SQLite database
static/          frontend (index.html, app.js, style.css)
```

> Note: GitHub Pages cannot run this app because it needs the Python backend. Run it locally, or deploy to a Python host such as Render or PythonAnywhere (start command: `python server.py`).
