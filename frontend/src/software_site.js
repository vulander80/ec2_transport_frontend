import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SoftwareInventory = () => {
  const navigate = useNavigate();
  const [softwareList, setSoftwareList] = useState([]);
  const [apiStatus, setApiStatus] = useState('connected');

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Mock software data
  const mockSoftware = [
    {
      id: 1,
      name: 'Office 365',
      vendor: 'Microsoft',
      category: 'Productivity',
      description: 'Cloud-based productivity suite',
      licenseType: 'Subscription',
      licensesPurchased: 100,
      licensesUsed: 87,
      licenseExpiry: '2025-01-15T00:00:00Z',
      licenseCost: 12000,
      maintenanceExpiry: '2025-01-15T00:00:00Z',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Adobe Photoshop',
      vendor: 'Adobe',
      category: 'Productivity',
      description: 'Image editing software',
      licenseType: 'Perpetual',
      licensesPurchased: 50,
      licensesUsed: 40,
      licenseExpiry: 'N/A',
      licenseCost: 5000,
      maintenanceExpiry: '2024-12-31T00:00:00Z',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Norton Antivirus',
      vendor: 'NortonLifeLock',
      category: 'Security',
      description: 'Antivirus and malware protection',
      licenseType: 'Subscription',
      licensesPurchased: 200,
      licensesUsed: 180,
      licenseExpiry: '2024-11-30T00:00:00Z',
      licenseCost: 8000,
      maintenanceExpiry: '2024-11-30T00:00:00Z',
      status: 'Expired',
    },
    {
      id: 4,
      name: 'Visual Studio',
      vendor: 'Microsoft',
      category: 'Development',
      description: 'IDE for software development',
      licenseType: 'Subscription',
      licensesPurchased: 30,
      licensesUsed: 25,
      licenseExpiry: '2024-09-15T00:00:00Z',
      licenseCost: 9000,
      maintenanceExpiry: '2024-09-15T00:00:00Z',
      status: 'Active',
    },
  ];

  useEffect(() => {
    fetchSoftware();
  }, []);

  const fetchSoftware = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSoftwareList(mockSoftware);
      setApiStatus('connected');
    } catch (error) {
      console.error('Error fetching software:', error);
      setApiStatus('error');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.toLowerCase() === 'n/a') return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600';
      case 'expired': return 'text-red-600';
      case 'maintenance': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'maintenance': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredSoftware = softwareList.filter(software =>
    (filterName === '' || software.name.toLowerCase().includes(filterName.toLowerCase())) &&
    (filterVendor === '' || software.vendor.toLowerCase().includes(filterVendor.toLowerCase())) &&
    (filterCategory === '' || software.category.toLowerCase().includes(filterCategory.toLowerCase())) &&
    (filterStatus === '' || software.status.toLowerCase().includes(filterStatus.toLowerCase()))
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

        <h1 className="text-3xl font-bold mb-6 text-gray-900">Software Inventory</h1>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Filter by Software Name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Filter by Vendor"
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Filter by Category"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="text"
            placeholder="Filter by Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={fetchSoftware}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Software Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Software Name</th>
                <th className="text-left px-4 py-2">Vendor</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">License Type</th>
                <th className="text-left px-4 py-2">Licenses Purchased</th>
                <th className="text-left px-4 py-2">Licenses Used</th>
                <th className="text-left px-4 py-2">License Expiry</th>
                <th className="text-left px-4 py-2">License Cost</th>
                <th className="text-left px-4 py-2">Maintenance Expiry</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSoftware.map((software) => (
                <tr key={software.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{software.name}</td>
                  <td className="px-4 py-2">{software.vendor}</td>
                  <td className="px-4 py-2">{software.category}</td>
                  <td className="px-4 py-2">{software.description}</td>
                  <td className="px-4 py-2">{software.licenseType}</td>
                  <td className="px-4 py-2">{software.licensesPurchased}</td>
                  <td className="px-4 py-2">{software.licensesUsed}</td>
                  <td className="px-4 py-2">{formatDate(software.licenseExpiry)}</td>
                  <td className="px-4 py-2">${software.licenseCost.toLocaleString()}</td>
                  <td className="px-4 py-2">{formatDate(software.maintenanceExpiry)}</td>
                  <td className={`px-4 py-2 font-semibold ${getStatusColor(software.status)}`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(software.status)}
                      <span>{software.status}</span>
                    </div>
                  </td>
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

export default SoftwareInventory;
