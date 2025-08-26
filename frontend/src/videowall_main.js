import React from 'react';
import Header from './components/Header';

const videoUrls = [
  'https://x.com/home',
  'https://www.nrl.com/',
  'https://www.youtube.com/embed/l482T0yNkeo',
  'https://www.youtube.com/embed/FTQbiNvZqaY',
];

const VideoWallMain = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-64px)]">
        {videoUrls.map((url, index) => (
          <iframe
            key={index}
            src={url}
            title={`video-${index}`}
            className="w-full h-[calc(50vh-1rem)] border rounded-lg shadow-md"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ))}
      </div>
    </div>
  );
};

export default VideoWallMain;
