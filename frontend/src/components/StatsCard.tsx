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

export default function StatsCard({ title, value, icon, trend }: StatsCardProps) {
  return (
    <div className="card-govuk">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-govuk-secondary-text">{title}</p>
          <p className="text-3xl font-bold text-govuk-text mt-2">{value}</p>

          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-govuk-success' : 'text-govuk-error'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>

        {icon && (
          <div className="w-16 h-16 rounded-none bg-govuk-blue flex items-center justify-center text-white">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
