import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './TVScreens.css';

const TYPE_COLORS = {
  'New BMW':  '#0066B1',
  'CPO BMW':  '#4da6e8',
  'Used BMW': '#a8d4f5',
  'New MINI': '#70B62C',
  'CPO MINI': '#a3d96a',
  'Used MINI':'#cceea0',
};

const TYPES = Object.keys(TYPE_COLORS);

function TVScreenTypeBreakdown({ advisors, monthSales }) {
  const data = advisors.map(({ name, firstName }) => {
    const mySales = monthSales.filter(s => s.advisor === name && s.delivered);
    const row = { firstName };
    TYPES.forEach(t => {
      row[t] = mySales.filter(s => s.type === t).length || 0;
    });
    return row;
  });

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Sales by Type</span>
      <div className="tv-screen-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 40, left: 0, bottom: 20 }} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#222" />
            <XAxis dataKey="firstName" tick={{ fill: '#ccc', fontSize: 18, fontWeight: 600 }} axisLine={{ stroke: '#333' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Legend wrapperStyle={{ color: '#888', fontSize: 13, paddingTop: 8 }} iconType="circle" iconSize={10} />
            {TYPES.map(t => (
              <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TVScreenTypeBreakdown;
