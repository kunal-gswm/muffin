export default function MetadataRow({ items = [] }) {
  // Filter out falsy items
  const validItems = items.filter(Boolean);
  
  if (validItems.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'center',
      flexWrap: 'wrap'
    }}>
      {validItems.map((item, index) => (
        <span 
          key={index} 
          className="text-metadata"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          {item}
          {/* Add a subtle separator dot except for the last item */}
          {index < validItems.length - 1 && (
            <span style={{ color: 'var(--text-metadata)', opacity: 0.5 }}>·</span>
          )}
        </span>
      ))}
    </div>
  );
}
