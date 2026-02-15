const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./db');

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

/* =========================
   🔐 AUTH ROUTES
========================= */

// SIGNUP
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, email, hashedPassword], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: "User already exists" });
      }

      res.json({ message: "User registered successfully" });
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Server error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      userId: user.id,
      name: user.name
    });
  });
});

/* =========================
   � TEAM ROUTES
========================= */

// Create a new team
app.post("/teams", (req, res) => {
  const { name, description, createdBy } = req.body;
  
  const sql = "INSERT INTO teams (name, description, created_by) VALUES (?, ?, ?)";
  db.query(sql, [name, description || '', createdBy], (err, result) => {
    if (err) {
      console.error('Error creating team:', err);
      return res.status(500).json({ message: "Failed to create team" });
    }
    
    const teamId = result.insertId;
    
    // Add creator as admin member
    const memberSql = "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'admin')";
    db.query(memberSql, [teamId, createdBy], (err) => {
      if (err) {
        console.error('Error adding creator as member:', err);
      }
      
      res.json({ 
        message: "Team created successfully", 
        teamId,
        name 
      });
    });
  });
});

// Get all teams for a user
app.get("/teams/:userId", (req, res) => {
  const { userId } = req.params;
  
  const sql = `
    SELECT t.*, gm.role, u.name as creator_name,
           (SELECT COUNT(*) FROM group_members WHERE group_id = t.id) as member_count
    FROM teams t
    INNER JOIN group_members gm ON t.id = gm.group_id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE gm.user_id = ?
    ORDER BY t.created_at DESC
  `;
  
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching teams:', err);
      return res.status(500).json({ message: "Failed to fetch teams" });
    }
    res.json(results);
  });
});

// Get team details with members
app.get("/teams/:teamId/details", (req, res) => {
  const { teamId } = req.params;
  
  const teamSql = "SELECT * FROM teams WHERE id = ?";
  const membersSql = `
    SELECT u.id, u.name, u.email, gm.role, gm.joined_at
    FROM group_members gm
    INNER JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
  `;
  
  db.query(teamSql, [teamId], (err, teamResults) => {
    if (err || teamResults.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    db.query(membersSql, [teamId], (err, memberResults) => {
      if (err) {
        return res.status(500).json({ message: "Failed to fetch members" });
      }
      
      res.json({
        ...teamResults[0],
        members: memberResults
      });
    });
  });
});

// Search users by email (for adding to team)
app.get("/users/search", (req, res) => {
  const { email } = req.query;
  
  if (!email || email.length < 2) {
    return res.json([]);
  }
  
  const sql = "SELECT id, name, email FROM users WHERE email LIKE ? LIMIT 10";
  db.query(sql, [`%${email}%`], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Search failed" });
    }
    res.json(results);
  });
});

// Add member to team
app.post("/teams/:teamId/members", (req, res) => {
  const { teamId } = req.params;
  const { userId, role = 'member' } = req.body;
  
  // Check if user exists
  const checkUserSql = "SELECT id FROM users WHERE id = ?";
  db.query(checkUserSql, [userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const sql = "INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)";
    db.query(sql, [teamId, userId, role], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: "User already in team" });
        }
        return res.status(500).json({ message: "Failed to add member" });
      }
      res.json({ message: "Member added successfully" });
    });
  });
});

// Remove member from team
app.delete("/teams/:teamId/members/:userId", (req, res) => {
  const { teamId, userId } = req.params;
  
  const sql = "DELETE FROM group_members WHERE group_id = ? AND user_id = ?";
  db.query(sql, [teamId, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Failed to remove member" });
    }
    res.json({ message: "Member removed successfully" });
  });
});

/* =========================
   �📋 REAL-TIME TASK SYSTEM
========================= */

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  let currentUserId = null;
  let currentTeamId = null;

  // Helper function to map task from DB to frontend format
  const mapTask = (task) => ({
    id: task.id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    createdAt: task.created_at,
    teamId: task.group_id,
    assignedTo: task.assigned_to,
    assignedToName: task.assigned_to_name || null,
    createdByName: task.created_by_name || null
  });

  // Set user and fetch their personal tasks (including assigned team tasks)
  socket.on('set:user', (userId) => {
    currentUserId = parseInt(userId, 10);
    currentTeamId = null; // Reset team context
    console.log('User set:', currentUserId);
    
    // Fetch personal tasks AND tasks assigned to this user from teams
    const sql = `
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.user_id = creator.id
      WHERE (t.user_id = ? AND t.group_id IS NULL) 
         OR t.assigned_to = ?
      ORDER BY t.created_at DESC
    `;
    db.query(sql, [currentUserId, currentUserId], (err, results) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        socket.emit('sync:tasks', []);
        return;
      }
      console.log('Found tasks:', results.length);
      const tasks = results.map(mapTask);
      socket.emit('sync:tasks', tasks);
    });
  });

  // Join a team room and fetch team tasks
  socket.on('join:team', (teamId) => {
    if (currentTeamId) {
      socket.leave(`team:${currentTeamId}`);
    }
    currentTeamId = parseInt(teamId, 10);
    socket.join(`team:${currentTeamId}`);
    console.log('User', currentUserId, 'joined team:', currentTeamId);
    
    const sql = `
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.user_id = creator.id
      WHERE t.group_id = ?
      ORDER BY t.created_at DESC
    `;
    db.query(sql, [currentTeamId], (err, results) => {
      if (err) {
        console.error('Error fetching team tasks:', err);
        socket.emit('sync:team-tasks', []);
        return;
      }
      const tasks = results.map(mapTask);
      socket.emit('sync:team-tasks', tasks);
    });
  });

  // Leave team context and go back to personal board
  socket.on('leave:team', () => {
    if (currentTeamId) {
      socket.leave(`team:${currentTeamId}`);
      currentTeamId = null;
    }
    // Re-fetch personal tasks
    socket.emit('set:user', currentUserId);
  });

  socket.on('get:tasks', () => {
    if (!currentUserId) {
      socket.emit('sync:tasks', []);
      return;
    }
    
    const sql = `
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.user_id = creator.id
      WHERE (t.user_id = ? AND t.group_id IS NULL) 
         OR t.assigned_to = ?
      ORDER BY t.created_at DESC
    `;
    db.query(sql, [currentUserId, currentUserId], (err, results) => {
      if (err) {
        console.error('Error fetching tasks:', err);
        socket.emit('sync:tasks', []);
        return;
      }
      const tasks = results.map(mapTask);
      socket.emit('sync:tasks', tasks);
    });
  });

  socket.on('task:create', (newTask) => {
    if (!currentUserId) {
      console.error('No user set, cannot create task');
      return;
    }

    const teamId = newTask.teamId || currentTeamId || null;
    const assignedTo = newTask.assignedTo || null;
    
    const sql = "INSERT INTO tasks (user_id, title, description, status, priority, category, group_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const values = [currentUserId, newTask.title, newTask.description || '', 'todo', newTask.priority, newTask.category, teamId, assignedTo];
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error creating task:', err);
        return;
      }
      
      // Fetch the created task with names
      const fetchSql = `
        SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users creator ON t.user_id = creator.id
        WHERE t.id = ?
      `;
      db.query(fetchSql, [result.insertId], (err, results) => {
        if (err || results.length === 0) return;
        
        const task = mapTask(results[0]);
        console.log('New task created:', task.title, 'Team:', teamId);
        
        // Emit to creator
        socket.emit('task:created', task);
        
        // If team task, emit to team room
        if (teamId) {
          socket.to(`team:${teamId}`).emit('task:created', task);
        }
        
        // If assigned to someone else, they'll see it in their personal board
      });
    });
  });

  socket.on('task:updated', (updatedTask) => {
    const assignedTo = updatedTask.assignedTo || null;
    const sql = "UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, category = ?, assigned_to = ? WHERE id = ?";
    const values = [updatedTask.title, updatedTask.description, updatedTask.status, updatedTask.priority, updatedTask.category, assignedTo, updatedTask.id];
    
    db.query(sql, values, (err) => {
      if (err) {
        console.error('Error updating task:', err);
        return;
      }
      
      // Fetch updated task with names
      const fetchSql = `
        SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users creator ON t.user_id = creator.id
        WHERE t.id = ?
      `;
      db.query(fetchSql, [updatedTask.id], (err, results) => {
        if (err || results.length === 0) return;
        
        const task = mapTask(results[0]);
        socket.emit('task:updated', task);
        
        // If team task, emit to team room
        if (task.teamId) {
          socket.to(`team:${task.teamId}`).emit('task:updated', task);
        }
      });
    });
  });

  socket.on('task:move', ({ id, newStatus }) => {
    console.log('Moving task:', id, 'to status:', newStatus, 'for user:', currentUserId);
    const taskId = parseInt(id, 10);
    
    // Allow moving if user is owner, assignee, or it's a team task they're part of
    const sql = "UPDATE tasks SET status = ? WHERE id = ?";
    
    db.query(sql, [newStatus, taskId], (err, result) => {
      if (err) {
        console.error('Error moving task:', err);
        return;
      }
      console.log('Task move result - affected rows:', result.affectedRows);
      
      // Fetch the updated task with names
      const fetchSql = `
        SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN users creator ON t.user_id = creator.id
        WHERE t.id = ?
      `;
      db.query(fetchSql, [taskId], (err, results) => {
        if (err || results.length === 0) return;
        
        const task = mapTask(results[0]);
        socket.emit('task:updated', task);
        
        // If team task, emit to team room
        if (task.teamId) {
          socket.to(`team:${task.teamId}`).emit('task:updated', task);
        }
      });
    });
  });

  socket.on('task:delete', (id) => {
    const taskId = parseInt(id, 10);
    
    // First get the task to know if it's a team task
    db.query("SELECT group_id FROM tasks WHERE id = ?", [taskId], (err, results) => {
      if (err || results.length === 0) return;
      
      const teamId = results[0].group_id;
      
      const sql = "DELETE FROM tasks WHERE id = ?";
      db.query(sql, [taskId], (err) => {
        if (err) {
          console.error('Error deleting task:', err);
          return;
        }
        socket.emit('task:deleted', id);
        
        // If team task, emit to team room
        if (teamId) {
          socket.to(`team:${teamId}`).emit('task:deleted', id);
        }
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

/* =========================
   🚀 SERVER START
========================= */

const PORT = 4000;

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
