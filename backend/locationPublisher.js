const { connectQueue } = require('./config/rabbitmq');

const publishLocation = async () => {
  const { channel } = await connectQueue();
  
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
    
    console.log('Location published:', location);
  }, 1000);
};

publishLocation().catch(console.error);