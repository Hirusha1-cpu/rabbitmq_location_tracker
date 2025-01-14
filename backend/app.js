// app.js
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

// Connect to MongoDB with logging
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rabbit_tracker_mq')
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set up RabbitMQ consumer and Socket.io
const setupConsumer = async () => {
  try {
    const { channel } = await connectQueue();
    console.log('Successfully connected to RabbitMQ');
    
    channel.consume('location_updates', async (data) => {
      try {
        const locationData = JSON.parse(data.content);
        console.log('Received location update:', locationData);
        
        // Create and save new location to MongoDB
        const newLocation = new Location({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          timestamp: new Date()
        });

        await newLocation.save();
        console.log('Location saved to MongoDB:', newLocation);
        
        // Emit to connected clients
        io.emit('locationUpdate', {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          timestamp: newLocation.timestamp
        });
        
        channel.ack(data);
      } catch (error) {
        console.error('Error processing message:', error);
        // Don't acknowledge the message if there's an error
        // It will be requeued automatically
      }
    });
  } catch (error) {
    console.error('Error setting up RabbitMQ consumer:', error);
  }
};

// API endpoint to get latest location
app.get('/api/location/latest', async (req, res) => {
  try {
    const location = await Location.findOne().sort({ timestamp: -1 });
    console.log('Retrieved latest location:', location);
    res.json(location);
  } catch (error) {
    console.error('Error fetching latest location:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get location history
app.get('/api/location/history', async (req, res) => {
  try {
    const locations = await Location.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ error: error.message });
  }
});

setupConsumer().catch(console.error);

const PORT = process.env.PORT || 5004;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});