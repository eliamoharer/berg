import React, { useMemo } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, ScatterChart, Scatter, ZAxis, Legend } from 'recharts';
import { ChartDataPoint, User } from '../types';

interface ProgressChartProps {
  data: ChartDataPoint[];
  compareMode?: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ data, compareMode = false }) => {

  const formattedData = useMemo(() => {
    return data.map(d => ({
      ...d,
      // For coloring
      fillColor: compareMode 
        ? (d.user === 'Adam' ? '#0ea5e9' : '#eab308') // Adam=Blue, Elia=Yellow/Orange
        : getRepColor(d.reps)
    }));
  }, [data, compareMode]);

  // Determine domain for Y axis to make graph look good
  const minWeight = Math.min(...data.map(d => d.weight)) * 0.9;
  const maxWeight = Math.max(...data.map(d => d.weight)) * 1.1;

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        No data to graph yet
      </div>
    );
  }

  return (
    <div className="w-full h-72 bg-white p-2 rounded-xl shadow-sm border border-slate-100">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <XAxis 
            type="number" 
            dataKey="date" 
            name="Date" 
            domain={['auto', 'auto']} 
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            type="number" 
            dataKey="weight" 
            name="Weight" 
            domain={[Math.floor(minWeight), Math.ceil(maxWeight)]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <ZAxis type="number" dataKey="reps" range={[50, 400]} name="Reps" />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 shadow-lg rounded-lg border border-slate-100 text-xs">
                    <p className="font-bold text-slate-700">{data.formattedDate}</p>
                    <p className="text-slate-600">User: <span className="font-semibold">{data.user || 'Me'}</span></p>
                    <p className="text-indigo-600">Weight: <span className="font-bold">{data.weight}</span></p>
                    <p className="text-emerald-600">Reps: <span className="font-bold">{data.reps}</span></p>
                  </div>
                );
              }
              return null;
            }}
          />
          {compareMode && (
            <Legend verticalAlign="top" height={36} iconType="circle" payload={[
              { value: 'Adam', type: 'circle', color: '#0ea5e9' },
              { value: 'Elia', type: 'circle', color: '#eab308' }
            ]}/>
          )}

          {/* If Comparison Mode: Render two scatters or one with conditional fills?
              Recharts Scatter cells can handle individual fills. 
              We use a single Scatter to simplify, but we color cells manually.
              We add a 'line' prop to connect them.
          */}
          <Scatter 
            name="History" 
            data={formattedData} 
            line={{ stroke: compareMode ? '#cbd5e1' : '#94a3b8', strokeWidth: 1 }}
            shape={(props: any) => <CustomDot {...props} />}
          >
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      
      {!compareMode && (
        <div className="flex justify-between items-center px-4 mt-[-10px]">
           <span className="text-[10px] text-green-400 font-medium">Low Reps (6)</span>
           <div className="h-1 flex-1 mx-2 rounded-full bg-gradient-to-r from-green-300 via-teal-400 to-blue-600 opacity-50"></div>
           <span className="text-[10px] text-blue-600 font-medium">High Reps (12+)</span>
        </div>
      )}
    </div>
  );
};

// Helper to calculate color based on reps
// 6 reps = light green (#86efac), 12 reps = dark blue (#1e40af)
function getRepColor(reps: number): string {
  if (reps <= 6) return '#4ade80'; // green-400
  if (reps >= 12) return '#2563eb'; // blue-600
  
  // Interpolate between for 7-11
  // Simple discrete mapping for simplicity and aesthetics
  const map: Record<number, string> = {
    7: '#2dd4bf', // teal-400
    8: '#0d9488', // teal-600
    9: '#0ea5e9', // sky-500
    10: '#0284c7', // sky-600
    11: '#3b82f6', // blue-500
  };
  return map[reps] || '#2563eb';
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  return (
    <circle cx={cx} cy={cy} r={compareModeStroke(payload.reps)} fill={payload.fillColor} stroke="white" strokeWidth={2} />
  );
};

const compareModeStroke = (reps: number) => {
  // slightly larger radius for more reps
  return 4 + (Math.min(reps, 15) / 3); 
}

export default ProgressChart;
