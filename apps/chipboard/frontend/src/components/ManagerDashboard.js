import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
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
  ComposedChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './ManagerDashboard.css';
import ViewToggleBar from './ViewToggleBar';

const calculateWorkingDays = (startDate, endDate) => {
  let count = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    if (current.getDay() !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

function ManagerDashboard() {
  const { auth } = useContext(AuthContext);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamSalesData, setTeamSalesData] = useState([]);
  const [currentMonthSales, setCurrentMonthSales] = useState([]);
  const [selectedView, setSelectedView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState('current-month'); // current-month, last-month, year-to-date, custom
  const [customStartDate, setCustomStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [teamPerformance, setTeamPerformance] = useState({
    totalSales: 0,
    averagePerMember: 0,
    topPerformer: { name: '', sales: 0 },
    pendingSales: 0
  });

  // Get date range based on selected time frame
  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (timeFrame) {
      case 'current-month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth)
        };
      case 'year-to-date':
        return {
          start: startOfYear(now),
          end: now
        };
      case 'custom':
        return {
          start: new Date(customStartDate),
          end: new Date(customEndDate)
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        };
    }
  }, [timeFrame, customStartDate, customEndDate]);

  // Calculate team performance metrics
  const calculateTeamPerformance = useCallback((allSales, currentSales) => {
    const salesByMember = {};
    const currentByMember = {};

    // Group sales by team member
    allSales.forEach(sale => {
      if (!salesByMember[sale.advisor]) {
        salesByMember[sale.advisor] = [];
      }
      salesByMember[sale.advisor].push(sale);
    });

    currentSales.forEach(sale => {
      if (!currentByMember[sale.advisor]) {
        currentByMember[sale.advisor] = [];
      }
      currentByMember[sale.advisor].push(sale);
    });

    // Calculate metrics
    const totalSales = currentSales.length;
    const pendingSales = currentSales.filter(sale => !sale.delivered).length;
    const deliveredSales = totalSales - pendingSales;
    const activeMembers = teamMembers.filter(member => member.status === 'active');
    const averagePerMember = activeMembers.length > 0 ? deliveredSales / activeMembers.length : 0;

    // Find top performer (based on delivered sales only)
    let topPerformer = { name: '', sales: 0 };
    Object.entries(currentByMember).forEach(([name, sales]) => {
      const deliveredCount = sales.filter(sale => sale.delivered).length;
      if (deliveredCount > topPerformer.sales) {
        topPerformer = { name, sales: deliveredCount };
      }
    });

    setTeamPerformance({
      totalSales,
      averagePerMember,
      topPerformer,
      pendingSales
    });
  }, [teamMembers]);

  // Fetch team members (only active salespeople)
  const fetchTeamMembers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const activeSalespeople = response.data.filter(user => 
        user.role_name === 'Salesperson' && user.status === 'active'
      );
      setTeamMembers(activeSalespeople);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setError('Failed to load team members');
    }
  }, [auth.token]);

  // Fetch team sales data
  const fetchTeamSales = useCallback(async () => {
    try {
      const endDate = new Date();
      const startDate = subMonths(endDate, 12);
      
      const response = await axios.get(`${API_BASE_URL}/sales`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      const allSales = response.data.filter(sale => 
        new Date(sale.deliveryDate) >= startDate
      );
      setTeamSalesData(allSales);

      // Filter sales based on selected time frame
      const dateRange = getDateRange();
      const filteredSales = allSales.filter(sale => {
        const saleDate = new Date(sale.deliveryDate);
        return saleDate >= dateRange.start && saleDate <= dateRange.end;
      });
      setCurrentMonthSales(filteredSales);

      // Calculate team performance
      calculateTeamPerformance(allSales, filteredSales);
    } catch (error) {
      console.error('Error fetching team sales:', error);
      setError('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  }, [auth.token, calculateTeamPerformance, getDateRange]);

  // Generate chart data for team performance
  const generateChartData = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 12 - i);
      return format(date, 'MMM yyyy');
    });

    return months.map(month => {
      const monthSales = teamSalesData.filter(sale => 
        format(new Date(sale.deliveryDate), 'MMM yyyy') === month
      );

      const salesByMember = {};
      monthSales.forEach(sale => {
        if (!salesByMember[sale.advisor]) {
          salesByMember[sale.advisor] = { total: 0, delivered: 0 };
        }
        salesByMember[sale.advisor].total += 1;
        if (sale.delivered) {
          salesByMember[sale.advisor].delivered += 1;
        }
      });

      const deliveredSales = Object.values(salesByMember).reduce((sum, member) => sum + member.delivered, 0);
      const activeMembers = teamMembers.filter(member => member.status === 'active');
      const averagePerMember = activeMembers.length > 0 ? deliveredSales / activeMembers.length : 0;
      const topPerformer = Math.max(...Object.values(salesByMember).map(member => member.delivered), 0);

      return {
        month,
        totalSales: monthSales.length,
        averagePerMember,
        topPerformer
      };
    });
  };

  // Generate pie chart data for sales distribution
  const generateSalesDistributionData = () => {
    const salesByMember = {};
    currentMonthSales.forEach(sale => {
      salesByMember[sale.advisor] = (salesByMember[sale.advisor] || 0) + 1;
    });

    return Object.entries(salesByMember).map(([name, count]) => ({
      name,
      value: count
    }));
  };

  // Get time frame label
  const getTimeFrameLabel = () => {
    switch (timeFrame) {
      case 'current-month':
        return 'Current Month';
      case 'last-month':
        return 'Last Month';
      case 'year-to-date':
        return 'Year to Date';
      case 'custom':
        return `Custom (${format(new Date(customStartDate), 'MMM dd')} - ${format(new Date(customEndDate), 'MMM dd, yyyy')})`;
      default:
        return 'Current Month';
    }
  };

  useEffect(() => {
    fetchTeamMembers();
    fetchTeamSales();
  }, [fetchTeamMembers, fetchTeamSales]);

  useEffect(() => {
    fetchTeamSales();
  }, [fetchTeamSales]);

  if (loading) return <div className="loading">Loading team data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  const chartData = generateChartData();
  const salesDistributionData = generateSalesDistributionData();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  const dateRange = getDateRange();

  return (
    <div className="manager-dashboard">
      <ViewToggleBar />
      <div className="dashboard-header">
        <h1>Team Performance Dashboard</h1>
        <div className="header-actions">
          <div className="time-frame-selector">
            <label>Time Frame:</label>
            <select 
              value={timeFrame} 
              onChange={(e) => setTimeFrame(e.target.value)}
              className="time-frame-select"
            >
              <option value="current-month">Current Month</option>
              <option value="last-month">Last Month</option>
              <option value="year-to-date">Year to Date</option>
              <option value="custom">Custom Range</option>
            </select>
            {timeFrame === 'custom' && (
              <div className="custom-date-inputs">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="date-input"
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ViewToggleBar 
        views={[
          { id: 'overview', label: 'Team Overview' },
          { id: 'performance', label: 'Performance' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'management', label: 'Management' }
        ]}
        selectedView={selectedView}
        onViewChange={setSelectedView}
        isCustomView={true}
      />

      {selectedView === 'overview' && (
        <>
          {/* Team Performance Summary */}
          <div className="team-summary-grid">
            <div className="summary-card">
              <h3>{getTimeFrameLabel()}</h3>
              <div className="big-number">{teamPerformance.totalSales - teamPerformance.pendingSales}</div>
              <div className="subtitle">Delivered Units</div>
            </div>

            <div className="summary-card">
              <h3>Team Average</h3>
              <div className="big-number">{teamPerformance.averagePerMember.toFixed(1)}</div>
              <div className="subtitle">Delivered per Member</div>
            </div>

            <div className="summary-card">
              <h3>Top Performer</h3>
              <div className="big-number">{teamPerformance.topPerformer.sales}</div>
              <div className="subtitle">{teamPerformance.topPerformer.name}</div>
            </div>

            <div className="summary-card">
              <h3>Pending Sales</h3>
              <div className="big-number">{teamPerformance.pendingSales}</div>
              <div className="subtitle">Awaiting Delivery</div>
            </div>
          </div>

          {/* Team Members Table */}
          <div className="team-members-section">
            <h2>Team Members Performance</h2>
            <div className="team-members-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Delivered</th>
                    <th>Pending</th>
                    <th>Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers
                    .map(member => {
                      const memberSales = currentMonthSales.filter(sale => sale.advisor === member.name);
                      const deliveredSales = memberSales.filter(sale => sale.delivered).length;
                      const pendingSales = memberSales.filter(sale => !sale.delivered).length;
                      const totalSales = memberSales.length;

                      return {
                        ...member,
                        deliveredSales,
                        pendingSales,
                        totalSales
                      };
                    })
                    .sort((a, b) => b.deliveredSales - a.deliveredSales)
                    .map(member => (
                      <tr key={member.id}>
                        <td className="member-name">{member.name}</td>
                        <td className="delivered-count">{member.deliveredSales}</td>
                        <td className="pending-count">{member.pendingSales}</td>
                        <td className="sales-count">{member.totalSales}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedView === 'performance' && (
        <>
          {/* Team Performance Chart */}
          <div className="chart-card">
            <h2>Team Performance Over Time</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid stroke="#E6E6E6" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar type="monotone" dataKey="averagePerMember" fill="#1C69D4" name="Team Average" />
                <Line type="linear" dataKey="topPerformer" stroke="#FF6B6B" strokeWidth={2} name="Top Performer" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Distribution */}
          <div className="chart-card">
            <h2>{getTimeFrameLabel()} Sales Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {selectedView === 'analytics' && (
        <>
          {/* Detailed Analytics */}
          <div className="analytics-grid">
            <div className="analytics-card">
              <h3>Sales Trends</h3>
              <div className="trend-analysis">
                <div className="trend-item">
                  <span className="trend-label">Monthly Growth</span>
                  <span className="trend-value positive">+12.5%</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Team Efficiency</span>
                  <span className="trend-value positive">+8.3%</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Delivery Rate</span>
                  <span className="trend-value">
                    {teamPerformance.totalSales > 0 
                      ? (((teamPerformance.totalSales - teamPerformance.pendingSales) / teamPerformance.totalSales) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h3>Performance Metrics</h3>
              <div className="metrics-list">
                <div className="metric">
                  <span className="metric-label">Average Sales per Day</span>
                  <span className="metric-value">
                    {(teamPerformance.totalSales / calculateWorkingDays(dateRange.start, dateRange.end)).toFixed(1)}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Delivery Rate</span>
                  <span className="metric-value">
                    {teamPerformance.totalSales > 0 
                      ? (((teamPerformance.totalSales - teamPerformance.pendingSales) / teamPerformance.totalSales) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Team Utilization</span>
                  <span className="metric-value">
                    {teamMembers.length > 0 ? (teamPerformance.totalSales / teamMembers.length).toFixed(1) : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedView === 'management' && (
        <>
          {/* Management Tools */}
          <div className="management-section">
            <h2>Team Management Tools</h2>
            <div className="management-grid">
              <div className="management-card">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                  <button className="action-btn">
                    <i className="fas fa-chart-line"></i>
                    Generate Report
                  </button>
                  <button className="action-btn">
                    <i className="fas fa-users"></i>
                    Team Meeting
                  </button>
                  <button className="action-btn">
                    <i className="fas fa-trophy"></i>
                    Performance Review
                  </button>
                </div>
              </div>

              <div className="management-card">
                <h3>Team Status</h3>
                <div className="team-status">
                  <div className="status-item">
                    <span className="status-label">Active Members</span>
                    <span className="status-value">{teamMembers.filter(m => m.status === 'active').length}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Total Team Size</span>
                    <span className="status-value">{teamMembers.length}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">Average Experience</span>
                    <span className="status-value">2.5 years</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ManagerDashboard; 