// src/components/TrainRoutesV3.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * TrainRoutesV3
 * A polished, production-ready viewer for /api/get_routes.
 * - Fetches data from FastAPI (defaults to http://localhost:8000)
 * - Search across route name, route_id, and trip_id
 * - Per-route cards styled by route colour
 * - Expandable variants, sortable train table, external GPS links
 * - Robust against missing fields
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function sanitizeGpsUrl(raw) {
  if (!raw) return null;
  // input might look like: "{'https://www.google.com/maps?q=-33.89,151.17'}" or just the url
  const str = String(raw);
  const match = str.match(/https?:\/\/[^\s'"}]+/);
  return match ? match[0] : null;
}

function useRoutes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/get_routes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // optional: auto-refresh every 30s
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  return { data, loading, error, lastRefreshed, refresh: fetchData };
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function RouteCard({ route }) {
  const [open, setOpen] = useState(true);
  const [sortKey, setSortKey] = useState("avg_speed_desc");
  const routeHex = (route?.route_colour || "").replace(/^#?/, "#");

  const totals = useMemo(() => {
    const variants = Array.isArray(route?.trip_data) ? route.trip_data : [];
    let trains = 0;
    variants.forEach(v => {
      if (Array.isArray(v?.train_data)) trains += v.train_data.length;
    });
    return { variants: variants.length, trains };
  }, [route]);

  return (
    <div
      className={classNames(
        "rounded-2xl shadow-sm border bg-white overflow-hidden",
        "transition hover:shadow-md"
      )}
      style={{ borderColor: routeHex || undefined }}
    >
      <div className="p-4 sm:p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-6 w-6 rounded-full border"
            style={{ backgroundColor: routeHex, borderColor: routeHex }}
            title={routeHex}
          />
          <div>
            <div className="text-lg font-semibold leading-tight">
              {route?.route_name || "Unnamed route"}
            </div>
            <div className="text-xs text-gray-500">Colour: {routeHex}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Stat label="Variants" value={totals.variants} />
          <Stat label="Active trains" value={totals.trains} />
          <button
            onClick={() => setOpen(o => !o)}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50"
          >
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t">
          {Array.isArray(route?.trip_data) && route.trip_data.length > 0 ? (
            route.trip_data.map((variant, idx) => (
              <VariantBlock
                key={`${variant?.route_id || idx}`}
                variant={variant}
                routeHex={routeHex}
                sortKey={sortKey}
                setSortKey={setSortKey}
              />
            ))
          ) : (
            <div className="p-4 text-sm text-gray-500">No variants found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function VariantBlock({ variant, routeHex, sortKey, setSortKey }) {
  const [expanded, setExpanded] = useState(true);

  const trains = useMemo(() => {
    const rows = Array.isArray(variant?.train_data) ? variant.train_data : [];
    const sorted = [...rows].sort((a, b) => {
      const av = Number(a?.avg_speed ?? Number.NEGATIVE_INFINITY);
      const bv = Number(b?.avg_speed ?? Number.NEGATIVE_INFINITY);
      switch (sortKey) {
        case "avg_speed_asc":
          return av - bv;
        case "avg_speed_desc":
        default:
          return bv - av;
      }
    });
    return sorted;
  }, [variant, sortKey]);

  const total = trains.length;

  return (
    <div className="">
      <div className="px-4 py-3 sm:px-5 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="font-medium leading-tight">
              {variant?.route_name || "Unnamed variant"}
            </div>
            <div className="text-gray-500">route_id: {variant?.route_id || "—"}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">{total} trains</div>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="text-sm px-2 py-1.5 border rounded-lg bg-white"
            title="Sort by average speed"
          >
            <option value="avg_speed_desc">Avg speed ▾</option>
            <option value="avg_speed_asc">Avg speed ▴</option>
          </select>
          <button
            onClick={() => setExpanded(x => !x)}
            className="text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-100"
            style={{ borderColor: routeHex }}
          >
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 sm:px-5 pb-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4 font-medium">Trip ID</th>
                <th className="py-2 pr-4 font-medium">Avg speed (km/h)</th>
                <th className="py-2 pr-4 font-medium">GPS</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trains.map((row, idx) => {
                const url = sanitizeGpsUrl(row?.gps_url);
                const spd = row?.avg_speed;
                return (
                  <tr key={`${row?.trip_id || idx}`} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-[12px] break-all">{row?.trip_id || "—"}</td>
                    <td className="py-2 pr-4">{Number.isFinite(Number(spd)) ? Number(spd).toFixed(2) : "—"}</td>
                    <td className="py-2 pr-4">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:no-underline"
                          title={url}
                        >
                          Open map
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={() => navigator.clipboard?.writeText(row?.trip_id || "")}
                        title="Copy Trip ID"
                      >
                        Copy ID
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TrainRoutesV3() {
  const { data, loading, error, lastRefreshed, refresh } = useRoutes();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return (data || []).filter(rt => {
      const rn = (rt?.route_name || "").toLowerCase();
      const anyVariantMatch = (rt?.trip_data || []).some(v => {
        const rid = (v?.route_id || "").toLowerCase();
        const rname = (v?.route_name || "").toLowerCase();
        const anyTrip = (v?.train_data || []).some(t => {
          const tid = (t?.trip_id || "").toLowerCase();
          return tid.includes(needle);
        });
        return rid.includes(needle) || rname.includes(needle) || anyTrip;
      });
      return rn.includes(needle) || anyVariantMatch;
    });
  }, [data, q]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <header className="mb-6 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sydney Trains — Routes (v3)</h1>
            <p className="text-sm text-gray-600">Data from <code className="px-1 py-0.5 bg-gray-200 rounded">/api/get_routes</code></p>
          </div>
          <div className="flex items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search route, route_id, or trip_id…"
              className="px-3 py-2 rounded-xl border bg-white w-72"
            />
            <button
              onClick={refresh}
              className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
              title="Refresh now"
            >
              Refresh
            </button>
          </div>
        </header>

        <section className="mb-4 text-sm text-gray-600 flex items-center justify-between">
          <div>
            {loading && <span>Loading latest data…</span>}
            {!loading && error && (
              <span className="text-red-600">Failed to load: {error}</span>
            )}
            {!loading && !error && (
              <span>
                Showing {filtered?.length ?? 0} route{(filtered?.length || 0) === 1 ? "" : "s"}
                {lastRefreshed && (
                  <>
                    {" "}· Updated {lastRefreshed.toLocaleTimeString()}
                  </>
                )}
              </span>
            )}
          </div>
        </section>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(!loading && !error && filtered?.length === 0) && (
            <div className="text-sm text-gray-500">No routes match your search.</div>
          )}

          {loading && (
            <div className="animate-pulse space-y-4 md:col-span-2">
              <div className="h-32 bg-white rounded-2xl" />
              <div className="h-32 bg-white rounded-2xl" />
            </div>
          )}

          {!loading && !error && filtered?.map((route, idx) => (
            <RouteCard key={`${route?.route_name || idx}`} route={route} />
          ))}
        </div>
      </div>
    </div>
  );
}
