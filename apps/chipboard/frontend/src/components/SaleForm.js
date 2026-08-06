import React, { useState, useContext } from 'react';
import './EditSaleForm.css';
import { AuthContext } from '../contexts/AuthContext';

function EditSaleForm({ sale, onSubmit, onCancel }) {
  const { auth } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    ...sale,
    deliveryDate: sale.deliveryDate.toISOString().split('T')[0],
    advisor: auth?.user?.name
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      deliveryDate: new Date(formData.deliveryDate),
      advisor: auth?.user?.name
    };
    
    await onSubmit(submissionData);
    onCancel();
  };

  return (
    <div className="edit-sale-form-overlay">
      <div className="edit-sale-form">
        <h2>Edit Sale</h2>
        <form onSubmit={handleSubmit}>
          {/* ... rest of your form fields ... */}
          <div className="form-buttons">
            <button type="submit">Save Changes</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditSaleForm;