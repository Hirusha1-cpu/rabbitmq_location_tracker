// locationPublisher.js
const { connectQueue } = require('./config/rabbitmq');

const publishLocation = async () => {
  try {
    const { channel } = await connectQueue();
    console.log('Connected to RabbitMQ for publishing');
    
    // Simulate location updates
    setInterval(() => {
      const location = {
        latitude: 40.7128 + (Math.random() - 0.5) * 0.01,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date()
      };
      
      channel.sendToQueue(
        'location_updates',
        Buffer.from(JSON.stringify(location))
      );
      
      console.log('Published location:', location);
    }, 10000);
  } catch (error) {
    console.error('Error in location publisher:', error);
  }
};

publishLocation().catch(console.error);