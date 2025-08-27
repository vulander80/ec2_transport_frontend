// TrainRoutesMenu.js
import React, { useEffect, useMemo, useState } from 'react';
import { Rnd } from 'react-rnd';

const norm = (s) => String(s ?? '').trim().toLowerCase();

const cleanGpsUrl = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  if (s.startsWith("{'") && s.endsWith("'}")) s = s.slice(2, -2);
  s = s.replace(/^\{+|^\[+|^'+|^"+|^\(+/g, '').replace(/\}+|\]+|'+|"+|\)+$/g, '');
  return s.startsWith('http') ? s : null;
};

const TrainRoutesMenu = ({
  containerRef,
  routes,
  selectedRoutes,
  setSelectedRoutes,
  filterText,
  setFilterText,
  expandedStops,
  setExpandedStops,
  routeInfoMap,      // kept for compatibility
  setRouteInfoMap,   // kept for compatibility
  cardRefs,
  measureTextWidth,
}) => {
  const [routesPayload, setRoutesPayload] = useState([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Load once
  useEffect(() => {
    let cancelled = false;
    setLoadingRoutes(true);
    setLoadError(null);
    fetch('/api/get_routes')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (!cancelled) setRoutesPayload(Array.isArray(data) ? data : []); })
      .catch((e) => { if (!cancelled) setLoadError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoadingRoutes(false); });
    return () => { cancelled = true; };
  }, []);

  // Build normalized maps
  const { byRouteId, tripsByRouteName } = useMemo(() => {
    const idMap = {};
    const nameMap = {};
    for (const group of routesPayload || []) {
      const tripData = group?.trip_data || [];
      for (const t of tripData) {
        if (t?.route_id) idMap[norm(t.route_id)] = t; // normalized key
        if (t?.route_name) {
          const k = norm(t.route_name);
          if (!nameMap[k]) nameMap[k] = [];
          nameMap[k].push(t);
        }
      }
    }
    return { byRouteId: idMap, tripsByRouteName: nameMap };
  }, [routesPayload]);

  const findRouteInfoForStop = (stop) => {
    if (!stop) return null;
    if (stop.route_id && byRouteId[norm(stop.route_id)]) return byRouteId[norm(stop.route_id)];
    if (stop.name) {
      const n = norm(stop.name);
      for (const [nameKey, list] of Object.entries(tripsByRouteName)) {
        if (nameKey.includes(n) || n.includes(nameKey)) return list[0]; // pick first
      }
    }
    return null;
  };

  const handleSelectRoute = (routeId, e) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - containerRect.left;
    const clickY = e.clientY - containerRect.top;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const found = routes.find((r) => r.id === routeId);
    if (!found) return;

    const title = `${found.id} - ${found.stops[0]?.name}`;
    const baseWidth = measureTextWidth(title);
    const paddedWidth = baseWidth * 1.1 + 40;
    const defaultWidth = Math.max(300, Math.min(paddedWidth, containerWidth - 40));
    const defaultHeight = Math.min(150 + found.stops.length * 40, containerHeight - 100);
    const finalWidth = Math.min(defaultWidth * 2, containerWidth - 40);
    const estimatedHeight = Math.min(defaultHeight * 2, containerHeight - 60);

    const isNearBottom = clickY >= containerHeight * 0.7;
    const isNearRight = clickX >= containerWidth * 0.7;

    const positionX = isNearRight
      ? (containerWidth - finalWidth) / 2
      : Math.max(0, Math.min(clickX - finalWidth / 2, containerWidth - finalWidth));
    const positionY = isNearBottom
      ? (containerHeight - estimatedHeight) / 2
      : Math.max(0, Math.min(clickY - estimatedHeight / 2, containerHeight - estimatedHeight));

    setSelectedRoutes((prev) => ({
      ...prev,
      [routeId]: { ...found, width: finalWidth, height: estimatedHeight, x: positionX, y: positionY },
    }));

    setExpandedStops((prev) => ({
      ...prev,
      [routeId]: { 0: true, ...(prev[routeId] || {}) },
    }));
  };

  const updateRoutePosition = (routeId, x, y) => {
    setSelectedRoutes((prev) => ({ ...prev, [routeId]: { ...prev[routeId], x, y } }));
  };

  const updateRouteSize = (routeId, width, height) => {
    setSelectedRoutes((prev) => ({ ...prev, [routeId]: { ...prev[routeId], width, height } }));
  };

  const handleExpandStop = (routeId, stopIndex) => {
    setExpandedStops((prev) => {
      const routeStops = { ...(prev[routeId] || {}) };
      routeStops[stopIndex] = !routeStops[stopIndex];
      return { ...prev, [routeId]: routeStops };
    });
  };

  const filter = filterText.toLowerCase();
  const filteredRoutes = routes.filter((route) => {
    const combinedText = [route.id, route.name, ...route.stops.map((s) => s.name)]
      .filter(Boolean).join(' ').toLowerCase();
    return combinedText.includes(filter);
  });

  return (
    <>
      <h1 className="text-2xl font-bold mb-4">Sydney Train Routes</h1>

      <div className="mb-4">
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Filter by variation..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        {loadingRoutes && <div className="text-xs text-gray-500 mt-1">Loading route data…</div>}
        {loadError && <div className="text-xs text-red-600 mt-1">Error: {loadError}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRoutes.map((route) => (
          <div
            key={route.id}
            className={`border-l-8 p-4 rounded cursor-pointer hover:bg-gray-100 ${selectedRoutes[route.id] ? 'bg-blue-100' : ''}`}
            style={{ borderColor: route.color }}
            onClick={(e) => handleSelectRoute(route.id, e)}
          >
            <h2 className="font-bold text-sm">
              {route.id} - {route.stops[0]?.name}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Variations:</strong>{' '}
              {route.stops?.length ? route.stops.map((s) => s.name).join(', ') : '—'}
            </p>
          </div>
        ))}
      </div>

      {Object.values(selectedRoutes).map((route) => (
        <Rnd
          key={route.id}
          size={{ width: route.width || 500, height: route.height || 400 }}
          position={{ x: route.x || 100, y: route.y || 100 }}
          minWidth={300}
          minHeight={200}
          bounds={containerRef.current || 'parent'}
          style={{ borderRadius: '0.5rem', overflow: 'hidden' }}
          className="border shadow bg-white flex flex-col absolute z-10 rounded"
          onDragStop={(e, d) => updateRoutePosition(route.id, d.x, d.y)}
          onResizeStop={(e, direction, ref, delta, position) => {
            updateRouteSize(route.id, ref.offsetWidth, ref.offsetHeight);
            updateRoutePosition(route.id, position.x, position.y);
          }}
          cancel=".card-content"  // ✅ allow selecting text inside card body
        >
          <div ref={(el) => (cardRefs.current[route.id] = el)} className="flex flex-col h-full">
            {/* Header (draggable) */}
            <div className="flex justify-between items-center px-4 py-3 font-bold text-white text-sm" style={{ backgroundColor: route.color }}>
              <span>{route.id} - {route.stops[0]?.name}</span>
              <button
                onClick={() => {
                  const updated = { ...selectedRoutes }; delete updated[route.id]; setSelectedRoutes(updated);
                  setExpandedStops((prev) => { const next = { ...prev }; delete next[route.id]; return next; });
                }}
                className="text-white text-lg leading-none hover:text-gray-200" aria-label="Close card"
              >
                ×
              </button>
            </div>

            {/* Body (copyable text) */}
            <div className="card-content overflow-y-auto divide-y px-4 py-2 flex-1 select-text">
              {route.stops.map((stop, idx) => {
                const isExpanded = expandedStops[route.id]?.[idx] || false;
                const routeInfo = findRouteInfoForStop(stop);
                return (
                  <div
                    key={idx}
                    className="py-3 border-b last:border-none cursor-pointer"
                    onClick={() => handleExpandStop(route.id, idx)}
                  >
                    <div className="text-sm font-semibold text-gray-800 flex justify-between items-center">
                      <span>{stop.name}</span>
                      <span className="text-xs text-blue-600">{isExpanded ? '−' : '+'}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 text-xs text-gray-700">
                        <p className="mb-1">
                          Route ID: <strong>{stop.route_id || '—'}</strong>
                        </p>

                        {routeInfo?.train_data?.length ? (
                          <div className="space-y-2">
                            {routeInfo.train_data.map((t, i) => {
                              const url = cleanGpsUrl(t.gps_url);
                              return (
                                <div key={`${t.trip_id}-${i}`} className="rounded border p-2 bg-gray-50">
                                  <div className="font-mono break-all text-[11px]">{t.trip_id}</div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span>
                                      avg_speed:{' '}
                                      <strong>
                                        {typeof t.avg_speed === 'number' ? t.avg_speed.toFixed(2) : String(t.avg_speed)}
                                      </strong>{' '}
                                      km/h
                                    </span>
                                    {url ? (
                                      <a
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Open map
                                      </a>
                                    ) : (
                                      <span className="text-gray-400">no gps</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">
                            {loadingRoutes
                              ? 'Loading trains…'
                              : `No trains found for "${stop.route_id || stop.name}".`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Rnd>
      ))}
    </>
  );
};

export default TrainRoutesMenu;
