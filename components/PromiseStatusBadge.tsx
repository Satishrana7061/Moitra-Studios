import React from 'react';
import { PromiseStatus } from '../types';

interface Props {
  status: PromiseStatus;
  className?: string;
}

const PromiseStatusBadge: React.FC<Props> = ({ status, className = '' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'Fulfilled':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'Partially Fulfilled':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'Not Fulfilled':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'In Progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'Unclear':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles()} ${className}`}
    >
      {status}
    </span>
  );
};

export default PromiseStatusBadge;
