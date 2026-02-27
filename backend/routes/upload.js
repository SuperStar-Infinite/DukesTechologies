import express from 'express'
import multer from 'multer'
import { authenticate, requireRestaurant } from '../middleware/auth.js'
import { uploadFile, deleteFile } from '../config/r2.js'

const router = express.Router()

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

// All routes require authentication
router.use(authenticate)
router.use(requireRestaurant)

// @route   POST /api/upload/logo
// @desc    Upload restaurant logo to Cloudflare R2
// @access  Private (Restaurant)
router.post('/logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = req.file.originalname.split('.').pop()
    const fileName = `${timestamp}-${randomString}.${extension}`

    // Upload to Cloudflare R2
    const uploadResult = await uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype
    )

    res.json({
      message: 'Logo uploaded successfully',
      logoUrl: uploadResult.fileUrl,
      logoKey: uploadResult.fileKey
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ message: 'Upload failed', error: error.message })
  }
})

// @route   DELETE /api/upload/logo
// @desc    Delete logo from Cloudflare R2
// @access  Private (Restaurant)
router.delete('/logo', async (req, res) => {
  try {
    const { logoKey } = req.body

    if (!logoKey) {
      return res.status(400).json({ message: 'Logo key required' })
    }

    await deleteFile(logoKey)

    res.json({ message: 'Logo deleted successfully' })
  } catch (error) {
    console.error('Delete logo error:', error)
    res.status(500).json({ message: 'Delete failed', error: error.message })
  }
})

export default router
