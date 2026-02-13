import React, { useState } from 'react';

interface ModuleIconProps {
  /** Name of the PNG file in /public (without extension), e.g. "contracts" */
  name: string;
  /** Emoji fallback when PNG doesn't exist */
  emoji: string;
  /** Icon size in pixels */
  size: number;
  /** Alt text for the image */
  alt?: string;
}

export const ModuleIcon: React.FC<ModuleIconProps> = ({ name, emoji, size, alt }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <span
        role="img"
        aria-label={alt || name}
        style={{ fontSize: `${size}px`, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: `${size}px`, height: `${size}px` }}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={`/${name}.png`}
      alt={alt || name}
      onError={() => setImgError(true)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
      }}
    />
  );
};
