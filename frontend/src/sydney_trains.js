import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import { Rnd } from 'react-rnd';
import TrainRoutesMenu from './components/TrainRoutesMenu';
import TrainHeatMap from './components/trainheatmap';

const measureTextWidth = (text, font = 'bold 14px Arial') => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;
  return context.measureText(text).width;
};

const SydneyTrains = () => {
  const [activeMenuItem, setActiveMenuItem] = useState('menu1');
  const [routes, setRoutes] = useState([]);
  const [selectedRoutes, setSelectedRoutes] = useState({});
  const [filterText, setFilterText] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState({});
  const [expandedStops, setExpandedStops] = useState({});
  const [routeInfoMap, setRouteInfoMap] = useState({});

  const containerRef = useRef(null);
  const cardRefs = useRef({});

  useEffect(() => {
    if (activeMenuItem === 'menu1') {
      const fetchRoutes = async () => {
        try {
          const res = await fetch('/api/get_routes');
          const data = await res.json();

          // ✅ Transform new payload format
          const transformedRoutes = data.map((line) => {
            const stops = (line.trip_data || []).map(td => ({
              name: td.route_name,
              route_id: td.route_id,
              trips: (td.train_data || []).map(t => t.trip_id)
            }));

            return {
              id: line.route_name,
              name: line.route_name,
              color: `#${line.route_colour}`,
              stops
            };
          });

          setRoutes(transformedRoutes);
        } catch (err) {
          console.error('Failed to fetch routes:', err);
          setRoutes([]);
        }
      };
      fetchRoutes();
    }
  }, [activeMenuItem]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.entries(cardRefs.current).forEach(([id, ref]) => {
        if (ref && !ref.contains(event.target)) {
          if (selectedRoutes[id]) {
            const updated = { ...selectedRoutes };
            delete updated[id];
            setSelectedRoutes(updated);

            setExpandedStops((prev) => {
              const newExpanded = { ...prev };
              delete newExpanded[id];
              return newExpanded;
            });
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedRoutes]);

  const handleExpandStop = (routeId, stopIndex, stop) => {
    setExpandedStops((prev) => {
      const routeStops = { ...(prev[routeId] || {}) };
      routeStops[stopIndex] = !routeStops[stopIndex];
      return {
        ...prev,
        [routeId]: routeStops,
      };
    });

    if (stop.route_id && !routeInfoMap[stop.route_id]) {
      fetch(`/api/get_route_info?route_id=${encodeURIComponent(stop.route_id)}`)
        .then((res) => res.json())
        .then((data) => {
          setRouteInfoMap((prev) => ({
            ...prev,
            [stop.route_id]: data,
          }));
        })
        .catch((err) => {
          console.error('Failed to fetch route info:', err);
        });
    }
  };

  const refreshRoutes = async () => {
    try {
      const res = await fetch('/api/get_routes');
      const data = await res.json();

      const transformedRoutes = data.map((line) => {
        const stops = (line.trip_data || []).map(td => ({
          name: td.route_name,
          route_id: td.route_id,
          trips: (td.train_data || []).map(t => t.trip_id)
        }));

        return {
          id: line.route_name,
          name: line.route_name,
          color: `#${line.route_colour}`,
          stops
        };
      });

      setRoutes(transformedRoutes);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
      setRoutes([]);
    }
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
      [routeId]: {
        ...found,
        width: finalWidth,
        height: estimatedHeight,
        x: positionX,
        y: positionY,
      },
    }));
  };

  const updateRoutePosition = (routeId, x, y) => {
    setSelectedRoutes((prev) => ({
      ...prev,
      [routeId]: {
        ...prev[routeId],
        x,
        y,
      },
    }));
  };

  const updateRouteSize = (routeId, width, height) => {
    setSelectedRoutes((prev) => ({
      ...prev,
      [routeId]: {
        ...prev[routeId],
        width,
        height,
      },
    }));
  };

  useEffect(() => {
    if (activeMenuItem === 'menu1') {
      refreshRoutes();
    }
    Object.entries(selectedRoutes).forEach(([routeId]) => {
      setTimeout(() => {
        const cardEl = cardRefs.current[routeId];
        if (cardEl && cardEl.scrollIntoView) {
          cardEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 100);
    });
  }, [selectedRoutes]);

  const filter = filterText.toLowerCase();

  const filteredRoutes = routes.filter((route) => {
    const combinedText = [
      route.id,
      route.name,
      ...route.stops.map((s) => s.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return combinedText.includes(filter);
  });

  const filteredAlerts = alerts.filter((alert) => {
    const matchesPriority = !priorityFilter || alert.priority === priorityFilter;
    const search = searchText.toLowerCase();
    const matchesSearch =
      !searchText ||
      [
        alert.title,
        alert.expiration,
        alert.validity?.from,
        alert.validity?.to,
        ...(alert.affected_stops || []).map((s) => s.name),
        ...(alert.affected_lines || []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    return matchesPriority && matchesSearch;
  });

  const toggleExpanded = (id) => {
    setExpandedAlerts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header section="Sydney Trains" />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar menu */}
        <div className="w-64 bg-gray-100 border-r p-4 overflow-auto">
          <h2 className="text-lg font-bold mb-4">Sidebar</h2>
          <ul className="space-y-2">
            <li
              className={`cursor-pointer p-2 rounded hover:bg-blue-200 ${
                activeMenuItem === 'menu1' ? 'bg-blue-100' : ''
              }`}
              onClick={() => {
                setActiveMenuItem('menu1');
                setSelectedRoutes({});
                setExpandedStops({});
              }}
            >
              🚆 Train Routes
            </li>
            <li
              className={`cursor-pointer p-2 rounded hover:bg-blue-200 ${
                activeMenuItem === 'menu2' ? 'bg-blue-100' : ''
              }`}
              onClick={() => setActiveMenuItem('menu2')}
            >
              🔥 Heat Map
            </li>
          </ul>
        </div>

        {/* Content area */}
        <div ref={containerRef} className="flex-1 p-6 overflow-auto relative">
          {activeMenuItem === 'menu1' && (
            <TrainRoutesMenu
              containerRef={containerRef}
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
              measureTextWidth={measureTextWidth}
              handleSelectRoute={handleSelectRoute}
              handleExpandStop={handleExpandStop}
              refreshRoutes={refreshRoutes}
            />
          )}
          {activeMenuItem === 'menu2' && <TrainHeatMap />}
        </div>
      </div>
    </div>
  );
};

export default SydneyTrains;
