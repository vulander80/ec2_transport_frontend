import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from './vu_logo2.png'; // ✅ Import your local logo image

const Layout = ({ title, children }) => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-md p-4 flex items-center justify-between relative max-w-7xl mx-auto w-full">
        {/* Left: Logo and Home icon */}
        <div className="flex items-center space-x-4">
          {/* Logo */}
          <div
            className="cursor-pointer select-none"
            onClick={() => navigate('/')}
            aria-label="Home"
            title="Home"
          >
            <img
                src={logo}
                alt="Home"
                className="max-h-16 w-auto object-contain"
                />
          </div>

          {/* Home Icon Button */}
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800 focus:outline-none"
            aria-label="Home"
            title="Home"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>
        </div>

        {/* Center: Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <h1 className="text-lg font-bold text-gray-800 select-none">{title}</h1>
        </div>

        {/* Right: Profile Icon and Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            className="focus:outline-none rounded-full hover:bg-gray-200 p-1"
            title="Profile menu"
          >
            <svg
              className="w-8 h-8 text-gray-600"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-50">
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/account');
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Account Details
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate('/settings');
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full">{children}</main>

      {/* Footer */}
      <footer className="bg-white shadow-inner p-4 text-sm text-center text-gray-500">
        &copy; {new Date().getFullYear()} Internal Dashboard | Status: OK
      </footer>
    </div>
  );
};

export default Layout;
