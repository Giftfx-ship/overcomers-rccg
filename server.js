// ============================================================
// RCCG OVERCOMERS HOC - COMPLETE SERVER
// Parish: Oke Ado, Old Stadium Road, Ogbomoso, Oyo State
// ============================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to RCCG Overcomers DB'))
.catch(err => console.error('❌ MongoDB Error:', err));

// File Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
    }
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'video/mp4'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type'), false);
    }
});

// ============================================================
// MODELS
// ============================================================

// User
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin' }
});
const User = mongoose.model('User', UserSchema);

// Sermon
const SermonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    preacher: { type: String, required: true },
    date: { type: Date, default: Date.now },
    description: String,
    audioUrl: String,
    videoUrl: String,
    pdfUrl: String,
    imageUrl: String,
    featured: { type: Boolean, default: false },
    views: { type: Number, default: 0 }
}, { timestamps: true });
const Sermon = mongoose.model('Sermon', SermonSchema);

// Event
const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    time: String,
    location: String,
    description: String,
    imageUrl: String,
    category: { type: String, enum: ['worship', 'youth', 'community', 'prayer', 'other'], default: 'other' }
}, { timestamps: true });
const Event = mongoose.model('Event', EventSchema);

// Media
const MediaSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['photo', 'video', 'audio', 'document'], required: true },
    url: { type: String, required: true },
    thumbnail: String,
    description: String,
    featured: { type: Boolean, default: false }
}, { timestamps: true });
const Media = mongoose.model('Media', MediaSchema);

// Testimony
const TestimonySchema = new mongoose.Schema({
    name: { type: String, required: true },
    testimony: { type: String, required: true },
    date: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false }
}, { timestamps: true });
const Testimony = mongoose.model('Testimony', TestimonySchema);

// Prayer Request
const PrayerRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: String,
    request: { type: String, required: true },
    prayed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
}, { timestamps: true });
const PrayerRequest = mongoose.model('PrayerRequest', PrayerRequestSchema);

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Please authenticate' });
    }
};

// ============================================================
// INIT ADMIN USER (from .env)
// ============================================================
const initAdmin = async () => {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const adminExists = await User.findOne({ username: adminUsername });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await User.create({ username: adminUsername, password: hashedPassword });
        console.log(`✅ Admin created - username: ${adminUsername}, password: ${adminPassword}`);
    }
};
initAdmin();

// ============================================================
// API ROUTES
// ============================================================

// ----- AUTH -----
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            username: user.username,
            message: 'Login successful'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/verify', authMiddleware, async (req, res) => {
    res.json({ valid: true, username: req.user.username });
});

// ----- DASHBOARD STATS -----
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
    try {
        const [sermons, events, media, testimonies, prayers] = await Promise.all([
            Sermon.countDocuments(),
            Event.countDocuments(),
            Media.countDocuments(),
            Testimony.countDocuments(),
            PrayerRequest.countDocuments()
        ]);
        res.json({ sermons, events, media, testimonies, prayers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- SERMONS -----
app.get('/api/sermons', async (req, res) => {
    try {
        const sermons = await Sermon.find().sort({ date: -1 });
        res.json(sermons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sermons/featured', async (req, res) => {
    try {
        const sermon = await Sermon.findOne({ featured: true }).sort({ date: -1 });
        res.json(sermon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sermons/:id', async (req, res) => {
    try {
        const sermon = await Sermon.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );
        if (!sermon) return res.status(404).json({ error: 'Sermon not found' });
        res.json(sermon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/sermons', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const sermon = await Sermon.create(data);
        res.status(201).json(sermon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/sermons/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const sermon = await Sermon.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!sermon) return res.status(404).json({ error: 'Sermon not found' });
        res.json(sermon);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/sermons/:id', authMiddleware, async (req, res) => {
    try {
        await Sermon.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sermon deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- EVENTS -----
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/events/upcoming', async (req, res) => {
    try {
        const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(4);
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/events', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const event = await Event.create(data);
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/events/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const event = await Event.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/events/:id', authMiddleware, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- MEDIA -----
app.get('/api/media', async (req, res) => {
    try {
        const media = await Media.find().sort({ createdAt: -1 });
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/media', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.url = '/uploads/' + req.file.filename;
        const media = await Media.create(data);
        res.status(201).json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/media/:id', authMiddleware, async (req, res) => {
    try {
        await Media.findByIdAndDelete(req.params.id);
        res.json({ message: 'Media deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- TESTIMONIES -----
app.get('/api/testimonies', async (req, res) => {
    try {
        const testimonies = await Testimony.find({ approved: true }).sort({ date: -1 });
        res.json(testimonies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/testimonies', async (req, res) => {
    try {
        const testimony = await Testimony.create(req.body);
        res.status(201).json({ message: 'Testimony submitted for approval' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/testimonies', authMiddleware, async (req, res) => {
    try {
        const testimonies = await Testimony.find().sort({ date: -1 });
        res.json(testimonies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/testimonies/:id', authMiddleware, async (req, res) => {
    try {
        const testimony = await Testimony.findByIdAndUpdate(
            req.params.id,
            { approved: true },
            { new: true }
        );
        if (!testimony) return res.status(404).json({ error: 'Testimony not found' });
        res.json(testimony);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/testimonies/:id', authMiddleware, async (req, res) => {
    try {
        await Testimony.findByIdAndDelete(req.params.id);
        res.json({ message: 'Testimony deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- PRAYER REQUESTS -----
app.post('/api/prayer-requests', async (req, res) => {
    try {
        const prayer = await PrayerRequest.create(req.body);
        res.status(201).json({ message: 'Prayer request submitted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/prayer-requests', authMiddleware, async (req, res) => {
    try {
        const prayers = await PrayerRequest.find().sort({ date: -1 });
        res.json(prayers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/prayer-requests/:id', authMiddleware, async (req, res) => {
    try {
        const prayer = await PrayerRequest.findByIdAndUpdate(
            req.params.id,
            { prayed: true },
            { new: true }
        );
        if (!prayer) return res.status(404).json({ error: 'Prayer request not found' });
        res.json(prayer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/prayer-requests/:id', authMiddleware, async (req, res) => {
    try {
        await PrayerRequest.findByIdAndDelete(req.params.id);
        res.json({ message: 'Prayer request deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ----- FILE UPLOAD (General) -----
app.post('/api/admin/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        res.json({ url: '/uploads/' + req.file.filename });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// SERVE HTML PAGES
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/sermons', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sermons.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'events.html'));
});

app.get('/media', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'media.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════╗
    ║  🏛️  RCCG OVERCOMERS HOC                                ║
    ║  📍 Oke Ado, Old Stadium Road, Ogbomoso, Oyo State     ║
    ║  🌐 http://localhost:${PORT}                            ║
    ║  🔑 Admin Login: ${process.env.ADMIN_USERNAME}          ║
    ║  🔐 Admin Password: ${process.env.ADMIN_PASSWORD}       ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});