import React, { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import './MonthlyGoal.css';

function MonthlyGoal({ advisor, month, onUpdate, deliveredCount, showGoalNumber }) {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(0);
  const { auth } = useContext(AuthContext);
  
  const canViewGoal = auth?.user?.role === 'Admin' || 
                     auth?.user?.role === 'Manager' || 
                     auth?.user?.name === advisor;

  const canEditGoal = auth?.user?.role === 'Admin' ||
                     auth?.user?.name === advisor;

  const progressPercentage = goal ? (deliveredCount / goal) * 100 : 0;
  const progressColor = progressPercentage >= 100 ? 'var(--mini-green)' : 'var(--bmw-blue)';

  const handleClick = () => {
    if (canEditGoal) {
      setIsEditing(true);
      setTempGoal(goal || 0);
    }
  };

  const fetchGoal = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/goals/${advisor}/${month}`,
        {
          headers: { 
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setGoal(response.data.goal_count || 0);
      setTempGoal(response.data.goal_count || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching goal:', error.response || error);
      setError(error);
      setLoading(false);
    }
  }, [advisor, month, auth.token]);

  useEffect(() => {
    fetchGoal();
  }, [advisor, month, fetchGoal]);

  const handleSave = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/goals`,
        {
          advisor,
          month,
          goal_count: tempGoal
        },
        {
          headers: { 
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setGoal(tempGoal);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error saving goal:', error);
      alert(`Failed to save goal: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading goal</div>;

  return (
    <div className="monthly-goal">
      <div className="goal-progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${Math.min(progressPercentage, 100)}%`,
            backgroundColor: progressColor,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        />
      </div>
      {isEditing ? (
        <div className="goal-edit">
          <input
            type="number"
            className="goal-input"
            value={tempGoal}
            onChange={(e) => setTempGoal(parseInt(e.target.value) || 0)}
            min="0"
          />
          <button className="save-goal" onClick={handleSave}>✓</button>
          <button className="cancel-goal" onClick={() => setIsEditing(false)}>✕</button>
        </div>
      ) : (
        <>
          {canViewGoal && (
            <>
              {showGoalNumber && goal !== null && (
                <div className="goal-display" onClick={handleClick}>
                  <span className="goal-number">
                    {deliveredCount}/{goal}
                  </span>
                </div>
              )}
              {!showGoalNumber && (
                <span className="goal-progress">{Math.round(progressPercentage)}%</span>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MonthlyGoal;
