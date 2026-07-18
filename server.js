// ============================================
// RCCG OVERCOMERS HOC - COMPLETE PROFESSIONAL SERVER
// ============================================
// Developed by Dev Gift Team | Powered by De Creative Mide
// Version: 2.0.0

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
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp3', 'video/mp4', 'video/webm'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, and video are allowed.'), false);
  }
};

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter
});

// ============================================
// DATABASE MODELS (PROFESSIONAL)
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
    lowercase: true,
    match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
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

// 2. SERMON MODEL (Enhanced with more fields)
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
    maxlength: 10000
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
  duration: { type: String }, // e.g., "45:30"
  tags: [{ type: String }],
  isPublished: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SermonSchema.pre('save', updateTimestamps);

// 3. EVENT MODEL (Enhanced)
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

// 5. FACE OF THE WEEK (Enhanced)
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

// 6. PRAYER WEEK (Enhanced)
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

// 7. OPEN HEAVEN (Enhanced)
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

// 8. SUNDAY SCHOOL (Enhanced)
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

// 9. PRAYER REQUEST (Enhanced)
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