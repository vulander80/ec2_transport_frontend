import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from './components/Layout';

const JSMAssetSyncDashboard = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const [apiStatus, setApiStatus] = useState('connected');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [syncLog, setSyncLog] = useState([]);
  const [infoAsset, setInfoAsset] = useState(null);

  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const mockAssets = [
    {
      id: 1,
      name: 'Server-001',
      type: 'Hardware',
      status: 'Active',
      lastUpdated: '2024-01-15T10:30:00Z',
      purchaseDate: '2022-06-15',
      cpu: 'Intel Xeon',
      memory: '32GB',
      diskSize: '2TB',
      operatingSystem: 'Ubuntu Server 20.04',
    },
    {
      id: 2,
      name: 'License-Office365',
      type: 'Software',
      status: 'Active',
      lastUpdated: '2024-01-14T14:20:00Z',
      vendor: 'Microsoft',
      category: 'Productivity',
      description: 'Office suite including Word, Excel, Outlook',
      licenseType: 'Subscription',
      licensesPurchased: 50,
      licensesUsed: 42,
      licenseExpiry: '2025-01-01',
      licenseCost: '$600/year',
      maintenanceExpiry: '2025-01-01',
    },
    {
      id: 3,
      name: 'Database-Prod',
      type: 'Service',
      status: 'Active',
      lastUpdated: '2024-01-15T08:45:00Z',
      tier: 'Gold',
      serviceOwner: 'DB Team',
      teamContact: 'db-support@example.com',
      description: 'Handles production database workloads',
    },
  ];

  const mockSyncLogs = [
    { id: 1, timestamp: '2024-01-15T10:30:00Z', action: 'Full Sync', status: 'Success', count: 4 },
    { id: 2, timestamp: '2024-01-14T14:20:00Z', action: 'Incremental Sync', status: 'Success', count: 2 },
    { id: 3, timestamp: '2024-01-13T09:15:00Z', action: 'Full Sync', status: 'Warning', count: 3 },
  ];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      setAssets(mockAssets); // This sets the data
      setApiStatus('connected');
    } catch (error) {
      console.error('Error fetching assets:', error);
      setApiStatus('error');
    }
  };

  const syncAssets = async (assetIds = []) => {
    setSyncStatus('syncing');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newLogEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: assetIds.length > 0 ? 'Selective Sync' : 'Full Sync',
        status: 'Success',
        count: assetIds.length || assets.length,
      };
      setSyncLog([newLogEntry, ...syncLog]);
      setLastSync(new Date());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleAssetSelect = (assetId) => {
    setSelectedAssets(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'text-green-600';
      case 'Maintenance': return 'text-yellow-600';
      case 'Inactive': return 'text-red-600';
      case 'Decommissioned': return 'text-gray-400';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'Error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredAssets = assets.filter(asset => {
    const assetDate = new Date(asset.lastUpdated);
    const fromDate = filterDateFrom ? new Date(filterDateFrom) : null;
    const toDate = filterDateTo ? new Date(filterDateTo) : null;

    return (
      (filterName === '' || asset.name.toLowerCase().includes(filterName.toLowerCase())) &&
      (filterType === '' || asset.type.toLowerCase() === filterType.toLowerCase()) &&
      (filterStatus === '' || asset.status.toLowerCase() === filterStatus.toLowerCase()) &&
      (!fromDate || assetDate >= fromDate) &&
      (!toDate || assetDate <= toDate)
    );
  });

  return (
    <Layout title="JSM Asset Sync Dashboard">
      <div className="mb-4">
        {/* (You can remove this Home button below since Layout already includes one) */}
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* ... your inputs for filters (name, type, status, date) ... */}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mb-4">
        {/* ... Refresh and Sync buttons ... */}
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {/* ... Your table ... */}
      </div>

      {/* Info Panel */}
      {infoAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          {/* ... Asset detail modal ... */}
        </div>
      )}

      {/* Sync Logs */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Sync History</h2>
        <div className="space-y-3">
          {syncLog.concat(mockSyncLogs).map((log) => (
            <div key={log.id} className="flex gap-3 items-start">
              {getStatusIcon(log.status)}
              <div>
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-sm text-gray-500">{log.count} assets</p>
                <p className="text-xs text-gray-400">{formatDate(log.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default JSMAssetSyncDashboard;
