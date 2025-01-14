const { connectQueue } = require('./config/rabbitmq');
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

// Function to generate random nearby location within 10km
const generateNearbyLocation = (baseLocation) => {
  // Convert km to degrees (roughly)
  const kmToDegrees = 0.009; // ~1km in degrees
  const maxKm = 10;
  const distance = Math.random() * maxKm; // Random distance up to 10km
  const angle = Math.random() * 2 * Math.PI; // Random angle

  const latOffset = (distance * kmToDegrees) * Math.cos(angle);
  const lngOffset = (distance * kmToDegrees) * Math.sin(angle);

  return {
    latitude: baseLocation.latitude + latOffset,
    longitude: baseLocation.longitude + lngOffset,
    distance: distance.toFixed(2)
  };
};

const setupPublisher = async () => {
  const { channel } = await connectQueue();
  console.log('Connected to RabbitMQ for publishing');

  wss.on('connection', (ws) => {
    console.log('Browser connected');
    let intervalId = null;
    let lastUserLocation = null;

    ws.on('message', async (data) => {
      try {
        const location = JSON.parse(data);
        console.log('Received user location:', location);
        lastUserLocation = location;

        // Clear existing interval
        if (intervalId) {
          clearInterval(intervalId);
        }

        // Generate and send single random location immediately
        const randomLoc = generateNearbyLocation(lastUserLocation);
        const locationData = {
          type: 'random',
          ...randomLoc,
          timestamp: new Date().toISOString()
        };

        // Send to client
        ws.send(JSON.stringify(locationData));

        // Publish to RabbitMQ
        channel.sendToQueue(
          'location_updates',
          Buffer.from(JSON.stringify(locationData))
        );

        console.log('Published random location:', locationData);

        // Set up interval for periodic updates
        intervalId = setInterval(() => {
          if (lastUserLocation) {
            const newRandomLoc = generateNearbyLocation(lastUserLocation);
            const newLocationData = {
              type: 'random',
              ...newRandomLoc,
              timestamp: new Date().toISOString()
            };

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(newLocationData));
            }

            channel.sendToQueue(
              'location_updates',
              Buffer.from(JSON.stringify(newLocationData))
            );

            console.log('Published updated random location:', newLocationData);
          }
        }, 10000);

      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('Browser disconnected');
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
  });
};

setupPublisher().catch(console.error);