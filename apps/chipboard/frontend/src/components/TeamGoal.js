import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './TeamGoal.css';

function TeamGoal({ month, sales, individualGoals }) {
  const { auth } = useContext(AuthContext);
  const [teamGoal, setTeamGoal] = useState(0);
  
  const totalIndividualGoals = useMemo(() => 
    Object.values(individualGoals || {}).reduce((sum, goal) => sum + (goal || 0), 0)
  , [individualGoals]);

  const deliveredCount = sales.filter(sale => sale.delivered).length;
  const pendingCount = sales.filter(sale => !sale.delivered).length;

  useEffect(() => {
    const fetchTeamGoal = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/goals/team/${month}`,
          {
            headers: { 
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        setTeamGoal(response.data?.goal_count || 0);
      } catch (error) {
        console.error('Error fetching team goal:', error);
        setTeamGoal(0);
      }
    };

    fetchTeamGoal();
  }, [month, auth.token]);

  console.log('TeamGoal Debug:', {
    individualGoals,
    totalIndividualGoals,
    goals: Object.entries(individualGoals || {}).map(([advisor, goal]) => ({
      advisor,
      goal
    }))
  });

  return (
    <div className="team-goal">
      <div className="goal-header">
        <h3>Team Goal: {teamGoal}</h3>
        <div className="goal-stats">
          <span>Individual Goals: {totalIndividualGoals}</span>
          <span>Delivered: {deliveredCount} ({deliveredCount + pendingCount})</span>
        </div>
      </div>
      <div className="progress-container">
        <div 
          className="goal-marker"
          style={{ 
            left: `${Math.min(totalIndividualGoals / teamGoal * 100, 100)}%` 
          }}
        />
        <div className="progress-bar">
          <div 
            className="progress delivered"
            style={{ 
              width: `${Math.min(deliveredCount / teamGoal * 100, 100)}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default TeamGoal;