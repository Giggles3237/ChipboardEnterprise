// VehicleDetailsModal.js
import React from 'react';
import './VehicleDetailsModal.css';

function VehicleDetailsModal({ vehicle, onClose }) {
  if (!vehicle) return null;

  // Prepare an array of vehicle details for cleaner mapping
  const details = [
    { label: 'Stock Number', value: vehicle.StockNumber },
    { label: 'Status', value: vehicle.Status || 'N/A' },
    { label: 'Certified', value: vehicle.Certified || 'N/A' },
    { label: 'Series', value: vehicle.Series || 'N/A' },
    { label: 'Age', value: vehicle.Age || 'N/A' },
    { label: 'Color', value: vehicle.Color || 'N/A' },
    { label: 'Interior', value: vehicle.Interior || 'N/A' },
    { label: 'VIN', value: vehicle.VIN || 'N/A' },
    { label: 'Odometer', value: vehicle.Odometer || 'N/A' },
    { label: 'Equipment', value: vehicle.Equipment || 'N/A' },
    { label: 'Report', value: vehicle.Report || 'N/A' },
    { label: 'Recall', value: vehicle.Recall || 'N/A' },
    { label: 'Warnings', value: vehicle.Warnings || 'N/A' },
    { label: 'Problems', value: vehicle.Problems || 'N/A' },
    { label: 'Recall Status', value: vehicle.RecallStatus || 'N/A' },
    { label: 'Tags', value: vehicle.Tags || 'N/A' },
    { label: 'Vehicle Rank', value: vehicle.vRank || 'N/A' },
    { label: 'Price Rank', value: vehicle.PriceRank || 'N/A' },
    { label: 'VIN Leads', value: vehicle.VinLeads || 'N/A' },
    { label: 'Price', value: vehicle.Price || 'N/A' },
    { label: 'Recon Status', value: vehicle.ReconStatus || 'N/A' },
    { label: 'Chassis', value: vehicle.Chassis || 'N/A' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {vehicle.Year} {vehicle.Make} {vehicle.Model}
          </h2>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div className="vehicle-details">
            {details.map((item, index) => (
              <div key={index} className="detail-group">
                <div className="detail-label">{item.label}:</div>
                <div className="detail-value">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Key Status Section */}
          <div className="section-header">
            <h3>Key Status</h3>
          </div>
          {vehicle.keyRecords && vehicle.keyRecords.length > 0 ? (
            <div className="key-grid">
              {vehicle.keyRecords.map((key, index) => (
                <div key={index} className="key-card">
                  <h4>Key {index + 1}</h4>
                  <div className="key-details">
                    <div><strong>Status:</strong> {key.status || 'N/A'}</div>
                    <div><strong>User:</strong> {key.user || 'N/A'}</div>
                    <div><strong>Location:</strong> {key.systemLocation || 'N/A'}</div>
                    <div><strong>Last Checkout:</strong> {key.checkoutTime || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="detail-group">
              <div className="detail-value">No key records found</div>
            </div>
          )}
        </div>

        {/* Modal Footer with Close Button */}
        <div className="modal-footer">
          <button className="close-button footer-close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default VehicleDetailsModal;
