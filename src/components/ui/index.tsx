import React from 'react';

// Typography
export const PageHeader = ({ title, icon: Icon, actions, description }: { title: string, icon?: React.ElementType, actions?: React.ReactNode, description?: string }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-main pb-4 mb-6">
    <div>
      <h2 className="text-2xl font-extrabold flex items-center gap-2 text-text-main">
        {Icon && <Icon size={24} className="text-primary-main" />}
        {title}
      </h2>
      {description && <p className="text-text-muted mt-1">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
  </div>
);

export const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: React.ElementType }) => (
  <h3 className="text-sm font-bold text-text-muted flex items-center gap-2 uppercase tracking-wider mb-4">
    {Icon && <Icon size={16} />}
    {title}
  </h3>
);

// Layout & Surfaces
export const Panel = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-bg-surface p-6 rounded-xl border border-border-main shadow-sm ${className}`}>
    {children}
  </div>
);

// Cards
export const StatCard = ({ title, value, icon: Icon, trend, colorClass = "text-primary-main" }: { title: string, value: string | number, icon: React.ElementType, trend?: string, colorClass?: string }) => (
  <div className="bg-bg-surface p-5 rounded-xl border border-border-main shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-lg bg-bg-app ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-text-muted">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-extrabold text-text-main">{value}</p>
        {trend && <span className="text-xs font-bold text-success-main">{trend}</span>}
      </div>
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description, action }: { icon: React.ElementType, title: string, description: string, action?: React.ReactNode }) => (
  <div className="text-center p-12 bg-bg-surface border border-border-main rounded-xl border-dashed">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-bg-app text-text-muted mb-4">
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-bold text-text-main mb-1">{title}</h3>
    <p className="text-text-muted mb-6 max-w-sm mx-auto">{description}</p>
    {action}
  </div>
);

// Elements
export const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }) => {
  const variants = {
    default: 'bg-bg-app text-text-muted border-border-main',
    primary: 'bg-primary-bg text-primary-text border-primary-main/20',
    success: 'bg-success-bg text-success-text border-success-main/20',
    warning: 'bg-warning-bg text-warning-text border-warning-main/20',
    error: 'bg-error-bg text-error-text border-error-main/20',
    info: 'bg-info-bg text-info-text border-info-main/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${variants[variant]}`}>
      {children}
    </span>
  );
};

export const ActionButton = ({ children, onClick, variant = 'default', icon: Icon, className = '', title }: { children?: React.ReactNode, onClick?: (e: any) => void, variant?: 'default' | 'primary' | 'ghost' | 'outline', icon?: React.ElementType, className?: string, title?: string }) => {
  const base = "font-medium flex items-center justify-center gap-2 transition-colors rounded-lg text-sm";
  const padding = children ? "px-4 py-2" : "p-2";
  const variants = {
    default: "bg-bg-app border border-border-main text-text-main hover:bg-bg-surface-hover",
    outline: "bg-transparent border border-border-main text-text-main hover:bg-bg-surface-hover",
    primary: "bg-primary-main text-white hover:bg-primary-hover shadow-sm border border-transparent",
    ghost: "bg-transparent text-text-muted hover:text-text-main hover:bg-bg-surface-hover border border-transparent"
  };

  return (
    <button onClick={onClick} title={title} className={`${base} ${padding} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};
