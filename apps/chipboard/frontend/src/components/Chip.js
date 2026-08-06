import React, { useState, useContext, useRef, useMemo, useEffect } from 'react';
import Tooltip from './Tooltip'; // Import the Tooltip component
import { AuthContext } from '../contexts/AuthContext';
import './Chip.css';

function Chip({ sale, onEdit }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({});
  const chipRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const { auth } = useContext(AuthContext);
  
  // Determine if the current user is a manager or admin
  const isManagerOrAdmin = useMemo(() => {
    return auth?.user?.role === 'Admin' || auth?.user?.role === 'Manager';
  }, [auth]);

  // Determine if the current user can edit this chip
  const isEditable = useMemo(() => {
    if (!auth?.user) return false;
    if (isManagerOrAdmin) return true;
    return auth.user.name === sale?.advisor;
  }, [auth, sale, isManagerOrAdmin]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  if (!sale) {
    return null;
  }

  const getChipClass = () => {
    const baseClass = (() => {
      switch (sale.type) {
        case 'New BMW':
          return 'new-bmw';
        case 'New MINI':
          return 'new-mini';
        case 'CPO BMW':
        case 'CPO MINI':
        case 'Used BMW':
        case 'Used MINI':
          return 'used-cpo';
        case 'Wholesale':
          return 'wholesale';
        default:
          return 'default';
      }
    })();

    return `chip-component ${baseClass} ${sale.delivered ? 'delivered' : 'pending'}`;
  };

  const formatClientName = (name) => {
    if (!name) return '';
    if (!isManagerOrAdmin && sale.advisor !== auth?.user?.name) {
      return '***';
    }
    return name;
  };

  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set tooltip position immediately
    if (chipRef.current) {
      const rect = chipRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + (rect.width / 2) + window.scrollX
      });
    }
    
    // Delay showing the tooltip by 500ms
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    // Clear the timeout if mouse leaves before delay completes
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  // Format vehicle info for mobile view
  const vehicleInfo = `${sale.color} ${sale.year} ${sale.make} ${sale.model}`;
  const clientInfo = formatClientName(sale.clientName);

  return (
    <div 
      className={`chip-component ${getChipClass()}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isEditable ? () => onEdit(sale) : undefined}
      ref={chipRef}
      style={{ cursor: isEditable ? 'pointer' : 'default' }}
      data-vehicle-info={vehicleInfo}
      data-client-info={clientInfo}
      data-hovered={isHovered}
    >
      <span className="stock-number">
        {sale.stockNumber}
        {(sale.type === 'CPO BMW' || sale.type === 'CPO MINI') && <span className="gold-star">★</span>}
      </span>
      <Tooltip visible={isHovered} position={tooltipPosition}>
        <p>{vehicleInfo}</p>
        <p>{clientInfo}</p>
      </Tooltip>
    </div>
  );
}

export default Chip;
