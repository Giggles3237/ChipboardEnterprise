import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './TVScreens.css';

const TYPE_COLORS = {
  'New BMW':  '#0066B1',
  'CPO BMW':  '#4da6e8',
  'Used BMW': '#a8d4f5',
  'New MINI': '#70B62C',
  'CPO MINI': '#a3d96a',
  'Used MINI':'#d4f0a0',
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (!value) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={18} fontWeight="700">
      {value}
    </text>
  );
};

function TVScreenTeamDonut({ monthSales }) {
  const delivered = monthSales.filter(s => s.delivered && s.type !== 'Wholesale');
  const counts = {};
  delivered.forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });

  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Team Type Breakdown — {total} delivered</span>
      <div className="tv-donut-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="35%"
              outerRadius="65%"
              dataKey="value"
              labelLine={false}
              label={renderLabel}
            >
              {data.map(entry => (
                <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#888'} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
            />
            <Legend
              wrapperStyle={{ color: '#888', fontSize: 15 }}
              iconType="circle"
              iconSize={12}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TVScreenTeamDonut;
