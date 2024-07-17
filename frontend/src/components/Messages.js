import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [receiverUsername, setReceiverUsername] = useState('');
  const [users, setUsers] = useState([]);

  const fetchMessages = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('https://arin-jaff.github.io/green-arrow-public/messages', {
        headers: {
          Authorization: token,
        },
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get('https://arin-jaff.github.io/green-arrow-public/users', {
          headers: {
            Authorization: token,
          },
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
    fetchMessages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      await axios.post('https://arin-jaff.github.io/green-arrow-public/messages', { text, receiverUsername }, {
        headers: {
          Authorization: token,
        },
      });
      setText('');
      setReceiverUsername('');
      alert('Message posted successfully!');
      fetchMessages(); // Refresh messages after posting
    } catch (error) {
      console.error('Error posting message:', error);
      alert('Posting message failed.');
    }
  };

  const handleVote = async (messageId, type) => {
    const token = localStorage.getItem('token');
    try {
      // Fetch the current message to determine the current vote balance
      const response = await axios.get(`https://arin-jaff.github.io/green-arrow-public/messages/${messageId}`, {
        headers: {
          Authorization: token,
        },
      });
      const message = response.data;

      // Determine the previous vote balance
      const previousBalance = message.upvotes - message.downvotes;

      // Submit the vote
      await axios.post('https://arin-jaff.github.io/green-arrow-public/vote', { messageId, type }, {
        headers: {
          Authorization: token,
        },
      });

      // Fetch the updated message to get the new vote balance
      const updatedResponse = await axios.get(`https://arin-jaff.github.io/green-arrow-public/messages/${messageId}`, {
        headers: {
          Authorization: token,
        },
      });
      const updatedMessage = updatedResponse.data;

      // Determine the new vote balance
      const newBalance = updatedMessage.upvotes - updatedMessage.downvotes;

      // Determine the score change for the receiver
      let scoreChange = 0;
      if (previousBalance <= 0 && newBalance > 0) {
        scoreChange = 1;
      } else if (previousBalance >= 0 && newBalance < 0) {
        scoreChange = -1;
      } else if ((previousBalance > 0 && newBalance === 0) || (previousBalance < 0 && newBalance === 0)) {
        scoreChange = -Math.sign(previousBalance);
      }

      if (scoreChange !== 0) {
        await axios.post('https://arin-jaff.github.io/green-arrow-public/update-score', { username: message.receiverUsername, scoreChange }, {
          headers: {
            Authorization: token,
          },
        });
      }

      alert('Vote recorded!');
      fetchMessages(); // Refresh messages after voting
    } catch (error) {
      console.error('Error recording vote:', error);
      alert('Voting failed.');
    }
  };

  return (
    <div>
      <h2>Messages</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Message: </label>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label>Direct to: </label>
          <select value={receiverUsername} onChange={(e) => setReceiverUsername(e.target.value)}>
            <option value="">Select user</option>
            {users.map(user => (
              <option key={user._id} value={user.username}>{user.username}</option>
            ))}
          </select>
        </div>
        <button type="submit">Post Message</button>
      </form>
      <ul>
        {messages.map(message => (
          <li key={message._id}>
            <p>{message.text} (To: {message.receiverUsername}) by {message.user.username}</p>
            <button onClick={() => handleVote(message._id, 'upvote')}>Upvote ({message.upvotes})</button>
            <button onClick={() => handleVote(message._id, 'downvote')}>Downvote ({message.downvotes})</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Messages;
