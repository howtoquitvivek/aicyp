import React from 'react';
import { Card } from './Card';

// Temporary alias to prevent broken imports while we refactor the rest of the pages
const GlassCard = React.forwardRef((props, ref) => {
  return <Card ref={ref} {...props} />;
});
GlassCard.displayName = "GlassCard";

export default GlassCard;
