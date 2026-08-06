import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './InboundUnit.css';

/**
 * InboundUnit Component
 * 
 * Represents an individual sale unit within the Inbound component.
 * Displays the client's last name and indicates if the sale is Certified Pre-Owned (CPO).
 * Handles click events to initiate the edit process for the sale.
 *
 * @param {Object} sale - The sale data to be displayed.
 * @param {Function} onEdit - Callback function to handle editing of the sale.
 */
const InboundUnit = ({ sale, onEdit }) => {
  const { auth } = useContext(AuthContext);
  
  // Determine if user has permission to see client name
  const canSeeClientName = () => {
    if (!auth?.user) return false;
    
    // Managers and Admins can see all names
    if (auth.user.role === 'Admin' || auth.user.role === 'Manager') return true;
    
    // Advisors can only see their own clients
    if (auth.user.role === 'Salesperson') {
      return sale.advisor === auth.user.name;
    }
    
    return false;
  };

  // Determine the CSS class based on the sale type
  const unitClass = sale.type.includes('BMW') ? 'bmw-unit' : 'mini-unit';
  
  // Check if the sale is Certified Pre-Owned
  const isCPO = sale.type === 'CPO BMW' || sale.type === 'CPO MINI';

  const handleClick = async () => {
    if (canSeeClientName()) {
      try {
        await onEdit(sale);
      } catch (error) {
        console.error('Error updating sale:', error);
        alert('Failed to update sale. Please try again.');
      }
    }
  };

  /**
   * Extracts the last name from a full name string.
   * 
   * @param {string} fullName - The full name of the client.
   * @returns {string} - The last name of the client.
   */
  const getLastName = (fullName) => {
    const nameParts = fullName.trim().split(' ');
    return nameParts[nameParts.length - 1]; // Return the last segment as the last name
  };

  // Display placeholder if user can't see client name
  const displayText = canSeeClientName() 
    ? getLastName(sale.clientName)
    : '•••';

  return (
    <div 
      className={`inbound-unit ${unitClass} ${isCPO ? 'cpo' : ''}`}
      onClick={handleClick}
    >
      <span className="client-name">
        {displayText}
        {isCPO && <span className="gold-star">★</span>} {/* Display gold star if CPO */}
      </span>
    </div>
  );
};

export default InboundUnit;
