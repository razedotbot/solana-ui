import React, { useState, useRef, useEffect } from "react";

export interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  onEdit: (newLabel: string) => void;
  isEditMode: boolean;
}

// Shared Tab Button component used by TradingForm and FloatingTradingCard
const TabButton = React.memo<TabButtonProps>(
  ({ label, isActive, onClick, onEdit, isEditMode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(label);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleClick = (): void => {
      if (isEditMode) {
        setIsEditing(true);
        setEditValue(label);
      } else {
        onClick();
      }
    };

    const handleSave = (): void => {
      if (editValue.trim()) {
        onEdit(editValue.trim());
      }
      setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        setEditValue(label);
        setIsEditing(false);
      }
    };

    if (isEditing) {
      return (
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full px-2 py-1 text-xs font-mono rounded
                   bg-app-primary text-app-primary border border-app-primary-color
                   focus:outline-none focus:ring-1 focus:ring-app-primary-40"
          />
        </div>
      );
    }

    return (
      <button
        onClick={handleClick}
        className={`flex-1 px-3 py-1.5 text-xs font-mono rounded transition-all duration-200
                ${
                  isActive
                    ? "bg-primary-20 border border-app-primary-80 color-primary"
                    : "bg-app-primary-60 border border-app-primary-40 text-app-secondary-60 hover-border-primary-40 hover-text-app-secondary"
                }
                ${isEditMode ? "cursor-text" : "cursor-pointer"}`}
      >
        {label}
      </button>
    );
  },
);
TabButton.displayName = "TabButton";

export default TabButton;
