import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

// Private storage directory outside public web root
const PRIVATE_STORAGE_DIR = path.resolve(process.cwd(), 'uploads', 'private');

// Ensure storage directory exists
if (!fs.existsSync(PRIVATE_STORAGE_DIR)) {
  fs.mkdirSync(PRIVATE_STORAGE_DIR, { recursive: true });
}

export const storageService = {
  /**
   * Save an uploaded file to private local storage
   * @param {Object} file - Multer file object
   * @returns {Promise<{ storageKey: string, originalName: string, mimeType: string, sizeBytes: number }>}
   */
  async uploadFile(file) {
    if (!file || !file.buffer) {
      throw new Error('No file buffer provided for storage');
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `${crypto.randomUUID()}-${safeName}`;
    const targetPath = path.join(PRIVATE_STORAGE_DIR, storageKey);

    await fs.promises.writeFile(targetPath, file.buffer);

    return {
      storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  },

  /**
   * Generate a short-lived signed access URL for a medical document
   * @param {string} storageKey - Key of the file in storage
   * @param {string} documentId - Database ID of the Document entity
   * @param {number} expiresInSeconds - Expiration time in seconds (default: 300)
   * @param {string|null} actorId - ID of user accessing the file
   * @returns {Promise<{ url: string, expiresInSeconds: number }>}
   */
  async getSignedUrl(storageKey, documentId, expiresInSeconds = 300, actorId = null) {
    const token = jwt.sign(
      {
        documentId,
        storageKey,
        ...(actorId ? { actorId } : {}),
      },
      config.JWT_SECRET,
      { expiresIn: expiresInSeconds }
    );

    return {
      url: `/api/records/raw/${encodeURIComponent(token)}`,
      expiresInSeconds,
    };
  },

  /**
   * Verify signed access token and resolve target file path
   * @param {string} token - Signed JWT access token
   * @returns {{ documentId: string, filePath: string, actorId: string|null }}
   */
  verifyAndResolve(token) {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const targetPath = path.join(PRIVATE_STORAGE_DIR, decoded.storageKey);

    // Prevent directory traversal attacks
    if (!targetPath.startsWith(PRIVATE_STORAGE_DIR)) {
      throw new Error('Invalid storage path');
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error('File not found in storage');
    }

    return {
      documentId: decoded.documentId,
      filePath: targetPath,
      actorId: decoded.actorId || null,
    };
  },
};

export default storageService;
