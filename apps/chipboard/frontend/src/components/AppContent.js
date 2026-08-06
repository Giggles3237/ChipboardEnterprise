import React, { useState, useContext, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import Navbar from './Navbar';
import KeyboardShortcutsHandler from './KeyboardShortcutsHandler';
import EditSaleForm from './EditSaleForm';
import Login from './Login';
import Inbound from './Inbound';
import { API_BASE_URL } from '../config';

function AppContent() {
  const { auth } = useContext(AuthContext);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sales data
  useEffect(() => {
    const fetchSales = async () => {
      if (!auth?.token) {
        console.log('No auth token found, skipping fetch');
        return;
      }
      
      try {
        setLoading(true);
        console.log('Fetching sales from:', `${API_BASE_URL}/sales`);
        const response = await axios.get(`${API_BASE_URL}/sales`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        console.log('Fetched sales data:', response.data);
        setSales(response.data);
        setFilteredSales(response.data);
      } catch (error) {
        console.error('Error fetching sales:', error.response || error);
        setError(error.response?.data?.message || 'Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [auth?.token]);

  useEffect(() => {
    const handleSalesUpdate = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/sales`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        setSales(response.data);
        setFilteredSales(response.data);
      } catch (error) {
        console.error('Error refreshing sales data:', error);
      }
    };

    window.addEventListener('salesUpdated', handleSalesUpdate);
    
    return () => {
      window.removeEventListener('salesUpdated', handleSalesUpdate);
    };
  }, [auth.token]);

  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleSaleUpdate = async (updatedSale) => {
    let stateBackup;

    try {
      console.log('App: Starting sale update:', updatedSale);
      
      if (!updatedSale.id) {
        throw new Error('Sale ID is required for update');
      }

      const formattedSale = {
        ...updatedSale,
        delivered: Boolean(updatedSale.delivered),
        deliveryDate: new Date(updatedSale.deliveryDate).toISOString().split('T')[0]
      };

      stateBackup = {
        sales: [...sales],
        filteredSales: filteredSales ? [...filteredSales] : null
      };

      setSales(prevSales => 
        prevSales.map(sale => 
          sale.id === updatedSale.id ? formattedSale : sale
        )
      );

      if (filteredSales) {
        setFilteredSales(prevFiltered => 
          prevFiltered.map(sale => 
            sale.id === updatedSale.id ? formattedSale : sale
          )
        );
      }

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

      if (response.status === 200 && response.data) {
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

        return response.data;
      }

      return formattedSale;
    } catch (error) {
      console.error('App: Error updating sale:', error);
      
      if (stateBackup) {
        setSales(stateBackup.sales);
        if (stateBackup.filteredSales) {
          setFilteredSales(stateBackup.filteredSales);
        }
      }

      throw error;
    }
  };

  const handleSaleDelete = async (sale) => {
    try {
      await axios.delete(`${API_BASE_URL}/sales/${sale.id}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      // Update local state after successful deletion
      setSales(prevSales => prevSales.filter(s => s.id !== sale.id));
      setFilteredSales(prevFiltered => 
        prevFiltered ? prevFiltered.filter(s => s.id !== sale.id) : null
      );
      
      return true;
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Failed to delete sale. Please try again.');
      return false;
    }
  };

  return (
    <div className={`app-container ${isDarkMode ? 'night-mode' : ''}`}>
      {auth && (
        <KeyboardShortcutsHandler
          setIsEditFormOpen={() => setEditingSale(null)}
          setEditingSale={setEditingSale}
        />
      )}
      
      <Navbar isDarkMode={isDarkMode} onToggleTheme={handleToggleTheme} />
      
      {loading ? (
        <div className="loading">Loading sales data...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/inbound" element={
            <Inbound 
              handleSaleUpdate={handleSaleUpdate}
              sales={filteredSales}
            />
          } />
        </Routes>
      )}

      {editingSale && (
        <EditSaleForm
          sale={editingSale}
          onSubmit={handleSaleUpdate}
          onCancel={() => setEditingSale(null)}
          onDelete={handleSaleDelete}
        />
      )}
    </div>
  );
}

export default AppContent;
