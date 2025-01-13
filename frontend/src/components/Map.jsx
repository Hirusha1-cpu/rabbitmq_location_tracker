import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useLoadScript, Marker } from '@react-google-maps/api';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:5004');

const Map = () => {
  const [location, setLocation] = useState({
    latitude: 40.7128,
    longitude: -74.0060
  });
  
  const [lastUpdate, setLastUpdate] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  const mapStyles = {
    height: "100vh",
    width: "100%"
  };

  const center = useMemo(() => ({
    lat: location.latitude,
    lng: location.longitude
  }), [location.latitude, location.longitude]);

  useEffect(() => {
    // Get initial location
    const fetchInitialLocation = async () => {
      try {
        const response = await axios.get('http://localhost:5004/api/location/latest');
        if (response.data) {
          setLocation({
            latitude: response.data.latitude,
            longitude: response.data.longitude
          });
          setLastUpdate(new Date(response.data.timestamp));
        }
      } catch (error) {
        console.error('Error fetching initial location:', error);
      }
    };

    fetchInitialLocation();

    // Listen for real-time updates
    socket.on('locationUpdate', (newLocation) => {
      setLocation({
        latitude: newLocation.latitude,
        longitude: newLocation.longitude
      });
      setLastUpdate(new Date(newLocation.timestamp));
    });

    return () => {
      socket.off('locationUpdate');
    };
  }, []);

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <div>Loading maps...</div>;

  const markerIcon = {
    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
    fillColor: '#FF0000',
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
    scale: 2,
    anchor: { x: 12, y: 24 }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <GoogleMap
        mapContainerStyle={mapStyles}
        zoom={15}
        center={center}
        options={{
          zoomControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        <Marker
          position={{
            lat: location.latitude,
            lng: location.longitude
          }}
          icon={markerIcon}
          animation={2} // Using the numeric value for DROP animation
        />
      </GoogleMap>
      
      {/* Location Info Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          backgroundColor: 'white',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Current Location</div>
        <div>Lat: {location.latitude.toFixed(6)}</div>
        <div>Lon: {location.longitude.toFixed(6)}</div>
        {lastUpdate && (
          <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
            Last Update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;