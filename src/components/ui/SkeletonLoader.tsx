import React from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl ${className}`}
    />
  )
}

export function SkeletonStatCard() {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-14 h-5 rounded-full" />
      </div>
      <Skeleton className="w-24 h-7 mb-1.5" />
      <Skeleton className="w-32 h-4" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="w-full h-10 rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="w-full h-12 rounded-xl" />
      ))}
    </div>
  )
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <Skeleton className="w-full h-32 rounded-xl" />
          <Skeleton className="w-3/4 h-5" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      ))}
    </div>
  )
}
