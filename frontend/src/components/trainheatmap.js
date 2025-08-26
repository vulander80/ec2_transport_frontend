import React, { useEffect, useState } from 'react';

const TrainHeatMap = () => {
  const [heatData, setHeatData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHeatMapData = async () => {
      try {
        const res = await fetch('/api/get_heatmap'); // adjust this endpoint if needed
        if (!res.ok) throw new Error('Failed to fetch heatmap data');
        const data = await res.json();
        setHeatData(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error loading heatmap');
      } finally {
        setLoading(false);
      }
    };

    fetchHeatMapData();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-500">Loading heat map...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Train Heat Map</h2>
      <div className="bg-white rounded-lg shadow p-4">
        {heatData.length === 0 ? (
          <p>No heatmap data available.</p>
        ) : (
          <ul className="space-y-2">
            {heatData.map((item, index) => (
              <li key={index} className="border p-2 rounded bg-gray-100">
                <div><strong>Location:</strong> {item.location}</div>
                <div><strong>Activity:</strong> {item.activity_level}</div>
                <div><strong>Time:</strong> {item.timestamp}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TrainHeatMap;
