-- Create the application database if it doesn't exist
CREATE DATABASE IF NOT EXISTS kitaab_faroosh;

USE kitaab_faroosh;

-- Users table: stores user profiles, credentials, and password reset metadata
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  university VARCHAR(255),
  password VARCHAR(255) NOT NULL,
  reset_token VARCHAR(255) NULL,           
  reset_token_expires BIGINT NULL,         
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table: marketplace listings with pricing, categorization, seller linkage, and moderation status
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NULL,
  category VARCHAR(100) NOT NULL,
  institution ENUM('School','College','University') NOT NULL,
  city VARCHAR(120) NULL,
  item_type ENUM('New','Used') DEFAULT 'Used',
  images JSON NULL,
  meta JSON NULL,
  attributes JSON NULL,
  status ENUM('pending','approved','rejected','active','sold') NOT NULL DEFAULT 'pending',
  seller_id INT NULL,
  seller_name VARCHAR(255) NULL,
  seller_email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_user FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table: per-user alerts with basic read/unread state and action type
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  read_status ENUM('unread','read') NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Favorites table: many-to-many relation capturing items saved by users (unique per user-item)
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_favorite (user_id, item_id),
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Conversations table: buyer–seller chat thread per item with uniqueness enforced per (item, buyer)
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_id INT NOT NULL,
  buyer_id INT NOT NULL,
  seller_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_conversation (item_id, buyer_id),
  CONSTRAINT fk_conv_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table: individual chat messages within conversations with sender/receiver and read status
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  message_text TEXT NOT NULL,
  read_status ENUM('unread','read') NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Orders table: captures shipping details and status of an order
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(25) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  notes TEXT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table: junction table for items included in an order
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  item_id INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  quantity INT DEFAULT 1,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
