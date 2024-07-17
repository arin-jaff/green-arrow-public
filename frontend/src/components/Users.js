import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate instead of useHistory

const Users = () => {
  const navigate = useNavigate(); // Use useNavigate hook

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login'); // Redirect to login if token is not found
        return;
      }

      try {
        const response = await axios.get('https://arin-jaff.github.io/users', {
          headers: {
            Authorization: token,
          },
        });
        setUsers(response.data);
      } catch (error) {
        console.error(error);
        navigate('/login'); // Redirect to login on error
      }
    };

    fetchUsers();
  }, [navigate]);

  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user._id}>{user.username}</li>
        ))}
      </ul>
    </div>
  );
};

export default Users;
