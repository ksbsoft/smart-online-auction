import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import socket from '../lib/socket';
import CountdownTimer from '../components/CountdownTimer';
import BidPanel from '../components/BidPanel';
import { ArrowLeft, Clock, Users, DollarSign, TrendingUp, Image, Tag, Hash } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AuctionDetailPage() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [bidFlash, setBidFlash] = useState(false);

  const fetchAuction = useCallback(async () => {
    try {
      const { data } = await api.get(`/auctions/${id}`);
      setAuction(data);
      setBids(data.bids || []);
    } catch (err) {
      console.error('Failed to fetch auction:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  // Socket events
  useEffect(() => {
    if (!id) return;

    socket.emit('join-auction', parseInt(id));

    const handleNewBid = (data) => {
      setAuction(prev => prev ? {
        ...prev,
        current_bid: data.currentBid,
        current_bidder: data.currentBidder,
        bid_count: data.bidCount
      } : prev);

      setBids(prev => [{
        bidder_name: data.bidderName,
        amount: data.amount,
        created_at: data.timestamp
      }, ...prev].slice(0, 50));

      setBidFlash(true);
      setTimeout(() => setBidFlash(false), 500);
    };

    const handleViewerCount = (data) => {
      if (data.auctionId === parseInt(id)) {
        setViewerCount(data.count);
      }
    };

    const handleAuctionEnded = (data) => {
      setAuction(prev => prev ? { ...prev, ...data, status: 'ended' } : prev);
      toast('Auction has ended!', { icon: '🔨' });
    };

    const handleAuctionStarted = (data) => {
      setAuction(prev => prev ? { ...prev, ...data, status: 'active' } : prev);
      toast('Auction is now live!', { icon: '🎉' });
    };

    socket.on('new-bid', handleNewBid);
    socket.on('viewer-count', handleViewerCount);
    socket.on('auction-ended', handleAuctionEnded);
    socket.on('auction-started', handleAuctionStarted);

    return () => {
      socket.emit('leave-auction', parseInt(id));
      socket.off('new-bid', handleNewBid);
      socket.off('viewer-count', handleViewerCount);
      socket.off('auction-ended', handleAuctionEnded);
      socket.off('auction-started', handleAuctionStarted);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-96 bg-gray-200 rounded-xl" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-600">Auction not found</h2>
        <Link to="/auctions" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Auctions
        </Link>
      </div>
    );
  }

  const currentPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        to="/auctions"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Auctions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left - Product Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden" style={{ minHeight: '400px' }}>
            {auction.product_image ? (
              <img
                src={auction.product_image}
                alt={auction.product_title}
                className="w-full h-full object-cover"
                style={{ minHeight: '400px', maxHeight: '500px' }}
              />
            ) : (
              <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
                <Image className="h-24 w-24 text-gray-300" />
              </div>
            )}

            {/* Status overlay */}
            <div className="absolute top-4 left-4">
              {auction.status === 'active' && (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-500 text-white rounded-full font-bold text-sm">
                  <span className="live-dot" /> LIVE
                </span>
              )}
              {auction.status === 'upcoming' && (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 text-white rounded-full font-bold text-sm">
                  <Clock className="h-4 w-4" /> UPCOMING
                </span>
              )}
              {auction.status === 'ended' && (
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-700 text-white rounded-full font-bold text-sm">
                  ENDED
                </span>
              )}
            </div>

            {/* Viewer count */}
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur text-white rounded-full text-sm">
                <Users className="h-4 w-4" /> {viewerCount} watching
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              {auction.category_name && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs font-medium">
                  <Tag className="h-3 w-3" /> {auction.category_name}
                </span>
              )}
              <span className="text-gray-400 text-sm">Auction #{auction.id}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{auction.product_title}</h1>
            <p className="text-gray-600 leading-relaxed text-lg">{auction.product_description}</p>
          </div>

          {/* Auction Info Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-xl border ${bidFlash ? 'bid-highlight' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Current Bid
              </span>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Starting Bid</span>
              <p className="text-lg font-semibold text-gray-600 mt-1">
                ${auction.starting_bid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Total Bids
              </span>
              <p className="text-lg font-semibold text-gray-600 mt-1">{auction.bid_count}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Bid Increment</span>
              <p className="text-lg font-semibold text-gray-600 mt-1">
                ${auction.bid_increment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Timer */}
          {auction.status === 'active' && (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-white text-center sm:text-left">
                <p className="text-sm text-gray-400">Time Remaining</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ends {format(new Date(auction.end_time), 'PPpp')}
                </p>
              </div>
              <CountdownTimer endTime={auction.end_time} onEnd={fetchAuction} />
            </div>
          )}

          {/* Bid History */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Hash className="h-5 w-5 text-gray-400" /> Bid History
              <span className="text-sm font-normal text-gray-400">({bids.length} bids)</span>
            </h2>
            {bids.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="max-h-96 overflow-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Bidder</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bids.map((bid, i) => (
                        <tr key={i} className={i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{bid.bidder_name}</span>
                            {i === 0 && (
                              <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                Highest
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            ${bid.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">
                            {format(new Date(bid.created_at), 'PPp')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-gray-500">No bids yet. Be the first to bid!</p>
              </div>
            )}
          </div>
        </div>

        {/* Right - Bid Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <BidPanel auction={auction} onBidPlaced={fetchAuction} />
          </div>
        </div>
      </div>
    </div>
  );
}
