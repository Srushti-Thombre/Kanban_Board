import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import io from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const socket = io('http://localhost:4000');

const columns = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' }
];

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
    count: tasks.filter(t => t.status === col.id).length
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Real-time Kanban Board</h1>
        <button onClick={refreshBoard} className="bg-gray-600 text-white px-5 py-2 rounded-lg">
          Refresh Board
        </button>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleCreateTask} className="mb-10 bg-gray-100 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Task Title" value={newTask.title}
            onChange={e => setNewTask({...newTask, title: e.target.value})} className="border p-3 rounded-lg" required />
          <input type="text" placeholder="Description" value={newTask.description}
            onChange={e => setNewTask({...newTask, description: e.target.value})} className="border p-3 rounded-lg" />
          <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})} className="border p-3 rounded-lg">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <select value={newTask.category} onChange={e => setNewTask({...newTask, category: e.target.value})} className="border p-3 rounded-lg">
            <option>Bug</option><option>Feature</option><option>Enhancement</option>
          </select>
        </div>
        <button type="submit" className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg">Create Task</button>
      </form>

      {/* Progress Chart */}
      <div className="mb-10 bg-white p-6 rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-4">Progress Overview</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(column => (
            <div key={column.id} className="bg-gray-50 rounded-xl p-4 min-h-[500px]">
              <h2 className="font-bold text-lg mb-4 text-gray-700">{column.title}</h2>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3 min-h-[400px]">
                    {tasks.filter(task => task.status === column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className="bg-white p-4 rounded-lg shadow border border-gray-200">
                            <div className="flex justify-between">
                              <h3 className="font-semibold">{task.title}</h3>
                              <button onClick={() => handleDelete(task.id)} className="text-red-500">×</button>
                            </div>
                            {task.description && <p className="text-sm text-gray-600 mt-2">{task.description}</p>}
                            <div className="flex gap-2 mt-3">
                              <span className={`text-xs px-3 py-1 rounded-full ${task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {task.priority}
                              </span>
                              <span className="text-xs px-3 py-1 bg-gray-100 rounded-full">{task.category}</span>
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
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default KanbanBoard;