import React, { useState } from 'react';

// Simple AES-GCM encryptor using Web Crypto API
async function encryptAES(secret, password) {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password).slice(0, 16),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(secret)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: Array.from(iv),
  };
}

const Header = ({ section = 'Dashboard' }) => {
  const buttons = [
    { label: 'Home', url: 'http://localhost:3000' },
    // Add more routes here as needed
  ];

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');

  const handleSubmit = async () => {
    if (!name || !secret) return alert('Both fields are required.');

    try {
      const { ciphertext, iv } = await encryptAES(secret, 'encryptionpass123');
      const response = await fetch('http://localhost:8000/api/set-secret-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, encrypted: ciphertext, iv }),
      });

      if (response.ok) {
        alert(`Secret "${name}" set successfully.`);
      } else {
        alert('Failed to send secret.');
      }
    } catch (err) {
      console.error('Encryption error:', err);
      alert('Encryption or network error.');
    }

    setShowModal(false);
    setName('');
    setSecret('');
  };

  return (
    <header className="w-full bg-gray-800 text-white p-4 flex justify-between items-center shadow">
      <div className="flex items-center gap-4">
        <div className="text-xl font-semibold">My App</div>
        <span className="text-gray-400">|</span>
        <div className="text-sm text-gray-200">{section}</div>
      </div>

      <nav className="flex items-center">
        {buttons.map(({ label, url }) => (
          <button
            key={label}
            onClick={() => (window.location.href = url)}
            className="ml-4 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowModal(true)}
          className="ml-4 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm"
        >
          Set Secret Key
        </button>
      </nav>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white text-black p-6 rounded shadow w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Set Secret Key</h2>
            <input
              type="text"
              placeholder="Secret name (e.g., SESSION_SECRET)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-3 p-2 border rounded"
            />
            <input
              type="password"
              placeholder="Secret value"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full mb-4 p-2 border rounded"
            />
            <div className="flex justify-end">
              <button
                className="mr-2 px-4 py-1 bg-gray-300 hover:bg-gray-400 rounded"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
