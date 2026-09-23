-- Referans şema: uygulama açılışında IF NOT EXISTS ile oluşturulur.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),customer TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),interval TEXT NOT NULL CHECK(interval IN ('month','year')),active INTEGER NOT NULL DEFAULT 1);
 CREATE TABLE IF NOT EXISTS invoices(id TEXT PRIMARY KEY,subscription_id TEXT REFERENCES subscriptions(id),period TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'open',UNIQUE(subscription_id,period));
 CREATE TABLE IF NOT EXISTS events(event_id TEXT PRIMARY KEY,invoice_id TEXT REFERENCES invoices(id),created_at TEXT NOT NULL);
