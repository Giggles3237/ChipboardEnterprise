import React, { useState, useContext, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './EditSaleForm.css';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import ScheduleButton from './ScheduleButton';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDateOnly = (value) => {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'string') {
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);

    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }

  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const getDayBefore = (value) => new Date(toDateOnly(value).getTime() - MS_PER_DAY);

const isBeforeToday = (value) => {
  const today = toDateOnly(new Date());
  return toDateOnly(value) < today;
};

function EditSaleForm({ sale, onSubmit, onCancel, onDelete }) {
  const { auth } = useContext(AuthContext);
  const [salespeople, setSalespeople] = useState([]);
  const [showGetReady, setShowGetReady] = useState(false);
  const [showLoanerRequest, setShowLoanerRequest] = useState(false);
  const [getReadyDateManuallyChanged, setGetReadyDateManuallyChanged] = useState(false);
  const [getReadyData, setGetReadyData] = useState({
    location: 'annex',
    miles: '',
    instructions: [],
    comments: '',
    promiseTime: '14:00',
    // Store as Date object to avoid timezone issues in the DatePicker
    getReadyDate: getDayBefore(sale.deliveryDate),
    salespersonEmail: auth?.user?.email || ''
  });
  const [loanerRequestData, setLoanerRequestData] = useState({
    soldUnit: 'Yes',
    additionalInformation: ''
  });

  // Add useEffect to fetch salespeople
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

  const [formData, setFormData] = useState({
    ...sale,
    deliveryDate: sale.deliveryDate instanceof Date 
      ? sale.deliveryDate.toISOString().split('T')[0]
      : new Date(sale.deliveryDate).toISOString().split('T')[0],
    advisor: sale.advisor || (auth?.user?.role === 'Salesperson' ? auth.user.name : '')
  });

  // Add console logs to debug
  console.log('Auth state:', auth);
  console.log('Current sale:', sale);

  useEffect(() => {
    // Check if we're authenticated
    if (!auth?.token) {
      console.error('No authentication token found');
      // Optionally redirect to login
      // window.location.href = '/login';
    }
  }, [auth]);

  // Add validation check at the start of component
  useEffect(() => {
    if (auth?.user?.role === 'Salesperson' && sale.advisor && sale.advisor !== auth.user.name) {
      alert('You can only edit your own sales.');
      onCancel();
    }
  }, [auth, sale, onCancel]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prevData => ({
      ...prevData,
      deliveryDate: date
    }));

    if (!getReadyDateManuallyChanged) {
      setGetReadyData(prevData => ({
        ...prevData,
        getReadyDate: getDayBefore(date)
      }));
    }
  };

  const handleGetReadyDateChange = (date) => {
    setGetReadyDateManuallyChanged(true);
    setGetReadyData(prevData => ({
      ...prevData,
      getReadyDate: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('EditSaleForm: Starting form submission');
    
    if (auth?.user?.role === 'Salesperson' && sale.advisor && sale.advisor !== auth.user.name) {
      alert('You can only edit your own sales.');
      return;
    }
    
    try {
      const formattedDate = formData.deliveryDate instanceof Date 
        ? formData.deliveryDate.toISOString().split('T')[0]
        : new Date(formData.deliveryDate).toISOString().split('T')[0];

      const submissionData = {
        ...formData,
        id: sale.id,
        deliveryDate: formattedDate,
        delivered: Boolean(formData.delivered)
      };
      
      console.log('EditSaleForm: Submission data prepared:', submissionData);
      
      await onSubmit(submissionData);
      console.log('EditSaleForm: Submit successful');
      onCancel(); // Only call onCancel after successful submission
      
    } catch (error) {
      console.error('EditSaleForm: Error in handleSubmit:', error);
      alert(`Error saving changes: ${error.message}`);
    }
  };

  const handleCancel = () => {
    console.log('Cancel clicked');
    onCancel();
  };

  const handleGetReadyToggle = () => {
    setShowGetReady(!showGetReady);
  };

  const handleLoanerRequestToggle = () => {
    setShowLoanerRequest(!showLoanerRequest);
  };

  const handleGetReadyChange = (e) => {
    const { name, value, type } = e.target;
    setGetReadyData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? value : value
    }));
  };

  const handleInstructionChange = (instruction) => {
    setGetReadyData(prevData => ({
      ...prevData,
      instructions: prevData.instructions.includes(instruction)
        ? prevData.instructions.filter(item => item !== instruction)
        : [...prevData.instructions, instruction]
    }));
  };

  const handleLoanerRequestChange = (e) => {
    const { name, value } = e.target;
    setLoanerRequestData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSendGetReady = async () => {
    try {
      const dueDate = getReadyData.getReadyDate instanceof Date 
        ? getReadyData.getReadyDate.toLocaleDateString()
        : new Date(getReadyData.getReadyDate).toLocaleDateString();
      
      const promiseTime = getReadyData.promiseTime || '2:00 PM';
      
      const getReadyEmailData = {
        getReadyId: formData.stockNumber,
        dueBy: `${dueDate} at ${promiseTime}`,
        chassis: formData.chassis || '',
        vehicle: `${formData.model} ${formData.color}`,
        location: getReadyData.location,
        miles: getReadyData.miles,
        itemsNeeded: getReadyData.instructions,
        additionalAction: 'Check for Open Campaigns',
        comments: getReadyData.comments,
        customerName: formData.clientName,
        salesperson: formData.advisor,
        submittedBy: auth?.user?.name || '',
        salespersonEmail: getReadyData.salespersonEmail,
        year: Number(formData.year),
        make: formData.make,
        modelName: formData.model,
        color: formData.color,
        getReadyDate: getReadyData.getReadyDate instanceof Date
          ? getReadyData.getReadyDate.toISOString().split('T')[0]
          : new Date(getReadyData.getReadyDate).toISOString().split('T')[0],
        promiseTime: getReadyData.promiseTime || '14:00'
      };

      const response = await axios.post(`${API_BASE_URL}/getready/send-email`, getReadyEmailData, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const sentTo = response?.data?.recipients || [];
        const cc = response?.data?.cc ? `\nCC: ${response.data.cc}` : '';
        const integrationNote = response?.data?.integration?.ok === false
          ? `\nGet Ready system warning: ${response.data.integration.message || 'submission failed'}`
          : '\nGet Ready was also added to the new tracking system.';
        alert(`Get Ready email sent successfully!\nSent to: ${sentTo.join(', ') || 'N/A'}${cc}${integrationNote}`);
        setShowGetReady(false);
      }
    } catch (error) {
      console.error('Error sending Get Ready email:', error);
      console.error('Get Ready email response:', error.response?.data);
      const serverMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      const readableMessage = error.response?.status === 401
        ? `${serverMessage}. Please log out and log back in, then try again.`
        : serverMessage;
      alert(`Error sending Get Ready email: ${readableMessage}`);
    }
  };

  const handleSubmitLoanerRequest = async () => {
    try {
      const advisorEmail = salespeople.find(person => person.name === formData.advisor)?.email || auth?.user?.email || '';
      const loanerPayload = {
        stockNumber: formData.stockNumber,
        clientName: formData.clientName,
        soldUnit: loanerRequestData.soldUnit,
        additionalInformation: loanerRequestData.additionalInformation,
        clientAdvisorEmail: advisorEmail,
        respondersEmail: auth?.user?.email || ''
      };

      const response = await axios.post(`${API_BASE_URL}/loaners/request`, loanerPayload, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        alert('Loaner request submitted successfully.');
        setShowLoanerRequest(false);
      }
    } catch (error) {
      console.error('Error submitting loaner request:', error);
      console.error('Loaner request response:', error.response?.data);
      const serverMessage = error.response?.data?.flow?.message || error.response?.data?.message || error.message;
      const readableMessage = typeof serverMessage === 'string'
        ? serverMessage
        : JSON.stringify(serverMessage);
      alert(`Error submitting loaner request: ${readableMessage || error.message}`);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      console.warn('Delete functionality not available');
      return;
    }

    if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
      try {
        await onDelete(sale);
        onCancel(); // Close the form after successful deletion
      } catch (error) {
        console.error('Error deleting sale:', error);
        alert(`Error deleting sale: ${error.message}`);
      }
    }
  };

  const vehicleTypes = [
    'New BMW',
    'CPO BMW',
    'Used BMW',
    'New MINI',
    'CPO MINI',
    'Used MINI',
    'Wholesale'
  ];

  const instructionOptions = [
    'Fuel',
    'Fluff',
    'CPO',
    'Check for Retail',
    'PDI',
    'Safety Check',
    'State and Emissions',
    'Cilajet',
    'Body Estimate',
    'Wholesale - Check for recalls',
    'Maintenance',
    'Prep for PPF',
    'Other'
  ];

  console.log('onSubmit:', onSubmit);

  const getReadyDateIsPast = isBeforeToday(getReadyData.getReadyDate);

  return (
    <div className="edit-sale-form-overlay">
      <div className="edit-sale-form">
        <h2>{sale.id ? 'Edit Sale' : 'Add New Sale'}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="clientName">Client Name:</label>
            <input
              type="text"
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="stockNumber">Stock Number:</label>
            <input
              type="text"
              id="stockNumber"
              name="stockNumber"
              value={formData.stockNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="year">Year:</label>
            <input
              type="number"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="make">Make:</label>
            <input
              type="text"
              id="make"
              name="make"
              value={formData.make}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="model">Model:</label>
            <input
              type="text"
              id="model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="color">Color:</label>
            <input
              type="text"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label htmlFor="advisor">Advisor:</label>
            <select
              id="advisor"
              name="advisor"
              value={formData.advisor || ''}
              onChange={handleChange}
              required
            >
              <option value="">Select Advisor</option>
              {auth?.user?.role === 'Salesperson' ? (
                <option value={auth.user.name}>{auth.user.name}</option>
              ) : (
                <>
                  {salespeople.map(person => (
                    <option key={person.id} value={person.name}>
                      {person.name} ({person.role})
                    </option>
                  ))}
                  <option value="House">House</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label htmlFor="delivered">Delivered:</label>
            <input
              type="checkbox"
              id="delivered"
              name="delivered"
              checked={formData.delivered}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="deliveryDate">Delivery Date:</label>
            <DatePicker
              selected={formData.deliveryDate instanceof Date ? formData.deliveryDate : new Date(formData.deliveryDate)}
              onChange={handleDateChange}
              dateFormat="yyyy-MM-dd"
              id="deliveryDate"
              name="deliveryDate"
              required
            />
          </div>

          <div>
            <label htmlFor="type">Type:</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select Type</option>
              {vehicleTypes.map((type, index) => (
                <option key={index} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Get Ready Section */}
          {!formData.delivered && (
            <div className="get-ready-section">
              <button
                type="button"
                className="toggle-loaner-request-button"
                onClick={handleLoanerRequestToggle}
              >
                Loaner Request
              </button>
              <button 
                type="button" 
                className="toggle-get-ready-button"
                onClick={handleGetReadyToggle}
              >
                Get Ready
              </button>
              <ScheduleButton
                stockNumber={formData.stockNumber}
                clientLastName={formData.clientName ? formData.clientName.split(' ').pop() : ''}
                advisorLastName={formData.advisor ? formData.advisor.split(' ').pop() : ''}
                advisorName={formData.advisor}
                advisorEmail={salespeople.find(person => person.name === formData.advisor)?.email || auth?.user?.email || ''}
              />
              
              {showGetReady && (
                <div className="get-ready-fields">
                  <div>
                    <label htmlFor="getReadyLocation">Location:</label>
                    <input
                      type="text"
                      id="getReadyLocation"
                      name="location"
                      value={getReadyData.location}
                      onChange={handleGetReadyChange}
                      placeholder="Enter location"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="getReadyDate">Get Ready Date:</label>
                    <DatePicker
                      selected={getReadyData.getReadyDate instanceof Date ? getReadyData.getReadyDate : new Date(getReadyData.getReadyDate)}
                      onChange={handleGetReadyDateChange}
                      dateFormat="yyyy-MM-dd"
                      id="getReadyDate"
                      name="getReadyDate"
                      required
                    />
                    {getReadyDateIsPast && (
                      <div className="get-ready-date-warning" role="alert">
                        Warning: this Get Ready date is in the past.
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="getReadyMiles">Miles:</label>
                    <input
                      type="number"
                      id="getReadyMiles"
                      name="miles"
                      value={getReadyData.miles}
                      onChange={handleGetReadyChange}
                      placeholder="Enter miles"
                    />
                  </div>
                  
                  <div>
                    <label>Instructions:</label>
                    <div className="instructions-grid">
                      {instructionOptions.map((instruction) => (
                        <div key={instruction} className="instruction-item">
                          <input
                            type="checkbox"
                            id={`getReady-${instruction}`}
                            checked={getReadyData.instructions.includes(instruction)}
                            onChange={() => handleInstructionChange(instruction)}
                          />
                          <label htmlFor={`getReady-${instruction}`}>{instruction}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="getReadyComments">Comments:</label>
                    <textarea
                      id="getReadyComments"
                      name="comments"
                      value={getReadyData.comments}
                      onChange={handleGetReadyChange}
                      placeholder="Enter comments"
                      rows="3"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="getReadySalespersonEmail">Salesperson's Email:</label>
                    <input
                      type="email"
                      id="getReadySalespersonEmail"
                      name="salespersonEmail"
                      value={getReadyData.salespersonEmail}
                      onChange={handleGetReadyChange}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="getReadyPromiseTime">Promise Time:</label>
                    <input
                      type="time"
                      id="getReadyPromiseTime"
                      name="promiseTime"
                      value={getReadyData.promiseTime}
                      onChange={handleGetReadyChange}
                    />
                  </div>
                  
                  <div className="get-ready-buttons">
                    <button 
                      type="button" 
                      className="send-get-ready-button"
                      onClick={handleSendGetReady}
                    >
                      Send Get Ready Email
                    </button>
                  </div>
                </div>
              )}

              {showLoanerRequest && (
                <div className="loaner-request-fields">
                  <div>
                    <label htmlFor="loanerSoldUnit">Sold Unit?</label>
                    <select
                      id="loanerSoldUnit"
                      name="soldUnit"
                      value={loanerRequestData.soldUnit}
                      onChange={handleLoanerRequestChange}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="loanerClientAdvisorEmail">Client Advisor Email:</label>
                    <input
                      type="email"
                      id="loanerClientAdvisorEmail"
                      value={salespeople.find(person => person.name === formData.advisor)?.email || auth?.user?.email || ''}
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="loanerRespondersEmail">Responder's Email:</label>
                    <input
                      type="email"
                      id="loanerRespondersEmail"
                      value={auth?.user?.email || ''}
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="loanerStockNumber">Stock Number:</label>
                    <input
                      type="text"
                      id="loanerStockNumber"
                      value={formData.stockNumber}
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="loanerClientName">Client Name:</label>
                    <input
                      type="text"
                      id="loanerClientName"
                      value={formData.clientName}
                      readOnly
                    />
                  </div>

                  <div>
                    <label htmlFor="loanerAdditionalInformation">Additional Notes:</label>
                    <textarea
                      id="loanerAdditionalInformation"
                      name="additionalInformation"
                      value={loanerRequestData.additionalInformation}
                      onChange={handleLoanerRequestChange}
                      placeholder="Enter loaner request details"
                      rows="3"
                      required
                    />
                  </div>

                  <div className="loaner-request-buttons">
                    <button
                      type="button"
                      className="send-loaner-request-button"
                      onClick={handleSubmitLoanerRequest}
                    >
                      Submit Loaner Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-buttons">
            <button type="submit" className="save-button">Save Changes</button>
            {sale.id && !formData.delivered && ( // Only show delete button for existing, undelivered sales
              <button 
                type="button" 
                className="delete-button"
                onClick={handleDelete}
                title="Delete Sale"
              >
                🗑️
              </button>
            )}
            <button type="button" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditSaleForm;
