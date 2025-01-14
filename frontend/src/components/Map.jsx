import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker, Polyline } from '@react-google-maps/api';
import axios from 'axios';

const WS_URL = 'ws://localhost:8080';
const API_URL = 'http://localhost:5004';

const Map = () => {
  const [userLocation, setUserLocation] = useState({
    latitude: 40.7128,
    longitude: -74.0060
  });
  const [randomLocation, setRandomLocation] = useState(null);
  const [error, setError] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  // Fetch latest location from MongoDB on component mount
  useEffect(() => {
    const fetchLatestLocation = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/location/latest`);
        if (response.data) {
          setRandomLocation({
            latitude: response.data.latitude,
            longitude: response.data.longitude,
            timestamp: response.data.timestamp
          });
        }
      } catch (error) {
        console.error('Error fetching latest location:', error);
      }
    };

    fetchLatestLocation();
  }, []);

  useEffect(() => {
    let ws = null;
    
    const connectWebSocket = () => {
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'random') {
            setRandomLocation(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
      };
    };

    // Set up geolocation tracking
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('Got user location:', newLocation);
          setUserLocation(newLocation);
          
          // Connect WebSocket and send initial location
          connectWebSocket();
          setTimeout(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              console.log('Sending initial location to WebSocket');
              ws.send(JSON.stringify(newLocation));
            }
          }, 1000);
        },
        (error) => {
          const errorMessage = `Geolocation error: ${error.message}`;
          setError(errorMessage);
          console.error(errorMessage);
        }
      );

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          console.log('Location updated:', newLocation);
          setUserLocation(newLocation);
          
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('Sending updated location to WebSocket');
            ws.send(JSON.stringify(newLocation));
          }
        },
        (error) => {
          const errorMessage = `Location watching error: ${error.message}`;
          setError(errorMessage);
          console.error(errorMessage);
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        if (ws) {
          ws.close();
        }
      };
    } else {
      setError("Geolocation is not supported by this browser");
    }
  }, []);

  const center = useMemo(() => ({
    lat: userLocation.latitude,
    lng: userLocation.longitude
  }), [userLocation.latitude, userLocation.longitude]);

  const pathCoordinates = useMemo(() => {
    if (!randomLocation) return [];
    return [
      { lat: userLocation.latitude, lng: userLocation.longitude },
      { lat: randomLocation.latitude, lng: randomLocation.longitude }
    ];
  }, [userLocation, randomLocation]);

  if (loadError) return <div>Error loading maps: {loadError.message}</div>;
  if (!isLoaded) return <div>Loading maps...</div>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ff4444',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}
      
      <GoogleMap
        mapContainerStyle={{
          height: "100vh",
          width: "100%"
        }}
        zoom={14}
        center={center}
      >
        {/* User location marker */}
        <Marker
          position={center}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#FF0000',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF'
          }}
        />

        {/* Random location marker */}
        {randomLocation && (
          <Marker
            position={{
              lat: randomLocation.latitude,
              lng: randomLocation.longitude
            }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#0000FF',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            }}
          />
        )}

        {/* Path between points */}
        {randomLocation && (
          <Polyline
            path={pathCoordinates}
            options={{
              strokeColor: '#4285F4',
              strokeOpacity: 0.8,
              strokeWeight: 3,
              geodesic: true
            }}
          />
        )}
      </GoogleMap>

      <div style={{
        position: 'absolute',
        top: error ? '80px' : '20px',
        left: '20px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        zIndex: 1000
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Location Info</div>
        <div>Your Location:</div>
        <div>Lat: {userLocation.latitude.toFixed(6)}</div>
        <div>Lon: {userLocation.longitude.toFixed(6)}</div>
        
        {randomLocation && (
          <>
            <div style={{ marginTop: '10px' }}>Random Location:</div>
            <div>Lat: {randomLocation.latitude.toFixed(6)}</div>
            <div>Lon: {randomLocation.longitude.toFixed(6)}</div>
            <div>Distance: {randomLocation.distance}km</div>
            <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
              Last Update: {new Date(randomLocation.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Map;