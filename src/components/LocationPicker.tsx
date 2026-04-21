'use client';

import { useState } from 'react';
import { MapPin, Send } from 'lucide-react';
import { useGeolocated } from 'react-geolocated';

interface LocationPickerProps {
  onSend: (location: { latitude: number; longitude: number; address?: string }) => void;
}

export default function LocationPicker({ onSend }: LocationPickerProps) {
  const { coords, isGeolocationAvailable, isGeolocationEnabled } = useGeolocated({
    positionOptions: {
      enableHighAccuracy: true,
    },
    userDecisionTimeout: 5000,
  });

  const [address, setAddress] = useState('');

  const sendLocation = () => {
    if (coords) {
      onSend({
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address || 'Current location'
      });
    }
  };

  if (!isGeolocationAvailable) {
    return <div className="p-4 text-center text-gray-500">Location not available</div>;
  }

  if (!isGeolocationEnabled) {
    return <div className="p-4 text-center text-gray-500">Location not enabled</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center space-x-2 mb-4">
        <MapPin size={20} className="text-blue-500" />
        <span>Share Location</span>
      </div>

      {coords && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Lat: {coords.latitude.toFixed(6)}, Lng: {coords.longitude.toFixed(6)}
          </p>
          <input
            type="text"
            placeholder="Add a message (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full p-2 border rounded mt-2"
          />
        </div>
      )}

      <button
        onClick={sendLocation}
        disabled={!coords}
        className="w-full bg-blue-500 text-white py-2 rounded flex items-center justify-center space-x-2"
      >
        <Send size={16} />
        <span>Send Location</span>
      </button>
    </div>
  );
}