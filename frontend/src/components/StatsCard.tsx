import React from 'react'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  bgGradient?: string
}

export default function StatsCard({ title, value, icon, trend, bgGradient }: StatsCardProps) {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-display font-bold text-white mt-2">{value}</p>

          {trend && (
            <p className={`text-xs font-medium mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>

        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            bgGradient ? `bg-gradient-to-br ${bgGradient} shadow-sm` : 'bg-white/[0.06]'
          }`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
