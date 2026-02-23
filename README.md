# 📝 Kanban_Board - Real-Time Collaborative Kanban Board

A modern, real-time Kanban board application built with React and WebSockets, featuring team collaboration, user authentication, and beautiful visualizations.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socket.io)
![MySQL](https://img.shields.io/badge/MySQL-8.x-blue?logo=mysql)
![Vite](https://img.shields.io/badge/Vite-5.x-purple?logo=vite)

---

## ✨ Features

### 🎯 Task Management

- **Drag & Drop** - Seamlessly move tasks between To Do, In Progress, and Done columns
- **Priority Levels** - Assign High, Medium, or Low priority with color-coded cards
- **Categories** - Organize tasks as Bug, Feature, or Enhancement
- **Real-time Sync** - Changes reflect instantly across all connected users

### 👥 Team Collaboration

- **Create Teams** - Build teams and invite members by email
- **Shared Boards** - Team members see all team tasks in real-time
- **Task Assignment** - Assign tasks to specific team members
- **Personal + Team View** - Tasks assigned to you appear on your personal board

### 📊 Visualizations

- **Progress Overview** - Bar chart showing task distribution across columns
- **Priority Analysis** - Pie chart displaying tasks by priority level
- **Live Updates** - Charts update in real-time as tasks move

### 🔐 Authentication

- **User Accounts** - Secure signup and login with password hashing
- **Session Management** - Persistent login with localStorage
- **Protected Routes** - Authenticated access to boards

### 🎨 User Experience

- **Dark/Light Theme** - Toggle between themes with a single click
- **Responsive Design** - Works beautifully on desktop and tablet
- **Modern UI** - Clean, professional aesthetic with smooth animations

---

## 📌 What is Kanban?

Kanban is a **workflow management system** that visually organizes tasks into columns representing different stages of work.

### 🏗 Example Board:

```
To Do       In Progress      Done
----------------------------------
Task A   →  Task B        →  Task C
Task D   →  Task E        →  Task F
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.x
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/Kanban_Board.git
   cd Kanban_Board
   ```

2. **Set up the database**

   Create a MySQL database and configure your credentials in `backend/db.js`.

3. **Install dependencies**

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Start the application**

   ```bash
   # Terminal 1 - Backend (port 4000)
   cd backend
   node server.js

   # Terminal 2 - Frontend (port 5173)
   cd frontend
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 📂 Project Structure

```
taskflow-kanban/
├── backend/
│   ├── server.js          # Express + Socket.IO server
│   ├── db.js              # MySQL connection
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── KanbanBoard.jsx      # Personal task board
│   │   │   ├── TeamKanbanBoard.jsx  # Team collaboration board
│   │   │   ├── TeamsModal.jsx       # Team management modal
│   │   │   ├── Login.jsx            # Authentication
│   │   │   └── ThemeToggle.jsx      # Dark/light mode
│   │   ├── context/
│   │   │   └── ThemeContext.jsx     # Theme state management
│   │   ├── App.jsx
│   │   └── index.css                # Global styles
│   └── package.json
│
└── README.md
```

---

## 🛠 Tech Stack

| Layer       | Technology                       |
| ----------- | -------------------------------- |
| Frontend    | React 19, Vite, React Router     |
| Styling     | CSS Variables, CSS Grid, Flexbox |
| Drag & Drop | @hello-pangea/dnd                |
| Charts      | Recharts                         |
| Real-time   | Socket.IO                        |
| Backend     | Node.js, Express                 |
| Database    | MySQL                            |
| Auth        | bcrypt                           |

---

### Personal Board

Clean, minimal interface for managing your personal tasks with drag-and-drop functionality.

### Team Board

Collaborative workspace where team members can create and assign tasks in real-time.

### Dark Mode

Easy on the eyes with a sleek dark theme option.

---

## 🔮 Future Enhancements

- [ ] Due dates and reminders
- [ ] File attachments
- [ ] Task comments
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Keyboard shortcuts

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

Built with ❤️ using React and Socket.IO
