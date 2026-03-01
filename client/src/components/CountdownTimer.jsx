import { useState, useEffect, useCallback } from 'react';
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

export default function CountdownTimer({ endTime, onEnd, className = '' }) {
  const calculateTimeLeft = useCallback(() => {
    const end = new Date(endTime);
    const now = new Date();
    const totalSeconds = differenceInSeconds(end, now);
    
    if (totalSeconds <= 0) return null;

    const days = differenceInDays(end, now);
    const hours = differenceInHours(end, now) % 24;
    const minutes = differenceInMinutes(end, now) % 60;
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds, totalSeconds };
  }, [endTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = calculateTimeLeft();
      setTimeLeft(newTime);
      if (!newTime && onEnd) {
        onEnd();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft, onEnd]);

  if (!timeLeft) {
    return <span className={`text-red-600 font-bold ${className}`}>Ended</span>;
  }

  const isUrgent = timeLeft.totalSeconds < 300; // Less than 5 minutes
  const urgentClass = isUrgent ? 'countdown-urgent' : '';

  return (
    <div className={`flex items-center gap-1 font-mono ${urgentClass} ${className}`}>
      {timeLeft.days > 0 && (
        <div className="text-center">
          <span className="bg-gray-900 text-white px-2 py-1 rounded text-sm font-bold">
            {String(timeLeft.days).padStart(2, '0')}
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">Days</span>
        </div>
      )}
      <div className="text-center">
        <span className="bg-gray-900 text-white px-2 py-1 rounded text-sm font-bold">
          {String(timeLeft.hours).padStart(2, '0')}
        </span>
        <span className="block text-xs text-gray-500 mt-0.5">Hrs</span>
      </div>
      <span className="text-gray-400 font-bold mb-4">:</span>
      <div className="text-center">
        <span className="bg-gray-900 text-white px-2 py-1 rounded text-sm font-bold">
          {String(timeLeft.minutes).padStart(2, '0')}
        </span>
        <span className="block text-xs text-gray-500 mt-0.5">Min</span>
      </div>
      <span className="text-gray-400 font-bold mb-4">:</span>
      <div className="text-center">
        <span className={`px-2 py-1 rounded text-sm font-bold ${isUrgent ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="block text-xs text-gray-500 mt-0.5">Sec</span>
      </div>
    </div>
  );
}
