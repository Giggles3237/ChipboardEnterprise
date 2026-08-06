import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import Totals from './Totals';
import MonthlyGoal from './MonthlyGoal';
import Chip from './Chip';
import TrainingBadges from './TrainingBadges';
import './ChipTable.css';

/**
 * ChipTable Component
 */
function ChipTable({ sales = [], onEdit }) {
  const { auth } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [userTrainingData, setUserTrainingData] = useState({});

  // Add responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isManagerOrAdmin = auth?.user?.role === 'Admin' || auth?.user?.role === 'Manager';

  console.log('ChipTable Debug:', {
    isManagerOrAdmin,
    userRole: auth?.user?.role,
    hasAuth: !!auth,
    hasSales: sales.length,
    isMobile
  });

  const sortedAdvisors = useMemo(() => {
    const advisorStats = sales.reduce((acc, sale) => {
      if (!acc[sale.advisor]) {
        acc[sale.advisor] = { 
          name: sale.advisor, 
          delivered: 0, 
          pending: 0,
          isHouse: (sale.advisor || '').toLowerCase().includes('house'),
          isCurrentUser: sale.advisor === auth?.user?.name
        };
      }
      if (sale.type !== 'Wholesale') {
        if (sale.delivered) {
          acc[sale.advisor].delivered++;
        } else {
          acc[sale.advisor].pending++;
        }
      }
      return acc;
    }, {});

    return Object.values(advisorStats).sort((a, b) => {
      // If user is a salesperson, put them at the top
      if (auth?.user?.role === 'Salesperson') {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
      }
      
      // Always put house at the bottom
      if (a.isHouse) return 1;
      if (b.isHouse) return -1;
      
      // Sort others by total sales
      return (b.delivered + b.pending) - (a.delivered + a.pending);
    });
  }, [sales, auth?.user?.name, auth?.user?.role]);

  const fetchGoals = useCallback(async () => {
    try {
      const currentMonth = format(new Date(), 'yyyy-MM');
      
      // Get all unique advisors from sales
      const advisors = [...new Set(sales.map(sale => sale.advisor))];
      
      // Fetch goals for each advisor
      const goalsMap = {};
      await Promise.all(
        advisors.map(async (advisor) => {
          try {
            const response = await axios.get(
              `${API_BASE_URL}/goals/${advisor}/${currentMonth}`,
              {
                headers: { 
                  'Authorization': `Bearer ${auth.token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (response.data?.goal_count) {
              goalsMap[advisor] = response.data.goal_count;
            }
          } catch (error) {
            console.error(`Error fetching goal for ${advisor}:`, error);
          }
        })
      );

      console.log('Goals Debug:', {
        processedGoals: goalsMap,
        currentMonth,
        advisors
      });

    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  }, [sales, auth.token]);

  useEffect(() => {
    fetchGoals();
  }, [sales, fetchGoals]);

  // Fetch user training data
  const fetchUserTrainingData = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { 
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const trainingData = {};
      response.data.forEach(user => {
        trainingData[user.name] = {
          ethos_training_complete: user.ethos_training_complete || false,
          bmw_training_complete: user.bmw_training_complete || false
        };
      });
      
      setUserTrainingData(trainingData);
    } catch (error) {
      console.error('Error fetching user training data:', error);
    }
  }, [auth.token]);

  useEffect(() => {
    fetchUserTrainingData();
  }, [fetchUserTrainingData]);

  // Add a function to determine if goal number should be visible
  const canSeeGoalNumber = (advisorName) => {
    return isManagerOrAdmin || auth?.user?.name === advisorName;
  };

  return (
    <div className={`chip-table ${isMobile ? 'mobile-view' : ''}`}>
      {isManagerOrAdmin && (
        <Totals sales={sales} />
      )}
      
      {sortedAdvisors.map(({ name, delivered, pending }) => (
        <div key={name} className="advisor-section">
          <div className="advisor-name">
            <h3>
              <div className="advisor-name-with-badges">
                <span>{name}</span>
              </div>
              <div className="advisor-stats">
                <div className="stats-left">
                  <span className="delivered">{delivered}</span>
                  <span className="pending">({pending})</span>
                  <MonthlyGoal 
                    advisor={name} 
                    month={format(new Date(), 'yyyy-MM')} 
                    onUpdate={fetchGoals}
                    deliveredCount={delivered}
                    showGoalNumber={canSeeGoalNumber(name)}
                  />
                </div>
                <div className="training-badges">
                  <TrainingBadges 
                    ethosTrainingComplete={userTrainingData[name]?.ethos_training_complete}
                    bmwTrainingComplete={userTrainingData[name]?.bmw_training_complete}
                    size="small"
                  />
                </div>
              </div>
            </h3>
          </div>
          <div className="chips">
            {sales
              .filter(sale => sale.advisor === name)
              .sort((a, b) => {
                // Wholesale always last
                if (a.type === 'Wholesale' && b.type !== 'Wholesale') return 1;
                if (a.type !== 'Wholesale' && b.type === 'Wholesale') return -1;
                if (a.delivered === b.delivered) {
                  return new Date(b.deliveryDate) - new Date(a.deliveryDate);
                }
                return a.delivered ? -1 : 1;
              })
              .map(sale => (
                <Chip
                  key={sale.id}
                  sale={sale}
                  onEdit={() => onEdit(sale)}
                  isEditable={true}
                />
              ))}
          </div>
        </div>
      ))}
      
      {isMobile && (
        <div className="mobile-info">
          <div className="legend">
            <div className="legend-item">
              <span className="legend-color delivered"></span> Delivered
            </div>
            <div className="legend-item">
              <span className="legend-color pending"></span> Pending
            </div>
          </div>
        </div>
      )}
      
      <div style={{ height: '60px' }} aria-hidden="true"></div>
    </div>
  );
}

export default ChipTable;