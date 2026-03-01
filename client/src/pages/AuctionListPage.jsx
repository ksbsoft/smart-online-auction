import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import AuctionCard from '../components/AuctionCard';
import { Filter, Gavel } from 'lucide-react';

export default function AuctionListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const statusFilter = searchParams.get('status') || '';

  useEffect(() => {
    const fetchAuctions = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 12 };
        if (statusFilter) params.status = statusFilter;

        const { data } = await api.get('/auctions', { params });
        setAuctions(data.auctions);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch auctions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, [statusFilter, page]);

  const filterTabs = [
    { label: 'All', value: '' },
    { label: 'Live', value: 'active' },
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Ended', value: 'ended' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Auctions</h1>
        <p className="text-gray-500 mt-1">Browse and bid on our latest auction listings</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
        {filterTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              setPage(1);
              if (tab.value) {
                setSearchParams({ status: tab.value });
              } else {
                setSearchParams({});
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === tab.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4">{total} auction{total !== 1 ? 's' : ''} found</p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-8 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : auctions.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>

          {/* Pagination */}
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {Math.ceil(total / 12)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 12 >= total}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Gavel className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600">No auctions found</h3>
          <p className="text-gray-400 mt-2">Try changing your filter or check back later.</p>
        </div>
      )}
    </div>
  );
}
