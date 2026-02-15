import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import io from 'socket.io-client';
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
  Low: '#8b6914'
};

const priorityOrder = { High: 1, Medium: 2, Low: 3 };

const getCategoryClass = (category) => {
  switch (category?.toLowerCase()) {
    case 'bug': return 'category-bug';
    case 'feature': return 'category-feature';
    case 'enhancement': return 'category-enhancement';
    default: return 'category-feature';
  }
};

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

function KanbanBoard() {
  const [tasks, setTasks] = useState([]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Feature'
  });

  useEffect(() => {
    console.log('Socket connected, listening for events...');

    socket.on('sync:tasks', (initialTasks) => {
      console.log('Received sync:tasks →', initialTasks.length, 'tasks');
      setTasks(initialTasks);
    });

    socket.on('task:created', (task) => {
      console.log('Task received from server:', task);
      setTasks(prev => [...prev, task]);
    });

    socket.on('task:updated', (updatedTask) => {
      console.log('Task updated:', updatedTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    });

    socket.on('task:deleted', (id) => {
      console.log('Task deleted:', id);
      setTasks(prev => prev.filter(t => t.id !== id));
    });

    return () => socket.disconnect();
  }, []);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTask.title) return;

    const taskData = { ...newTask, status: 'todo' };
    console.log('Sending task:create →', taskData);
    socket.emit('task:create', taskData);

    setNewTask({ title: '', description: '', priority: 'Medium', category: 'Feature' });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    socket.emit('task:move', { id: draggableId, newStatus: destination.droppableId });
  };

  const handleDelete = (id) => {
    socket.emit('task:delete', id);
  };

  const refreshBoard = () => {
    console.log('Manual refresh requested');
    socket.emit('get:tasks');
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
        <h1 className="kanban-title">Real-time Kanban Board</h1>
        <button onClick={refreshBoard} className="refresh-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          Refresh Board
        </button>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleCreateTask} className="task-form">
        <h2 className="task-form-title">Add New Task</h2>
        <div className="task-form-grid">
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
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  labelLine={false}
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
                                <button 
                                  onClick={() => handleDelete(task.id)} 
                                  className="delete-btn"
                                  title="Delete task"
                                >
                                  ×
                                </button>
                              </div>
                              {task.description && (
                                <p className="task-description">{task.description}</p>
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
    </div>
  );
}

export default KanbanBoard;