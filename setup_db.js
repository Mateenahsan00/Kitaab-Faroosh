/**
 * Initial Database Schema Setup
 */
const { pool } = require('./db');

async function setup() {
    try {
        await pool.query(`
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
        `);
        console.log("Conversations table created.");

        await pool.query(`
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
        `);
        console.log("Messages table created.");
    } catch (err) {
        console.error("Error creating tables", err);
    } finally {
        process.exit(0);
    }
}
setup();
