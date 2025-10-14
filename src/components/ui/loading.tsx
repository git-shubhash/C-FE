import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <div className={`${sizeClasses[size]} border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto ${text ? 'mb-4' : ''}`}></div>
        {text && <p className="text-muted-foreground text-sm">{text}</p>}
      </div>
    </div>
  );
};

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  isLoading, 
  children, 
  loadingText = 'Loading...',
  className = '',
  disabled = false,
  onClick,
  type = 'button'
}) => {
  return (
    <button
      type={type}
      className={className}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {loadingText}
        </div>
      ) : (
        children
      )}
    </button>
  );
};

interface LoadingPageProps {
  text?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ text = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}; 