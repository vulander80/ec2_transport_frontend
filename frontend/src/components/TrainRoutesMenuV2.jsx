// src/components/TrainRoutesMenuV2.jsx
import React from 'react';
import { Rnd } from 'react-rnd';

export default function TrainRoutesMenuV2({
  routes,
  selectedRoutes,
  setSelectedRoutes,
  filterText,
  setFilterText,
  expandedStops,
  setExpandedStops,
  routeInfoMap,
  setRouteInfoMap,
  cardRefs,
  handleSelectRoute,
  handleExpandStop,
  updateRoutePosition,
  updateRouteSize,
}) {
  return (
    <div className="space-y-6">
      {/* Picker */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter routes..."
            className="border rounded px-3 py-2 w-72"
          />
          <span className="text-sm text-gray-500">
            {routes.length} route{routes.length !== 1 ? 's' : ''} loaded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {routes.map((r) => (
            <button
              key={r.id}
              onClick={(e) => handleSelectRoute(r.id, e)}
              className="text-left border rounded px-3 py-2 hover:bg-gray-50 transition"
              title={`Open ${r.id}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded"
                  style={{ backgroundColor: r.color }}
                />
                <span className="font-semibold">{r.id}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {(r.stops?.length ?? 0)} segments
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Floating cards */}
      {Object.entries(selectedRoutes).map(([routeId, card]) => (
        <Rnd
          key={routeId}
          size={{ width: card.width, height: card.height }}
          position={{ x: card.x, y: card.y }}
          bounds="parent"
          onDragStop={(e, d) => updateRoutePosition(routeId, d.x, d.y)}
          onResizeStop={(e, dir, ref, delta, pos) => {
            updateRouteSize(
              routeId,
              parseInt(ref.style.width, 10),
              parseInt(ref.style.height, 10)
            );
            updateRoutePosition(routeId, pos.x, pos.y);
          }}
          className="absolute shadow-xl rounded-lg bg-white border"
        >
          <div
            ref={(el) => (cardRefs.current[routeId] = el)}
            className="flex flex-col h-full"
          >
            {/* Header */}
            <div className="px-4 py-2 border-b flex items-center justify-between bg-slate-50">
              <div className="font-semibold">{card.id}</div>
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => {
                  const updated = { ...selectedRoutes };
                  delete updated[routeId];
                  setSelectedRoutes(updated);
                  setExpandedStops((prev) => {
                    const cp = { ...prev };
                    delete cp[routeId];
                    return cp;
                  });
                }}
                aria-label="Close card"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-3 overflow-auto space-y-2">
              {(() => {
                // Build stops-like structure
                const stopsToRender =
                  Array.isArray(card.stops) && card.stops.length
                    ? card.stops
                    : Array.isArray(card.train_data)
                    ? [
                        {
                          name: card.route_name || card.id || routeId,
                          trips: card.train_data.map((t) => ({
                            trip_id: t.trip_id,
                            avg_speed: t.avg_speed,
                            gps_url: t.gps_url?.replace(/[{}']/g, ''), // clean url
                          })),
                        },
                      ]
                    : [];

                return stopsToRender.map((stop, idx) => {
                  const isOpen = !!expandedStops[routeId]?.[idx];
                  const count = stop.trips?.length ?? 0;

                  return (
                    <div key={`${routeId}-${idx}`} className="border rounded">
                      <button
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                        onClick={() => handleExpandStop(routeId, idx, stop)}
                        title="Click to toggle trip IDs"
                      >
                        <span className="font-medium">{stop.name}</span>
                        <span className="text-xs text-gray-500">
                          {isOpen ? 'Hide' : 'Show'} trips
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 text-sm text-gray-700 space-y-2">
                          {/* Count badge + copy-all */}
                          <div className="flex items-center gap-2">
                            <div className="rounded bg-gray-50 border px-3 py-1">
                              <span className="font-semibold">{count}</span>{' '}
                              trip{count !== 1 ? 's' : ''}
                            </div>
                            <button
                              className="text-xs underline"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await navigator.clipboard.writeText(
                                    (stop.trips || [])
                                      .map((t) => t.trip_id)
                                      .join('\n')
                                  );
                                } catch (_) {}
                              }}
                              title="Copy all trip IDs"
                            >
                              Copy all
                            </button>
                          </div>

                          {/* Trip IDs list */}
                          <div className="max-h-48 overflow-auto rounded border">
                            <ul className="divide-y">
                              {(stop.trips || []).map((t, i) => (
                                <li
                                  key={t.trip_id || i}
                                  className="flex items-center justify-between px-3 py-1 gap-2"
                                >
                                  <div className="flex flex-col">
                                    <code className="text-xs break-all">
                                      {t.trip_id}
                                    </code>
                                    <span className="text-[11px] text-gray-500">
                                      Speed: {t.avg_speed?.toFixed(2)} km/h
                                    </span>
                                    {t.gps_url && (
                                      <a
                                        href={t.gps_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] underline text-blue-600"
                                      >
                                        Map
                                      </a>
                                    )}
                                  </div>
                                  <button
                                    className="text-[11px] underline ml-3 shrink-0"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await navigator.clipboard.writeText(
                                          t.trip_id
                                        );
                                      } catch (_) {}
                                    }}
                                    title="Copy trip ID"
                                  >
                                    Copy
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </Rnd>
      ))}
    </div>
  );
}
