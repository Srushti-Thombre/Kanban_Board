import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TeamsModal.css';

const API_URL = 'http://localhost:4000';

function TeamsModal({ isOpen, onClose, userId }) {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [view, setView] = useState('list'); // 'list', 'create', 'details'
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchTeams();
    }
  }, [isOpen, userId]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_URL}/teams/${userId}`);
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeam.name,
          description: newTeam.description,
          createdBy: userId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create team');
        return;
      }

      setNewTeam({ name: '', description: '' });
      setView('list');
      fetchTeams();
    } catch (err) {
      setError('Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamDetails = async (teamId) => {
    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/details`);
      const data = await response.json();
      setSelectedTeam(data);
      setView('details');
    } catch (err) {
      console.error('Error fetching team details:', err);
    }
  };

  const searchUsers = async (email) => {
    setSearchEmail(email);
    if (email.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/users/search?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      // Filter out users already in the team
      const memberIds = selectedTeam?.members?.map(m => m.id) || [];
      setSearchResults(data.filter(u => !memberIds.includes(u.id)));
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const addMember = async (userIdToAdd) => {
    try {
      const response = await fetch(`${API_URL}/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userIdToAdd })
      });

      if (response.ok) {
        fetchTeamDetails(selectedTeam.id);
        setSearchEmail('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  const removeMember = async (memberUserId) => {
    try {
      const response = await fetch(`${API_URL}/teams/${selectedTeam.id}/members/${memberUserId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTeamDetails(selectedTeam.id);
      }
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleSelectTeam = (team) => {
    onClose();
    navigate(`/team/${team.id}`);
  };

  const handleBackToPersonal = () => {
    onClose();
    navigate('/board');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="teams-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {view === 'list' && 'My Teams'}
            {view === 'create' && 'Create New Team'}
            {view === 'details' && selectedTeam?.name}
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {/* Team List View */}
          {view === 'list' && (
            <>
              <div className="teams-actions">
                <button className="personal-board-btn" onClick={handleBackToPersonal}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Personal Board
                </button>
                <button className="create-team-btn" onClick={() => setView('create')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Create Team
                </button>
              </div>

              <div className="teams-list">
                {teams.length === 0 ? (
                  <p className="no-teams">You're not part of any team yet. Create one to get started!</p>
                ) : (
                  teams.map(team => (
                    <div 
                      key={team.id} 
                      className="team-card"
                    >
                      <div className="team-info" onClick={() => handleSelectTeam(team)}>
                        <h3>{team.name}</h3>
                        <p>{team.description || 'No description'}</p>
                        <span className="member-count">{team.member_count} members</span>
                      </div>
                      <button 
                        className="manage-btn"
                        onClick={(e) => { e.stopPropagation(); fetchTeamDetails(team.id); }}
                      >
                        Manage
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Create Team View */}
          {view === 'create' && (
            <form onSubmit={handleCreateTeam} className="create-team-form">
              <div className="form-group">
                <label>Team Name</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="What's this team about?"
                  rows={3}
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setView('list')}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          )}

          {/* Team Details View */}
          {view === 'details' && selectedTeam && (
            <div className="team-details">
              <button className="back-btn" onClick={() => setView('list')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to Teams
              </button>

              <div className="team-description">
                <p>{selectedTeam.description || 'No description'}</p>
              </div>

              <div className="add-member-section">
                <h4>Add Member</h4>
                <input
                  type="text"
                  value={searchEmail}
                  onChange={(e) => searchUsers(e.target.value)}
                  placeholder="Search by email..."
                  className="search-input"
                />
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(user => (
                      <div key={user.id} className="search-result-item">
                        <div>
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                        <button onClick={() => addMember(user.id)} className="add-btn">
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="members-section">
                <h4>Members ({selectedTeam.members?.length || 0})</h4>
                <div className="members-list">
                  {selectedTeam.members?.map(member => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        <span className="member-name">{member.name}</span>
                        <span className="member-email">{member.email}</span>
                        {member.role === 'admin' && <span className="admin-badge">Admin</span>}
                      </div>
                      {member.role !== 'admin' && member.id !== parseInt(userId) && (
                        <button 
                          onClick={() => removeMember(member.id)} 
                          className="remove-btn"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamsModal;
