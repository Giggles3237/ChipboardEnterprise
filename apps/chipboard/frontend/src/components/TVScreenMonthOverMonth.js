import React from 'react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import './TVScreens.css';

const CustomLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} fill="#aaa" textAnchor="middle" fontSize={14} fontWeight="600">
      {value}
    </text>
  );
};

function TVScreenMonthOverMonth({ advisors, prevYearSales }) {
  const thisMonth  = format(new Date(), 'MMMM yyyy');
  const prevYear   = new Date();
  prevYear.setFullYear(prevYear.getFullYear() - 1);
  const lastYearMonth = format(prevYear, 'MMMM yyyy');

  const data = advisors.map(({ name, firstName, delivered }) => {
    const lastYear = prevYearSales.filter(s => s.advisor === name && s.delivered).length;
    return { firstName, 'This Year': delivered, 'Last Year': lastYear };
  });

  return (
    <div className="tv-screen">
      <span className="tv-screen-title">{thisMonth} vs {lastYearMonth}</span>
      <div className="tv-screen-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 30, right: 40, left: 0, bottom: 20 }} barCategoryGap="20%" barGap={6}>
            <CartesianGrid vertical={false} stroke="#222" />
            <XAxis dataKey="firstName" tick={{ fill: '#ccc', fontSize: 18, fontWeight: 600 }} axisLine={{ stroke: '#333' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 13 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff' }}
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            />
            <Legend wrapperStyle={{ color: '#888', fontSize: 14, paddingTop: 10 }} iconType="circle" iconSize={10} />
            <Bar dataKey="This Year" fill="#0066B1" radius={[6, 6, 0, 0]}>
              <LabelList content={<CustomLabel />} />
            </Bar>
            <Bar dataKey="Last Year" fill="#444" radius={[6, 6, 0, 0]}>
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TVScreenMonthOverMonth;
