export default function SharpProgress({ percentage = 0 }) {
  // Clamp between 0 and 100
  const width = Math.min(Math.max(percentage, 0), 100);
  
  return (
    <div style={{
      width: '100%',
      height: '2px', // Thin, sharp line
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: `${width}%`,
        backgroundColor: 'var(--accent)',
        transition: 'width var(--duration) linear'
      }} />
    </div>
  );
}
