import { Link } from 'react-router-dom';
import { Clock, Users, DollarSign, ArrowRight, Image } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { formatDistanceToNow } from 'date-fns';

const statusConfig = {
  active: { label: 'Live', class: 'bg-red-500 text-white', dot: true },
  upcoming: { label: 'Upcoming', class: 'bg-blue-500 text-white', dot: false },
  ended: { label: 'Ended', class: 'bg-gray-500 text-white', dot: false },
};

export default function AuctionCard({ auction }) {
  const status = statusConfig[auction.status] || statusConfig.ended;
  const hasImage = auction.product_image;

  return (
    <Link to={`/auctions/${auction.id}`} className="card group block">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {hasImage ? (
          <img
            src={auction.product_image}
            alt={auction.product_title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Image className="h-16 w-16 text-gray-300" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${status.class}`}>
            {status.dot && <span className="live-dot" />}
            {status.label}
          </span>
        </div>

        {/* Category */}
        {auction.category_name && (
          <div className="absolute top-3 right-3">
            <span className="bg-black/60 text-white px-2 py-1 rounded text-xs">
              {auction.category_name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1 text-lg">
          {auction.product_title}
        </h3>
        
        {auction.product_description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{auction.product_description}</p>
        )}

        {/* Price Info */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {auction.status === 'active' ? 'Current Bid' : auction.status === 'ended' ? 'Final Price' : 'Starting Bid'}
            </p>
            <p className="text-xl font-bold text-gray-900">
              ${(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {auction.bid_count > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Bids</p>
              <p className="text-lg font-semibold text-gray-700">{auction.bid_count}</p>
            </div>
          )}
        </div>

        {/* Timer or Time Info */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {auction.status === 'active' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time Left
              </span>
              <CountdownTimer endTime={auction.end_time} className="text-xs" />
            </div>
          )}
          {auction.status === 'upcoming' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Starts
              </span>
              <span className="text-blue-600 font-medium">
                {formatDistanceToNow(new Date(auction.start_time), { addSuffix: true })}
              </span>
            </div>
          )}
          {auction.status === 'ended' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Winner</span>
              <span className="font-medium text-green-600">{auction.winner_name || 'No bids'}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-3">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 group-hover:text-primary-700">
            {auction.status === 'active' ? 'Bid Now' : 'View Details'}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
