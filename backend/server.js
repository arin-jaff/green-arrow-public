const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// MongoDB URI
const uri = "mongodb+srv://dbuser:dbuserdbuser@greenarrow.8re0zjc.mongodb.net/?retryWrites=true&w=majority&appName=GreenArrow";

// Connect to MongoDB using promises
MongoClient.connect(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})
.then(client => {
  console.log('Connected successfully to MongoDB');
  const db = client.db('greenarrow');
  const usersCollection = db.collection('users');
  const messagesCollection = db.collection('messages');
  const leaderboardCollection = db.collection('leaderboard');

  // Middleware to verify JWT token
  const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access Denied');
    try {
      const verified = jwt.verify(token, 'secret');
      req.user = verified;
      next();
    } catch (err) {
      res.status(400).send('Invalid Token');
    }
  };

  // Routes

  // Register a new user
// Register a new user with initial score of 0
app.post('/green-arrow-public/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { username, password: hashedPassword, score: 0 };
    await usersCollection.insertOne(user);
    res.json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});





  // Login endpoint
  app.post('/green-arrow-public/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await usersCollection.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id }, 'secret');
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  // Retrieve all users (authenticated)
  app.get('/green-arrow-public/users', authenticate, async (req, res) => {
    try {
      const users = await usersCollection.find({}, { projection: { username: 1 } }).toArray();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Post a new message (authenticated)
// Update /messages endpoint to handle message posting with targeted user
app.post('/green-arrow-public/messages', authenticate, async (req, res) => {
  const { text, receiverUsername } = req.body;
  const message = { 
    userId: new ObjectId(req.user.id), 
    text, 
    upvotes: 0, 
    downvotes: 0, 
    receiverUsername
  };

  try {
    await messagesCollection.insertOne(message);

    // Update targeted user's score if message has more upvotes than downvotes
    const messageValue = message.upvotes - message.downvotes;
    if (messageValue > 0) {
      const receiver = await usersCollection.findOne({ username: receiverUsername });
      if (receiver) {
        await usersCollection.updateOne(
          { _id: receiver._id },
          { $inc: { overallScore: messageValue } }
        );
      }
    } else if (messageValue < 0) {
      // Handle negative scoring if needed
    }

    res.json({ message: 'Message posted successfully!' });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});


  // Retrieve all messages with user details (authenticated)
  app.get('/green-arrow-public/messages', authenticate, async (req, res) => {
    try {
      const messages = await messagesCollection.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            text: 1,
            upvotes: 1,
            downvotes: 1,
            'user.username': 1
          }
        }
      ]).toArray();
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Vote on a message (authenticated)
app.post('/green-arrow-public/vote', authenticate, async (req, res) => {
  const { messageId, type } = req.body;
  const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) });

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  try {
    if (type === 'upvote') {
      message.upvotes += 1;
    } else if (type === 'downvote') {
      message.downvotes += 1;
    }

    await messagesCollection.updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { upvotes: message.upvotes, downvotes: message.downvotes } }
    );

    // Calculate message value based on votes
    const messageValue = message.upvotes - message.downvotes;

    // Update sender's score in leaderboard
    await leaderboardCollection.updateOne(
      { userId: message.userId },
      { $inc: { score: messageValue } }
    );

    // Update receiver's score in leaderboard
    if (message.receiverUsername) {
      const receiver = await usersCollection.findOne({ username: message.receiverUsername });
      if (receiver) {
        await leaderboardCollection.updateOne(
          { userId: receiver._id },
          { $inc: { score: -messageValue } }  // Negative score adjustment for receiver
        );
      }
    }

    res.json({ message: 'Vote recorded!' });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

app.get('/green-arrow-public/leaderboard', authenticate, async (req, res) => {
  try {
    const users = await usersCollection.find({}, { projection: { username: 1, score: 1 } }).sort({ score: -1 }).toArray();
    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.post('/green-arrow-public/update-score', authenticate, async (req, res) => {
  const { username, scoreChange } = req.body;
  try {
    await usersCollection.updateOne(
      { username },
      { $inc: { score: scoreChange } }
    );
    res.json({ message: 'Score updated successfully!' });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ error: 'Failed to update score' });
  }
});

app.get('/green-arrow-public/messages/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const message = await messagesCollection.findOne({ _id: new ObjectId(id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(message);
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

  // Start the server
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
