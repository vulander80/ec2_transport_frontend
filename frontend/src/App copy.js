import React from 'react';
import UserDirectory from './user_site';
import SoftwareInventory from './software_site';
import SydneyTrains from './sydney_trains';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import JSMAssetSyncDashboard from './JSMAssetSyncDashboard';

const Home = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'JSM Assets',
      description: 'Click to view and manage your assets',
      route: '/jsm',
    },
    {
      title: 'User Directory',
      description: 'Browse and manage user profiles',
      route: '/users',
    },
    {
      title: 'Software Inventory',
      description: 'Track and manage software licenses',
      route: '/software',
    },
    {
      title: 'Sydney Trains',
      description: 'Get average times and schedule info',
      route: '/trains',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.route)}
            className="cursor-pointer bg-white shadow-lg rounded-xl p-10 text-center hover:shadow-xl transition"
          >
            <h1 className="text-2xl font-bold text-blue-600 mb-2">{card.title}</h1>
            <p className="text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jsm" element={<JSMAssetSyncDashboard />} />
        <Route path="/users" element={<UserDirectory />} />
        <Route path="/software" element={<SoftwareInventory />} />
        <Route path="/trains" element={<SydneyTrains />} />

      </Routes>
    </Router>
  );
}

export default App;
