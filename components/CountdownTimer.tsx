import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
    targetDate: string;
    onComplete?: () => void;
    label?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, onComplete, label = "TIME REMAINING" }) => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    } | null>(null);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(targetDate) - +new Date();
            let timeLeftCalculated = null;

            if (difference > 0) {
                timeLeftCalculated = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            } else {
                if (onComplete) onComplete();
            }

            return timeLeftCalculated;
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (!remaining) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate, onComplete]);

    if (!timeLeft) {
        return (
            <div className="flex items-center gap-2 text-gameOrange font-bold animate-pulse">
                <Clock className="w-4 h-4" />
                <span>EXPIRED</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mb-2 uppercase">{label}</span>
            <div className="flex gap-3 md:gap-4">
                {[
                    { label: 'D', value: timeLeft.days },
                    { label: 'H', value: timeLeft.hours },
                    { label: 'M', value: timeLeft.minutes },
                    { label: 'S', value: timeLeft.seconds }
                ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                        <div className="bg-slate-900 border border-white/10 rounded-lg w-10 h-10 md:w-14 md:h-14 flex items-center justify-center shadow-inner relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
                            <span className="text-white text-lg md:text-2xl font-black font-rajdhani relative z-10">
                                {String(item.value).padStart(2, '0')}
                            </span>
                        </div>
                        <span className="text-[8px] md:text-[10px] text-slate-400 font-bold mt-1 uppercase">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CountdownTimer;
