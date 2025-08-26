import React, { useState, useEffect } from 'react';
import TerminalEmulator from './TerminalEmulator';
import Header from './components/Header'; // adjust path if needed

const FolderNode = ({ node, level = 0, onFileSelect }) => {
  const [collapsed, setCollapsed] = useState(true);

  if (node.type === 'file') {
    return (
      <div
        style={{ paddingLeft: level * 16 }}
        className="cursor-pointer hover:bg-gray-200 rounded px-1"
        onClick={() => onFileSelect(node)}
      >
        📄 {node.name}
      </div>
    );
  }

  // folder
  return (
    <div style={{ paddingLeft: level * 16 }}>
      <div
        className="cursor-pointer font-semibold"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? '📁' : '📂'} {node.name}
      </div>
      {!collapsed &&
        node.children?.map((child, idx) => (
          <FolderNode key={idx} node={child} level={level + 1} onFileSelect={onFileSelect} />
        ))}
    </div>
  );
};

const TerminalSession = () => {
  const [folderStructure, setFolderStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [loadFileError, setLoadFileError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/folder-structure')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch folder structure');
        return res.json();
      })
      .then((data) => {
        setFolderStructure(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const getFullPath = (node) => node.path || node.name;

  const handleFileSelect = (fileNode) => {
    setSelectedFile(fileNode);
    setFileContent('');
    setLoadFileError(null);

    fetch(`http://localhost:8000/api/file-content?path=${encodeURIComponent(getFullPath(fileNode))}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load file content');
        return res.text();
      })
      .then((text) => {
        setFileContent(text);
      })
      .catch((err) => {
        setLoadFileError(err.message);
      });
  };

  const handleSave = () => {
    setSaving(true);
    setSaveError(null);

    fetch('http://localhost:8000/api/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: getFullPath(selectedFile), content: fileContent }),
    })
      .then((res) => {
        setSaving(false);
        if (!res.ok) throw new Error('Failed to save file');
        alert('File saved successfully!');
      })
      .catch((err) => {
        setSaving(false);
        setSaveError(err.message);
      });
  };

  if (loading) return <div>Loading folder structure...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-100 border-r border-gray-300 p-4 overflow-auto">
          <FolderNode node={folderStructure} onFileSelect={handleFileSelect} />
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 flex flex-col">
          {selectedFile ? (
            <>
              <h2 className="mb-2">Editing: {getFullPath(selectedFile)}</h2>

              {loadFileError ? (
                <div className="text-red-600 mb-2">Error loading file: {loadFileError}</div>
              ) : (
                <textarea
                  className="flex-grow w-full p-2 border rounded font-mono text-sm"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  spellCheck={false}
                />
              )}

              <button
                onClick={handleSave}
                disabled={saving || loadFileError !== null}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>

              {saveError && <div className="text-red-600 mt-2">{saveError}</div>}

              {/* Terminal emulator below */}
              <TerminalEmulator />
            </>
          ) : (
            <p>Select a file from the left to view/edit its content.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalSession;
