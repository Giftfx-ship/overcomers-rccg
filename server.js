// ============================================================
// RCCG OVERCOMERS HOC - COMPLETE SERVER
// Parish: Oke Ado, Old Stadium Road, Ogbomoso, Oyo State
// Single Database (Simplified - NO SSL ERRORS!)
// Developed by Dev Gift Team
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

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));

console.log('🚀 RCCG Overcomers HOC Server Starting...');

// ============================================================
// SINGLE MONGODB CONNECTION
// ============================================================

console.log('📊 Connecting to Database...');
const db = mongoose.createConnection(process.env.MONGODB_URI_MAIN, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
});

db.on('connected', () => {
    console.log('✅ Database Connected Successfully!');
    console.log('📊 Using Database: admin');
    initAdmin();
    initSocialLinks();
});

db.on('error', (err) => {
    console.error('❌ Database Error:', err.message);
});

// ============================================================
// MODELS - ALL IN ONE DATABASE
// ============================================================

// User
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = db.model('User', UserSchema);

// Social Links
const SocialLinksSchema = new mongoose.Schema({
    platform: { type: String, required: true, unique: true },
    url: { type: String, default: '' },
    icon: { type: String, required: true },
    active: { type: Boolean, default: true }
}, { timestamps: true });
const SocialLink = db.model('SocialLink', SocialLinksSchema);

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
const Sermon = db.model('Sermon', SermonSchema);

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
const Event = db.model('Event', EventSchema);

// Testimony
const TestimonySchema = new mongoose.Schema({
    name: { type: String, required: true },
    testimony: { type: String, required: true },
    date: { type: Date, default: Date.now },
    approved: { type: Boolean, default: false }
}, { timestamps: true });
const Testimony = db.model('Testimony', TestimonySchema);

// Prayer Request
const PrayerRequestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: String,
    request: { type: String, required: true },
    prayed: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
}, { timestamps: true });
const PrayerRequest = db.model('PrayerRequest', PrayerRequestSchema);

// Prayer for the Week
const PrayerWeekSchema = new mongoose.Schema({
    title: { type: String, required: true },
    prayer: { type: String, required: true },
    bibleVerse: String,
    date: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
}, { timestamps: true });
const PrayerWeek = db.model('PrayerWeek', PrayerWeekSchema);

// Open Heaven
const OpenHeavenSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    bibleReading: String,
    memoryVerse: String,
    prayer: String,
    date: { type: Date, default: Date.now },
    featured: { type: Boolean, default: false }
}, { timestamps: true });
const OpenHeaven = db.model('OpenHeaven', OpenHeavenSchema);

// Face of the Week
const FaceOfWeekSchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String, required: true },
    words: { type: String, required: true },
    imageUrl: { type: String, required: true },
    date: { type: Date, default: Date.now },
    active: { type: Boolean, default: true }
}, { timestamps: true });
const FaceOfWeek = db.model('FaceOfWeek', FaceOfWeekSchema);

// Sunday School
const SundaySchoolSchema = new mongoose.Schema({
    title: { type: String, required: true },
    teacher: { type: String, required: true },
    date: { type: Date, default: Date.now },
    description: String,
    bibleReading: String,
    memoryVerse: String,
    imageUrl: String,
    featured: { type: Boolean, default: false }
}, { timestamps: true });
const SundaySchool = db.model('SundaySchool', SundaySchoolSchema);

// Media (Stored in same database now)
const MediaSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['photo', 'video', 'audio'], required: true },
    url: { type: String, required: true },
    thumbnail: String,
    description: String,
    featured: { type: Boolean, default: false },
    fileSize: Number,
    mimeType: String
}, { timestamps: true });
const Media = db.model('Media', MediaSchema);

// ============================================================
// FILE UPLOAD CONFIG
// ============================================================
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
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/webm'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type'), false);
    }
});

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
// INIT ADMIN USER & SOCIAL LINKS
// ============================================================
const initAdmin = async () => {
    try {
        const adminUsername = process.env.ADMIN_USERNAME || 'devgift';
        const adminPassword = process.env.ADMIN_PASSWORD || 'mide';

        const adminExists = await User.findOne({ username: adminUsername });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await User.create({ username: adminUsername, password: hashedPassword });
            console.log(`✅ Admin created - username: ${adminUsername}`);
        } else {
            console.log('✅ Admin already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    }
};

const initSocialLinks = async () => {
    try {
        const defaultLinks = [
            { platform: 'facebook', url: 'https://facebook.com/rccgovercomers', icon: 'fab fa-facebook', active: true },
            { platform: 'youtube', url: 'https://youtube.com/rccgovercomers', icon: 'fab fa-youtube', active: true },
            { platform: 'instagram', url: 'https://instagram.com/rccgovercomers', icon: 'fab fa-instagram', active: true },
            { platform: 'whatsapp', url: 'https://wa.me/2348000000000', icon: 'fab fa-whatsapp', active: true },
            { platform: 'twitter', url: 'https://twitter.com/rccgovercomers', icon: 'fab fa-twitter', active: true }
        ];

        for (const link of defaultLinks) {
            const exists = await SocialLink.findOne({ platform: link.platform });
            if (!exists) {
                await SocialLink.create(link);
                console.log(`✅ Social link created: ${link.platform}`);
            }
        }
        console.log('✅ All social links initialized');
    } catch (error) {
        console.error('❌ Error creating social links:', error.message);
    }
};

// ============================================================
// API ROUTES - AUTH
// ============================================================
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/verify', authMiddleware, (req, res) => {
    res.json({ valid: true, username: req.user.username });
});

// ============================================================
// API ROUTES - SOCIAL LINKS
// ============================================================
app.get('/api/social-links', async (req, res) => {
    try {
        const links = await SocialLink.find({ active: true });
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/social-links', authMiddleware, async (req, res) => {
    try {
        const links = await SocialLink.find().sort({ platform: 1 });
        res.json(links);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/social-links/:id', authMiddleware, async (req, res) => {
    try {
        const link = await SocialLink.findByIdAndUpdate(
            req.params.id,
            { url: req.body.url, active: req.body.active },
            { new: true }
        );
        if (!link) return res.status(404).json({ error: 'Social link not found' });
        res.json(link);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// API ROUTES - DASHBOARD STATS
// ============================================================
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
    try {
        const [sermons, events, media, testimonies, prayers, prayerWeek, openHeaven, faceOfWeek, sundaySchool] = await Promise.all([
            Sermon.countDocuments(),
            Event.countDocuments(),
            Media.countDocuments(),
            Testimony.countDocuments(),
            PrayerRequest.countDocuments(),
            PrayerWeek.countDocuments(),
            OpenHeaven.countDocuments(),
            FaceOfWeek.countDocuments(),
            SundaySchool.countDocuments()
        ]);
        res.json({ sermons, events, media, testimonies, prayers, prayerWeek, openHeaven, faceOfWeek, sundaySchool });
    } catch (error) {
        console.error('❌ Stats error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// API ROUTES - SERMONS
// ============================================================
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

// ============================================================
// API ROUTES - EVENTS
// ============================================================
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

// ============================================================
// API ROUTES - MEDIA
// ============================================================
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
        if (req.file) {
            data.url = '/uploads/' + req.file.filename;
            data.fileSize = req.file.size;
            data.mimeType = req.file.mimetype;
            if (req.file.mimetype.startsWith('image/')) data.type = 'photo';
            else if (req.file.mimetype.startsWith('video/')) data.type = 'video';
            else if (req.file.mimetype.startsWith('audio/')) data.type = 'audio';
        }
        const media = await Media.create(data);
        res.status(201).json(media);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/media/:id', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) {
            data.url = '/uploads/' + req.file.filename;
            data.fileSize = req.file.size;
            data.mimeType = req.file.mimetype;
            if (req.file.mimetype.startsWith('image/')) data.type = 'photo';
            else if (req.file.mimetype.startsWith('video/')) data.type = 'video';
            else if (req.file.mimetype.startsWith('audio/')) data.type = 'audio';
        }
        const media = await Media.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!media) return res.status(404).json({ error: 'Media not found' });
        res.json(media);
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

// ============================================================
// API ROUTES - TESTIMONIES
// ============================================================
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

// ============================================================
// API ROUTES - PRAYER REQUESTS
// ============================================================
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

// ============================================================
// API ROUTES - PRAYER FOR THE WEEK
// ============================================================
app.get('/api/prayer-week', async (req, res) => {
    try {
        const prayer = await PrayerWeek.findOne({ active: true }).sort({ date: -1 });
        res.json(prayer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/prayer-week', authMiddleware, async (req, res) => {
    try {
        const prayers = await PrayerWeek.find().sort({ date: -1 });
        res.json(prayers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/prayer-week', authMiddleware, async (req, res) => {
    try {
        await PrayerWeek.updateMany({ active: true }, { active: false });
        const prayer = await PrayerWeek.create(req.body);
        res.status(201).json(prayer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/prayer-week/:id', authMiddleware, async (req, res) => {
    try {
        const prayer = await PrayerWeek.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!prayer) return res.status(404).json({ error: 'Prayer not found' });
        res.json(prayer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/prayer-week/:id', authMiddleware, async (req, res) => {
    try {
        await PrayerWeek.findByIdAndDelete(req.params.id);
        res.json({ message: 'Prayer deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// API ROUTES - OPEN HEAVEN
// ============================================================
app.get('/api/open-heaven', async (req, res) => {
    try {
        const openHeaven = await OpenHeaven.findOne({ featured: true }).sort({ date: -1 });
        res.json(openHeaven);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/open-heaven/all', async (req, res) => {
    try {
        const openHeaven = await OpenHeaven.find().sort({ date: -1 });
        res.json(openHeaven);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/open-heaven', authMiddleware, async (req, res) => {
    try {
        const openHeaven = await OpenHeaven.find().sort({ date: -1 });
        res.json(openHeaven);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/open-heaven', authMiddleware, async (req, res) => {
    try {
        if (req.body.featured) {
            await OpenHeaven.updateMany({ featured: true }, { featured: false });
        }
        const openHeaven = await OpenHeaven.create(req.body);
        res.status(201).json(openHeaven);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/open-heaven/:id', authMiddleware, async (req, res) => {
    try {
        if (req.body.featured) {
            await OpenHeaven.updateMany({ featured: true }, { featured: false });
        }
        const openHeaven = await OpenHeaven.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!openHeaven) return res.status(404).json({ error: 'Open Heaven not found' });
        res.json(openHeaven);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/open-heaven/:id', authMiddleware, async (req, res) => {
    try {
        await OpenHeaven.findByIdAndDelete(req.params.id);
        res.json({ message: 'Open Heaven deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// API ROUTES - FACE OF THE WEEK
// ============================================================
app.get('/api/face-of-week', async (req, res) => {
    try {
        const face = await FaceOfWeek.findOne({ active: true }).sort({ date: -1 });
        res.json(face);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/face-of-week', authMiddleware, async (req, res) => {
    try {
        const faces = await FaceOfWeek.find().sort({ date: -1 });
        res.json(faces);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/face-of-week', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        await FaceOfWeek.updateMany({ active: true }, { active: false });
        const face = await FaceOfWeek.create(data);
        res.status(201).json(face);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/face-of-week/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const face = await FaceOfWeek.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!face) return res.status(404).json({ error: 'Face not found' });
        res.json(face);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/face-of-week/:id', authMiddleware, async (req, res) => {
    try {
        await FaceOfWeek.findByIdAndDelete(req.params.id);
        res.json({ message: 'Face deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// API ROUTES - SUNDAY SCHOOL
// ============================================================
app.get('/api/sunday-school', async (req, res) => {
    try {
        const sundaySchool = await SundaySchool.find().sort({ date: -1 });
        res.json(sundaySchool);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sunday-school/featured', async (req, res) => {
    try {
        const sundaySchool = await SundaySchool.findOne({ featured: true }).sort({ date: -1 });
        res.json(sundaySchool);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/sunday-school', authMiddleware, async (req, res) => {
    try {
        const sundaySchool = await SundaySchool.find().sort({ date: -1 });
        res.json(sundaySchool);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/sunday-school', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const sundaySchool = await SundaySchool.create(data);
        res.status(201).json(sundaySchool);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/admin/sunday-school/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const data = JSON.parse(req.body.data || '{}');
        if (req.file) data.imageUrl = '/uploads/' + req.file.filename;
        const sundaySchool = await SundaySchool.findByIdAndUpdate(req.params.id, data, { new: true });
        if (!sundaySchool) return res.status(404).json({ error: 'Sunday School not found' });
        res.json(sundaySchool);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/admin/sunday-school/:id', authMiddleware, async (req, res) => {
    try {
        await SundaySchool.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sunday School deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// FILE UPLOAD (General)
// ============================================================
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
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/sermons', (req, res) => {
    res.sendFile(path.join(__dirname, 'sermons.html'));
});

app.get('/events', (req, res) => {
    res.sendFile(path.join(__dirname, 'events.html'));
});

app.get('/media', (req, res) => {
    res.sendFile(path.join(__dirname, 'media.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/sunday-school', (req, res) => {
    res.sendFile(path.join(__dirname, 'sunday-school.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Catch-all route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
    ║  🔒 Admin: http://localhost:${PORT}/admin               ║
    ║  💾 Single Database: admin (Simplified!)               ║
    ║  👨‍💻 Developed by Dev Gift Team                         ║
    ╚══════════════════════════════════════════════════════════╝
    `);
});
