import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './components/Header';

const VideoWall = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="p-8 text-center text-gray-500 text-xl">
        Video Wall Placeholder
      </div>
      <div className="flex justify-center">
        <button
          onClick={() => navigate('/videowall/main')}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go to VideoWall Main
        </button>
      </div>
    </div>
  );
};

export default VideoWall;
