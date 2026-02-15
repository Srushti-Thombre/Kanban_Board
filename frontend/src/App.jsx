import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import KanbanBoard from "./components/KanbanBoard";
import TeamKanbanBoard from "./components/TeamKanbanBoard";
import Signup from "./components/signinauth";
import Login from "./components/Login";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <ThemeToggle />
          <Routes>
            <Route path="/" element={<Login />} />
             <Route path="/signup" element={<Signup />} />
            <Route path="/board" element={<KanbanBoard />} />
            <Route path="/team/:teamId" element={<TeamKanbanBoard />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;


