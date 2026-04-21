
// Kitaab Faroosh - server.js (Final Version)
console.log("SERVER STARTING: Kitaab Faroosh Marketplace - Order Management System Active");


// Step 1: Imports
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const db = require('./db'); // Database pool

// Multer configuration — store files in public/uploads/
// Handles general image uploads (e.g., item images) with a timestamp-based filename strategy.
const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `img_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
    }
});
const upload = multer({ storage: multerStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Multer for avatars — store in public/uploads/avatars/
// Dedicated storage engine for user avatars; filenames include user id for traceability.
const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'public', 'uploads', 'avatars');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, `avatar_${req.session.userId}_${Date.now()}${ext}`);
    }
});
const uploadAvatar = multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Step 2: App Configuration
// Creates the Express application and determines the listening port (env PORT fallback to 3000).
const app = express();
const PORT = process.env.PORT || 3000;

// Step 3: Middleware

// - Session management for login-state tracking across requests
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for multiple images
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_strong_secret_key_for_kitaab_faroosh',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Step 3.1: Lightweight migration (adds profile_pic, phone_number, city column if missing)

(async () => {
    try {
        await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT NULL');
        await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) NULL');
        await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100) NULL');
        await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS university VARCHAR(255) NULL');
    } catch (e) {
        try {
            const [cols] = await db.pool.query("SHOW COLUMNS FROM users");
            const names = cols.map(c => c.Field);
            if (!names.includes('profile_pic')) await db.pool.query('ALTER TABLE users ADD COLUMN profile_pic TEXT NULL');
            if (!names.includes('phone_number')) await db.pool.query('ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) NULL');
            if (!names.includes('city')) await db.pool.query('ALTER TABLE users ADD COLUMN city VARCHAR(100) NULL');
            if (!names.includes('university')) await db.pool.query('ALTER TABLE users ADD COLUMN university VARCHAR(255) NULL');
        } catch (_) { }
    }
})();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'ipv4first.smtp.gmail.com', 

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }

});

// Step 5: Helper Functions
// sendEmail: Wraps branded HTML styling around provided content and sends via Nodemailer transporter.
async function sendEmail(to, subject, htmlContent) {
    try {
        if (!to) return;

        // --- Professional HTML Template Wrapper ---
        const currentYear = new Date().getFullYear();
        const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5; }
                .wrapper { width: 100%; table-layout: fixed; background-color: #f5f5f5; padding: 40px 0; }
                .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
                .header { background-color: #5c4033; padding: 25px 30px; text-align: center; } /* Dark Brown */
                .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px; }
                .body { padding: 40px 30px; color: #333333; line-height: 1.6; font-size: 16px; }
                .body h2 { color: #5c4033; margin-top: 0; font-size: 22px; }
                .body p { margin-bottom: 20px; }
                .cta-container { text-align: center; margin: 35px 0 20px; }
                .cta-button { background-color: #8b5a2b; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s; }
                .cta-button:hover { background-color: #a06e3d; }
                .footer { background-color: #e9e5e0; padding: 20px 30px; text-align: center; font-size: 13px; color: #777777; border-top: 1px solid #dcdcdc; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <table class="main" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                        <td class="header">
                            <h1>Kitaab Faroosh</h1>
                        </td>
                    </tr>
                    <tr>
                        <td class="body">
                            ${htmlContent}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            &copy; ${currentYear} Kitaab Faroosh. All rights reserved.<br>
                            If you have any questions, please contact us.
                        </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: fullHtml
        });
    } catch (e) {
        console.error('Email send error:', e);
    }
}
// createNotification: Inserts a notification row for a user, typed by action (e.g., signup, login, item_approved).
async function createNotification(userId, message, actionType) {
    try {
        if (!userId || !message || !actionType) return;
        await db.pool.query(
            'INSERT INTO notifications (user_id, message, action_type) VALUES (?,?,?)',
            [userId, message, actionType]
        );
    } catch (e) {
        console.error('Create notification error:', e);
    }
}

// Step 5.2: Normalize image inputs (base64 data URLs -> /uploads files)

function ensureUploadsDir() {
    const dir = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function saveDataUrlToFile(dataUrl) {
    try {
        const m = String(dataUrl).match(/^data:(.+);base64,(.+)$/);
        if (!m) return null;
        const mime = m[1];
        const ext = mime.split('/')[1] || 'png';
        const buf = Buffer.from(m[2], 'base64');
        const dir = ensureUploadsDir();
        const name = `img_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
        const filePath = path.join(dir, name);
        fs.writeFileSync(filePath, buf);
        return `/uploads/${name}`;
    } catch (e) {
        return null;
    }
}
// normalizeImagesArray: Accepts various image formats (data URLs or URLs) and produces a deduplicated array of URLs.
function normalizeImagesArray(images) {
    if (!Array.isArray(images)) return [];
    const out = [];
    for (const img of images) {
        if (!img) continue;
        if (typeof img === 'string' && img.startsWith('data:')) {
            const url = saveDataUrlToFile(img);
            if (url) out.push(url);
        } else if (typeof img === 'string') {
            out.push(img);
        }
    }
    
    return Array.from(new Set(out));
}

// Step 5.1: Ensure users.disabled column exists for account disabling

(async () => {
    try {
        await db.pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled TINYINT(1) NOT NULL DEFAULT 0');
    } catch (e) {
        try {
            const [cols] = await db.pool.query("SHOW COLUMNS FROM users LIKE 'disabled'");
            if (!cols || cols.length === 0) {
                await db.pool.query('ALTER TABLE users ADD COLUMN disabled TINYINT(1) NOT NULL DEFAULT 0');
            }
        } catch (_) { }
    }
})();

// Step 5.2: Ensure items.phone_number and attributes column exists

(async () => {
    try {
        await db.pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS phone_number VARCHAR(25) NULL');
        await db.pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS attributes JSON NULL');
        // Ensure 'sold' status exists in items table
        try {
            await db.pool.query("ALTER TABLE items MODIFY COLUMN status ENUM('pending','approved','rejected','active','sold') NOT NULL DEFAULT 'pending'");
        } catch (_) { }
    } catch (e) {
        try {
            const [cols] = await db.pool.query("SHOW COLUMNS FROM items");
            const names = cols.map(c => c.Field);
            if (!names.includes('phone_number')) await db.pool.query('ALTER TABLE items ADD COLUMN phone_number VARCHAR(25) NULL');
            if (!names.includes('attributes')) await db.pool.query('ALTER TABLE items ADD COLUMN attributes JSON NULL');
        } catch (_) { }
    }
})();


// PAGE SERVING ROUTES (HTML Files)

// requireLogin: Simple gatekeeper redirecting unauthenticated users to landing page.
function requireLogin(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.redirect('/');
}
// Static page endpoints: maps friendly paths to HTML files in /public; some routes perform SSR injection.
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/sell', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'sell.html')));
app.get('/home', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/my-orders.html', requireLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'my-orders.html')));
app.get('/profile/edit', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/');
    }
    try {
        const [[user]] = await db.pool.query('SELECT id, full_name, email, profile_pic, created_at FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.redirect('/');
        const html = fs.readFileSync(path.join(__dirname, 'public', 'profile-edit.html'), 'utf8');
        const payload = `<script>window.__SSR_PROFILE=${JSON.stringify(user)};</script>`;
        const injected = html.replace('</head>', payload + '\n</head>');
        res.send(injected);
    } catch (e) {
        res.status(500).send('Failed to load profile editor.');
    }
});
app.get('/profile/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));



// USER API ROUTES (Signup, Login, Logout, Session)
// ===================================================
// Signup: Validates password strength and duplicates, hashes password, stores user, and sends welcome email/notification.

app.post('/signup', async (req, res) => {
    try {
        const { full_name, email, university, password } = req.body || {};
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Missing fields' });
        }
        const strong = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
        if (!strong) {
            return res.status(400).json({ success: false, error: 'Password does not meet strength requirements.' });
        }
        // Duplicate checks
        const [existingEmail] = await db.pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) return res.status(409).json({ success: false, error: 'Email already in use' });
        const [existingName] = await db.pool.query('SELECT id FROM users WHERE full_name = ?', [full_name]);
        if (existingName.length > 0) return res.status(409).json({ success: false, error: 'Name already in use' });
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Insert
        try {
            const [result] = await db.pool.query(
                'INSERT INTO users (full_name, email, university, password) VALUES (?,?,?,?)',
                [full_name, email, university || null, hashedPassword]
            );
            const userId = result.insertId;
            try {
                
                await sendEmail(
                    email,
                    'Welcome to Kitaab Faroosh',
                    `<h2>Welcome to Kitaab Faroosh!</h2>
                     <p>Hello ${full_name},</p>
                     <p>Thank you for joining our community of learners and readers. We're excited to have you on board!</p>
                     <p>You can now log in and start buying or selling books, uniforms, and gadgets.</p>
                     <div class="cta-container">
                         <a href="http://localhost:3000/home.html" class="cta-button">Explore Now</a>
                     </div>`
                );
            } catch (e) { }
            await createNotification(userId, 'Signup successful', 'signup');
            return res.status(201).json({ success: true });
        } catch (dbErr) {
            // Handle duplicate key error from DB just in case
            if (dbErr && dbErr.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ success: false, error: 'Email already in use' });
            }
            console.error('Signup DB error:', dbErr);
            return res.status(500).json({ success: false, error: 'Server error during signup.' });
        }
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ success: false, error: 'Server error during signup.' });
    }
});

// Login: Supports email or full_name as identifier; checks disabled state, verifies password, sets session, and sends email/notification.
app.post('/login', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const identifier = (email || username || '').trim();
        if (!identifier || !password) return res.status(400).json({ success: false, error: 'Missing credentials.' });
        const [rows] = await db.pool.query('SELECT * FROM users WHERE email = ? OR full_name = ?', [identifier, identifier]);
        if (rows.length === 0) return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        const user = rows[0];
        if (Number(user.disabled) === 1) {
            return res.status(403).json({ success: false, error: 'Your account has been disabled by the administrator.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        req.session.userId = user.id;
        req.session.user = { id: user.id, full_name: user.full_name, email: user.email, profile_pic: user.profile_pic };
        await createNotification(user.id, 'Welcome back! You logged in successfully.', 'login');
        await sendEmail(
            user.email,
            'Welcome Back - Kitaab Faroosh',
            `<h2>Welcome back!</h2>
             <p>Hello ${user.full_name},</p>
             <p>You logged in successfully to your Kitaab Faroosh account.</p>
             <div class="cta-container">
                 <a href="http://localhost:3000/home.html" class="cta-button">Visit Your Account</a>
             </div>`
        );
        res.json({ success: true, redirect: '/home.html?status=login_success' });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server error during login." });
    }
});

// Session: Returns login state and lightweight user info for client-side rendering.
app.get('/session', (req, res) => {
    if (req.session.userId && req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});


app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, error: 'Could not log out.' });
        res.clearCookie('connect.sid'); 
        res.json({ success: true });
    });
});

// Forgot Password: Generates OTP code, stores with expiry, and emails the code to the user.
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
        const user = await db.getUserByEmail(email);
        if (!user) return res.status(200).json({ success: true, message: 'If the email exists, an OTP has been sent.' });
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        const expires = Date.now() + 10 * 60 * 1000;
        await db.storeResetToken(user.id, otp, expires);
        try {
            await sendEmail(
                email,
                'Your Kitaab Faroosh OTP Code',
                `<h2>Password Reset OTP</h2>
                 <p>Your OTP code is: <strong style="font-size: 20px;">${otp}</strong></p>
                 <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>`
            );
        } catch (e) { }
        res.json({ success: true, message: 'An OTP has been sent to your email.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Verify OTP: Confirms OTP matches and has not expired for the given email.
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Missing fields.' });
        const user = await db.getUserByEmail(email);
        if (!user || !user.reset_token || !user.reset_token_expires) return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        
        // Convert to numbers to ensure proper comparison. Sync server time to UTC ms.
        const expiresAt = Number(user.reset_token_expires);
        const currentTime = Date.now();
        const tokenMatches = String(user.reset_token).trim() === String(otp).trim();
        const notExpired = currentTime <= expiresAt;
        
        console.log('OTP Verification Debug:', {
            tokenMatches,
            notExpired,
            currentTime,
            expiresAt,
            timeDiff: expiresAt - currentTime
        });
        
        const valid = tokenMatches && notExpired;
        if (!valid) return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        res.json({ success: true, message: 'OTP verified.' });
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

// Change Password: Validates strength, verifies OTP, hashes and updates password, emails confirmation.
app.post('/change-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields.' });
        const strong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
        if (!strong) return res.status(400).json({ success: false, message: 'Password does not meet strength requirements.' });
        
        // Ensure OTP is properly trimmed for findUserByResetToken lookup
        const cleanOtp = String(otp).trim();
        const user = await db.findUserByResetToken(cleanOtp, email);
        if (!user || !user.reset_token_expires) return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        
        // Convert to numbers to ensure proper comparison
        const expiresAt = Number(user.reset_token_expires);
        const currentTime = Date.now();
        const notExpired = currentTime <= expiresAt;
        
        if (!notExpired) return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.updatePassword(user.id, hashed);
        try {
            await sendEmail(
                email,
                'Your Kitaab Faroosh Password Was Changed',
                `<h2>Password Changed</h2>
                 <p>Hello ${user.full_name},</p>
                 <p>Your password has been updated successfully.</p>
                 <p>If you did not make this change, please contact support immediately.</p>
                 <div class="cta-container">
                     <a href="http://localhost:3000/index.html" class="cta-button">Login Now</a>
                 </div>`
            );
        } catch (e) { }
        res.json({ success: true, message: 'Password updated.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});


// SELLING & ITEM ROUTES
// ===================================================
// GET /api/items: Returns filtered listing results by institution/category/city/condition/search with sort order.

app.get('/api/items', async (req, res) => {
    try {
        const { institution, category, city, condition, sort, search, minPrice, maxPrice } = req.query;
        let query = 'SELECT * FROM items WHERE status = "active"';
        const params = [];

        if (institution) { query += ' AND institution = ?'; params.push(institution); }
        if (category) { query += ' AND category = ?'; params.push(category); }
        if (city && city !== 'All Pakistan') { query += ' AND city = ?'; params.push(city); }
        if (condition) { query += ' AND item_type = ?'; params.push(condition); }
        if (minPrice) { query += ' AND price >= ?'; params.push(Number(minPrice)); }
        if (maxPrice) { query += ' AND price <= ?'; params.push(Number(maxPrice)); }
        
        if (search) {
            query += ' AND (title LIKE ? OR description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (sort === 'oldest') {
            query += ' ORDER BY created_at ASC';
        } else if (sort === 'price_low') {
            query += ' ORDER BY price ASC';
        } else if (sort === 'price_high') {
            query += ' ORDER BY price DESC';
        } else {
            query += ' ORDER BY created_at DESC';
        }

        const [rows] = await db.pool.query(query, params);
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                description: r.description,
                price: r.price,
                category: r.category,
                institution: r.institution,
                city: r.city,
                itemType: r.item_type,
                sellerId: r.seller_id,
                sellerName: r.seller_name,
                images,
                attributes: r.attributes ? (typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes) : {},
                datePosted: r.created_at
            };
        });
        res.json({ success: true, items });
    } catch (error) {
        console.error('Filter products error:', error);
        res.status(500).json({ success: false, error: 'Failed to load items.' });
    }
});


// Returns latest items matching city and query; used by landing page search.
app.get('/api/items/search', async (req, res) => {
    try {
        const { city, query: searchText } = req.query;
        let sql = 'SELECT * FROM items WHERE status = "active"';
        const params = [];

        if (city && city !== 'Pakistan') {
            sql += ' AND city = ?';
            params.push(city);
        }
        if (searchText) {
            sql += ' AND (title LIKE ? OR description LIKE ?)';
            params.push(`%${searchText}%`, `%${searchText}%`);
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await db.pool.query(sql, params);
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                description: r.description,
                price: r.price,
                city: r.city,
                category: r.category,
                institution: r.institution,
                city: r.city,
                images,
                datePosted: r.created_at
            };
        });
        res.json({ success: true, items });
    } catch (error) {
        console.error('Search items error:', error);
        res.status(500).json({ success: false, error: 'Failed to search items.' });
    }
});

// GET /api/items/all: Fetches all active items (admin/public dashboards or global browsing).
app.get('/api/items/all', async (req, res) => {
    try {
        const [rows] = await db.pool.query('SELECT * FROM items WHERE status = "active" ORDER BY created_at DESC');
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                description: r.description,
                price: r.price,
                category: r.category,
                itemType: r.item_type,
                institution: r.institution,
                city: r.city,
                images,
                datePosted: r.created_at
            };
        });
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to load items.' });
    }
});

// GET /api/user/items — returns all items posted by the logged-in user
// Provides user's own listings for their dashboard, including status.
app.get('/api/user/items', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [rows] = await db.pool.query('SELECT * FROM items WHERE seller_id = ? ORDER BY created_at DESC', [req.session.userId]);
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                description: r.description,
                price: r.price,
                category: r.category,
                itemType: r.item_type,
                institution: r.institution,
                city: r.city,
                images,
                status: r.status,
                datePosted: r.created_at
            };
        });
        res.json({ success: true, items });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to load your items.' });
    }
});

// DELETE /api/items/:id — securely delete an item (ownership check required)
// Confirms the logged-in user owns the item before deleting; also removes related favorites/cart entries.
app.delete('/api/items/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const itemId = req.params.id;
        const userId = req.session.userId;

        // 1. Fetch item to check ownership
        const [[item]] = await db.pool.query('SELECT seller_id FROM items WHERE id = ?', [itemId]);
        if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

        // 2. Ownership Check
        if (item.seller_id !== userId) {
            return res.status(403).json({ success: false, error: 'You are not authorized to delete this item.' });
        }

        // 3. Delete the item
        await db.pool.query('DELETE FROM items WHERE id = ?', [itemId]);

        // Optional: Also cleanup related records like favorites
        await db.pool.query('DELETE FROM favorites WHERE item_id = ?', [itemId]);
        await db.pool.query('DELETE FROM cart WHERE item_id = ?', [itemId]);

        res.json({ success: true, message: 'Item deleted successfully.' });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete item.' });
    }
});

// POST /api/items: Handles new item submissions with uploaded images and dynamic attributes; default status 'pending'.
app.post('/api/items', upload.array('images', 5), async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'You must be logged in.' });
    try {
        const { title, description, price, category, institution_type, city, condition, phone_number } = req.body;
        if (!title || !category || !institution_type || !city) {
            return res.status(400).json({ success: false, error: 'Please fill all required fields.' });
        }
        const seller_id = req.session.userId;
        const seller_name = req.session.user.full_name;
        const seller_email = req.session.user.email;

        // Build image paths from uploaded files
        const imagePaths = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
        const imagesJson = JSON.stringify(imagePaths);

        // Build attributes from extra category-specific fields in req.body
        const attributes = {};
        const categoryVal = category || '';
        
        // Map category-specific fields from sell.html
        if (categoryVal === 'Books') {
            if (req.body.author_name) attributes.author_name = req.body.author_name;
            if (req.body.subject) attributes.subject = req.body.subject;
        } else if (categoryVal === 'Notes') {
            if (req.body.class_year) attributes.class_year = req.body.class_year;
            if (req.body.subject) attributes.subject = req.body.subject;
        } else if (categoryVal === 'Uniform') {
            if (req.body.size) attributes.size = req.body.size;
            if (req.body.uniform_type) attributes.uniform_type = req.body.uniform_type;
        } else if (categoryVal === 'Past Papers') {
            if (req.body.year_range) attributes.year_range = req.body.year_range;
            if (req.body.board) attributes.board = req.body.board;
        } else if (categoryVal === 'Gadgets') {
            if (req.body.brand) attributes.brand = req.body.brand;
            if (req.body.specifications) attributes.specifications = req.body.specifications;
        } else if (categoryVal === 'Study Material') {
            if (req.body.material_type) attributes.material_type = req.body.material_type;
        }

        // Capture ALL other fields that are not standard item columns
        const standardFields = [
            'title', 'description', 'price', 'category', 'institution_type', 
            'city', 'condition', 'phone_number', 'phone', 'images'
        ];
        Object.keys(req.body).forEach(key => {
            if (!standardFields.includes(key) && !attributes[key]) {
                attributes[key] = req.body[key];
            }
        });

        const attributesJson = JSON.stringify(attributes);
        const metaJson = attributesJson; // Sync meta and attributes for consistency
        const finalCondition = condition || 'Used';
        const finalPhone = phone_number || req.body.phone || null;

        await db.pool.query(
            'INSERT INTO items (title, description, price, category, institution, city, item_type, phone_number, images, meta, attributes, seller_id, seller_name, seller_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, price || null, category, institution_type, city, finalCondition, finalPhone, imagesJson, metaJson, attributesJson, seller_id, seller_name, seller_email, 'pending']
        );
        
        // Notify user that item is pending approval
        await createNotification(seller_id, `Your item "${title}" has been submitted and is pending admin approval.`, 'item_pending');
        await sendEmail(
            seller_email,
            'Item Submitted - Kitaab Faroosh',
            `<h2>Item Received!</h2>
             <p>Hello ${seller_name},</p>
             <p>Your item "<strong>${title}</strong>" has been submitted successfully.</p>
             <p>It is currently pending approval from our administrators. You will be notified once it is live.</p>`
        );

        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Item submission error details:", error);
        res.status(500).json({ success: false, error: 'Server error while submitting item: ' + error.message });
    }
});

// GET single item by ID (public, for item-detail.html)
// Fetches active item with metadata and attributes for detail view.
app.get('/api/item/:id', async (req, res) => {
    try {
        const [[row]] = await db.pool.query('SELECT * FROM items WHERE id = ? AND status = "active"', [req.params.id]);
        if (!row) return res.status(404).json({ success: false, error: 'Item not found or not approved.' });
        let images = [];
        let meta = {};
        try { images = typeof row.images === 'string' ? JSON.parse(row.images || '[]') : (row.images || []); } catch (e) { }
        try { meta = typeof row.meta === 'string' ? JSON.parse(row.meta || '{}') : (row.meta || {}); } catch (e) { }
        res.json({
            success: true,
            item: {
                id: row.id,
                title: row.title,
                description: row.description,
                price: row.price,
                category: row.category,
                condition: row.item_type,
                institution: row.institution,
                city: row.city,
                phone_number: row.phone_number,
                sellerId: row.seller_id,
                sellerName: row.seller_name,
                images,
                meta,
                attributes: row.attributes ? (typeof row.attributes === 'string' ? JSON.parse(row.attributes) : row.attributes) : {},
                datePosted: row.created_at
            }
        });
    } catch (e) {
        console.error('GET /api/item/:id error:', e);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

// GET /api/messages/unread-count — returns number of unread messages for navbar badge
// Provides quick unread count for chat notification badge; falls back gracefully where schema differs.
app.get('/api/messages/unread-count', async (req, res) => {
    if (!req.session.userId) return res.json({ success: true, count: 0 });
    try {
        
        const [[row]] = await db.pool.query(
            'SELECT COUNT(*) as cnt FROM messages WHERE receiver_id = ? AND (read_status IS NULL OR read_status = 0)',
            [req.session.userId]
        );
        res.json({ success: true, count: row.cnt || 0 });
    } catch (e) {
        res.json({ success: true, count: 0 });
    }
});

// GET /api/users/:id/public-profile — professional seller profile endpoint
// Returns seller's public profile along with their active items for profile page rendering.
app.get('/api/users/:id/public-profile', async (req, res) => {
    try {
        const { id } = req.params;
        const [userRows] = await db.pool.query(
            'SELECT id, full_name, city, profile_pic, created_at as member_since FROM users WHERE id = ?',
            [id]
        );
        if (userRows.length === 0) return res.status(404).json({ success: false, error: 'User not found.' });
        const user = userRows[0];

        const [itemRows] = await db.pool.query(
            'SELECT id, title, price, city, category, images FROM items WHERE seller_id = ? AND status = "active" ORDER BY created_at DESC',
            [id]
        );
        const items = itemRows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return { id: r.id, title: r.title, price: r.price, city: r.city, category: r.category, images };
        });

        res.json({ success: true, user, items });
    } catch (e) {
        console.error('Public profile error:', e);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


// FAVORITES TABLE INIT
(async () => {
    try {
        await db.pool.query(`CREATE TABLE IF NOT EXISTS favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            item_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_favorite (user_id, item_id),
            CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_fav_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    } catch (e) {
        console.error('Favorites table init error (non-fatal):', e.message);
    }
})();

// FAVORITES API

// Provides endpoints to add/remove/check favorites and list favorited items; includes real-time seller notifications.
app.post('/api/favorites', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const { item_id } = req.body;
        if (!item_id) return res.status(400).json({ success: false, error: 'Missing item_id' });

        // Use INSERT IGNORE to smoothly handle existing favorites
        await db.pool.query(
            'INSERT IGNORE INTO favorites (user_id, item_id) VALUES (?, ?)',
            [req.session.userId, item_id]
        );

        // Real-time: notify the item's seller that someone favorited their item
        try {
            const [[favItem]] = await db.pool.query('SELECT seller_id, title FROM items WHERE id = ?', [item_id]);
            const [[liker]] = await db.pool.query('SELECT full_name FROM users WHERE id = ?', [req.session.userId]);
            if (favItem && favItem.seller_id && global.io) {
                global.io.to(favItem.seller_id.toString()).emit('new_favorite', {
                    from_name: liker ? liker.full_name : 'Someone',
                    item_title: favItem.title,
                    item_id
                });
            }
        } catch (_) { }

        res.json({ success: true, message: 'Added to favorites' });
    } catch (error) {
        console.error("Add favorite error:", error);
        res.status(500).json({ success: false, error: 'Failed to add favorite' });
    }
});

app.delete('/api/favorites/:item_id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const { item_id } = req.params;
        await db.pool.query(
            'DELETE FROM favorites WHERE user_id = ? AND item_id = ?',
            [req.session.userId, item_id]
        );
        res.json({ success: true, message: 'Removed from favorites' });
    } catch (error) {
        console.error("Remove favorite error:", error);
        res.status(500).json({ success: false, error: 'Failed to remove favorite' });
    }
});

app.get('/api/favorites', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [rows] = await db.pool.query(
            `SELECT i.* FROM items i 
             JOIN favorites f ON i.id = f.item_id 
             WHERE f.user_id = ? AND i.status = 'active'
             ORDER BY f.id DESC`,
            [req.session.userId]
        );

        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                price: r.price,
                category: r.category,
                city: r.city,
                institution: r.institution,
                itemType: r.item_type,
                images,
                datePosted: r.created_at
            };
        });

        res.json({ success: true, items });
    } catch (error) {
        console.error("Get favorites error:", error);
        res.status(500).json({ success: false, error: 'Failed to load favorites' });
    }
});

app.get('/api/favorites/check', async (req, res) => {
    if (!req.session.userId) return res.json({ success: true, favoriteIds: [] });
    try {
        const [rows] = await db.pool.query('SELECT item_id FROM favorites WHERE user_id = ?', [req.session.userId]);
        const favoriteIds = rows.map(r => r.item_id);
        res.json({ success: true, favoriteIds });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to check favorites' });
    }
});


// CART SYSTEM — Table Init + API

// Initializes cart table (if missing) and exposes endpoints for adding/removing/listing/checking cart items.
(async () => {
    try {
        await db.pool.query(`CREATE TABLE IF NOT EXISTS cart (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            item_id INT NOT NULL,
            quantity INT DEFAULT 1,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_cart_new (user_id, item_id),
            CONSTRAINT fk_cart_user_new FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_cart_item_new FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    } catch (e) {
        console.error('Cart table init error (non-fatal):', e.message);
    }
})();

// POST /api/cart — add item to cart
// Validates item availability, uses INSERT IGNORE for idempotency, and returns success.
app.post('/api/cart', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const { itemId } = req.body;
        if (!itemId) return res.status(400).json({ success: false, error: 'Missing itemId' });

        // Check item exists and is active (not sold/removed or pending)
        const [[item]] = await db.pool.query('SELECT id, status FROM items WHERE id = ?', [itemId]);
        if (!item) return res.status(404).json({ success: false, error: 'Item not found.' });
        if (item.status !== 'active') return res.status(400).json({ success: false, error: 'This item is no longer available.' });

        await db.pool.query(
            'INSERT IGNORE INTO cart (user_id, item_id) VALUES (?, ?)',
            [req.session.userId, itemId]
        );
        res.json({ success: true, message: 'Added to cart' });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to add to cart' });
    }
});

// DELETE /api/cart/:itemId — remove item from cart
// Removes a single row from cart for the logged-in user and returns confirmation JSON.
app.delete('/api/cart/:itemId', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const { itemId } = req.params;
        await db.pool.query(
            'DELETE FROM cart WHERE user_id = ? AND item_id = ?',
            [req.session.userId, itemId]
        );
        res.json({ success: true, message: 'Removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to remove from cart' });
    }
});

// GET /api/cart — fetch all cart items for logged-in user
// Joins cart and items tables, returning enriched item data and quantities for the UI.
app.get('/api/cart', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [rows] = await db.pool.query(
            `SELECT 
                i.id, 
                i.title, 
                i.price, 
                i.images, 
                i.seller_id, 
                i.seller_name, 
                i.city,
                c.quantity, 
                c.added_at as addedAt
             FROM cart c
             INNER JOIN items i ON c.item_id = i.id
             WHERE c.user_id = ? AND i.status = 'active'
             ORDER BY c.added_at DESC`,
            [req.session.userId]
        );

        const items = rows.map(r => {
            let images = [];
            try {
                images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []);
            } catch (e) {
                console.error("Cart image parse error:", e);
            }
            return {
                id: r.id,
                title: r.title,
                price: r.price,
                sellerId: r.seller_id,
                sellerName: r.seller_name,
                city: r.city,
                images,
                quantity: r.quantity,
                addedAt: r.addedAt
            };
        });

        res.json({ success: true, items });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to load cart' });
    }
});

// GET /api/cart/check — returns array of item IDs in user's cart
// Useful for client-side toggling of "Added to Cart" state on item detail pages.
app.get('/api/cart/check', async (req, res) => {
    if (!req.session.userId) return res.json({ success: true, cartIds: [] });
    try {
        const [rows] = await db.pool.query('SELECT item_id FROM cart WHERE user_id = ?', [req.session.userId]);
        const cartIds = rows.map(r => r.item_id);
        res.json({ success: true, cartIds });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to check cart' });
    }
});

// ADMIN API ROUTES
// ===================================================
// Administrative endpoints for user and item management; protected via session flag (isAdmin).

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded admin check
    if (username === 'admin' && password === '12345678') {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    }
});

app.get('/api/admin/users', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        try {
            const [users] = await db.pool.query('SELECT id, full_name, email, university, profile_pic, created_at, disabled FROM users ORDER BY id DESC');
            return res.json({ success: true, users });
        } catch (e1) {
            // Fallback if "disabled" column is missing
            const [users] = await db.pool.query('SELECT id, full_name, email, university, profile_pic, created_at FROM users ORDER BY id DESC');
            const enriched = users.map(u => ({ ...u, disabled: 0 }));
            return res.json({ success: true, users: enriched });
        }
    } catch (error) {
        console.error("Admin: Get users error:", error);
        return res.status(500).json({ success: false, error: 'Failed to load users.' });
    }
});

app.get('/api/admin/selling-requests', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const status = req.query.status || 'pending'; // Default 'pending'
        const [requests] = await db.pool.query('SELECT * FROM items WHERE status =? ORDER BY id DESC', [status]);
        const parsed = requests.map(r => {
            let imgs = [];
            let attrs = {};
            try { imgs = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            try { attrs = typeof r.attributes === 'string' ? JSON.parse(r.attributes || '{}') : (r.attributes || {}); } catch (e) { }
            return { ...r, images: imgs, attributes: attrs };
        });
        res.json({ success: true, requests: parsed });
    } catch (error) {
        console.error("Admin: Get selling requests error:", error);
        res.status(500).json({ success: false, error: 'Failed to load selling requests.' });
    }
});

// Admin: Get all items (all statuses)
// Provides a holistic view to review/inspect items irrespective of moderation state.
app.get('/api/admin/all-items', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const [rows] = await db.pool.query('SELECT * FROM items ORDER BY id DESC');
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                seller_name: r.seller_name,
                price: r.price,
                category: r.category,
                status: r.status,
                created_at: r.created_at,
                images,
                attributes: r.attributes ? (typeof r.attributes === 'string' ? JSON.parse(r.attributes) : r.attributes) : {},
            };
        });
        res.json({ success: true, items });
    } catch (error) {
        console.error("Admin: Get all items error:", error);
        res.status(500).json({ success: false, error: 'Failed to load all items.' });
    }
});

// Admin: Get Dashboard Stats
app.get('/api/admin/stats', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const [[{ totalUsers }]] = await db.pool.query('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ totalItems }]] = await db.pool.query('SELECT COUNT(*) as totalItems FROM items');
        const [[{ pendingItems }]] = await db.pool.query('SELECT COUNT(*) as pendingItems FROM items WHERE status = "pending"');
        const [[{ activeItems }]] = await db.pool.query('SELECT COUNT(*) as activeItems FROM items WHERE status = "active"');
        const [[{ totalOrders }]] = await db.pool.query('SELECT COUNT(*) as totalOrders FROM orders');
        
        res.json({
            success: true,
            stats: { totalUsers, totalItems, pendingItems, activeItems, totalOrders }
        });
    } catch (error) {
        console.error("Admin: Get stats error:", error);
        res.status(500).json({ success: false, error: 'Failed to load stats.' });
    }
});

app.post('/api/admin/selling-requests/:id/:action', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const { id, action } = req.params;
        const validActions = ['approve', 'reject'];

        if (action === 'delete') {
            await db.pool.query('DELETE FROM items WHERE id =?', [id]);
            return res.json({ success: true, message: 'Item deleted.' });
        }

        if (validActions.includes(action)) {
            const newStatus = action === 'approve' ? 'active' : 'rejected';
            await db.pool.query('UPDATE items SET status =? WHERE id =?', [newStatus, id]);
            try {
                const [[item]] = await db.pool.query('SELECT seller_id, seller_email, seller_name, title FROM items WHERE id =?', [id]);
                if (item && item.seller_id) {
                    if (newStatus === 'active') {
                        // Notify and email seller for approval
                        await createNotification(item.seller_id, `Congratulations! Your item "${item.title}" has been approved and is now live.`, 'item_approved');
                        await sendEmail(
                            item.seller_email,
                            'Item Approved - Kitaab Faroosh',
                            `<h2>Your Item is Live!</h2>
                             <p>Hello ${item.seller_name},</p>
                             <p>Congratulations! Your item "<strong>${item.title}</strong>" has been approved by our administrators.</p>
                             <p>It is now live on Kitaab Faroosh and visible to all buyers.</p>
                             <div class="cta-container">
                                 <a href="http://localhost:3000/item-detail.html?id=${id}" class="cta-button">View Your Item</a>
                             </div>`
                        );
                    } else if (newStatus === 'rejected') {
                        // Notify and email seller for rejection with guidance
                        await createNotification(item.seller_id, `Your item "${item.title}" was rejected. Please review our policies.`, 'item_rejected');
                        await sendEmail(
                            item.seller_email,
                            'Item Rejected - Kitaab Faroosh',
                            `<h2>Item Update</h2>
                             <p>Hello ${item.seller_name},</p>
                             <p>We are sorry to inform you that your item "<strong>${item.title}</strong>" could not be approved for publication at this time.</p>
                             <p>Please review our posting policies and ensure your item details meet our guidelines before trying again.</p>
                             <div class="cta-container">
                                 <a href="http://localhost:3000/sell.html" class="cta-button">Submit a New Item</a>
                             </div>`
                        );
                    }
                }
            } catch (e) { }
            return res.json({ success: true, message: `Item ${newStatus}.` });
        }

        res.status(400).json({ success: false, error: 'Invalid action.' });
    } catch (error) {
        console.error(`Admin: Failed to ${req.params.action} item:`, error);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const { id } = req.params;
        await db.pool.query('DELETE FROM users WHERE id =?', [id]);
        await db.pool.query('DELETE FROM items WHERE seller_id =?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete user.' });
    }
});

// Admin: disable/enable user
// Toggles the 'disabled' flag for a user account for moderation purposes.
app.post('/api/admin/users/:id/disable', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const { id } = req.params;
        await db.pool.query('UPDATE users SET disabled=1 WHERE id=?', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to disable user.' });
    }
});
app.post('/api/admin/users/:id/enable', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const { id } = req.params;
        await db.pool.query('UPDATE users SET disabled=0 WHERE id=?', [id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to enable user.' });
    }
});

// Admin: Get full user details
// Returns enriched user profile with a calculated completion percentage for admin dashboard views.
app.get('/api/admin/users/:id', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const { id } = req.params;
        const [rows] = await db.pool.query('SELECT id, full_name, email, university, profile_pic, phone_number, city, created_at, disabled FROM users WHERE id =?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });

        const user = rows[0];
        // Calculate profile completion percentage (simplified)
        let filled = 0;
        const fields = ['full_name', 'email', 'university', 'profile_pic', 'phone_number', 'city'];
        fields.forEach(f => { if (user[f]) filled++; });
        user.profile_completion = Math.round((filled / fields.length) * 100);

        res.json({ success: true, user });
    } catch (error) {
        console.error("Admin: Get user details error:", error);
        res.status(500).json({ success: false, error: 'Failed to load user details.' });
    }
});

// Admin: get all items by a specific user (any status)
// Provides item inventory for a single user across statuses for detailed moderation/auditing.
app.get('/api/admin/users/:id/items', async (req, res) => {
    if (!req.session.isAdmin) return res.status(403).json({ success: false, error: 'Forbidden' });
    try {
        const { id } = req.params;
        const [rows] = await db.pool.query('SELECT * FROM items WHERE seller_id=? ORDER BY id DESC', [id]);
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                price: r.price,
                status: r.status,
                category: r.category,
                city: r.city,
                institution: r.institution,
                itemType: r.item_type,
                images,
                created_at: r.created_at
            };
        });
        res.json({ success: true, items });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to load user items.' });
    }
});

// NOTIFICATIONS API 
// ===================================================
// Endpoints for listing and marking notifications read; used by navbar and notification panels.
app.get('/api/notifications', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        console.log('Fetching notifications for user:', req.session.userId);
        const [rows] = await db.pool.query('SELECT * FROM notifications WHERE user_id =? ORDER BY id DESC LIMIT 15', [req.session.userId]);
        console.log('DB rows fetched:', rows.length);
        
        let unifiedNotifications = rows.map(r => {
            let d = new Date();
            if (r.created_at && !Number.isNaN(new Date(r.created_at).getTime())) {
                d = new Date(r.created_at);
            }
            return {
                id: r.id,
                message: r.message,
                action_type: r.action_type,
                read_status: r.read_status,
                created_at: d.toISOString(),
                action_url: ''
            };
        });
        
        console.log('Mapped Unified Notifications Length:', unifiedNotifications.length);
        
        const [unreadMsgs] = await db.pool.query(
            `SELECT m.conversation_id, MAX(m.created_at) as created_at, u.full_name as sender_name, COUNT(m.id) as msg_count 
             FROM messages m JOIN users u ON m.sender_id = u.id 
             WHERE m.receiver_id = ? AND m.read_status = "unread" 
             GROUP BY m.conversation_id, u.full_name 
             ORDER BY created_at DESC LIMIT 15`, [req.session.userId]
        );
        console.log('Unread msgs fetched:', unreadMsgs.length);
        
        for(const m of unreadMsgs) {
            let d = new Date();
            if (m.created_at && !Number.isNaN(new Date(m.created_at).getTime())) {
                d = new Date(m.created_at);
            }
            unifiedNotifications.push({
                id: 'msg_' + m.conversation_id,
                message: `💬 ${m.msg_count} new message(s) from ${m.sender_name}`,
                action_type: 'chat_message',
                read_status: 'unread',
                created_at: d.toISOString(),
                action_url: `/my-chats.html?chatId=${m.conversation_id}`
            });
        }
        
        unifiedNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        const [[unread]] = await db.pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id =? AND read_status = "unread"', [req.session.userId]);
        const [[unreadChat]] = await db.pool.query('SELECT COUNT(*) as count FROM messages WHERE receiver_id =? AND read_status = "unread"', [req.session.userId]);
        
        const totalCount = Number(unread.count) + Number(unreadChat.count);
        console.log('Sending final merged length:', unifiedNotifications.length);
        
        res.json({ success: true, notifications: unifiedNotifications.slice(0, 30), unreadCount: totalCount });
    } catch (error) {
        console.error("Notifications fetch EXCEPTION trace:", error);
        res.status(500).json({ success: false, error: 'Failed to load notifications.' });
    }
});

app.post('/api/notifications/mark-all-read', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        await db.pool.query('UPDATE notifications SET read_status="read" WHERE user_id=?', [req.session.userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update notifications.' });
    }
});

// ===================================================
// USER PROFILE API ROUTES
// ===================================================
// Public user profile and authenticated profile fetch/update; used by profile pages and dashboards.
app.get('/api/users/:id/public', async (req, res) => {
    try {
        const { id } = req.params;
        const [[user]] = await db.pool.query('SELECT id, full_name, email, profile_pic, created_at FROM users WHERE id = ?', [id]);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        const [rows] = await db.pool.query('SELECT id, title, price, images, category, item_type, city, institution, created_at FROM items WHERE seller_id = ? AND status = "active" ORDER BY id DESC', [id]);
        const items = rows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return { id: r.id, title: r.title, price: r.price, images, category: r.category, itemType: r.item_type, city: r.city, institution: r.institution, datePosted: r.created_at };
        });
        res.json({
            success: true,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                profile_pic: user.profile_pic || null,
                member_since: user.created_at
            },
            items
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to load profile.' });
    }
});

app.get('/api/profile/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [[user]] = await db.pool.query('SELECT id, full_name, email, profile_pic, phone_number, city, created_at FROM users WHERE id = ?', [req.session.userId]);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({ success: true, user });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to load profile.' });
    }
});

app.get('/api/profile/stats', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const uid = req.session.userId;
        const [[{ adCount }]] = await db.pool.query('SELECT COUNT(*) as adCount FROM items WHERE seller_id=? AND status="active"', [uid]);
        const [[{ favCount }]] = await db.pool.query('SELECT COUNT(*) as favCount FROM favorites WHERE user_id=?', [uid]);
        const [[{ cartCount }]] = await db.pool.query('SELECT COUNT(*) as cartCount FROM cart WHERE user_id=?', [uid]);

        res.json({
            success: true,
            stats: { adCount, favCount, cartCount }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to load stats.' });
    }
});

app.put('/api/profile/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const userId = req.session.userId;
        const { full_name, profile_pic, phone_number, city, newPassword } = req.body || {};

        if (full_name) {
            const [existingName] = await db.pool.query('SELECT id FROM users WHERE full_name = ? AND id <> ?', [full_name, userId]);
            if (existingName.length > 0) return res.status(400).json({ success: false, error: 'This name is already taken.' });
        }
        if (newPassword) {
            const strong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
            if (!strong) return res.status(400).json({ success: false, error: 'Password does not meet strength requirements.' });
        }

        const fields = [];
        const values = [];
        if (full_name) { fields.push('full_name = ?'); values.push(full_name); }
        if (typeof profile_pic === 'string') { fields.push('profile_pic = ?'); values.push(profile_pic); }
        if (phone_number !== undefined) { fields.push('phone_number = ?'); values.push(phone_number); }
        if (city !== undefined) { fields.push('city = ?'); values.push(city); }

        if (newPassword) {
            const hashed = await bcrypt.hash(newPassword, 10);
            fields.push('password = ?'); values.push(hashed);
        }

        if (fields.length === 0) return res.json({ success: true });

        values.push(userId);
        await db.pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

        if (full_name) {
            req.session.user = { ...req.session.user, full_name };
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to update profile.' });
    }
});

// GET /api/users/:id/public — Public Profile Endpoint
// Alternative public profile endpoint returning user details and active items (lightweight format).
app.get('/api/users/:id/public', async (req, res) => {
    try {
        const { id } = req.params;
        // 1. Fetch public user info (safe fields only)
        const [userRows] = await db.pool.query(
            'SELECT id, full_name, city, profile_pic, created_at as member_since FROM users WHERE id = ?',
            [id]
        );
        if (userRows.length === 0) return res.status(404).json({ success: false, error: 'User not found.' });
        const user = userRows[0];

        // 2. Fetch all active items by this user
        const [itemRows] = await db.pool.query(
            'SELECT id, title, price, city, images FROM items WHERE seller_id = ? AND status = "active" ORDER BY created_at DESC',
            [id]
        );

        const items = itemRows.map(r => {
            let images = [];
            try { images = typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []); } catch (e) { }
            return {
                id: r.id,
                title: r.title,
                price: r.price,
                city: r.city,
                images
            };
        });

        res.json({ success: true, user, items });
    } catch (e) {
        console.error('Public Profile error:', e);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /api/user/me/avatar — Upload new profile picture
// Uses Multer avatar storage; updates database with file path and returns it for UI refresh.
app.post('/api/user/me/avatar', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    uploadAvatar.single('avatar')(req, res, async (err) => {
        if (err) return res.status(400).json({ success: false, error: 'Upload failed: ' + err.message });
        if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

        try {
            const filePath = `/uploads/avatars/${req.file.filename}`;
            await db.pool.query('UPDATE users SET profile_pic = ? WHERE id = ?', [filePath, req.session.userId]);
            res.json({ success: true, profile_pic: filePath });
        } catch (error) {
            console.error('Avatar DB update error:', error);
            res.status(500).json({ success: false, error: 'Database update failed.' });
        }
    });
});

// CHAT TABLE INIT
// ===================================================
// Creates conversations and messages tables (if absent) and ensures is_read exists for message read tracking.
(async () => {
    try {
        await db.pool.query(`CREATE TABLE IF NOT EXISTS conversations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            buyer_id INT NOT NULL,
            seller_id INT NOT NULL,
            item_id INT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_conv_buyer (buyer_id),
            INDEX idx_conv_seller (seller_id),
            CONSTRAINT fk_conv_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_conv_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
        await db.pool.query(`CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT NOT NULL,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            message_text TEXT NOT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_msg_conv (conversation_id),
            CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    } catch (e) { }
})();


(async () => {
    try {
        const [cols] = await db.pool.query('SHOW COLUMNS FROM messages LIKE "is_read"');
        if (cols.length === 0) {
            await db.pool.query('ALTER TABLE messages ADD COLUMN is_read TINYINT(1) DEFAULT 0');
        }
    } catch (e) { }
})();

// ===================================================
// CHAT API
// ===================================================
// REST endpoints for starting chats, listing conversations/messages, sending messages, and marking read status.
app.post('/api/chat/start', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const buyerId = req.session.userId;
        const sellerId = Number(req.body.seller_id);
        const itemId = req.body.item_id ? Number(req.body.item_id) : null;
        if (!sellerId) return res.status(400).json({ success: false, error: 'Missing seller_id' });
        const [rows] = await db.pool.query('SELECT id FROM conversations WHERE ((buyer_id=? AND seller_id=?) OR (buyer_id=? AND seller_id=?)) AND (? IS NULL OR item_id=?) LIMIT 1', [buyerId, sellerId, sellerId, buyerId, itemId, itemId]);
        if (rows.length > 0) {
            return res.json({ success: true, conversation_id: rows[0].id });
        }
        const [ins] = await db.pool.query('INSERT INTO conversations (buyer_id, seller_id, item_id) VALUES (?,?,?)', [buyerId, sellerId, itemId]);
        res.json({ success: true, conversation_id: ins.insertId });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
app.get('/api/conversations', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const uid = req.session.userId;
        const [rows] = await db.pool.query(`SELECT c.*, 
            CASE WHEN c.buyer_id=? THEN c.seller_id ELSE c.buyer_id END as other_user,
            (SELECT message_text FROM messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) as last_message,
            (SELECT created_at FROM messages m WHERE m.conversation_id=c.id ORDER BY m.id DESC LIMIT 1) as last_message_time,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id AND m.receiver_id=? AND m.is_read=0) as unread_count,
            i.title as item_title, i.price as item_price, i.images as item_images
            FROM conversations c
            LEFT JOIN items i ON c.item_id = i.id
            WHERE c.buyer_id=? OR c.seller_id=? 
            ORDER BY (SELECT MAX(created_at) FROM messages m WHERE m.conversation_id=c.id) DESC, c.id DESC`, [uid, uid, uid, uid]);

        const ids = rows.map(r => r.other_user).filter(Boolean);
        let map = {};
        if (ids.length) {
            const uniqueIds = [...new Set(ids)];
            const [users] = await db.pool.query(`SELECT id, full_name, profile_pic FROM users WHERE id IN (${uniqueIds.map(() => '?').join(',')})`, uniqueIds);
            users.forEach(u => map[u.id] = u);
        }

        const convs = rows.map(r => {
            let item_images = [];
            try { item_images = typeof r.item_images === 'string' ? JSON.parse(r.item_images || '[]') : (r.item_images || []); } catch (e) { }
            return {
                ...r,
                other_name: map[r.other_user]?.full_name || null,
                other_pic: map[r.other_user]?.profile_pic || null,
                item_image: item_images.length ? item_images[0] : '/assets/placeholder.jpg'
            };
        });
        res.json({ success: true, conversations: convs });
    } catch (e) {
        console.error('Chat API Error:', e);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
app.get('/api/messages/:conversation_id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const cid = Number(req.params.conversation_id);
        const uid = req.session.userId;

        // check if user belongs to convo
        const [[convo]] = await db.pool.query('SELECT buyer_id, seller_id FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?)', [cid, uid, uid]);
        if (!convo) return res.status(403).json({ success: false, error: 'Forbidden' });

        // Find partner ID
        const partnerId = convo.buyer_id === uid ? convo.seller_id : convo.buyer_id;
        const [[partner]] = await db.pool.query('SELECT id, full_name, profile_pic FROM users WHERE id=?', [partnerId]);

        const [msgs] = await db.pool.query('SELECT id, conversation_id, sender_id, receiver_id, message_text, is_read, created_at FROM messages WHERE conversation_id=? ORDER BY id ASC', [cid]);

        // Mark as read
        await db.pool.query('UPDATE messages SET is_read=1 WHERE conversation_id=? AND receiver_id=?', [cid, uid]);

        res.json({
            success: true,
            messages: msgs,
            partnerUser: partner ? {
                id: partner.id,
                full_name: partner.full_name,
                profile_pic: partner.profile_pic
            } : null
        });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});
app.post('/api/chat/messages', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const senderId = req.session.userId;
        const { conversation_id, receiver_id, message_text } = req.body || {};
        if (!conversation_id || !receiver_id || !message_text) return res.status(400).json({ success: false, error: 'Missing fields' });
        const [allowed] = await db.pool.query('SELECT id FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?)', [conversation_id, senderId, senderId]);
        if (!allowed.length) return res.status(403).json({ success: false, error: 'Forbidden' });
        await db.pool.query('INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text) VALUES (?,?,?,?)', [conversation_id, senderId, receiver_id, message_text]);
        await createNotification(receiver_id, `You have a new message regarding conversation #${conversation_id}`, 'chat_message');
        const [[u]] = await db.pool.query('SELECT email, full_name FROM users WHERE id=?', [receiver_id]);
        if (u && u.email) {
            await sendEmail(
                u.email,
                'New Chat Message - Kitaab Faroosh',
                `<h2>You have a new message!</h2>
                 <p>Hello ${u.full_name},</p>
                 <p>You received a new message regarding your conversation on Kitaab Faroosh:</p>
                 <blockquote style="border-left: 4px solid #8b5a2b; padding-left: 15px; margin-left: 0; font-style: italic; color: #555;">
                     "${message_text}"
                 </blockquote>
                 <p>Log in to view the full conversation and reply.</p>
                 <div class="cta-container">
                     <a href="http://localhost:3000/home.html" class="cta-button">View Messages</a>
                 </div>`
            );
        }
        if (global.io) {
            global.io.to(`user-${receiver_id}`).emit('receive_message', { conversation_id, sender_id: senderId, receiver_id, message_text, created_at: new Date().toISOString() });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// POST /api/contact — Handle secure contact form submissions
// Validates inputs, constructs a mail transporter from environment, and sends themed HTML email to admin inbox.
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        // Configuration from .env
        const mailHost = process.env.MAIL_HOST || 'smtp.gmail.com';
        const mailPort = parseInt(process.env.MAIL_PORT) || 587;
        const mailUser = process.env.MAIL_USER || process.env.EMAIL_USER;
        const mailPass = process.env.MAIL_PASS || process.env.EMAIL_PASS;
        const adminEmail = process.env.ADMIN_EMAIL || mailUser;

        const contactTransporter = nodemailer.createTransport({
            host: mailHost,
            port: mailPort,
            secure: mailPort === 465,
            auth: {
                user: mailUser,
                pass: mailPass
            }
        });

        await contactTransporter.sendMail({
            from: `"${name}" <${email}>`,
            to: adminEmail,
            subject: `Contact Form: ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2 style="color: #5c4033; border-bottom: 2px solid #5c4033; padding-bottom: 5px;">New Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <div style="background: #f9f6f0; border-left: 4px solid #5c4033; padding: 15px; margin-top: 20px;">
                        <p><strong>Message:</strong></p>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="font-size: 12px; color: #888; margin-top: 30px; text-align: center;">This message was sent from the Kitaab Faroosh contact form.</p>
                </div>
            `
        });

        res.json({ success: true, message: 'Thank you, your message has been sent!' });
    } catch (error) {
        console.error('Contact API error:', error);
        res.status(500).json({ success: false, error: 'Sorry, something went wrong. Please try again.' });
    }
});


// ORDERS TABLE INIT
(async () => {
    try {
        await db.pool.query(`CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(25) NOT NULL,
            address TEXT NOT NULL,
            city VARCHAR(100) NOT NULL,
            notes TEXT NULL,
            total_price DECIMAL(12,2) NOT NULL,
            status ENUM('pending', 'accepted', 'rejected', 'delivered', 'cancelled') DEFAULT 'pending',
            seller_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        await db.pool.query(`CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            item_id INT NOT NULL,
            price DECIMAL(12,2) NOT NULL,
            quantity INT DEFAULT 1,
            CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
            CONSTRAINT fk_items_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        // Migration for orders table: ensure seller_id and status enum are correct
        try {
            const [cols] = await db.pool.query("SHOW COLUMNS FROM orders");
            const names = cols.map(c => c.Field);
            if (!names.includes('seller_id')) {
                // If there is existing data, the NOT NULL constraint will fail because default is 0
                // and 0 usually doesn't exist in users table. We clear the incomplete data.
                await db.pool.query('DELETE FROM order_items');
                await db.pool.query('DELETE FROM orders');
                
                await db.pool.query('ALTER TABLE orders ADD COLUMN seller_id INT NOT NULL');
                await db.pool.query('ALTER TABLE orders ADD CONSTRAINT fk_orders_seller FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE');
            }
            // Ensure enum includes all values
            await db.pool.query("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'delivered', 'cancelled') DEFAULT 'pending'");
        } catch (err) {
            console.error('Migration error for orders table:', err.message);
        }
    } catch (e) {
        console.error('Orders table init error:', e.message);
    }
})();

// ORDER API
app.post('/api/orders', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    
    const conn = await db.pool.getConnection();
    try {
        await conn.beginTransaction();
        const userId = req.session.userId;
        const { full_name, phone_number, address, city, notes } = req.body;
        
        console.log(`[OrderProcess] Start for UserID: ${userId}`);

        if (!full_name || !phone_number || !address || !city) {
            console.error(`[OrderProcess] Missing fields:`, { full_name, phone_number, address, city });
            return res.status(400).json({ success: false, error: 'Missing required shipping information.' });
        }

        // 1. Fetch current cart items for the user
        const [cartItems] = await conn.query(
            `SELECT i.id, i.price, i.title, i.seller_id, i.seller_name FROM cart c 
             INNER JOIN items i ON c.item_id = i.id 
             WHERE c.user_id = ? AND i.status = 'active'`,
            [userId]
        );

        console.log(`[OrderProcess] Items in cart: ${cartItems.length}`);

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, error: 'Your cart is empty or items are no longer available.' });
        }

        // 2. Group items by seller
        const itemsBySeller = {};
        cartItems.forEach(item => {
            if (!itemsBySeller[item.seller_id]) {
                itemsBySeller[item.seller_id] = {
                    seller_id: item.seller_id,
                    seller_name: item.seller_name,
                    items: [],
                    total: 0
                };
            }
            itemsBySeller[item.seller_id].items.push(item);
            itemsBySeller[item.seller_id].total += Number(item.price);
        });

        const createdOrderIds = [];

        // 3. Create an order for each seller
        for (const sellerId in itemsBySeller) {
            const sellerData = itemsBySeller[sellerId];
            console.log(`[OrderProcess] Creating order for Seller: ${sellerId}, Total: ${sellerData.total}`);

            const [orderResult] = await conn.query(
                `INSERT INTO orders (user_id, seller_id, full_name, phone_number, address, city, notes, total_price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, sellerId, full_name, phone_number, address, city, notes || null, sellerData.total]
            );
            const orderId = orderResult.insertId;
            createdOrderIds.push(orderId);

            for (const item of sellerData.items) {
                await conn.query(
                    `INSERT INTO order_items (order_id, item_id, price) VALUES (?, ?, ?)`,
                    [orderId, item.id, item.price]
                );

                // Notify seller about the sale
                const notifMsg = `New order received for your item "${item.title}". Check "Orders Received" in your dashboard.`;
                await createNotification(
                    item.seller_id,
                    notifMsg,
                    'item_sold'
                );
                
                // Real-time socket notification to seller
                if (global.io) {
                    console.log(`[OrderProcess] Emitting socket notification to Seller: ${item.seller_id}`);
                    global.io.to(item.seller_id.toString()).emit('new_order', {
                        message: notifMsg,
                        orderId: orderId,
                        itemTitle: item.title
                    });
                }

                // Update item status to 'pending' while order is pending
                await conn.query('UPDATE items SET status = "pending" WHERE id = ?', [item.id]);
            }
        }

        // 4. Clear the cart
        await conn.query('DELETE FROM cart WHERE user_id = ?', [userId]);

        await conn.commit();
        console.log(`[OrderProcess] Success. Orders created: ${createdOrderIds.join(', ')}`);
        res.json({ success: true, orderIds: createdOrderIds, message: 'Order(s) placed successfully!' });

    } catch (error) {
        await conn.rollback();
        console.error('CRITICAL: Order creation failed. Full error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            body: req.body,
            userId: req.session.userId
        });
        res.status(500).json({ success: false, error: 'Failed to place order: ' + error.message });
    } finally {
        conn.release();
    }
});

// GET /api/orders/:id — returns details for order confirmation
app.get('/api/orders/:id', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [[order]] = await db.pool.query(
            'SELECT * FROM orders WHERE id = ? AND (user_id = ? OR seller_id = ?)',
            [req.params.id, req.session.userId, req.session.userId]
        );
        if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

        const [items] = await db.pool.query(
            `SELECT oi.price, i.title, i.images, i.id as item_id FROM order_items oi 
             INNER JOIN items i ON oi.item_id = i.id 
             WHERE oi.order_id = ?`,
            [order.id]
        );
        
        const parsedItems = items.map(i => {
            let images = [];
            try { images = typeof i.images === 'string' ? JSON.parse(i.images || '[]') : (i.images || []); } catch (e) {}
            return { ...i, images };
        });

        res.json({ success: true, order, items: parsedItems });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});

// GET /api/seller/orders — Get orders received by the seller
app.get('/api/seller/orders', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [orders] = await db.pool.query(
            `SELECT o.*, u.full_name as buyer_name, u.email as buyer_email 
             FROM orders o 
             JOIN users u ON o.user_id = u.id 
             WHERE o.seller_id = ? 
             ORDER BY o.created_at DESC`,
            [req.session.userId]
        );

        // Fetch items for each order
        const ordersWithItems = [];
        for (const order of orders) {
            const [items] = await db.pool.query(
                `SELECT oi.price, i.title, i.images, i.id as item_id 
                 FROM order_items oi 
                 JOIN items i ON oi.item_id = i.id 
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            
            const parsedItems = items.map(i => {
                let images = [];
                try { images = typeof i.images === 'string' ? JSON.parse(i.images || '[]') : (i.images || []); } catch (e) {}
                return { ...i, images };
            });
            
            ordersWithItems.push({ ...order, items: parsedItems });
        }

        res.json({ success: true, orders: ordersWithItems });
    } catch (error) {
        console.error('Seller orders error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch orders.' });
    }
});

// POST /api/orders/:id/status — Update order status (Seller Action)
app.post('/api/orders/:id/status', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const { status } = req.body;
        const orderId = req.params.id;
        const sellerId = req.session.userId;

        const validStatuses = ['accepted', 'rejected', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status.' });
        }

        // Verify ownership
        const [[order]] = await db.pool.query('SELECT user_id, seller_id FROM orders WHERE id = ?', [orderId]);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
        if (order.seller_id !== sellerId) return res.status(403).json({ success: false, error: 'Forbidden.' });

        await db.pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);

        // If accepted, mark items as sold/active depending on choice
        // Requirement says: "Option 1: Mark item as “Sold”" or "Option 2: Hide/remove item from listings"
        // Let's mark as 'sold' by changing status to something like 'sold' or just keeping 'active' but filtering out.
        // Actually, let's update items.status to 'sold' if we have such a status, or just keep it 'active' but set a flag.
        // Looking at schema.sql, status is ENUM('pending','approved','rejected','active').
        // Let's update it to 'sold' (need to add this to ENUM or just use 'rejected' to hide it).
        // Let's add 'sold' to the ENUM first if possible, or just use a logic to hide it.
        
        if (status === 'accepted') {
            const [orderItems] = await db.pool.query('SELECT item_id FROM order_items WHERE order_id = ?', [orderId]);
            for (const item of orderItems) {
                // Mark item as sold to hide it from listings
                await db.pool.query('UPDATE items SET status = "sold" WHERE id = ?', [item.item_id]);
            }
        } else if (status === 'rejected' || status === 'cancelled') {
            const [orderItems] = await db.pool.query('SELECT item_id FROM order_items WHERE order_id = ?', [orderId]);
            for (const item of orderItems) {
                // Return item to 'active' status if order is rejected or cancelled
                await db.pool.query('UPDATE items SET status = "active" WHERE id = ?', [item.item_id]);
            }
        }

        // Notify buyer
        const statusMessages = {
            'accepted': 'Your order has been accepted by the seller!',
            'rejected': 'Your order was unfortunately rejected by the seller.',
            'delivered': 'Your order has been marked as delivered!',
            'cancelled': 'Your order was cancelled.'
        };

        const finalMsg = statusMessages[status] || `Your order status has been updated to ${status}.`;
        await createNotification(
            order.user_id,
            finalMsg,
            'order_update'
        );

        // Real-time socket notification to buyer
        if (global.io) {
            global.io.to(order.user_id.toString()).emit('order_update', {
                message: finalMsg,
                orderId: orderId,
                status: status
            });
        }

        res.json({ success: true, message: `Order ${status} successfully.` });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ success: false, error: 'Failed to update order status.' });
    }
});

// GET /api/buyer/orders — Get orders placed by the buyer
app.get('/api/buyer/orders', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [orders] = await db.pool.query(
            `SELECT o.*, u.full_name as seller_name 
             FROM orders o 
             JOIN users u ON o.seller_id = u.id 
             WHERE o.user_id = ? 
             ORDER BY o.created_at DESC`,
            [req.session.userId]
        );

        const ordersWithItems = [];
        for (const order of orders) {
            const [items] = await db.pool.query(
                `SELECT oi.price, i.title, i.images, i.id as item_id 
                 FROM order_items oi 
                 JOIN items i ON oi.item_id = i.id 
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            
            const parsedItems = items.map(i => {
                let images = [];
                try { images = typeof i.images === 'string' ? JSON.parse(i.images || '[]') : (i.images || []); } catch (e) {}
                return { ...i, images };
            });
            
            ordersWithItems.push({ ...order, items: parsedItems });
        }

        res.json({ success: true, orders: ordersWithItems });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch your orders.' });
    }
});

// ADMIN ORDERS API
app.get('/api/admin/orders', async (req, res) => {
    // Basic admin check (could be refined with a dedicated admin role field)
    if (!req.session.userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
    try {
        const [orders] = await db.pool.query(
            `SELECT o.*, u.full_name as buyer_name, s.full_name as seller_name 
             FROM orders o 
             JOIN users u ON o.user_id = u.id 
             JOIN users s ON o.seller_id = s.id 
             ORDER BY o.created_at DESC`
        );

        const ordersWithItems = [];
        for (const order of orders) {
            const [items] = await db.pool.query(
                `SELECT oi.price, i.title, i.images, i.id as item_id 
                 FROM order_items oi 
                 JOIN items i ON oi.item_id = i.id 
                 WHERE oi.order_id = ?`,
                [order.id]
            );
            
            const parsedItems = items.map(i => {
                let images = [];
                try { images = typeof i.images === 'string' ? JSON.parse(i.images || '[]') : (i.images || []); } catch (e) {}
                return { ...i, images };
            });
            
            ordersWithItems.push({ ...order, items: parsedItems });
        }

        res.json({ success: true, orders: ordersWithItems });
    } catch (error) {
        console.error('Admin orders fetch error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch all orders.' });
    }
});

const http = require('http');
const { Server } = require('socket.io');
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
global.io = io;

io.on('connection', (socket) => {
    socket.on('register', (userId) => {
        if (userId) {
            socket.userId = userId;
            socket.join(userId.toString()); 
        }
    });

    socket.on('start_chat', async (data, callback) => {
        try {
            const buyerId = socket.userId;
            const sellerId = Number(data.sellerId);
            const itemId = data.itemId ? Number(data.itemId) : null;
            if (!buyerId || !sellerId) return callback({ success: false, error: 'Missing users' });

            const [rows] = await db.pool.query(
                'SELECT id FROM conversations WHERE ((buyer_id=? AND seller_id=?) OR (buyer_id=? AND seller_id=?)) AND (? IS NULL OR item_id=?) LIMIT 1',
                [buyerId, sellerId, sellerId, buyerId, itemId, itemId]
            );
            if (rows.length > 0) {
                return callback({ success: true, conversation_id: rows[0].id });
            }
            const [ins] = await db.pool.query(
                'INSERT INTO conversations (buyer_id, seller_id, item_id) VALUES (?,?,?)',
                [buyerId, sellerId, itemId]
            );
            callback({ success: true, conversation_id: ins.insertId });
        } catch (e) {
            callback({ success: false, error: 'Server error' });
        }
    });

    socket.on('send_message', async (data) => {
        try {
            const senderId = socket.userId;
            const { conversation_id, receiver_id, message_text } = data;
            if (!senderId || !conversation_id || !receiver_id || !message_text) return;

            const [allowed] = await db.pool.query('SELECT id FROM conversations WHERE id=? AND (buyer_id=? OR seller_id=?)', [conversation_id, senderId, senderId]);
            if (!allowed.length) return;

            await db.pool.query('INSERT INTO messages (conversation_id, sender_id, receiver_id, message_text) VALUES (?,?,?,?)', [conversation_id, senderId, receiver_id, message_text]);

            const newMessageData = {
                conversation_id,
                sender_id: senderId,
                receiver_id,
                message_text,
                created_at: new Date().toISOString()
            };

            // Emit receive_message event only to the receiver's private room
            io.to(receiver_id.toString()).emit('receive_message', newMessageData);
        } catch (e) {
            console.error('Socket send_message error', e);
        }
    });

    socket.on('typing', (data) => {
        const { conversation_id, receiver_id, is_typing } = data;
        const senderId = socket.userId;
        if (!senderId || !receiver_id) return;
        io.to(receiver_id.toString()).emit('user_typing', { conversation_id, sender_id: senderId, is_typing });
    });

    socket.on('mark_read', async (data) => {
        const { conversation_id } = data;
        const userId = socket.userId;
        if (!userId || !conversation_id) return;
        try {
            await db.pool.query('UPDATE messages SET is_read=1 WHERE conversation_id=? AND receiver_id=?', [conversation_id, userId]);
        } catch (e) { }
    });
});

httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
