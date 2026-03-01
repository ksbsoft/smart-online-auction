require('dotenv').config();
const { initDatabase, getDb } = require('./database');
const bcrypt = require('bcryptjs');

async function seed() {
  await initDatabase();
  const db = getDb();

  console.log('Seeding database...');

  // Seed categories
  const categories = ['Electronics', 'Vehicles', 'Real Estate', 'Jewelry', 'Art', 'Collectibles', 'Furniture', 'Industrial Equipment'];

  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
  const insertManyCategories = db.transaction((cats) => {
    for (const cat of cats) {
      insertCategory.run(cat, `${cat} items for auction`);
    }
  });
  insertManyCategories(categories);
  console.log('Categories seeded');

// Seed products
const products = [
  { title: '2023 Tesla Model 3', description: 'Excellent condition, low mileage Tesla Model 3 Long Range. Pearl White Multi-Coat exterior, black premium interior. Autopilot included. Only 12,000 miles.', category: 'Vehicles', starting_price: 25000, status: 'active' },
  { title: 'MacBook Pro 16" M3 Max', description: 'Brand new Apple MacBook Pro 16-inch with M3 Max chip, 36GB RAM, 1TB SSD. Space Black. Still in original packaging.', category: 'Electronics', starting_price: 2500, status: 'active' },
  { title: 'Vintage Rolex Submariner 1968', description: 'Authentic 1968 Rolex Submariner ref. 5513. Original dial and hands. Recently serviced. Complete with box and papers.', category: 'Jewelry', starting_price: 15000, status: 'active' },
  { title: 'Original Banksy Print - Girl with Balloon', description: 'Authenticated Banksy screen print "Girl with Balloon" 2004. Numbered edition. Framed in museum-quality glass. COA included.', category: 'Art', starting_price: 50000, status: 'active' },
  { title: 'John Deere 5075E Utility Tractor', description: '2022 John Deere 5075E, 75HP, 4WD, 540 PTO, with front loader. Only 200 hours. Excellent working condition.', category: 'Industrial Equipment', starting_price: 28000, status: 'active' },
  { title: 'Herman Miller Eames Lounge Chair', description: 'Authentic Herman Miller Eames Lounge Chair and Ottoman. Santos Palisander veneer with black MCL leather. Mint condition.', category: 'Furniture', starting_price: 4500, status: 'active' },
  { title: 'First Edition Harry Potter Collection', description: 'Complete set of first edition Harry Potter books (1-7). All UK hardcover first printings. Excellent condition with dust jackets.', category: 'Collectibles', starting_price: 35000, status: 'active' },
  { title: 'DJI Mavic 3 Pro Fly More Combo', description: 'DJI Mavic 3 Pro with Fly More Combo. Triple camera system, 43-min flight time. Includes 3 batteries, charging hub, shoulder bag.', category: 'Electronics', starting_price: 1800, status: 'active' },
  { title: 'Lakefront Property - 2.5 Acres', description: 'Beautiful lakefront property, 2.5 acres of cleared land with lake access. Utilities available. Perfect for dream home or cabin.', category: 'Real Estate', starting_price: 85000, status: 'active' },
  { title: 'Antique Chinese Ming Dynasty Vase', description: 'Authentic Ming Dynasty (1368-1644) blue and white porcelain vase. Height 45cm. Museum documented provenance. Exceptional preservation.', category: 'Collectibles', starting_price: 120000, status: 'active' },
  { title: 'CAT 320 Excavator 2021', description: '2021 Caterpillar 320 GC Hydraulic Excavator. 2,800 hours. AC cabin, GPS, rear camera. Well maintained with service records.', category: 'Industrial Equipment', starting_price: 95000, status: 'draft' },
  { title: 'Diamond Tennis Bracelet 10ct', description: '10 carat natural diamond tennis bracelet. 18K white gold. VS clarity, G color. IGI certified. Stunning brilliance.', category: 'Jewelry', starting_price: 22000, status: 'draft' },
];

const insertProduct = db.prepare('INSERT INTO products (title, description, category_id, starting_price, status, image_url) VALUES (?, ?, ?, ?, ?, ?)');
const getCategory = db.prepare('SELECT id FROM categories WHERE name = ?');

const insertManyProducts = db.transaction((prods) => {
  for (const prod of prods) {
    const cat = getCategory.get(prod.category);
    insertProduct.run(
      prod.title,
      prod.description,
      cat ? cat.id : null,
      prod.starting_price,
      prod.status,
      null
    );
  }
});
insertManyProducts(products);
console.log('Products seeded');

// Create some auctions for active products
const now = new Date();
const activeProducts = db.prepare("SELECT * FROM products WHERE status = 'active'").all();

const insertAuction = db.prepare(`
  INSERT INTO auctions (product_id, start_time, end_time, starting_bid, reserve_price, bid_increment, current_bid, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBid = db.prepare(`
  INSERT INTO bids (auction_id, bidder_name, bidder_email, amount) VALUES (?, ?, ?, ?)
`);

const seedAuctions = db.transaction(() => {
  activeProducts.forEach((product, index) => {
    const startOffset = index < 5 ? -2 : 1; // First 5 are currently active, rest upcoming
    const startTime = new Date(now.getTime() + startOffset * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 24 hrs duration

    const status = startOffset < 0 ? 'active' : 'upcoming';
    const bidIncrement = product.starting_price > 10000 ? 500 : product.starting_price > 1000 ? 100 : 50;

    const result = insertAuction.run(
      product.id,
      startTime.toISOString(),
      endTime.toISOString(),
      product.starting_price,
      product.starting_price * 1.2,
      bidIncrement,
      status === 'active' ? product.starting_price : 0,
      status
    );

    // Add some sample bids for active auctions
    if (status === 'active') {
      const auctionId = result.lastInsertRowid;
      const bidders = ['John Smith', 'Emily Chen', 'Mike Johnson', 'Sarah Williams', 'Alex Garcia'];
      let currentBid = product.starting_price;

      for (let i = 0; i < 3 + Math.floor(Math.random() * 5); i++) {
        currentBid += bidIncrement;
        const bidder = bidders[Math.floor(Math.random() * bidders.length)];
        insertBid.run(auctionId, bidder, `${bidder.toLowerCase().replace(' ', '.')}@email.com`, currentBid);
      }

      // Update auction with latest bid info
      const lastBid = db.prepare('SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1').get(auctionId);
      if (lastBid) {
        db.prepare('UPDATE auctions SET current_bid = ?, current_bidder = ?, bid_count = (SELECT COUNT(*) FROM bids WHERE auction_id = ?) WHERE id = ?')
          .run(lastBid.amount, lastBid.bidder_name, auctionId, auctionId);
      }
    }
  });
});

seedAuctions();
console.log('Auctions seeded');

// Ensure admin user exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.ADMIN_USERNAME || 'admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
}
console.log('Admin user ensured');

console.log('\n✅ Database seeded successfully!');
console.log('Admin login: admin / admin123');
console.log(`Products: ${db.prepare('SELECT COUNT(*) as c FROM products').get().c}`);
console.log(`Auctions: ${db.prepare('SELECT COUNT(*) as c FROM auctions').get().c}`);
console.log(`Bids: ${db.prepare('SELECT COUNT(*) as c FROM bids').get().c}`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
