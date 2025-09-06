import React, { useEffect, useState } from "react";
import { fetchStats } from "../api";
import StatsChart from "../components/StatsChart";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => alert("Failed to load stats"));
  }, []);

  if (!stats) return <div>Loading...</div>;

  // fallback data if backend doesn't return series
  const chartData =
    stats.series && stats.series.length > 0
      ? stats.series
      : [
          { hour: "00", count: 2 },
          { hour: "01", count: 5 },
          { hour: "02", count: 3 },
          { hour: "03", count: 6 },
          { hour: "04", count: 4 },
        ];

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="card">
        <p>Total: {stats.total}</p>
      </div>

      {/* Chart wrapper with fixed height */}
      <div className="card" style={{ height: "320px", minHeight: "320px" }}>
        <StatsChart series={chartData} />
      </div>
    </div>
  );
}
