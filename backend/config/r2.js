import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import dotenv from 'dotenv'

dotenv.config()

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const bucketName = process.env.R2_BUCKET_NAME
const publicUrl = process.env.R2_PUBLIC_URL // Your R2 public domain or custom domain

export const uploadFile = async (fileBuffer, fileName, contentType) => {
  try {
    const key = `logos/${fileName}`
    
    // Upload file to R2
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType || 'image/jpeg',
      // Make file publicly readable (if bucket allows)
      // ACL: 'public-read' // Uncomment if your R2 bucket supports ACLs
    })

    await r2Client.send(command)

    // Construct public URL
    // If using custom domain: https://your-domain.com/logos/filename
    // If using R2 public URL: https://pub-xxxxx.r2.dev/logos/filename
    // Note: R2 public URLs need to be configured in Cloudflare dashboard
    if (!publicUrl) {
      throw new Error('R2_PUBLIC_URL must be configured in environment variables')
    }
    
    const fileUrl = `${publicUrl.replace(/\/$/, '')}/${key}` // Remove trailing slash if present

    console.log('✅ File uploaded to R2:', key)

    return {
      fileName: key,
      fileUrl,
      fileKey: key
    }
  } catch (error) {
    console.error('❌ R2 upload error:', error)
    throw error
  }
}

export const deleteFile = async (fileKey) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    })

    await r2Client.send(command)
    console.log('✅ File deleted from R2:', fileKey)
  } catch (error) {
    console.error('Error deleting file from R2:', error)
    // Don't throw - file might not exist
  }
}

export default r2Client
