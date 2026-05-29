'use client';

import * as React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { FlavorProfile, FLAVOR_LABELS, FLAVOR_COLORS } from '@/lib/flavors';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface FlavorRadarChartProps {
  flavorProfile: FlavorProfile;
  title?: string;
  className?: string;
}

export function FlavorRadarChart({ flavorProfile, title, className }: FlavorRadarChartProps) {
  const labels = Object.values(FLAVOR_LABELS);
  const values = [
    flavorProfile.spicy,
    flavorProfile.numbing,
    flavorProfile.sour,
    flavorProfile.sweet,
    flavorProfile.salty,
    flavorProfile.savory,
    flavorProfile.fragrant,
  ];

  const data = {
    labels,
    datasets: [
      {
        label: '风味值',
        data: values,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: 'rgb(139, 92, 246)',
        borderWidth: 2,
        pointBackgroundColor: Object.values(FLAVOR_COLORS),
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label;
            const value = context.raw;
            return `${label}: ${value}/10`;
          },
        },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
          display: false,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        pointLabels: {
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          color: '#374151',
        },
      },
    },
  };

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-semibold text-gray-700 mb-3 text-center">{title}</h3>
      )}
      <div className="relative aspect-square max-w-[300px] mx-auto">
        <Radar data={data} options={options} />
      </div>
      {/* 风味数值 */}
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {Object.entries(FLAVOR_LABELS).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center gap-1 text-xs"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: FLAVOR_COLORS[key as keyof typeof FLAVOR_COLORS] }}
            />
            <span className="text-gray-600">
              {label}: {flavorProfile[key as keyof FlavorProfile]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
