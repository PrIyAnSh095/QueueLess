import React from 'react';
import './Skeleton.css';

export const SkeletonLine = ({ width = '100%', height = '16px' }) => (
  <div className="skeleton-line" style={{ width, height }} />
);

export const SkeletonCard = ({ lines = 3 }) => (
  <div className="skeleton-card">
    <SkeletonLine width="40%" height="20px" />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={`${80 - i * 15}%`} />
    ))}
  </div>
);

export const SkeletonGrid = ({ count = 6, lines = 3 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} lines={lines} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-head">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={i} width="80%" height="14px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="skeleton-table-row">
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonLine key={c} width={`${60 + Math.random() * 30}%`} />
        ))}
      </div>
    ))}
  </div>
);
