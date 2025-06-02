const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const initDatabase = require(path.join(__dirname, 'config', 'init-db'));
const User = require(path.join(__dirname, 'models', 'User'));

const UPLOAD_KEY = process.env.UPLOAD_KEY;
if (!UPLOAD_KEY) {
    throw new Error('UPLOAD_KEY environment variable is required');
}

const generateUploadToken = (userId) => {
    const expireTimestamp = Math.floor(Date.now() / 1000) + 900;
    const message = 'tk' + userId + expireTimestamp;
    const hmac = crypto.createHmac('sha256', UPLOAD_KEY)
        .update(message)
        .digest('hex');
    return `${userId}.${expireTimestamp}.${hmac}`;
};

const app = express(); 

app.use(session({
    secret: crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);

const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/upload', requireAuth, (req, res) => {
    const uploadToken = generateUploadToken(req.session.userId);
    res.render('upload', { uploadToken });
});

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 8) {
        return res.status(400).json({ error: 'Username must be at least 8 characters long' });
    }

    if (password.length < 12) {
        return res.status(400).json({ error: 'Password must be at least 12 characters long' });
    }

    try {
        const existingUser = await User.findOne({
            where: { username }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            password: hashedPassword
        });
        
        res.json({ 
            message: 'Registration successful',
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// this part is not implemented yet, but uploading works fine so we're ready to go
app.get('/api/files', requireAuth, (req, res) => {
    res.json({
        message: 'not implemented'
    });
});

app.post('/api/files/:uuid', requireAuth, (req, res) => {
    res.json({
        message: 'not implemented'
    });
});

let port = 4000;

initDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Webapp working on port ${port}`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
});