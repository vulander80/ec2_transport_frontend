import React, { useState, useEffect, useRef } from 'react';

// Mock Header component since it's not available
const Header = ({ section }) => (
  <header className="bg-blue-600 text-white p-4">
    <h1 className="text-xl font-bold">{section}</h1>
  </header>
);

const CadmusDBView = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('menu1');
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableSchema, setTableSchema] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [queryHistory, setQueryHistory] = useState([]);
  const [customQuery, setCustomQuery] = useState('');
  const [activeTab, setActiveTab] = useState('properties');

  const containerRef = useRef(null);

  // Fetch available tables on component mount
  useEffect(() => {
    if (activeMenuItem === 'menu1') {
      const fetchTables = async () => {
        try {
          setLoading(true);
          const res = await fetch('/api/db/tables');
          const data = await res.json();
          
          if (data.success) {
            setTables(data.tables || []);
          } else {
            setError('Failed to fetch tables');
          }
        } catch (err) {
          console.error('Failed to fetch tables:', err);
          setError('Network error while fetching tables');
          setTables([]);
        } finally {
          setLoading(false);
        }
      };
      fetchTables();
    }
  }, [activeMenuItem]);

  // Fetch table data when a table is selected and data tab is active
  useEffect(() => {
    if (selectedTable && activeMenuItem === 'menu1' && activeTab === 'data') {
      fetchTableData();
    }
  }, [selectedTable, currentPage, sortColumn, sortDirection, activeTab]);

  // Debounced search effect
  useEffect(() => {
    if (selectedTable && activeTab === 'data') {
      // Clear existing timeout
      if (searchDebounceTimeout) {
        clearTimeout(searchDebounceTimeout);
      }

      // Set new timeout for search
      const timeout = setTimeout(() => {
        setCurrentPage(1); // Reset to first page when searching
        fetchTableData();
      }, 500); // 500ms debounce

      setSearchDebounceTimeout(timeout);

      // Cleanup
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [searchText]);

  // Fetch table schema when a table is selected
  useEffect(() => {
    if (selectedTable && activeMenuItem === 'menu1') {
      fetchTableSchema();
    }
  }, [selectedTable]);

  const fetchTableSchema = async () => {
    if (!selectedTable) return;

    try {
      setSchemaLoading(true);
      // Fixed: Use the correct endpoint URL pattern that matches your backend
      const res = await fetch(`/api/db/schema/${encodeURIComponent(selectedTable.name)}`);
      const data = await res.json();
      
      if (data.success) {
        setTableSchema(data.schema || []);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch table schema');
        setTableSchema([]);
      }
    } catch (err) {
      console.error('Failed to fetch table schema:', err);
      setError('Network error while fetching table schema');
      setTableSchema([]);
    } finally {
      setSchemaLoading(false);
    }
  };

  const fetchTableData = async () => {
    if (!selectedTable) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        table: selectedTable.name,
        page: currentPage,
        limit: recordsPerPage,
        sortColumn: sortColumn || '',
        sortDirection: sortDirection || 'asc'
      });

      // Add search parameter if there's search text
      if (searchText && searchText.trim()) {
        params.append('search', searchText.trim());
      }

      const res = await fetch(`/api/db/table-data?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setTableData(data.data || []);
        setPagination(data.pagination || {});
        setError('');
      } else {
        setError(data.message || 'Failed to fetch table data');
        setTableData([]);
      }
    } catch (err) {
      console.error('Failed to fetch table data:', err);
      setError('Network error while fetching table data');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setCurrentPage(1);
    setSortColumn('');
    setSortDirection('asc');
    setColumnFilters({});
    setActiveTab('properties');
    setTableData([]);
    setSearchText(''); // Clear search when selecting new table
    setPagination({});
    setError('');
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const executeCustomQuery = async () => {
    if (!customQuery.trim()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: customQuery }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTableData(data.data || []);
        setQueryHistory(prev => [...prev.slice(-9), customQuery]);
        setError('');
      } else {
        setError(data.message || 'Query execution failed');
        setTableData([]);
      }
    } catch (err) {
      console.error('Failed to execute query:', err);
      setError('Network error while executing query');
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(filterText.toLowerCase())
  );

  // Remove client-side filtering since we're now doing server-side search
  const totalPages = pagination.totalPages || 1;
  const totalRecords = pagination.totalRecords || 0;

  // Render table properties/schema
  const renderTableProperties = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          {selectedTable.name} - Properties
        </h3>
        <span className="text-sm text-gray-600">
          {tableSchema.length} columns
        </span>
      </div>

      {schemaLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading schema...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Column Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Data Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Nullable
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Default
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Max Length
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableSchema.map((column, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {column.column_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                      {column.data_type}
                      {column.numeric_precision && column.numeric_scale !== null ? 
                        `(${column.numeric_precision},${column.numeric_scale})` : 
                        column.character_maximum_length ? `(${column.character_maximum_length})` : ''
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    <span className={`px-2 py-1 rounded text-xs ${
                      column.is_nullable === 'YES'
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {column.is_nullable}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                    {column.column_default || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {column.character_maximum_length || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderTableBrowser = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Database Tables</h2>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter tables..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredTables.map((table) => (
            <div
              key={table.name}
              onClick={() => handleTableSelect(table)}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                selectedTable?.name === table.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <h3 className="font-semibold text-gray-800">{table.name}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {table.row_count ? `${table.row_count} records` : 'Table'}
              </p>
              {selectedTable?.name === table.name && (
                <div className="mt-2">
                  <span className="inline-block bg-blue-500 text-white px-2 py-1 rounded text-xs">
                    Selected
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        )}

        {error && !selectedTable && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      {selectedTable && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'properties'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 Properties
              </button>
              <button
                onClick={() => {
                  setActiveTab('data');
                  if (tableData.length === 0) {
                    fetchTableData();
                  }
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'data'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Data ({selectedTable.row_count || '?'})
              </button>
            </nav>
          </div>

          <div className="p-0">
            {activeTab === 'properties' && renderTableProperties()}
            {activeTab === 'data' && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {selectedTable.name} - Data
                  </h3>
                  <input
                    type="text"
                    placeholder="Search all records in table..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading data...</p>
                  </div>
                ) : tableData.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full table-auto">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(tableData[0] || {}).map((column) => (
                              <th
                                key={column}
                                onClick={() => handleSort(column)}
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              >
                                <div className="flex items-center space-x-1">
                                  <span>{column}</span>
                                  {sortColumn === column && (
                                    <span className="text-blue-600">
                                      {sortDirection === 'asc' ? '↑' : '↓'}
                                    </span>
                                  )}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tableData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {Object.values(row).map((value, cellIndex) => (
                                <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                  {value?.toString() || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-700">
                          Showing page {pagination.currentPage || 1} of {totalPages} 
                          ({totalRecords} total records)
                          {searchText && <span className="text-blue-600 ml-2">• Search: "{searchText}"</span>}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Click "Data" tab to load table records
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderQueryEditor = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">SQL Query Editor</h2>
        
        <div className="mb-4">
          <textarea
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            rows={10}
            className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-4 mb-4">
          <button
            onClick={executeCustomQuery}
            disabled={!customQuery.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
          <button
            onClick={() => setCustomQuery('')}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Clear
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {queryHistory.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Recent Queries</h3>
            <div className="space-y-2">
              {queryHistory.slice().reverse().map((query, index) => (
                <div
                  key={index}
                  onClick={() => setCustomQuery(query)}
                  className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 font-mono text-sm truncate"
                  title={query}
                >
                  {query}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {tableData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Query Results</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(tableData[0] || {}).map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.slice(0, 100).map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {value?.toString() || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tableData.length > 100 && (
            <p className="text-sm text-gray-600 mt-2">
              Showing first 100 results of {tableData.length} total records
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Database Analytics</h2>
        <p className="text-gray-600">Analytics and reporting features coming soon...</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Tables</h3>
            <p className="text-2xl font-bold text-blue-600">{tables.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Active Connections</h3>
            <p className="text-2xl font-bold text-green-600">-</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Query Performance</h3>
            <p className="text-2xl font-bold text-purple-600">-</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header section="Cadmus Database View" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-gray-100 border-r p-4 overflow-auto">
          <h2 className="text-lg font-bold mb-4">Database Tools</h2>
          <ul className="space-y-2">
            <li
              className={`cursor-pointer p-2 rounded hover:bg-blue-200 ${
                activeMenuItem === 'menu1' ? 'bg-blue-100' : ''
              }`}
              onClick={() => {
                setActiveMenuItem('menu1');
                setSelectedTable(null);
                setTableData([]);
                setTableSchema([]);
                setError('');
              }}
            >
              📊 Table Browser
            </li>
            <li
              className={`cursor-pointer p-2 rounded hover:bg-blue-200 ${
                activeMenuItem === 'menu2' ? 'bg-blue-100' : ''
              }`}
              onClick={() => {
                setActiveMenuItem('menu2');
                setError('');
              }}
            >
              ⚡ Query Editor
            </li>
            <li
              className={`cursor-pointer p-2 rounded hover:bg-blue-200 ${
                activeMenuItem === 'menu3' ? 'bg-blue-100' : ''
              }`}
              onClick={() => setActiveMenuItem('menu3')}
            >
              📈 Analytics
            </li>
          </ul>
        </div>

        <div ref={containerRef} className="flex-1 p-6 overflow-auto bg-gray-50">
          {activeMenuItem === 'menu1' && renderTableBrowser()}
          {activeMenuItem === 'menu2' && renderQueryEditor()}
          {activeMenuItem === 'menu3' && renderAnalytics()}
        </div>
      </div>
    </div>
  );
};

export default CadmusDBView;