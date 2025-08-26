// src/sydney_trains_v2.jsx
import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header';
import TrainRoutesMenuV2 from './components/TrainRoutesMenuV2';

const measureTextWidth = (text, font = 'bold 14px Arial') => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  return ctx.measureText(text).width;
};

export default function SydneyTrainsV2() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState({});
  const [filterText, setFilterText] = useState('');
  const [expandedStops, setExpandedStops] = useState({});
  const [routeInfoMap, setRouteInfoMap] = useState({});

  const containerRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/get_routes');
        const data = await res.json();
        const transformed = data.map(line => ({
          id: line.route_name,
          name: line.route_name,
          color: `#${line.route_colour}`,
          stops: (line.trip_data || []).map(td => ({
            name: td.route_name,                 // display first
            route_id: td.route_id,
            trips: (td.train_data || []).map(t => t.trip_id), // count on expand
          })),
        }));
        setRoutes(transformed);
      } catch (e) {
        console.error('Failed to fetch routes:', e);
        setRoutes([]);
      }
    })();
  }, []);

  // close a card when clicking outside
  useEffect(() => {
    const handler = (e) => {
      Object.entries(cardRefs.current).forEach(([id, el]) => {
        if (el && !el.contains(e.target) && selectedRoutes[id]) {
          const updated = { ...selectedRoutes };
          delete updated[id];
          setSelectedRoutes(updated);

          setExpandedStops(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      });
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedRoutes]);

  const handleExpandStop = (routeId, stopIndex, stop) => {
    setExpandedStops(prev => {
      const r = { ...(prev[routeId] || {}) };
      r[stopIndex] = !r[stopIndex];
      return { ...prev, [routeId]: r };
    });

    if (stop.route_id && !routeInfoMap[stop.route_id]) {
      fetch(`/api/get_route_info?route_id=${encodeURIComponent(stop.route_id)}`)
        .then(r => r.json())
        .then(info => setRouteInfoMap(prev => ({ ...prev, [stop.route_id]: info })))
        .catch(err => console.error('get_route_info failed:', err));
    }
  };

  const handleSelectRoute = (routeId, e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const W = rect.width, H = rect.height;

    const found = routes.find(r => r.id === routeId);
    if (!found) return;

    const title = `${found.id} - ${found.stops[0]?.name ?? ''}`;
    const baseW = measureTextWidth(title);
    const defaultW = Math.max(300, Math.min(baseW * 1.1 + 40, W - 40));
    const defaultH = Math.min(150 + (found.stops.length * 40), H - 100);

    const finalW = Math.min(defaultW * 1.5, W - 40);
    const finalH = Math.min(defaultH, H - 60);

    const isNearBottom = clickY >= H * 0.7;
    const isNearRight = clickX >= W * 0.7;

    const x = isNearRight ? (W - finalW) / 2 : Math.max(0, Math.min(clickX - finalW / 2, W - finalW));
    const y = isNearBottom ? (H - finalH) / 2 : Math.max(0, Math.min(clickY - finalH / 2, H - finalH));

    setSelectedRoutes(prev => ({
      ...prev,
      [routeId]: { ...found, width: finalW, height: finalH, x, y }
    }));
  };

  const updateRoutePosition = (routeId, x, y) => {
    setSelectedRoutes(prev => ({ ...prev, [routeId]: { ...prev[routeId], x, y } }));
  };
  const updateRouteSize = (routeId, width, height) => {
    setSelectedRoutes(prev => ({ ...prev, [routeId]: { ...prev[routeId], width, height } }));
  };

  const filter = filterText.toLowerCase();
  const filteredRoutes = routes.filter(r => {
    const text = [r.id, r.name, ...(r.stops || []).map(s => s.name)]
      .filter(Boolean).join(' ').toLowerCase();
    return text.includes(filter);
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header section="Sydney Trains v2" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-gray-100 border-r p-4 overflow-auto">
          <h2 className="text-lg font-bold mb-4">Sidebar</h2>
          <ul className="space-y-2">
            <li className="cursor-pointer p-2 rounded bg-blue-100">🚆 Train Routes (v2)</li>
          </ul>
        </div>

        {/* Content */}
        <div ref={containerRef} className="flex-1 p-6 overflow-auto relative">
          <TrainRoutesMenuV2
            routes={filteredRoutes}
            selectedRoutes={selectedRoutes}
            setSelectedRoutes={setSelectedRoutes}
            filterText={filterText}
            setFilterText={setFilterText}
            expandedStops={expandedStops}
            setExpandedStops={setExpandedStops}
            routeInfoMap={routeInfoMap}
            setRouteInfoMap={setRouteInfoMap}
            cardRefs={cardRefs}
            handleSelectRoute={handleSelectRoute}
            handleExpandStop={handleExpandStop}
            updateRoutePosition={updateRoutePosition}
            updateRouteSize={updateRouteSize}
          />
        </div>
      </div>
    </div>
  );
}
