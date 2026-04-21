/**
 * Database Pool and Password Reset Helpers

 */
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "786@Mateen786",
    database: "kitaab_faroosh",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
   .then(() => console.log("Database Connected Successfully!"))
   .catch(err => console.error("Database Connection Failed:", err));

// --- Database functions for Password Reset ---

// 1. Get user by email

async function getUserByEmail(email) {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email =?', [email]);
        return rows[0]; // Returns the user object or undefined
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw error;
    }
}

// 2. Store reset token in the database for a user
async function storeResetToken(userId, token, expires) {
    try {
        await pool.query(
            'UPDATE users SET reset_token =?, reset_token_expires =? WHERE id =?',
            [token, expires, userId]
        );
    } catch (error) {
        console.error('Error storing reset token:', error);
        throw error;
    }
}

// 3. Find user by reset token and email
async function findUserByResetToken(token, email) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE reset_token =? AND email =?',
            [token, email]
        );
        return rows[0]; 
    } catch (error) {
        console.error('Error finding user by reset token:', error);
        throw error;
    }
}

// 4. Update user's password in the database
async function updatePassword(userId, newHashedPassword) {
    try {
        await pool.query(
            'UPDATE users SET password =?, reset_token = NULL, reset_token_expires = NULL WHERE id =?',
            [newHashedPassword, userId]
        );
    } catch (error) {
        console.error('Error updating password:', error);
        throw error;
    }
}

// 5. Delete/Invalidate reset token from the database
async function deleteResetToken(userId) {
    try {
        await pool.query(
            'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id =?',
            [userId]
        );
    } catch (error) {
        console.error('Error deleting reset token:', error);
        throw error;
    }
}

// Export the pool and the new functions
module.exports = {
    pool, 
    getUserByEmail,
    storeResetToken,
    findUserByResetToken,
    updatePassword,
    deleteResetToken
};
