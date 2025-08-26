import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserDirectory = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [apiStatus, setApiStatus] = useState('connected');

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  const mockUsers = [
    { id: 1, employee_id: 'E123', fullName: 'Alice Johnson', email: 'alice.j@example.com', role: 'Admin', country: 'Australia', lastSignIn: '2024-07-15T08:45:00Z' },
    { id: 2, employee_id: 'E456', fullName: 'Bob Smith', email: 'bob.smith@example.com', role: 'User', country: 'USA', lastSignIn: '2024-07-14T17:30:00Z' },
    { id: 3, employee_id: 'E789', fullName: 'Catherine Lee', email: 'c.lee@example.com', role: 'Manager', country: 'UK', lastSignIn: '2024-07-10T12:15:00Z' },
    { id: 4, employee_id: 'E321', fullName: 'David Nguyen', email: 'd.nguyen@example.com', role: 'User', country: 'Vietnam', lastSignIn: '2024-07-12T09:00:00Z' },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUsers(mockUsers);
      setApiStatus('connected');
    } catch (error) {
      console.error('Error fetching users:', error);
      setApiStatus('error');
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString();

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredUsers = users.filter(user =>
    (filterName === '' || user.fullName.toLowerCase().includes(filterName.toLowerCase())) &&
    (filterEmail === '' || user.email.toLowerCase().includes(filterEmail.toLowerCase())) &&
    (filterRole === '' || user.role.toLowerCase().includes(filterRole.toLowerCase())) &&
    (filterCountry === '' || user.country.toLowerCase().includes(filterCountry.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:underline"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7m-9 14V9m0 0L5 12m14 0l-4-3"
              />
            </svg>
            <span>Home</span>
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-900">User Directory</h1>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Filter by Name" value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm" />
          <input type="text" placeholder="Filter by Email" value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm" />
          <input type="text" placeholder="Filter by Role" value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm" />
          <input type="text" placeholder="Filter by Country" value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mb-4">
          <button onClick={fetchUsers}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* User Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Employee ID</th>
                <th className="text-left px-4 py-2">Full Name</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Country</th>
                <th className="text-left px-4 py-2">Last Sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{user.employee_id}</td>
                  <td className="px-4 py-2">{user.fullName}</td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">{user.role}</td>
                  <td className="px-4 py-2">{user.country}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{formatDate(user.lastSignIn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* API Status */}
        <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
          <span className="font-medium">API Status:</span>
          {getStatusIcon(apiStatus)}
          <span>{apiStatus}</span>
        </div>
      </div>
    </div>
  );
};

export default UserDirectory;
