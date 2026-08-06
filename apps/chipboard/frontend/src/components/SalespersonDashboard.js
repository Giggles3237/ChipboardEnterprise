import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { API_BASE_URL } from '../config';
import { 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Bar,
  ComposedChart
} from 'recharts';
import './SalespersonDashboard.css';
import ViewToggleBar from './ViewToggleBar';

const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    // Exclude Sundays (0)
    if (current.getDay() !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

function SalespersonDashboard() {
  const { auth } = useContext(AuthContext);
  const [salesData, setSalesData] = useState([]);
  const [currentMonthSales, setCurrentMonthSales] = useState([]);
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [selectedAdvisor, setSelectedAdvisor] = useState(auth.user.name);
  const [advisorList, setAdvisorList] = useState([]);
  const isAdmin = auth?.user?.role === 'Admin' || auth?.user?.role === 'Manager';
  const [yearlyStats, setYearlyStats] = useState({
    totalSales: 0,
    averagePerMonth: 0,
    bestMonth: { month: '', count: 0 },
    byType: {}
  });
  const [teamSalesData, setTeamSalesData] = useState([]);
  const [monthPace, setMonthPace] = useState({
    current: 0,
    projected: 0,
    daysLeft: 0,
    isEndOfMonth: false
  });
  const [pendingSales, setPendingSales] = useState(0);
  const [selectedView, setSelectedView] = useState('sales');

  // Fetch list of advisors for admin dropdown
  useEffect(() => {
    const fetchAdvisors = async () => {
      if (isAdmin) {
        try {
          const response = await axios.get(`${API_BASE_URL}/users`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          const salespeople = response.data
            .filter(user => user.role_name === 'Salesperson')
            .map(user => user.name);
          setAdvisorList(salespeople);
        } catch (error) {
          console.error('Error fetching advisors:', error);
        }
      }
    };

    fetchAdvisors();
  }, [isAdmin, auth.token]);

  // Fetch sales data for the past 24 months
  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        const endDate = new Date();
        const startDate = subMonths(endDate, 24);
        
        const response = await axios.get(`${API_BASE_URL}/sales`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });

        // Store all sales for team calculations
        const allSales = response.data.filter(sale => 
          new Date(sale.deliveryDate) >= startDate
        );
        setTeamSalesData(allSales);

        // Filter sales for selected advisor and past 24 months
        const userSales = response.data.filter(sale => 
          sale.advisor === selectedAdvisor &&
          new Date(sale.deliveryDate) >= startDate
        );

        setSalesData(userSales);
        
        // Set current month sales
        const currentMonthStart = startOfMonth(new Date());
        const currentMonthEnd = endOfMonth(new Date());
        const thisMonthSales = userSales.filter(sale => 
          new Date(sale.deliveryDate) >= currentMonthStart &&
          new Date(sale.deliveryDate) <= currentMonthEnd
        );
        setCurrentMonthSales(thisMonthSales);

        // Calculate yearly statistics
        calculateYearlyStats(userSales);

        // Inside fetchSalesHistory — wholesale excluded from counts
        const pendingCount = thisMonthSales.filter(sale => !sale.delivered && sale.type !== 'Wholesale').length;
        setPendingSales(pendingCount);
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
    };

    fetchSalesHistory();
  }, [auth.token, selectedAdvisor]);

  // Fetch monthly goal
  useEffect(() => {
    const fetchMonthlyGoal = async () => {
      try {
        const currentMonth = format(new Date(), 'yyyy-MM');
        const response = await axios.get(
          `${API_BASE_URL}/goals/${auth.user.name}/${currentMonth}`,
          {
            headers: { Authorization: `Bearer ${auth.token}` }
          }
        );
        setMonthlyGoal(response.data.goal_count || 0);
      } catch (error) {
        console.error('Error fetching monthly goal:', error);
      }
    };

    fetchMonthlyGoal();
  }, [auth.token, auth.user.name]);

  useEffect(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Calculate working days
    const completedWorkingDays = calculateWorkingDays(monthStart, today);
    const remainingWorkingDays = calculateWorkingDays(today, monthEnd);
    const isEndOfMonth = remainingWorkingDays <= 7;

    // Calculate current month's delivered sales — wholesale excluded
    const deliveredCount = currentMonthSales.filter(sale => sale.delivered && sale.type !== 'Wholesale').length;
    
    // Calculate daily rate based on delivered sales only
    const currentDailyRate = completedWorkingDays > 0 
      ? deliveredCount / completedWorkingDays 
      : 0;
    
    // Project future sales
    let projectedRemaining = remainingWorkingDays * currentDailyRate;
    if (isEndOfMonth) {
      projectedRemaining *= 1.3;
    }
    
    const projectedTotal = Math.round(
      deliveredCount +      // Current delivered sales
      projectedRemaining +  // Projected future sales
      pendingSales         // Current pending sales
    );

    setMonthPace({
      current: deliveredCount,  // Changed: Only count delivered sales
      projected: projectedTotal,
      daysLeft: remainingWorkingDays,
      isEndOfMonth
    });
  }, [currentMonthSales, pendingSales]);

  const calculateYearlyStats = (sales) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Get sales from last 12 months excluding current month
    const last12MonthsSales = sales.filter(sale => {
      const saleDate = new Date(sale.deliveryDate);
      const monthsAgo = (currentYear - saleDate.getFullYear()) * 12 + (currentMonth - saleDate.getMonth());
      return monthsAgo > 0 && monthsAgo <= 12;
    });

    // Calculate all-time monthly totals
    const monthlyTotals = {};
    const typeCount = {};

    // Calculate current year totals for YTD and type counts — wholesale excluded
    const currentYearSales = sales.filter(sale =>
      new Date(sale.deliveryDate).getFullYear() === currentYear &&
      sale.type !== 'Wholesale'
    );

    // Split the calculations:
    // 1. Current year sales for YTD and type counts
    currentYearSales.forEach(sale => {
      typeCount[sale.type] = (typeCount[sale.type] || 0) + 1;
    });

    // 2. All non-wholesale sales for best month calculation
    sales.filter(sale => sale.type !== 'Wholesale').forEach(sale => {
      const month = format(new Date(sale.deliveryDate), 'MMMM yyyy');
      monthlyTotals[month] = (monthlyTotals[month] || 0) + 1;
    });

    const bestMonth = Object.entries(monthlyTotals)
      .reduce((best, [month, count]) => 
        count > best.count ? { month, count } : best,
        { month: '', count: 0 }
      );

    setYearlyStats({
      totalSales: currentYearSales.length,
      averagePerMonth: (last12MonthsSales.length / 12).toFixed(1),
      bestMonth,
      byType: typeCount
    });
  };

  const chartData = Array.from({ length: 12 }, (_, i) => {
    // Start from last month instead of current month
    const date = subMonths(new Date(), 12 - i);
    const monthStr = format(date, 'MMM yyyy');
    const lastYearDate = subMonths(date, 12);
    const lastYearStr = format(lastYearDate, 'MMM yyyy');
    
    // Skip if it's the current month
    const isCurrentMonth = format(new Date(), 'MMM yyyy') === monthStr;
    if (isCurrentMonth) {
      return null;
    }
    
    const currentSales = salesData.filter(sale =>
      format(new Date(sale.deliveryDate), 'MMM yyyy') === monthStr &&
      sale.type !== 'Wholesale'
    ).length;

    const priorYearSales = salesData.filter(sale =>
      format(new Date(sale.deliveryDate), 'MMM yyyy') === lastYearStr &&
      sale.type !== 'Wholesale'
    ).length;

    const monthTeamSales = teamSalesData.filter(sale => 
      format(new Date(sale.deliveryDate), 'MMM yyyy') === monthStr
    );

    const teamAvg = monthTeamSales.length / (new Set(monthTeamSales.map(s => s.advisor)).size || 1);
    const topPerformer = Math.max(...Object.values(monthTeamSales.reduce((acc, sale) => {
      acc[sale.advisor] = (acc[sale.advisor] || 0) + 1;
      return acc;
    }, {})), 0);

    return {
      month: monthStr,
      sales: currentSales,
      priorYear: priorYearSales,
      teamAverage: Math.round(teamAvg * 10) / 10,
      topPerformer
    };
  }).filter(Boolean); // Remove null entries

  console.log('Chart Data:', chartData);

  return (
    <div className="salesperson-dashboard">
      <div className="dashboard-header">
        <h1>
          {isAdmin ? 'Salesperson Dashboard' : 'My Dashboard'}
        </h1>
        {isAdmin && (
          <div className="advisor-selector">
            <label htmlFor="advisor-select">Select Salesperson:</label>
            <select
              id="advisor-select"
              value={selectedAdvisor}
              onChange={(e) => setSelectedAdvisor(e.target.value)}
            >
              {advisorList.map(advisor => (
                <option key={advisor} value={advisor}>
                  {advisor}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <ViewToggleBar 
        views={[
          { id: 'sales', label: 'Sales' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'leads', label: 'Leads' }
        ]}
        selectedView={selectedView}
        onViewChange={setSelectedView}
      />

      {selectedView === 'sales' && (
        <>
          {/* Current Month Progress */}
          <div className="current-month-card">
            <h2>Current Month Progress</h2>
            <div className="progress-stats">
              <div className="stat">
                <span className="label">Current</span>
                <span className="value">{monthPace.current}</span>
              </div>
              <div className="stat">
                <span className="label">Pending</span>
                <span className="value">{pendingSales}</span>
              </div>
              <div className="stat">
                <span className="label">Daily Pace</span>
                <span className="value">
                  {(monthPace.current / calculateWorkingDays(startOfMonth(new Date()), new Date())).toFixed(1)}
                </span>
              </div>
              <div className="stat">
                <span className="label">Projected</span>
                <span className="value">{monthPace.projected}</span>
                {monthPace.isEndOfMonth && <span className="subtitle">🔥</span>}
              </div>
            </div>
            <div className="progress-bar">
              <div 
                className="progress" 
                style={{ 
                  width: `${Math.min((monthPace.projected / monthlyGoal) * 100, 100)}%`,
                  backgroundColor: monthPace.projected >= monthlyGoal ? 'var(--mini-green)' : 'var(--bmw-blue)'
                }}
              />
            </div>
            <div className="pace-indicator">
              <small>
                Goal: {monthlyGoal} | Days Left: {monthPace.daysLeft}
                {monthPace.isEndOfMonth && " (End of Month Surge Active)"}
              </small>
            </div>
          </div>

          {/* Sales History Chart */}
          <div className="chart-card">
            <h2>Sales History</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#E6E6E6" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar type="monotone" dataKey="teamAverage" fill="#1C69D4" name="Team Average" />
                <Line type="linear" dataKey="topPerformer" dot={{ r: 6, symbol: "star" }} fill="#4E8DCD" name="Top Performer" />
                <Line type="linear" dataKey="sales" stroke="#000000" strokeWidth={2} name="Current Year" />
                <Line type="linear" dataKey="priorYear" stroke="#666666" strokeWidth={1} name="Prior Year" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Year to Date Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Year to Date</h3>
              <div className="big-number">{yearlyStats.totalSales}</div>
              <div className="subtitle">Total Sales</div>
            </div>
            <div className="stat-card">
              <h3>Monthly Average</h3>
              <div className="big-number">{yearlyStats.averagePerMonth}</div>
              <div className="subtitle">Sales per Month</div>
            </div>
            <div className="stat-card">
              <h3>Best Month</h3>
              <div className="big-number">{yearlyStats.bestMonth.count}</div>
              <div className="subtitle">{yearlyStats.bestMonth.month}</div>
            </div>
          </div>

          {/* Sales by Type */}
          <div className="sales-by-type">
            <h2>Sales by Type</h2>
            <div className="type-grid">
              {Object.entries(yearlyStats.byType).map(([type, count]) => (
                <div key={type} className="type-card">
                  <div className="type-name">{type}</div>
                  <div className="type-count">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {selectedView === 'inventory' && (
        <div className="inventory-view">
          <h2>Inventory View Coming Soon</h2>
        </div>
      )}
      
      {selectedView === 'leads' && (
        <div className="leads-view">
          <h2>Leads View Coming Soon</h2>
        </div>
      )}
    </div>
  );
}

export default SalespersonDashboard; 