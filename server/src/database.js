const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const DB_PATH = path.join(dbDir, 'auction.db');

let db = null;

// Wrapper to provide a better-sqlite3-compatible API on top of sql.js
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
    this._inTransaction = false;
  }

  save() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }

  exec(sql) {
    this._db.run(sql);
    if (!this._inTransaction) this.save();
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const stmt = self._db.prepare(sql);
        if (params.length > 0) stmt.bind(params);
        stmt.step();
        stmt.free();

        // Get last insert rowid and changes
        let lastId = 0;
        try {
          const result = self._db.exec("SELECT last_insert_rowid() as id");
          if (result.length > 0 && result[0].values.length > 0) {
            lastId = result[0].values[0][0];
          }
        } catch (e) {}
        const changes = self._db.getRowsModified();

        if (!self._inTransaction) self.save();
        return {
          lastInsertRowid: lastId,
          changes
        };
      },
      get(...params) {
        try {
          const stmt = self._db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('DB get error:', e.message, sql);
          return undefined;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = self._db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            const columns = stmt.getColumnNames();
            const values = stmt.get();
            const row = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            results.push(row);
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('DB all error:', e.message, sql);
          return [];
        }
      }
    };
  }

  transaction(fn) {
    const self = this;
    return (...args) => {
      self._inTransaction = true;
      self._db.run("BEGIN TRANSACTION");
      try {
        const result = fn(...args);
        self._db.run("COMMIT");
        self._inTransaction = false;
        self.save();
        return result;
      } catch (e) {
        self._inTransaction = false;
        try { self._db.run("ROLLBACK"); } catch (re) {}
        throw e;
      }
    };
  }

  pragma(p) {
    try { this._db.run(`PRAGMA ${p}`); } catch (e) {}
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new DatabaseWrapper(new SQL.Database(buf));
  } else {
    db = new DatabaseWrapper(new SQL.Database());
  }

  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      image_url TEXT,
      starting_price REAL NOT NULL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      starting_bid REAL NOT NULL,
      reserve_price REAL DEFAULT 0,
      bid_increment REAL DEFAULT 1.00,
      current_bid REAL DEFAULT 0,
      current_bidder TEXT,
      bid_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'upcoming',
      winner_name TEXT,
      final_price REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER NOT NULL,
      bidder_name TEXT NOT NULL,
      bidder_email TEXT,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_id) REFERENCES auctions(id)
    );
  `);

  try { db.exec('CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id)'); } catch(e) {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)'); } catch(e) {}

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

module.exports = { initDatabase, getDb };
