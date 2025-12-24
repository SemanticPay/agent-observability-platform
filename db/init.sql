-- DETRAN-SP v2 Database Schema
-- This file initializes the PostgreSQL database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Operations Table
-- Defines available DETRAN services (e.g., driver license renewal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS operations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,  -- Price in satoshis
    required_fields JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for name lookups
CREATE INDEX IF NOT EXISTS idx_operations_name ON operations(name);

-- =============================================================================
-- Users Table
-- Stores registered users with hashed passwords
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for email lookups (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================================
-- Tickets Table
-- Stores service tickets with Lightning Network payment info
-- =============================================================================
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id INTEGER NOT NULL REFERENCES operations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    form_data JSONB NOT NULL,
    ln_invoice_id TEXT,
    ln_invoice TEXT,  -- BOLT11 invoice string for QR display
    amount_sats INTEGER NOT NULL,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON tickets(payment_status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
