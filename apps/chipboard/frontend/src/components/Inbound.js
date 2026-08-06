import React, { useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, addMonths } from 'date-fns';
import { AuthContext } from '../contexts/AuthContext';
import InboundUnit from './InboundUnit';
import EditSaleForm from './EditSaleForm';
import './Inbound.css';
import ViewToggleBar from './ViewToggleBar';
import ChipTable from './ChipTable';

/**
 * Inbound Component
 * 
 * This component displays pending sales grouped by advisors and organized by delivery month.
 * It includes functionalities to edit sales and ensures consistent UI with other pages by incorporating
 * the ViewToggleBar for view selection.
 */
const Inbound = ({ handleSaleUpdate }) => {
  // State to hold pending sales data
  const [pendingSales, setPendingSales] = useState([]);
  
  // State to hold the list of upcoming months
  const [months, setMonths] = useState([]);
  
  // Accessing authentication information from AuthContext
  const { auth } = useContext(AuthContext);
  
  // State to manage the current view mode ('chip' or 'list')
  const [currentView, setCurrentView] = useState('list');

  // State to manage the edit form
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  /**
   * Fetches pending sales data from the backend API.
   */
  const fetchPendingSales = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/sales/pending-sales`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      setPendingSales(response.data);
    } catch (error) {
      console.error('Error fetching pending sales:', error);
    }
  }, [auth.token]);

  /**
   * useEffect hook to fetch pending sales and generate months on component mount.
   */
  useEffect(() => {
    fetchPendingSales();
  }, [fetchPendingSales]);

  useEffect(() => {
    const generateMonths = () => {
      const monthsList = [];
      let currentDate = new Date();
      // Get next month as the starting point
      currentDate.setMonth(currentDate.getMonth() + 1);
      
      // Generate next 3 months
      for (let i = 0; i < 3; i++) {
        monthsList.push(format(currentDate, 'MMMM yyyy'));
        currentDate = addMonths(currentDate, 1);
      }
      
      setMonths(monthsList);
    };

    generateMonths();
  }, []);

  /**
   * Groups sales by advisor.
   * 
   * @param {Array} sales - The array of sales to group.
   * @returns {Object} - An object with advisor names as keys and arrays of sales as values.
   */
  const groupSalesByAdvisor = (sales) => {
    return sales.reduce((acc, sale) => {
      if (!acc[sale.advisor]) {
        acc[sale.advisor] = [];
      }
      acc[sale.advisor].push(sale);
      return acc;
    }, {});
  };

  // Grouping the pending sales by advisor
  const groupedSales = groupSalesByAdvisor(pendingSales);

  /**
   * Sorts advisors based on the number of sales in the upcoming months.
   */
  const sortedAdvisors = Object.entries(groupedSales)
    .filter(([_, sales]) => 
      sales.some(sale => 
        months.includes(format(new Date(sale.deliveryDate), 'MMMM yyyy'))
      )
    )
    .sort(([_, salesA], [__, salesB]) => salesB.length - salesA.length)
    .map(([advisor]) => advisor);

  /**
   * Handles the edit action by opening the edit form with the selected sale.
   * 
   * @param {Object} sale - The sale object to be edited.
   */
  const onEdit = (sale) => {
    if (!handleSaleUpdate) {
      throw new Error('Update function not provided');
    }
    setEditingSale(sale);
    setIsEditFormOpen(true);
  };

  const handleEditSubmit = async (updatedSale) => {
    try {
      const result = await handleSaleUpdate(updatedSale);
      if (result) {
        await fetchPendingSales();
        setIsEditFormOpen(false);
        setEditingSale(null);
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  };

  useEffect(() => {
    const handleSalesUpdate = () => {
      fetchPendingSales();
    };

    window.addEventListener('salesUpdated', handleSalesUpdate);
    
    return () => {
      window.removeEventListener('salesUpdated', handleSalesUpdate);
    };
  }, [fetchPendingSales]);

  return (
    <div className="inbound-container">
      <ViewToggleBar 
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {currentView === 'chip' ? (
        <ChipTable 
          sales={pendingSales}
          onEdit={onEdit}
        />
      ) : (
        <div className="inbound-grid">
          {/* Header row with month names */}
          <div className="header-row">
            <div className="advisor-column">Advisor</div>
            {months.map(month => (
              <div key={month} className="month-column">
                {month}
              </div>
            ))}
          </div>

          {/* Data rows */}
          {sortedAdvisors.map(advisor => (
            <div key={advisor} className="advisor-row">
              <div className="advisor-name">{advisor}</div>
              {months.map(month => (
                <div key={`${advisor}-${month}`} className="month-cell">
                  {groupedSales[advisor]
                    ?.filter(sale => 
                      format(new Date(sale.deliveryDate), 'MMMM yyyy') === month
                    )
                    .map(sale => (
                      <InboundUnit 
                        key={sale.id} 
                        sale={sale}
                        onEdit={() => onEdit(sale)}
                      />
                    ))
                  }
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {isEditFormOpen && editingSale && (
        <EditSaleForm
          sale={editingSale}
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setIsEditFormOpen(false);
            setEditingSale(null);
          }}
        />
      )}
    </div>
  );
};

export default Inbound;
