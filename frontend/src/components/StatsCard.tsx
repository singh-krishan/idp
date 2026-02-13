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
  const defaultGradient = 'from-indigo-500 to-purple-600'

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>

          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>

        {icon && (
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${bgGradient || defaultGradient} flex items-center justify-center text-white`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
