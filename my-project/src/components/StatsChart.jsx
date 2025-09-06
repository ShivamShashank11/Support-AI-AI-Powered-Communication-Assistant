// src/components/StatsChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function StatsChart({ series = [] }) {
  const data = (series || []).map((item, i) => ({
    hour: item.hour || item._id?.hour || String(i),
    count: item.count || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="#0b5fff" />
      </BarChart>
    </ResponsiveContainer>
  );
}
