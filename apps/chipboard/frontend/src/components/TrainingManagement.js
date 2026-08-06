import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import TrainingBadges from './TrainingBadges';
import './TrainingManagement.css';

function TrainingManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [roleFilter, setRoleFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUsers, setEditingUsers] = useState({}); // Track which users have unsaved changes
    const [savingUsers, setSavingUsers] = useState(new Set()); // Track which users are currently being saved
    const { auth } = useContext(AuthContext);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/users`, {
                headers: { 
                    'Authorization': `Bearer ${auth.token}`,
                    'Content-Type': 'application/json'
                }
            });
            setUsers(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(`Error fetching users: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    }, [auth.token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleTrainingChange = (userId, trainingType, value) => {
        setUsers(prevUsers => 
            prevUsers.map(user => 
                user.id === userId 
                    ? { ...user, [trainingType]: value }
                    : user
            )
        );
        
        // Mark this user as having unsaved changes
        setEditingUsers(prev => ({
            ...prev,
            [userId]: true
        }));
    };

    const saveUserTraining = async (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        setSavingUsers(prev => new Set(prev).add(userId));

        try {
            await axios.put(
                `${API_BASE_URL}/users/${userId}/profile`,
                {
                    ethos_training_complete: user.ethos_training_complete || false,
                    bmw_training_complete: user.bmw_training_complete || false
                },
                {
                    headers: { Authorization: `Bearer ${auth.token}` }
                }
            );

            // Remove from editing state
            setEditingUsers(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });

            setSuccess(`Training status updated for ${user.name}`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error saving training status:', err);
            setError(`Error saving training status: ${err.response?.data?.message || err.message}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setSavingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    };

    const saveAllChanges = async () => {
        const usersToSave = Object.keys(editingUsers);
        if (usersToSave.length === 0) {
            setError('No changes to save');
            return;
        }

        setSavingUsers(new Set(usersToSave));

        try {
            const savePromises = usersToSave.map(userId => {
                const user = users.find(u => u.id === parseInt(userId));
                if (!user) return Promise.resolve();

                return axios.put(
                    `${API_BASE_URL}/users/${userId}/profile`,
                    {
                        ethos_training_complete: user.ethos_training_complete || false,
                        bmw_training_complete: user.bmw_training_complete || false
                    },
                    {
                        headers: { Authorization: `Bearer ${auth.token}` }
                    }
                );
            });

            await Promise.all(savePromises);
            setEditingUsers({});
            setSuccess(`Successfully updated training status for ${usersToSave.length} user(s)`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error saving training statuses:', err);
            setError(`Error saving training statuses: ${err.response?.data?.message || err.message}`);
            setTimeout(() => setError(null), 5000);
        } finally {
            setSavingUsers(new Set());
        }
    };

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        const matchesRole = roleFilter === 'all' || (user.role_name || user.role) === roleFilter;
        const matchesSearch = searchTerm === '' || 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesStatus && matchesRole && matchesSearch;
    });

    // Get unique roles for filter
    const uniqueRoles = [...new Set(users.map(u => u.role_name || u.role).filter(Boolean))];

    if (loading) return <div className="training-management-loading">Loading users...</div>;
    if (error && !users.length) return <div className="training-management-error">Error: {error}</div>;

    const hasUnsavedChanges = Object.keys(editingUsers).length > 0;

    return (
        <div className="training-management">
            <div className="training-management-header">
                <h1>Training Management</h1>
                <p className="training-management-subtitle">
                    View and update training status for all users. Changes are saved individually or use "Save All" to save multiple changes at once.
                </p>
            </div>

            {error && <div className="training-management-error-message">{error}</div>}
            {success && <div className="training-management-success-message">{success}</div>}

            <div className="training-management-filters">
                <div className="filter-group">
                    <label htmlFor="status-filter">Status:</label>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="all">All</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="role-filter">Role:</label>
                    <select
                        id="role-filter"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="all">All Roles</option>
                        {uniqueRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="search">Search:</label>
                    <input
                        id="search"
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {hasUnsavedChanges && (
                    <button 
                        className="save-all-button"
                        onClick={saveAllChanges}
                        disabled={savingUsers.size > 0}
                    >
                        {savingUsers.size > 0 ? 'Saving...' : `Save All (${Object.keys(editingUsers).length})`}
                    </button>
                )}
            </div>

            <div className="training-management-table-wrapper">
                <table className="training-management-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th className="training-column">
                                <div className="training-column-header">
                                    <span>Ethos Training</span>
                                </div>
                            </th>
                            <th className="training-column">
                                <div className="training-column-header">
                                    <span>BMW Training</span>
                                </div>
                            </th>
                            <th>Current Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="no-users-message">
                                    No users found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => {
                                const isEditing = editingUsers[user.id];
                                const isSaving = savingUsers.has(user.id);
                                
                                return (
                                    <tr 
                                        key={user.id}
                                        className={isEditing ? 'has-unsaved-changes' : ''}
                                    >
                                        <td>{user.name}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role_name || user.role}</td>
                                        <td>
                                            <span className={`status-badge status-${user.status}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="training-checkbox-cell">
                                            <input
                                                type="checkbox"
                                                checked={user.ethos_training_complete || false}
                                                onChange={(e) => handleTrainingChange(
                                                    user.id,
                                                    'ethos_training_complete',
                                                    e.target.checked
                                                )}
                                                disabled={isSaving}
                                            />
                                        </td>
                                        <td className="training-checkbox-cell">
                                            <input
                                                type="checkbox"
                                                checked={user.bmw_training_complete || false}
                                                onChange={(e) => handleTrainingChange(
                                                    user.id,
                                                    'bmw_training_complete',
                                                    e.target.checked
                                                )}
                                                disabled={isSaving}
                                            />
                                        </td>
                                        <td>
                                            <TrainingBadges 
                                                ethosTrainingComplete={user.ethos_training_complete}
                                                bmwTrainingComplete={user.bmw_training_complete}
                                                size="small"
                                            />
                                        </td>
                                        <td>
                                            {isEditing && (
                                                <button
                                                    className="save-user-button"
                                                    onClick={() => saveUserTraining(user.id)}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? 'Saving...' : 'Save'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="training-management-footer">
                <span className="user-count">
                    Showing {filteredUsers.length} of {users.length} users
                </span>
            </div>
        </div>
    );
}

export default TrainingManagement;
