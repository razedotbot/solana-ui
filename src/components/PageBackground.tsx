import React from "react";

interface PageBackgroundProps {
  className?: string;
}

export const PageBackground: React.FC<PageBackgroundProps> = ({
  className = "",
}) => {
  return (
    <div
      className={`fixed inset-0 z-0 pointer-events-none overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-app-primary opacity-90">
        <div className="absolute inset-0 bg-gradient-to-b from-app-primary-05 to-transparent"></div>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(2, 179, 109, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(2, 179, 109, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
            backgroundPosition: "center center",
          }}
        ></div>
      </div>

      <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
        <div className="absolute top-0 left-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
        <div className="absolute top-0 right-0 w-px h-16 bg-gradient-to-b from-app-primary-color to-transparent"></div>
        <div className="absolute top-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-32 h-32 opacity-20">
        <div className="absolute bottom-0 left-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-16 h-px bg-gradient-to-r from-app-primary-color to-transparent"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
        <div className="absolute bottom-0 right-0 w-px h-16 bg-gradient-to-t from-app-primary-color to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-16 h-px bg-gradient-to-l from-app-primary-color to-transparent"></div>
      </div>
    </div>
  );
};
