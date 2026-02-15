import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import io from 'socket.io-client';
import { useNavigate, useParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const socket = io('http://localhost:4000');

const columns = [
  { id: 'todo', title: 'To Do', color: '#818cf8' },
  { id: 'in-progress', title: 'In Progress', color: '#fbbf24' },
  { id: 'done', title: 'Done', color: '#34d399' }
];

const priorityColors = {
  High: '#f12121',
  Medium: '#ad41d8', 
  Low: '#db2777'
};

const priorityOrder = { High: 1, Medium: 2, Low: 3 };

const getPriorityCardClass = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'priority-high';
    case 'medium': return 'priority-medium';
    case 'low': return 'priority-low';
    default: return 'priority-medium';
  }
};

const getPriorityTagClass = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'tag-priority-high';
    case 'medium': return 'tag-priority-medium';
    case 'low': return 'tag-priority-low';
    default: return 'tag-priority-medium';
  }
};

const getCategoryTagClass = (category) => {
  switch (category?.toLowerCase()) {
    case 'bug': return 'tag-category-bug';
    case 'feature': return 'tag-category-feature';
    case 'enhancement': return 'tag-category-enhancement';
    default: return 'tag-category-feature';
  }
};

function TeamKanbanBoard() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [teamInfo, setTeamInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Feature',
    assignedTo: ''
  });

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/");
      return;
    }

    const userIdNum = parseInt(userId, 10);
    
    // Fetch team details and members
    fetch(`http://localhost:4000/teams/${teamId}/details`)
      .then(res => res.json())
      .then(data => {
        setTeamInfo(data);
        setTeamMembers(data.members || []);
      })
      .catch(err => {
        console.error('Error fetching team:', err);
        navigate('/board');
      });

    // Remove any old listeners first
    socket.off('connect');
    socket.off('sync:team-tasks');
    socket.off('task:created');
    socket.off('task:updated');
    socket.off('task:deleted');
    
    // Reconnect if disconnected
    if (!socket.connected) {
      socket.connect();
    }

    // Set user first, then join team
    socket.emit('set:user', userIdNum);
    socket.emit('join:team', parseInt(teamId, 10));

    // Re-emit on reconnection
    socket.on('connect', () => {
      socket.emit('set:user', userIdNum);
      socket.emit('join:team', parseInt(teamId, 10));
    });

    socket.on('sync:team-tasks', (teamTasks) => {
      console.log('Received team tasks:', teamTasks.length);
      setTasks(teamTasks);
    });

    socket.on('task:created', (task) => {
      console.log('Task received:', task);
      // Only add if it's for this team
      if (task.teamId === parseInt(teamId, 10)) {
        setTasks(prev => {
          // Avoid duplicates
          if (prev.find(t => t.id === task.id)) return prev;
          return [...prev, task];
        });
      }
    });

    socket.on('task:updated', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    socket.on('task:deleted', (id) => {
      setTasks(prev => prev.filter(t => t.id !== id));
    });

    return () => {
      socket.emit('leave:team');
      socket.off('connect');
      socket.off('sync:team-tasks');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:deleted');
    };
  }, [navigate, teamId]);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) return;

    const taskData = { 
      ...newTask, 
      status: 'todo',
      teamId: parseInt(teamId, 10),
      assignedTo: parseInt(newTask.assignedTo, 10)
    };
    console.log('Creating team task:', taskData);
    socket.emit('task:create', taskData);

    setNewTask({ title: '', description: '', priority: 'Medium', category: 'Feature', assignedTo: '' });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    socket.emit('task:move', { id: draggableId, newStatus: destination.droppableId });
  };

  const handleDelete = (id) => {
    socket.emit('task:delete', id);
    setOpenMenuId(null);
  };

  const handleEdit = (task) => {
    setEditingTask({ ...task });
    setOpenMenuId(null);
  };

  const handleUpdateTask = (e) => {
    e.preventDefault();
    if (!editingTask.title || !editingTask.assignedTo) return;
    socket.emit('task:updated', editingTask);
    setEditingTask(null);
  };

  const toggleMenu = (taskId, e) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === taskId ? null : taskId);
  };

  const refreshBoard = () => {
    socket.emit('join:team', parseInt(teamId, 10));
  };

  const goBackToPersonal = () => {
    navigate('/board');
  };

  const progressData = columns.map(col => ({
    name: col.title,
    count: tasks.filter(t => t.status === col.id).length,
    color: col.color
  }));

  return (
    <div className="kanban-container">
      {/* Header */}
      <div className="kanban-header">
        <div className="team-header-left">
          <button onClick={goBackToPersonal} className="back-to-personal-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            My Board
          </button>
          <h1 className="kanban-title">{teamInfo?.name || 'Team Board'}</h1>
        </div>
        <div className="header-buttons">
          <span className="team-member-count">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {teamMembers.length} members
          </span>
          <button onClick={refreshBoard} className="refresh-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleCreateTask} className="task-form">
        <h2 className="task-form-title">Add Team Task</h2>
        <div className="task-form-grid team-task-form">
          <input 
            type="text" 
            placeholder="Task Title" 
            value={newTask.title}
            onChange={e => setNewTask({...newTask, title: e.target.value})} 
            className="form-input" 
            required 
          />
          <input 
            type="text" 
            placeholder="Description (optional)" 
            value={newTask.description}
            onChange={e => setNewTask({...newTask, description: e.target.value})} 
            className="form-input" 
          />
          <select 
            value={newTask.priority} 
            onChange={e => setNewTask({...newTask, priority: e.target.value})} 
            className="form-select"
          >
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>
          <select 
            value={newTask.category} 
            onChange={e => setNewTask({...newTask, category: e.target.value})} 
            className="form-select"
          >
            <option value="Bug">Bug</option>
            <option value="Feature">Feature</option>
            <option value="Enhancement">Enhancement</option>
          </select>
          <select 
            value={newTask.assignedTo} 
            onChange={e => setNewTask({...newTask, assignedTo: e.target.value})} 
            className="form-select assign-select"
            required
          >
            <option value="">Assign to *</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="submit-btn">Create Task</button>
      </form>

      {/* Progress Chart */}
      <div className="chart-container">
        <div className="charts-grid">
          {/* Progress Overview - Left */}
          <div className="chart-panel">
            <h3 className="chart-title">Progress Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={progressData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #e5e5e5', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Analysis - Right */}
          <div className="chart-panel">
            <h3 className="chart-title">Priority Analysis</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'High', value: tasks.filter(t => t.priority === 'High').length, fill: priorityColors.High },
                    { name: 'Medium', value: tasks.filter(t => t.priority === 'Medium').length, fill: priorityColors.Medium },
                    { name: 'Low', value: tasks.filter(t => t.priority === 'Low').length, fill: priorityColors.Low }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #e5e5e5', 
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: '#525252', fontSize: '0.8125rem' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-grid">
          {columns.map(column => {
            const columnTasks = tasks
              .filter(task => task.status === column.id)
              .sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
            return (
              <div key={column.id} className={`kanban-column column-${column.id}`}>
                <div className="column-header">
                  <h2 className="column-title">{column.title}</h2>
                  <span className="column-count">{columnTasks.length}</span>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.droppableProps} 
                      className="column-tasks"
                      style={{
                        background: snapshot.isDraggingOver ? 'rgba(0,0,0,0.02)' : 'transparent',
                        borderRadius: '12px',
                        transition: 'background 200ms ease'
                      }}
                    >
                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="empty-column">
                          <div className="empty-column-icon">📋</div>
                          <div className="empty-column-text">No tasks yet</div>
                        </div>
                      )}
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef} 
                              {...provided.draggableProps} 
                              {...provided.dragHandleProps}
                              className={`task-card ${getPriorityCardClass(task.priority)} ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className="task-header">
                                <h3 className="task-title">{task.title}</h3>
                                <div className="task-menu-wrapper">
                                  <button 
                                    onClick={(e) => toggleMenu(task.id, e)} 
                                    className="menu-btn"
                                    title="Task options"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="5" r="2"/>
                                      <circle cx="12" cy="12" r="2"/>
                                      <circle cx="12" cy="19" r="2"/>
                                    </svg>
                                  </button>
                                  {openMenuId === task.id && (
                                    <div className="task-menu-dropdown">
                                      <button onClick={() => handleEdit(task)} className="menu-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                        Edit
                                      </button>
                                      <button onClick={() => handleDelete(task.id)} className="menu-item menu-item-danger">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {task.description && (
                                <p className="task-description">{task.description}</p>
                              )}
                              {task.assignedToName && (
                                <div className="task-assignee">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                  </svg>
                                  {task.assignedToName}
                                </div>
                              )}
                              <div className="task-tags">
                                <span className={`tag ${getPriorityTagClass(task.priority)}`}>
                                  {task.priority}
                                </span>
                                <span className={`tag ${getCategoryTagClass(task.category)}`}>
                                  {task.category}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Task</h2>
              <button className="close-btn" onClick={() => setEditingTask(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateTask} className="edit-form">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  className="form-input"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                    className="form-select"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={editingTask.category}
                    onChange={(e) => setEditingTask({...editingTask, category: e.target.value})}
                    className="form-select"
                  >
                    <option value="Bug">Bug</option>
                    <option value="Feature">Feature</option>
                    <option value="Enhancement">Enhancement</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Assigned To *</label>
                <select
                  value={editingTask.assignedTo || ''}
                  onChange={(e) => setEditingTask({...editingTask, assignedTo: parseInt(e.target.value, 10)})}
                  className="form-select"
                  required
                >
                  <option value="">Select member</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setEditingTask(null)}>Cancel</button>
                <button type="submit" className="submit-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamKanbanBoard;
