import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './SearchUnifiedVehicles.css';
import debounce from 'lodash.debounce';
import VehicleDetailsModal from './VehicleDetailsModal';

// Use local development server
const DEV_API_URL = 'http://localhost:5000/api';
const PROD_API_URL = 'https://bopchipboard-c66df77a754d.herokuapp.com/api';
const API_URL = process.env.NODE_ENV === 'development' ? DEV_API_URL : PROD_API_URL;

function SearchUnifiedVehicles() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { auth } = useContext(AuthContext);
  const [searchInput, setSearchInput] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchVehicles = useCallback(async (term = '') => {
    if (!term || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    
    // Determine if this is a stock number search (PB1234 or 1234)
    const isStockNumber = /^(?:[a-zA-Z]{1,2})?\d+$/.test(term.replace(/\s+/g, ''));
    
    // Clean and format the search term
    const cleanTerm = isStockNumber 
      ? term.replace(/\s+/g, '').toUpperCase()
      : term.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/unified-vehicles`, {
        params: {
          searchTerm: cleanTerm,
          searchType: isStockNumber ? 'stock' : 'general',
          limit: 25,
          page: 1
        },
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      setResults(response.data.vehicles || []);
    } catch (err) {
      let errorMessage = 'Error fetching vehicles: ';
      if (err.code === 'ECONNABORTED' || err.response?.status === 504) {
        errorMessage = `Search "${term}" timed out. Try searching with just the stock number.`;
      } else if (!navigator.onLine) {
        errorMessage = 'No internet connection';
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Is the local server running?';
      } else {
        errorMessage = err.response?.data?.message || err.message;
      }
      
      setError(errorMessage);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  const debouncedFetch = useMemo(
    () => debounce((term) => {
      fetchVehicles(term);
    }, 750), // Increased debounce to 750ms
    [fetchVehicles]
  );

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    if (value.length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    debouncedFetch(value);
  };

  const handleRowClick = async (vehicle) => {
    try {
      const response = await axios.get(`${API_URL}/unified-vehicles/details/${vehicle.StockNumber}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });
      
      setSelectedVehicle(response.data);
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
      setError('Failed to fetch vehicle details.');
    }
  };

  return (
    <div className="unified-search-container">
      <div className="search-header">
        <input
          type="text"
          value={searchInput}
          onChange={handleSearch}
          placeholder="Enter at least 2 characters to search..."
          className="search-input"
          minLength={2}
        />
        {loading && <div className="loading-spinner">Searching...</div>}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <small>Try using a more specific search term</small>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th>Stock #</th>
                <th>Year</th>
                <th>Make</th>
                <th>Model</th>
                <th>Color</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {results.map((vehicle) => (
                <tr 
                  key={vehicle.StockNumber}
                  onClick={() => handleRowClick(vehicle)}
                  className="clickable-row"
                >
                  <td>{vehicle.StockNumber}</td>
                  <td>{vehicle.Year}</td>
                  <td>{vehicle.Make}</td>
                  <td>{vehicle.Model}</td>
                  <td>{vehicle.Color}</td>
                  <td>{vehicle['Current Price']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && searchInput.length >= 2 && results.length === 0 && (
        <div className="no-results">
          No vehicles found matching "{searchInput}"
        </div>
      )}

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}

export default SearchUnifiedVehicles;