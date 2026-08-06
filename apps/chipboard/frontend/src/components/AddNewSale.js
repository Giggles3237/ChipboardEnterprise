import React, { useContext, useState, useEffect } from 'react';
import EditSaleForm from './EditSaleForm';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

console.log('API_BASE_URL initialized as:', API_BASE_URL);

function AddNewSale() {
  console.log('Using API URL:', API_BASE_URL);
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);
  const [salespeople, setSalespeople] = useState([]);

  useEffect(() => {
    const fetchSalespeople = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/salespeople-and-managers`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`
          }
        });
        setSalespeople(response.data);
      } catch (error) {
        console.error('Error fetching salespeople:', error);
      }
    };

    fetchSalespeople();
  }, [auth.token]);

  const initialSaleData = {
    clientName: '',
    stockNumber: '',
    year: new Date().getFullYear(),
    make: '',
    model: '',
    color: '',
    advisor: '',
    delivered: false,
    deliveryDate: new Date().toISOString().split('T')[0],
    type: ''
  };

  const handleFormSubmit = async (newSale) => {
    try {
      console.log('Submitting sale data:', newSale);
      
      const saleToSubmit = {
        ...newSale,
        advisor: newSale.advisor || auth?.user?.name,
        deliveryDate: format(new Date(newSale.deliveryDate), 'yyyy-MM-dd'),
        year: parseInt(newSale.year) || new Date().getFullYear(),
        delivered: Boolean(newSale.delivered)
      };

      console.log('Formatted sale data:', saleToSubmit);

      if (!API_BASE_URL) {
        throw new Error('API URL is not configured. Please check your environment variables.');
      }

      console.log('Making request to:', `${API_BASE_URL}/sales`);

      const response = await axios.post(
        `${API_BASE_URL}/sales`, 
        saleToSubmit,
        {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 201 || response.status === 200) {
        window.dispatchEvent(new CustomEvent('salesUpdated'));
        alert('Sale added successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error('Full error:', error);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        alert(`Error adding new sale: ${error.response.data?.message || 'Server error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        alert('Error: No response received from server. Please check your connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        alert(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div>
      <h2>Add New Sale</h2>
      <EditSaleForm
        sale={initialSaleData}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate('/')}
        salespeople={salespeople}
      />
    </div>
  );
}

export default AddNewSale; 