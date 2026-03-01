import { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../lib/socket';
import { DollarSign, Send, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BidPanel({ auction, onBidPlaced }) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidderName, setBidderName] = useState('');
  const [bidderEmail, setBidderEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastBid, setLastBid] = useState(null);
  const formRef = useRef(null);

  // Load saved bidder info
  useEffect(() => {
    const savedName = localStorage.getItem('bidder_name');
    const savedEmail = localStorage.getItem('bidder_email');
    if (savedName) setBidderName(savedName);
    if (savedEmail) setBidderEmail(savedEmail);
  }, []);

  const minBid = auction.current_bid > 0
    ? auction.current_bid + auction.bid_increment
    : auction.starting_bid;

  useEffect(() => {
    setBidAmount(minBid.toFixed(2));
  }, [minBid]);

  // Socket event handlers
  useEffect(() => {
    const handleBidSuccess = (data) => {
      setIsSubmitting(false);
      setLastBid(data);
      toast.success(`Bid of $${data.amount.toLocaleString()} placed successfully!`);
      if (onBidPlaced) onBidPlaced(data);
    };

    const handleBidError = (data) => {
      setIsSubmitting(false);
      toast.error(data.message);
    };

    socket.on('bid-success', handleBidSuccess);
    socket.on('bid-error', handleBidError);

    return () => {
      socket.off('bid-success', handleBidSuccess);
      socket.off('bid-error', handleBidError);
    };
  }, [onBidPlaced]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!bidderName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      toast.error(`Minimum bid is $${minBid.toFixed(2)}`);
      return;
    }

    // Save bidder info
    localStorage.setItem('bidder_name', bidderName);
    if (bidderEmail) localStorage.setItem('bidder_email', bidderEmail);

    setIsSubmitting(true);
    socket.emit('place-bid', {
      auctionId: auction.id,
      bidderName: bidderName.trim(),
      bidderEmail: bidderEmail.trim(),
      amount
    });
  };

  const quickBids = [
    { label: 'Min', amount: minBid },
    { label: `+${auction.bid_increment * 2}`, amount: minBid + auction.bid_increment },
    { label: `+${auction.bid_increment * 5}`, amount: minBid + auction.bid_increment * 4 },
    { label: `+${auction.bid_increment * 10}`, amount: minBid + auction.bid_increment * 9 },
  ];

  const isActive = auction.status === 'active';

  if (!isActive) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 text-center">
        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 font-medium">
          {auction.status === 'upcoming' ? 'Auction has not started yet' : 'Auction has ended'}
        </p>
        {auction.status === 'ended' && auction.winner_name && (
          <p className="text-sm text-gray-500 mt-1">
            Won by <span className="font-semibold text-green-600">{auction.winner_name}</span> for 
            <span className="font-semibold"> ${auction.final_price?.toLocaleString()}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-primary-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">Place Your Bid</h3>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <span className="live-dot" />
            Live Auction
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-white/60 text-sm">Current Bid:</span>
          <span className="text-white text-2xl font-bold">
            ${(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
            <input
              type="text"
              value={bidderName}
              onChange={(e) => setBidderName(e.target.value)}
              className="input-field"
              placeholder="John Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
            <input
              type="email"
              value={bidderEmail}
              onChange={(e) => setBidderEmail(e.target.value)}
              className="input-field"
              placeholder="john@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bid Amount (min: ${minBid.toLocaleString('en-US', { minimumFractionDigits: 2 })})
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              min={minBid}
              step={auction.bid_increment}
              className="input-field pl-10 text-lg font-semibold"
              required
            />
          </div>
        </div>

        {/* Quick bid buttons */}
        <div className="flex flex-wrap gap-2">
          {quickBids.map((qb, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBidAmount(qb.amount.toFixed(2))}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors border border-gray-200"
            >
              ${qb.amount.toLocaleString()}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Placing Bid...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Place Bid - ${parseFloat(bidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          By placing a bid, you agree to the auction terms and conditions.
        </p>
      </form>
    </div>
  );
}
