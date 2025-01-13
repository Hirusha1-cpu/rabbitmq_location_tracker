const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectQueue } = require('./config/rabbitmq');
const Location = require('./models/Location');
require('dotenv').config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set up RabbitMQ consumer and Socket.io
const setupConsumer = async () => {
  const { channel } = await connectQueue();
  
  channel.consume('location_updates', async (data) => {
    try {
      const location = JSON.parse(data.content);
      
      // Save to MongoDB
      const newLocation = new Location({
        latitude: location.latitude,
        longitude: location.longitude
      });
      await newLocation.save();
      
      // Emit to connected clients
      io.emit('locationUpdate', location);
      
      channel.ack(data);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
};

setupConsumer().catch(console.error);

// API endpoint to get latest location
app.get('/api/location/latest', async (req, res) => {
  try {
    const location = await Location.findOne().sort({ timestamp: -1 });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5004;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});