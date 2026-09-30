# LibraSmart - Library Management System

A complete beginner-friendly web application for managing a library.

## Features

- Student login
- Librarian login
- Book search by title, author, category and ISBN
- Category and availability filters
- Student book issue
- Student book return
- Automatic 14-day due date
- Automatic late penalty: ₹5 per late day per book
- Student penalty page
- Librarian loan monitoring
- Librarian book management
- Add new books
- Dashboard statistics
- Responsive design for mobile and laptop
- Data persistence using browser localStorage

## Demo Login

### Student
- Username: `student`
- Password: `student123`

### Librarian
- Username: `librarian`
- Password: `admin123`

## How to Run

### Method 1 - Simple
1. Extract the ZIP file.
2. Open the extracted folder.
3. Double-click `index.html`.
4. Login using one of the demo accounts.

### Method 2 - VS Code
1. Open the project folder in VS Code.
2. Open `index.html`.
3. Install the **Live Server** extension if you have it.
4. Right-click `index.html`.
5. Select **Open with Live Server**.

## Project Structure

```text
library_management_system/
│
├── index.html
├── README.md
│
├── css/
│   └── style.css
│
└── js/
    └── app.js
```

## Important Note

This version is a frontend/demo application. It uses browser localStorage instead of a real server database. Therefore, login accounts are demo credentials and data is stored only in the browser.

For a production project, the next upgrade would be:

Frontend -> Java/Spring Boot or Flask backend -> MySQL database
