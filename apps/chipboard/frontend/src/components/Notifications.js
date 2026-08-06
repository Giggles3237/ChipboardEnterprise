import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import './Notifications.css';

function Notifications() {
  const { auth } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (auth.user) {
      const fetchNotifications = async () => {
        try {
          const response = await axios.get('/api/notifications', {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          setNotifications(response.data);
        } catch (err) {
          console.error('Error fetching notifications:', err);
        }
      };

      fetchNotifications();
    }
  }, [auth]);

  return (
    <div className="notifications">
      {notifications.map(notification => (
        <div key={notification.id} className="notification-item">
          {notification.message}
        </div>
      ))}
    </div>
  );
}

export default Notifications; 