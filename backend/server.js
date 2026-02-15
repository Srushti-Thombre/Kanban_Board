const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"], 
    methods: ["GET", "POST"] 
  }
});

app.use(cors());
app.use(express.json());

let tasks = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send all tasks on connect
  socket.emit('sync:tasks', tasks);

  // Manual refresh request
  socket.on('get:tasks', () => {
    socket.emit('sync:tasks', tasks);
  });

  // Create task
  socket.on('task:create', (newTask) => {
    const task = { 
      id: Date.now().toString(),
      status: 'todo',           // ← Critical: always default to todo
      ...newTask,
      createdAt: new Date().toISOString()
    };
    tasks.push(task);
    console.log('New task created:', task.title, '→ status:', task.status);
    io.emit('task:created', task);
  });

  socket.on('task:updated', (updatedTask) => {
    tasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    io.emit('task:updated', updatedTask);
  });

  socket.on('task:move', ({ id, newStatus }) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = newStatus;
      console.log(`Task ${id} moved to ${newStatus}`);
      io.emit('task:updated', task);
    }
  });

  socket.on('task:delete', (id) => {
    tasks = tasks.filter(t => t.id !== id);
    io.emit('task:deleted', id);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});