const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Brevo SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.BREVO_SMTP_KEY
    }
});

// Відправка листа підтвердження
async function sendVerificationEmail(email, token) {
    const baseUrl = process.env.BASE_URL || 'https://aerospread-pro.onrender.com';
    const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    await transporter.sendMail({
        from: 'AeroSpread Pro <aerospread@gmail.com>',
        to: email,
        subject: 'Підтвердження реєстрації — AeroSpread Pro',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px;">
                <div style="background: #0a0e1a; padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="color: #00d4ff; margin: 0; font-size: 24px;">AeroSpread Pro</h1>
                    <p style="color: #aaa; margin-top: 5px; font-size: 12px;">Моделювання розповсюдження атмосферних забруднень</p>
                </div>
                <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #1a1a2e;">Підтвердіть вашу електронну пошту</h2>
                    <p style="color: #555; line-height: 1.6;">
                        Дякуємо за реєстрацію в AeroSpread Pro!<br>
                        Натисніть кнопку нижче щоб активувати ваш акаунт.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyUrl}" 
                           style="background: linear-gradient(135deg, #00d4ff, #0099cc); 
                                  color: #0a0e1a; padding: 14px 32px; 
                                  text-decoration: none; border-radius: 8px; 
                                  font-weight: bold; font-size: 16px; display: inline-block;">
                            ✅ Підтвердити акаунт
                        </a>
                    </div>
                    <p style="color: #999; font-size: 13px;">
                        Посилання дійсне 24 години.<br>
                        Якщо ви не реєструвались — просто ігноруйте цей лист.
                    </p>
                </div>
            </div>
        `
    });
}

// Реєстрація нового користувача
router.post('/register', async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                error: 'Всі поля обов\'язкові для заповнення'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Пароль повинен містити мінімум 6 символів'
            });
        }

        // Перевірка чи користувач вже існує
        const userExists = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({
                error: 'Користувач з таким email вже існує'
            });
        }

        // Хешування паролю
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Створення користувача (не активований)
        const result = await db.query(
            `INSERT INTO users (full_name, email, password_hash, is_verified)
             VALUES ($1, $2, $3, false)
             RETURNING id, full_name, email, created_at`,
            [full_name, email, password_hash]
        );

        const user = result.rows[0];

        // Генерація токена підтвердження
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 години

        await db.query(
            `INSERT INTO email_verifications (user_id, token, expires_at)
             VALUES ($1, $2, $3)`,
            [user.id, token, expiresAt]
        );

        // Відправка листа
        try {
            await sendVerificationEmail(email, token);
            console.log('✅ Лист відправлено на:', email);
        } catch (mailError) {
            console.error('❌ Помилка відправки листа:', mailError.message);
        }

        res.status(201).json({
            message: 'Реєстрація успішна! Перевірте вашу пошту для підтвердження акаунту.',
            email: email
        });

    } catch (error) {
        console.error('Помилка реєстрації:', error);
        res.status(500).json({
            error: 'Помилка сервера при реєстрації'
        });
    }
});

// Підтвердження email
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).send(errorPage('Токен не вказано'));
        }

        // Знаходимо токен
        const result = await db.query(
            `SELECT ev.*, u.email FROM email_verifications ev
             JOIN users u ON ev.user_id = u.id
             WHERE ev.token = $1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).send(errorPage('Посилання недійсне або вже використане'));
        }

        const verification = result.rows[0];

        // Перевірка терміну дії
        if (new Date() > new Date(verification.expires_at)) {
            return res.status(400).send(errorPage('Посилання застаріло. Зареєструйтесь знову.'));
        }

        // Активуємо акаунт
        await db.query(
            'UPDATE users SET is_verified = true WHERE id = $1',
            [verification.user_id]
        );

        // Видаляємо токен
        await db.query(
            'DELETE FROM email_verifications WHERE token = $1',
            [token]
        );

        // Редірект на сторінку входу з повідомленням
        res.redirect('/?verified=true');

    } catch (error) {
        console.error('Помилка підтвердження:', error);
        res.status(500).send(errorPage('Помилка сервера'));
    }
});

function errorPage(message) {
    return `
        <html><body style="font-family:Arial;text-align:center;padding:50px;background:#0a0e1a;color:white;">
            <h2 style="color:#ff4757">❌ ${message}</h2>
            <a href="/" style="color:#00d4ff">← Повернутись на сайт</a>
        </body></html>
    `;
}

// Вхід користувача
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email та пароль обов\'язкові'
            });
        }

        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'Невірний email або пароль'
            });
        }

        const user = result.rows[0];

        // Перевірка підтвердження email
        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Будь ласка, підтвердіть вашу електронну пошту перед входом'
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Невірний email або пароль'
            });
        }

        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        const token = jwt.sign(
            { id: user.id, email: user.email, full_name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Вхід успішний',
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                last_login: user.last_login
            },
            token
        });

    } catch (error) {
        console.error('Помилка входу:', error.message);
        res.status(500).json({
            error: 'Помилка сервера при вході',
            message: error.message
        });
    }
});

// Отримання профілю
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, full_name, email, created_at, last_login
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Користувача не знайдено' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Помилка отримання профілю:', error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// Перевірка токена
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;
