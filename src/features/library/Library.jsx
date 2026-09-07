import { useWatchlist } from '../../hooks/useWatchlist';
import AsymmetricGrid from '../../components/AsymmetricGrid';

export default function Library() {
  const { watchlist } = useWatchlist();

  return (
    <div className="container page-transition" style={{ paddingTop: '8rem', minHeight: '100vh' }}>
      <h1 
        className="text-hero"
        style={{ 
          marginBottom: '4rem',
          fontSize: '4rem'
        }}
      >
        LIBRARY
      </h1>

      {watchlist.length > 0 ? (
        <AsymmetricGrid items={watchlist} />
      ) : (
        <p className="text-metadata">Your watchlist is empty. Go add some titles!</p>
      )}
    </div>
  );
}
