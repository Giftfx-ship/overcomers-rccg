// ============================================
// RCCG OVERCOMERS HOC - COMPLETE PROFESSIONAL SERVER
// ============================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(cors({
  origin: '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// SERVE STATIC FILES - FIXED FOR ROOT FILES
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ IMPORTANT: Serve files from root directory
app.use(express.static(__dirname));

// Also serve from public folder if it exists (for future use)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// DATABASE CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rccg_overcomers';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// ============================================
// FILE UPLOAD SETUP
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/';
    if (file.mimetype.startsWith('image/')) folder += 'images/';
    else if (file.mimetype.startsWith('audio/')) folder += 'audio/';
    else if (file.mimetype.startsWith('video/')) folder += 'video/';
    else folder += 'others/';
    
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/webm', 'video/ogg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, and video are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter
});

// ============================================
// DATABASE MODELS
// ============================================

// Helper: Update timestamps
const updateTimestamps = function(next) {
  this.updatedAt = new Date();
  next();
};

// 1. ADMIN MODEL
const AdminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  password: { 
    type: String, 
    required: true,
    select: false
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true
  },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'editor'], 
    default: 'admin' 
  },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 2. SERMON MODEL
const SermonSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  topic: { 
    type: String,
    trim: true,
    maxlength: 200
  },
  preacher: { 
    type: String, 
    required: true,
    trim: true
  },
  preacherTitle: { 
    type: String,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 5000
  },
  messageText: { 
    type: String,
    trim: true,
    maxlength: 50000
  },
  mainScripture: { 
    type: String,
    trim: true
  },
  otherScriptures: [{ type: String }],
  date: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  audioUrl: { type: String },
  videoUrl: { type: String },
  imageUrl: { type: String },
  pdfUrl: { type: String },
  featured: { 
    type: Boolean, 
    default: false,
    index: true
  },
  category: { 
    type: String,
    enum: ['Sunday Service', 'Midweek Service', 'Prayer Meeting', 'Youth Service', 'Conference', 'Revival', 'Other'],
    default: 'Sunday Service'
  },
  series: { 
    type: String,
    trim: true
  },
  seriesNumber: { type: Number },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  duration: { type: String },
  tags: [{ type: String }],
  isPublished: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SermonSchema.pre('save', updateTimestamps);

// 3. EVENT MODEL
const EventSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 5000
  },
  shortDescription: { 
    type: String,
    trim: true,
    maxlength: 300
  },
  date: { 
    type: Date, 
    required: true,
    index: true
  },
  endDate: { type: Date },
  time: { type: String },
  endTime: { type: String },
  location: { 
    type: String,
    required: true
  },
  venue: { type: String },
  category: { 
    type: String, 
    enum: ['Worship', 'Youth', 'Community', 'Prayer', 'Conference', 'Outreach', 'Other'], 
    default: 'Other' 
  },
  imageUrl: { type: String },
  featured: { 
    type: Boolean, 
    default: false 
  },
  isPublished: { type: Boolean, default: true },
  speakers: [{ type: String }],
  registrationLink: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventSchema.pre('save', updateTimestamps);

// 4. MEDIA MODEL
const MediaSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  type: { 
    type: String, 
    enum: ['photo', 'video', 'audio'], 
    required: true 
  },
  url: { 
    type: String, 
    required: true 
  },
  thumbnail: { type: String },
  description: { 
    type: String,
    trim: true,
    maxlength: 1000
  },
  altText: { type: String },
  featured: { type: Boolean, default: false },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

MediaSchema.pre('save', updateTimestamps);

// 5. FACE OF THE WEEK
const FaceOfWeekSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  title: { 
    type: String,
    trim: true
  },
  words: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 2000
  },
  testimony: { type: String },
  imageUrl: { type: String },
  occupation: { type: String },
  department: { type: String },
  date: { type: Date, default: Date.now },
  active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

FaceOfWeekSchema.pre('save', updateTimestamps);

// 6. PRAYER WEEK
const PrayerWeekSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  prayer: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000
  },
  bibleVerse: { type: String },
  bibleReading: { type: String },
  theme: { type: String },
  date: { type: Date, default: Date.now },
  active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PrayerWeekSchema.pre('save', updateTimestamps);

// 7. OPEN HEAVEN
const OpenHeavenSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000
  },
  bibleReading: { type: String },
  memoryVerse: { type: String },
  prayer: { type: String },
  reflection: { type: String },
  date: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

OpenHeavenSchema.pre('save', updateTimestamps);

// 8. SUNDAY SCHOOL
const SundaySchoolSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  teacher: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String,
    trim: true,
    maxlength: 5000
  },
  bibleReading: { type: String },
  memoryVerse: { type: String },
  mainText: { type: String },
  imageUrl: { type: String },
  date: { 
    type: Date, 
    default: Date.now 
  },
  featured: { 
    type: Boolean, 
    default: false 
  },
  lessonNumber: { type: Number },
  quarter: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SundaySchoolSchema.pre('save', updateTimestamps);

// 9. PRAYER REQUEST
const PrayerRequestSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  phone: { type: String },
  request: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000
  },
  category: { 
    type: String,
    enum: ['Personal', 'Family', 'Health', 'Financial', 'Spiritual', 'Other'],
    default: 'Other'
  },
  status: { 
    type: String, 
    enum: ['pending', 'answered', 'archived'], 
    default: 'pending' 
  },
  response: { type: String },
  respondedAt: { type: Date },
  isConfidential: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PrayerRequestSchema.pre('save', updateTimestamps);

// 10. SOCIAL LINK
const SocialLinkSchema = new mongoose.Schema({
  platform: { 
    type: String, 
    required: true,
    trim: true
  },
  url: { 
    type: String, 
    required: true,
    trim: true
  },
  icon: { 
    type: String, 
    required: true,
    trim: true
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SocialLinkSchema.pre('save', updateTimestamps);

// 11. TESTIMONY
const TestimonySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  content: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000
  },
  author: { 
    type: String,
    trim: true
  },
  imageUrl: { type: String },
  date: { type: Date, default: Date.now },
  featured: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TestimonySchema.pre('save', updateTimestamps);

// Create Models
const Admin = mongoose.model('Admin', AdminSchema);
const Sermon = mongoose.model('Sermon', SermonSchema);
const Event = mongoose.model('Event', EventSchema);
const Media = mongoose.model('Media', MediaSchema);
const FaceOfWeek = mongoose.model('FaceOfWeek', FaceOfWeekSchema);
const PrayerWeek = mongoose.model('PrayerWeek', PrayerWeekSchema);
const OpenHeaven = mongoose.model('OpenHeaven', OpenHeavenSchema);
const SundaySchool = mongoose.model('SundaySchool', SundaySchoolSchema);
const PrayerRequest = mongoose.model('PrayerRequest', PrayerRequestSchema);
const SocialLink = mongoose.model('SocialLink', SocialLinkSchema);
const Testimony = mongoose.model('Testimony', TestimonySchema);

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid token or account disabled' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// ============================================
// INITIALIZE ADMIN
// ============================================
const initializeAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: process.env.ADMIN_USERNAME || 'devgift' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'mide', 10);
      const admin = new Admin({
        username: process.env.ADMIN_USERNAME || 'devgift',
        password: hashedPassword,
        email: 'admin@rccgovercomers.org',
        role: 'superadmin'
      });
      await admin.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user already exists');
    }
  } catch (error) {
    console.error('❌ Error initializing admin:', error);
  }
};

// ============================================
// API ROUTES - AUTH
// ============================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username }).select('+password');
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - PUBLIC
// ============================================

// Sermons
app.get('/api/sermons', async (req, res) => {
  try {
    const { featured, category, preacher, limit } = req.query;
    const query = { isPublished: true };
    
    if (featured === 'true') query.featured = true;
    if (category) query.category = category;
    if (preacher) query.preacher = preacher;

    let sermonsQuery = Sermon.find(query).sort({ date: -1 });
    if (limit) sermonsQuery = sermonsQuery.limit(parseInt(limit));

    const sermons = await sermonsQuery;
    res.json(sermons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sermons/featured', async (req, res) => {
  try {
    const sermon = await Sermon.findOne({ featured: true, isPublished: true }).sort({ date: -1 });
    res.json(sermon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sermons/:id', async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ error: 'Sermon not found' });
    sermon.views += 1;
    await sermon.save();
    res.json(sermon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Events
app.get('/api/events', async (req, res) => {
  try {
    const { category, featured, upcoming } = req.query;
    const query = { isPublished: true };
    
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    if (upcoming === 'true') query.date = { $gte: new Date() };

    const events = await Event.find(query).sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/upcoming', async (req, res) => {
  try {
    const events = await Event.find({ 
      date: { $gte: new Date() }, 
      isPublished: true 
    }).sort({ date: 1 }).limit(6);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Media
app.get('/api/media', async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};
    if (type) query.type = type;
    
    const media = await Media.find(query).sort({ createdAt: -1 });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/media/:id', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Face of the Week
app.get('/api/face-of-week', async (req, res) => {
  try {
    const face = await FaceOfWeek.findOne({ active: true }).sort({ date: -1 });
    res.json(face);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prayer Week
app.get('/api/prayer-week', async (req, res) => {
  try {
    const prayer = await PrayerWeek.findOne({ active: true }).sort({ date: -1 });
    res.json(prayer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Open Heaven
app.get('/api/open-heaven', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let openHeaven = await OpenHeaven.findOne({
      date: { $gte: today, $lt: tomorrow }
    });

    if (!openHeaven) {
      openHeaven = await OpenHeaven.findOne().sort({ date: -1 });
    }

    res.json(openHeaven);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sunday School
app.get('/api/sunday-school', async (req, res) => {
  try {
    const { featured } = req.query;
    const query = {};
    if (featured === 'true') query.featured = true;
    
    const lessons = await SundaySchool.find(query).sort({ date: -1 });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prayer Requests (Public)
app.post('/api/prayer-requests', async (req, res) => {
  try {
    const prayerRequest = new PrayerRequest(req.body);
    await prayerRequest.save();
    res.status(201).json({ message: 'Prayer request submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Social Links
app.get('/api/social-links', async (req, res) => {
  try {
    const links = await SocialLink.find({ active: true }).sort({ order: 1 });
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Testimonies
app.get('/api/testimonies', async (req, res) => {
  try {
    const { featured } = req.query;
    const query = { isPublished: true };
    if (featured === 'true') query.featured = true;
    
    const testimonies = await Testimony.find(query).sort({ date: -1 });
    res.json(testimonies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES - ADMIN (Protected)
// ============================================

// Stats
app.get('/api/admin/stats', authMiddleware, async (req, res) => {
  try {
    const [
      totalSermons,
      totalEvents,
      totalMedia,
      totalPrayerRequests,
      totalFaces,
      totalLessons,
      totalTestimonies
    ] = await Promise.all([
      Sermon.countDocuments(),
      Event.countDocuments(),
      Media.countDocuments(),
      PrayerRequest.countDocuments(),
      FaceOfWeek.countDocuments(),
      SundaySchool.countDocuments(),
      Testimony.countDocuments()
    ]);

    res.json({
      sermons: totalSermons,
      events: totalEvents,
      media: totalMedia,
      prayerRequests: totalPrayerRequests,
      facesOfWeek: totalFaces,
      sundaySchool: totalLessons,
      testimonies: totalTestimonies
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Sermon
app.post('/api/admin/sermons', authMiddleware, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const sermonData = req.body;
    if (req.files?.image) sermonData.imageUrl = '/uploads/images/' + req.files.image[0].filename;
    if (req.files?.audio) sermonData.audioUrl = '/uploads/audio/' + req.files.audio[0].filename;
    if (req.files?.video) sermonData.videoUrl = '/uploads/video/' + req.files.video[0].filename;
    if (req.files?.pdf) sermonData.pdfUrl = '/uploads/others/' + req.files.pdf[0].filename;

    const sermon = new Sermon(sermonData);
    await sermon.save();
    res.status(201).json(sermon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Sermon
app.put('/api/admin/sermons/:id', authMiddleware, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) return res.status(404).json({ error: 'Sermon not found' });

    const sermonData = req.body;
    if (req.files?.image) sermonData.imageUrl = '/uploads/images/' + req.files.image[0].filename;
    if (req.files?.audio) sermonData.audioUrl = '/uploads/audio/' + req.files.audio[0].filename;
    if (req.files?.video) sermonData.videoUrl = '/uploads/video/' + req.files.video[0].filename;
    if (req.files?.pdf) sermonData.pdfUrl = '/uploads/others/' + req.files.pdf[0].filename;

    Object.assign(sermon, sermonData);
    await sermon.save();
    res.json(sermon);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Sermon
app.delete('/api/admin/sermons/:id', authMiddleware, async (req, res) => {
  try {
    const sermon = await Sermon.findByIdAndDelete(req.params.id);
    if (!sermon) return res.status(404).json({ error: 'Sermon not found' });
    res.json({ message: 'Sermon deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Sermons
app.delete('/api/admin/sermons', authMiddleware, async (req, res) => {
  try {
    const result = await Sermon.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} sermons` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Event
app.post('/api/admin/events', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const eventData = req.body;
    if (req.file) eventData.imageUrl = '/uploads/images/' + req.file.filename;
    
    const event = new Event(eventData);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Event
app.put('/api/admin/events/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const eventData = req.body;
    if (req.file) eventData.imageUrl = '/uploads/images/' + req.file.filename;

    Object.assign(event, eventData);
    await event.save();
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Event
app.delete('/api/admin/events/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Events
app.delete('/api/admin/events', authMiddleware, async (req, res) => {
  try {
    const result = await Event.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} events` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Media
app.post('/api/admin/media', authMiddleware, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const mediaData = req.body;
    
    if (req.files?.file) {
      const file = req.files.file[0];
      mediaData.url = '/uploads/' + (file.mimetype.startsWith('image/') ? 'images/' : 
                                   file.mimetype.startsWith('audio/') ? 'audio/' : 
                                   'video/') + file.filename;
    }
    if (req.files?.thumbnail) {
      mediaData.thumbnail = '/uploads/images/' + req.files.thumbnail[0].filename;
    }

    const media = new Media(mediaData);
    await media.save();
    res.status(201).json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Media
app.put('/api/admin/media/:id', authMiddleware, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });

    const mediaData = req.body;
    
    if (req.files?.file) {
      const file = req.files.file[0];
      mediaData.url = '/uploads/' + (file.mimetype.startsWith('image/') ? 'images/' : 
                                   file.mimetype.startsWith('audio/') ? 'audio/' : 
                                   'video/') + file.filename;
    }
    if (req.files?.thumbnail) {
      mediaData.thumbnail = '/uploads/images/' + req.files.thumbnail[0].filename;
    }

    Object.assign(media, mediaData);
    await media.save();
    res.json(media);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Media
app.delete('/api/admin/media/:id', authMiddleware, async (req, res) => {
  try {
    const media = await Media.findByIdAndDelete(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Media
app.delete('/api/admin/media', authMiddleware, async (req, res) => {
  try {
    const result = await Media.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} media items` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Face of Week
app.post('/api/admin/face-of-week', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    await FaceOfWeek.updateMany({ active: true }, { active: false });
    
    const faceData = req.body;
    if (req.file) faceData.imageUrl = '/uploads/images/' + req.file.filename;
    faceData.active = true;

    const face = new FaceOfWeek(faceData);
    await face.save();
    res.status(201).json(face);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Face of Week
app.put('/api/admin/face-of-week/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const face = await FaceOfWeek.findById(req.params.id);
    if (!face) return res.status(404).json({ error: 'Face not found' });

    const faceData = req.body;
    if (req.file) faceData.imageUrl = '/uploads/images/' + req.file.filename;

    Object.assign(face, faceData);
    await face.save();
    res.json(face);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Face of Week
app.delete('/api/admin/face-of-week/:id', authMiddleware, async (req, res) => {
  try {
    const face = await FaceOfWeek.findByIdAndDelete(req.params.id);
    if (!face) return res.status(404).json({ error: 'Face not found' });
    res.json({ message: 'Face deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Faces
app.delete('/api/admin/face-of-week', authMiddleware, async (req, res) => {
  try {
    const result = await FaceOfWeek.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} faces` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Prayer Week
app.post('/api/admin/prayer-week', authMiddleware, async (req, res) => {
  try {
    await PrayerWeek.updateMany({ active: true }, { active: false });
    
    const prayerData = req.body;
    prayerData.active = true;

    const prayer = new PrayerWeek(prayerData);
    await prayer.save();
    res.status(201).json(prayer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Prayer Week
app.put('/api/admin/prayer-week/:id', authMiddleware, async (req, res) => {
  try {
    const prayer = await PrayerWeek.findById(req.params.id);
    if (!prayer) return res.status(404).json({ error: 'Prayer not found' });

    Object.assign(prayer, req.body);
    await prayer.save();
    res.json(prayer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Prayer Week
app.delete('/api/admin/prayer-week/:id', authMiddleware, async (req, res) => {
  try {
    const prayer = await PrayerWeek.findByIdAndDelete(req.params.id);
    if (!prayer) return res.status(404).json({ error: 'Prayer not found' });
    res.json({ message: 'Prayer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Prayers
app.delete('/api/admin/prayer-week', authMiddleware, async (req, res) => {
  try {
    const result = await PrayerWeek.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} prayers` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Open Heaven
app.post('/api/admin/open-heaven', authMiddleware, async (req, res) => {
  try {
    const openHeaven = new OpenHeaven(req.body);
    await openHeaven.save();
    res.status(201).json(openHeaven);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Open Heaven
app.put('/api/admin/open-heaven/:id', authMiddleware, async (req, res) => {
  try {
    const openHeaven = await OpenHeaven.findById(req.params.id);
    if (!openHeaven) return res.status(404).json({ error: 'Open Heaven not found' });

    Object.assign(openHeaven, req.body);
    await openHeaven.save();
    res.json(openHeaven);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Open Heaven
app.delete('/api/admin/open-heaven/:id', authMiddleware, async (req, res) => {
  try {
    const openHeaven = await OpenHeaven.findByIdAndDelete(req.params.id);
    if (!openHeaven) return res.status(404).json({ error: 'Open Heaven not found' });
    res.json({ message: 'Open Heaven deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Open Heavens
app.delete('/api/admin/open-heaven', authMiddleware, async (req, res) => {
  try {
    const result = await OpenHeaven.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} open heavens` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Sunday School
app.post('/api/admin/sunday-school', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const lessonData = req.body;
    if (req.file) lessonData.imageUrl = '/uploads/images/' + req.file.filename;
    
    const lesson = new SundaySchool(lessonData);
    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Sunday School
app.put('/api/admin/sunday-school/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const lesson = await SundaySchool.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const lessonData = req.body;
    if (req.file) lessonData.imageUrl = '/uploads/images/' + req.file.filename;

    Object.assign(lesson, lessonData);
    await lesson.save();
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Sunday School
app.delete('/api/admin/sunday-school/:id', authMiddleware, async (req, res) => {
  try {
    const lesson = await SundaySchool.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Sunday School
app.delete('/api/admin/sunday-school', authMiddleware, async (req, res) => {
  try {
    const result = await SundaySchool.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} Sunday School lessons` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET Prayer Requests (Admin)
app.get('/api/admin/prayer-requests', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    
    const requests = await PrayerRequest.find(query).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Prayer Request
app.put('/api/admin/prayer-requests/:id', authMiddleware, async (req, res) => {
  try {
    const request = await PrayerRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Prayer request not found' });

    const { status, response } = req.body;
    if (status) request.status = status;
    if (response) {
      request.response = response;
      request.respondedAt = new Date();
    }

    await request.save();
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Prayer Request
app.delete('/api/admin/prayer-requests/:id', authMiddleware, async (req, res) => {
  try {
    const request = await PrayerRequest.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ error: 'Prayer request not found' });
    res.json({ message: 'Prayer request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Prayer Requests
app.delete('/api/admin/prayer-requests', authMiddleware, async (req, res) => {
  try {
    const result = await PrayerRequest.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} prayer requests` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Social Link
app.post('/api/admin/social-links', authMiddleware, async (req, res) => {
  try {
    const link = new SocialLink(req.body);
    await link.save();
    res.status(201).json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Social Link
app.put('/api/admin/social-links/:id', authMiddleware, async (req, res) => {
  try {
    const link = await SocialLink.findById(req.params.id);
    if (!link) return res.status(404).json({ error: 'Social link not found' });

    Object.assign(link, req.body);
    await link.save();
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Social Link
app.delete('/api/admin/social-links/:id', authMiddleware, async (req, res) => {
  try {
    const link = await SocialLink.findByIdAndDelete(req.params.id);
    if (!link) return res.status(404).json({ error: 'Social link not found' });
    res.json({ message: 'Social link deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Social Links
app.delete('/api/admin/social-links', authMiddleware, async (req, res) => {
  try {
    const result = await SocialLink.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} social links` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Testimony
app.post('/api/admin/testimonies', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const testimonyData = req.body;
    if (req.file) testimonyData.imageUrl = '/uploads/images/' + req.file.filename;
    
    const testimony = new Testimony(testimonyData);
    await testimony.save();
    res.status(201).json(testimony);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE Testimony
app.put('/api/admin/testimonies/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const testimony = await Testimony.findById(req.params.id);
    if (!testimony) return res.status(404).json({ error: 'Testimony not found' });

    const testimonyData = req.body;
    if (req.file) testimonyData.imageUrl = '/uploads/images/' + req.file.filename;

    Object.assign(testimony, testimonyData);
    await testimony.save();
    res.json(testimony);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE Testimony
app.delete('/api/admin/testimonies/:id', authMiddleware, async (req, res) => {
  try {
    const testimony = await Testimony.findByIdAndDelete(req.params.id);
    if (!testimony) return res.status(404).json({ error: 'Testimony not found' });
    res.json({ message: 'Testimony deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE ALL Testimonies
app.delete('/api/admin/testimonies', authMiddleware, async (req, res) => {
  try {
    const result = await Testimony.deleteMany({});
    res.json({ message: `Deleted ${result.deletedCount} testimonies` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CATCH-ALL ROUTE - Serve index.html
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================
initializeAdmin();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🔐 Admin login: ${process.env.ADMIN_USERNAME || 'devgift'}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

module.exports = app;