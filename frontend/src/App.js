import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import UserDirectory from './user_site';
import SoftwareInventory from './software_site';
import SydneyTrains from './sydney_trains';
import JSMAssetSyncDashboard from './JSMAssetSyncDashboard';
import VideoWall from './videowall';
import VideoWallMain from './videowall_main';
import CadmusDBView from './cadmus_dbview';  
import TetrisGame from './TetrisGame';
import PinballGame from './PinballGame';    
import SydneyTrainsV2 from './SydneyTrainsV2';     
import Header from './components/Header';

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
      title: 'Tetris',
      description: 'Play a quick game',
      route: '/tetris',
    },
    { title: 'Pinball', description: 'Flip out 🎯', route: '/pinball' },

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
    //{ title: 'Terminal', description: 'Access your terminal session', route: '/terminal', },
    {
      title: 'VideoWall',
      description: 'Display multiple dashboards or websites',
      route: '/videowall',
    },
    {
      title: 'DB View',
      description: 'View and query the Cadmus database',
      route: '/dbview',   // <-- New route path
    },
    {
      title: 'Sydney Trains v2',
      description: 'Segment-first view with trip counts',
      route: '/trainsv2',   // <-- New route path
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 p-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.route)}
            className="group cursor-pointer bg-white shadow-lg rounded-xl p-10 text-center
                       transition duration-300 ease-in-out
                       hover:bg-blue-50 hover:shadow-2xl hover:scale-105"
          >
            <h1 className="text-2xl font-bold text-blue-600 mb-2 transition-colors duration-300 group-hover:text-blue-800">
              {card.title}
            </h1>
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
        {/* <Route path="/terminal" element={<TerminalSession />} /> */}
        <Route path="/videowall" element={<VideoWall />} />
        <Route path="/videowall/main" element={<VideoWallMain />} />
        <Route path="/dbview" element={<CadmusDBView />} />  {/* New route */}
        <Route path="/tetris" element={<TetrisGame />} />
        <Route path="/pinball" element={<PinballGame />} />
        <Route path="/trainsv2" element={<SydneyTrainsV2 />} />
      </Routes>
    </Router>
  );
}

export default App;
