import React from 'react';
import infinityImg from '../assets/images/infinity_logo.png';

interface InfinityLoaderProps {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    variant?: 'rotate' | 'pulse' | 'none';
}

export const InfinityLoader: React.FC<InfinityLoaderProps> = ({ 
    size = 'md', 
    className = '',
    variant = 'rotate'
}) => {
    const sizeMap = {
        'xs': 'w-4 h-4',
        'sm': 'w-6 h-6',
        'md': 'w-10 h-10',
        'lg': 'w-16 h-16',
        'xl': 'w-24 h-24'
    };

    const animationClass = variant === 'rotate' 
        ? 'animate-spin' 
        : variant === 'pulse' 
            ? 'animate-pulse' 
            : '';

    return (
        <div className={`relative flex items-center justify-center ${sizeMap[size]} ${className}`}>
            <img 
                src={infinityImg} 
                alt="Loading..." 
                className={`w-full h-full object-contain ${animationClass}`}
            />
            {variant === 'rotate' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full pointer-events-none" />
            )}
        </div>
    );
};
