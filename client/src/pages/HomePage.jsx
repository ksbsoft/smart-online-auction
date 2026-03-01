import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import AuctionCard from '../components/AuctionCard';
import { Gavel, TrendingUp, Clock, Shield, ArrowRight, Users, Zap } from 'lucide-react';

export default function HomePage() {
  const [activeAuctions, setActiveAuctions] = useState([]);
  const [upcomingAuctions, setUpcomingAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const [activeRes, upcomingRes] = await Promise.all([
          api.get('/auctions', { params: { status: 'active', limit: 6 } }),
          api.get('/auctions', { params: { status: 'upcoming', limit: 4 } })
        ]);
        setActiveAuctions(activeRes.data.auctions);
        setUpcomingAuctions(upcomingRes.data.auctions);
      } catch (err) {
        console.error('Failed to fetch auctions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAuctions();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-primary-950 to-purple-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-primary-500 rounded-full filter blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white/80 text-sm mb-6">
              <span className="live-dot" />
              Live auctions happening now
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Bid. Win.
              <span className="bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent"> Own.</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Your trusted online auction platform. Discover incredible deals on electronics, 
              vehicles, real estate, collectibles, and more.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auctions?status=active" className="btn-primary py-3 px-8 text-lg inline-flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Browse Live Auctions
              </Link>
              <Link to="/auctions" className="btn-secondary py-3 px-8 text-lg bg-white/10 border-white/20 text-white hover:bg-white/20 inline-flex items-center gap-2">
                View All Auctions
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Gavel, label: 'Active Auctions', value: activeAuctions.length + '+' },
              { icon: Users, label: 'Active Bidders', value: '1,000+' },
              { icon: TrendingUp, label: 'Items Sold', value: '500+' },
              { icon: Shield, label: 'Secure Bidding', value: '100%' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
                <stat.icon className="h-6 w-6 text-primary-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Auctions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="live-dot" />
              <span className="text-sm font-medium text-red-600 uppercase tracking-wide">Live Now</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Active Auctions</h2>
          </div>
          <Link
            to="/auctions?status=active"
            className="hidden sm:inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

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
        ) : activeAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeAuctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Gavel className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">No active auctions at the moment</p>
            <p className="text-gray-400 text-sm mt-1">Check back soon for new listings!</p>
          </div>
        )}

        <div className="sm:hidden text-center mt-6">
          <Link to="/auctions?status=active" className="btn-primary inline-flex items-center gap-2">
            View All Auctions <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Upcoming Auctions */}
      {upcomingAuctions.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">Coming Soon</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Upcoming Auctions</h2>
              </div>
              <Link
                to="/auctions?status=upcoming"
                className="hidden sm:inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
              >
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcomingAuctions.map(auction => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Get started with bidding in three simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Search,
              title: 'Browse Auctions',
              desc: 'Explore our wide range of auction listings across multiple categories.'
            },
            {
              icon: Gavel,
              title: 'Place Your Bid',
              desc: 'Enter your bid amount and compete with other bidders in real-time.'
            },
            {
              icon: Zap,
              title: 'Win & Collect',
              desc: 'If you have the highest bid when the auction ends, you win!'
            }
          ].map((step, i) => (
            <div key={i} className="text-center p-8 rounded-2xl bg-gradient-to-b from-gray-50 to-white border border-gray-100">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-6">
                <step.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="inline-flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-bold mb-4">
                {i + 1}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Search(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
  );
}
