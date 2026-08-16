import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { useDebounce } from './hooks/useDebounce';
import { apiService } from './services/apiService';

// Import your components
import ChipTable from './components/ChipTable';
import DateRangePicker from './components/DateRangePicker';
import NavbarComponent from './components/Navbar';
import Inbound from './components/Inbound';
import AddNewSale from './components/AddNewSale';
import EditSaleForm from './components/EditSaleForm';
import Login from './components/Login';
import { AuthContext } from './contexts/AuthContext';
import SalesTable from './components/SalesTable';
import AdminDashboard from './components/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import LoanerSheet from './components/LoanerSheet';
import LoanerUpload from './components/LoanerUpload';
import LoanerSettings from './components/LoanerSettings';
import ViewToggleBar from './components/ViewToggleBar';
import ChangePasswordForm from './components/ChangePasswordForm';
import './App.css';
import SalespersonDashboard from './components/SalespersonDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import SearchUnifiedVehicles from './components/SearchUnifiedVehicles';
import TVDashboard from './components/TVDashboard';
import ContestDashboard from './components/ContestDashboard';
import MarketingPage from './components/MarketingPage';

/**
 * App Component
 * The main component that sets up routing, manages global state, and handles data fetching
 */
function App() {
  const { auth } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Add debouncing to search
  
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  });
  
  const [editingSale, setEditingSale] = useState(null);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState(null);
  const [searchArchive, setSearchArchive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  /**
   * useEffect to fetch sales data from the backend API with caching
   */
  useEffect(() => {
    const fetchSales = async () => {
      if (!auth?.token) return;
      
      setLoading(true);
      try {
        // Use the apiService to fetch with caching
        const data = await apiService.fetchWithCache('/sales', auth.token);
        setSales(data);
        
        // Filter sales within the selected date range
        const filtered = data.filter(sale => {
          const saleDate = new Date(sale.deliveryDate);
          return saleDate >= startDate && saleDate <= endDate;
        });
        setFilteredSales(filtered);
      } catch (error) {
        setError('Failed to fetch sales data.');
        console.error('Error fetching sales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [auth?.token, startDate, endDate]);

  /**
   * useEffect for handling search with debouncing
   */
  useEffect(() => {
    if (!debouncedSearchTerm && !searchArchive) {
      const filtered = sales.filter(sale => {
        const saleDate = new Date(sale.deliveryDate);
        return saleDate >= startDate && saleDate <= endDate;
      });
      setFilteredSales(filtered);
      return;
    }

    const filtered = sales.filter(sale => {
      const matchesSearch = Object.values(sale).some(value => 
        String(value).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
      
      if (searchArchive) {
        return matchesSearch;
      } else {
        const saleDate = new Date(sale.deliveryDate);
        return matchesSearch && saleDate >= startDate && saleDate <= endDate;
      }
    });
    setFilteredSales(filtered);
  }, [debouncedSearchTerm, sales, startDate, endDate, searchArchive]);

  /**
   * Handler for search input changes
   */
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handler for date range changes
   */
  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
  };

  /**
   * Handler to update a sale with cache invalidation
   */
  const handleSaleUpdate = async (updatedSale) => {
    try {
      if (!updatedSale.id) {
        throw new Error('Sale ID is required for update');
      }

      const formattedSale = {
        ...updatedSale,
        delivered: Boolean(updatedSale.delivered),
        deliveryDate: new Date(updatedSale.deliveryDate).toISOString().split('T')[0]
      };

      const response = await axios.put(
        `${API_BASE_URL}/sales/${updatedSale.id}`,
        formattedSale,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Invalidate cache after successful update
        apiService.clearCache();
        
        // Update state
        setSales(prevSales => 
          prevSales.map(sale => 
            sale.id === updatedSale.id ? response.data : sale
          )
        );
        
        if (filteredSales) {
          setFilteredSales(prevFiltered => 
            prevFiltered.map(sale => 
              sale.id === updatedSale.id ? response.data : sale
            )
          );
        }
        
        if (response.data.delivered !== updatedSale.delivered) {
          window.dispatchEvent(new CustomEvent('salesUpdated'));
        }
        
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('App: Error updating sale:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };

  /**
   * Handler for toggling the archive search
   */
  const handleArchiveToggle = (e) => {
    const isChecked = e.target.checked;
    setSearchArchive(isChecked);
    
    if (searchTerm) {
      const filtered = sales.filter(sale => {
        const matchesSearch = Object.values(sale).some(value => 
          String(value).toLowerCase().includes(searchTerm)
        );
        
        if (isChecked) {
          return matchesSearch;
        } else {
          const saleDate = new Date(sale.deliveryDate);
          return matchesSearch && saleDate >= startDate && saleDate <= endDate;
        }
      });
      setFilteredSales(filtered);
    }
  };

  const handleToggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSaleDelete = async (saleToDelete) => {
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/sales/${saleToDelete.id}`,
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        // Invalidate cache after successful delete
        apiService.clearCache();
        
        setSales(prevSales => 
          prevSales.filter(sale => sale.id !== saleToDelete.id)
        );
        if (filteredSales) {
          setFilteredSales(prevFiltered =>
            prevFiltered.filter(sale => sale.id !== saleToDelete.id)
          );
        }
        alert('Sale deleted successfully');
      }
    } catch (error) {
      console.error('Delete error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      alert(`Error deleting sale: ${error.response?.data?.message || error.message}`);
    }
  };

  useEffect(() => {
    const handleSalesUpdate = async () => {
      if (!auth?.token) return;
      
      try {
        // Clear the cache to ensure fresh data
        apiService.clearCache();
        
        // Fetch fresh data
        const data = await apiService.fetchWithCache('/sales', auth.token);
        setSales(data);
        
        // Update filtered sales if needed
        const filtered = data.filter(sale => {
          const saleDate = new Date(sale.deliveryDate);
          return saleDate >= startDate && saleDate <= endDate;
        });
        setFilteredSales(filtered);
      } catch (error) {
        console.error('Error refreshing sales data:', error);
      }
    };

    window.addEventListener('salesUpdated', handleSalesUpdate);
    
    return () => {
      window.removeEventListener('salesUpdated', handleSalesUpdate);
    };
  }, [auth?.token, startDate, endDate]);

  return (
    <Router>
      <ErrorBoundary>
        <div className={`app-container ${isDarkMode ? 'night-mode' : ''}`}>
          <NavbarComponent isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
          {loading && <p>Loading sales data...</p>}
          {error && <p className="error-message">{error}</p>}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/loaners" element={<PrivateRoute><LoanerSheet /></PrivateRoute>} />
            <Route path="/loaners/upload" element={<PrivateRoute roles={['Admin', 'Manager']}><LoanerUpload /></PrivateRoute>} />
            <Route path="/loaners/settings" element={<PrivateRoute roles={['Admin']}><LoanerSettings /></PrivateRoute>} />
            <Route path="/unified-search" element={
              <PrivateRoute>
                <ViewToggleBar />
                <SearchUnifiedVehicles />
              </PrivateRoute>
            } />
            <Route path="/inbound" element={
              <PrivateRoute>
                <Inbound handleSaleUpdate={handleSaleUpdate} />
              </PrivateRoute>
            } />
            <Route path="/add-sale" element={
              <PrivateRoute>
                <AddNewSale />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute roles={['Admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/manager" element={
              <PrivateRoute roles={['Admin', 'Manager']}>
                <ManagerDashboard />
              </PrivateRoute>
            } />
            <Route path="/tv" element={
              <PrivateRoute roles={['Admin', 'Manager']}>
                <TVDashboard />
              </PrivateRoute>
            } />
            <Route path="/mission-250" element={
              <PrivateRoute>
                <ContestDashboard />
              </PrivateRoute>
            } />
            <Route path="/" element={
              auth?.user ? (
                <PrivateRoute>
                  <>
                  <ViewToggleBar />
                  <div className="search-date-container">
                    <div className="search-bar">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        type="text"
                        placeholder="Search sales..."
                        value={searchTerm}
                        onChange={handleSearch}
                      />
                    </div>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onDateChange={handleDateChange}
                    />
                    <div className="archive-toggle">
                      <label>
                        <input
                          type="checkbox"
                          checked={searchArchive}
                          onChange={handleArchiveToggle}
                        />
                        Search Archive
                      </label>
                    </div>
                  </div>
                  <ChipTable sales={filteredSales || sales} onEdit={setEditingSale} />
                  </>
                </PrivateRoute>
              ) : (
                <MarketingPage />
              )
            } />
            <Route path="/sales-table" element={
              <PrivateRoute>
                <>
                  <ViewToggleBar />
                  <div className="search-date-container">
                    <div className="search-bar">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        type="text"
                        placeholder="Search sales..."
                        value={searchTerm}
                        onChange={handleSearch}
                      />
                    </div>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      onDateChange={handleDateChange}
                    />
                    <div className="archive-toggle">
                      <label>
                        <input
                          type="checkbox"
                          checked={searchArchive}
                          onChange={handleArchiveToggle}
                        />
                        Search Archive
                      </label>
                    </div>
                  </div>
                  <SalesTable 
                    sales={filteredSales || sales} 
                    onEdit={setEditingSale} 
                    onDelete={handleSaleDelete}
                  />
                </>
              </PrivateRoute>
            } />
            <Route 
              path="/change-password" 
              element={
                <PrivateRoute>
                  <ChangePasswordForm />
                </PrivateRoute>
              } 
            />
            <Route path="/salesperson-dashboard" element={
              <PrivateRoute>
                <SalespersonDashboard />
              </PrivateRoute>
            } />
            <Route path="/salesperson-dashboard/:advisorId?" element={
              <PrivateRoute>
                <ViewToggleBar />
                <SalespersonDashboard />
              </PrivateRoute>
            } />
          </Routes>

          {editingSale && (
            <EditSaleForm
              sale={editingSale}
              onSubmit={handleSaleUpdate}
              onCancel={() => setEditingSale(null)}
              onDelete={handleSaleDelete}
            />
          )}
        </div>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
