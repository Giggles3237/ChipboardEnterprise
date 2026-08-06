import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import './TVScreens.css';

const CustomLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 8} fill="#fff" textAnchor="middle" fontSize={20} fontWeight="700">
      {value}
    </text>
  );
};

function TVScreenBarChart({ advisors }) {
  return (
    <div className="tv-screen">
      <span className="tv-screen-title">Advisor Units — {new Date().toLocaleString('default', { month: 'long' })}</span>
      <div className="tv-screen-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={advisors}
            margin={{ top: 36, right: 40, left: 0, bottom: 20 }}
            barCategoryGap="20%"
            barGap={4}
          >
            <CartesianGrid vertical={false} stroke="#222" />
            <XAxis
              dataKey="firstName"
              tick={{ fill: '#ccc', fontSize: 20, fontWeight: 600 }}
              axisLine={{ stroke: '#333' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#555', fontSize: 14 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
              labelStyle={{ color: '#aaa', fontWeight: 600 }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Legend wrapperStyle={{ color: '#888', fontSize: 14, paddingTop: 10 }} iconType="circle" iconSize={10} />

            <Bar dataKey="delivered" name="Delivered" fill="#0066B1" radius={[6, 6, 0, 0]}>
              <LabelList content={<CustomLabel />} />
              {advisors.map(entry => (
                <Cell
                  key={entry.name}
                  fill={entry.goal > 0 && entry.delivered >= entry.goal ? '#00e676' : '#0066B1'}
                />
              ))}
            </Bar>
            <Bar dataKey="pending" name="Pending" fill="#ffa726" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TVScreenBarChart;
