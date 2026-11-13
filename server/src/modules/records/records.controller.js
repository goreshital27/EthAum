import prisma from '../../config/prisma.js';
import storageService from '../../services/storage.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/cases/:id/documents
 * Uploads a medical file (PDF, JPG, PNG, max 10MB) for a patient case.
 * Enforces ownership, mandatory patient consent, metadata storage, and audit logging.
 */
export const uploadCaseDocument = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const patientId = req.user.id;
    const { category = 'REPORT', consent, hospitalId } = req.body;

    // 1. Mandatory consent flag validation
    const hasConsent = consent === true || consent === 'true' || consent === '1';
    if (!hasConsent) {
      return res.status(400).json({
        status: 'fail',
        message: 'Patient consent is required to process and store medical records.',
      });
    }

    // 2. Validate category enum
    const validCategories = ['REPORT', 'SCAN', 'PRESCRIPTION', 'IDENTITY', 'OTHER'];
    const selectedCategory = validCategories.includes(category) ? category : 'REPORT';

    // 3. Verify case ownership
    const caseItem = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, patientId: true, deletedAt: true },
    });

    if (!caseItem || caseItem.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (caseItem.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // 4. File existence and type validation
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a file to upload (PDF, JPG, PNG up to 10MB)',
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid file format. Supported file formats are PDF, JPG, and PNG only.',
      });
    }

    if (req.file.size > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        status: 'fail',
        message: 'File size exceeds maximum permitted limit of 10 MB.',
      });
    }

    // 5. Store file in private local folder (outside public path)
    const stored = await storageService.uploadFile(req.file);

    // 6. Database transaction: create Document + optional Consent + AccessLog
    const result = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          caseId: caseItem.id,
          uploadedById: patientId,
          category: selectedCategory,
          originalName: stored.originalName,
          storageKey: stored.storageKey,
          mimeType: stored.mimeType,
          sizeBytes: BigInt(stored.sizeBytes),
        },
      });

      // If patient designated a hospital to share with, create/update Consent
      let createdConsent = null;
      if (hospitalId && hospitalId.trim()) {
        const approvedHospital = await tx.hospital.findUnique({
          where: { id: hospitalId.trim(), verificationStatus: 'APPROVED' },
          select: { id: true },
        });

        if (approvedHospital) {
          createdConsent = await tx.consent.upsert({
            where: {
              caseId_hospitalId: {
                caseId: caseItem.id,
                hospitalId: approvedHospital.id,
              },
            },
            update: {
              scope: 'ALL_RECORDS',
              revokedAt: null,
              grantedAt: new Date(),
            },
            create: {
              caseId: caseItem.id,
              hospitalId: approvedHospital.id,
              scope: 'ALL_RECORDS',
              grantedAt: new Date(),
            },
          });
        }
      }

      // Log upload action in audit trail
      await tx.accessLog.create({
        data: {
          documentId: doc.id,
          caseId: caseItem.id,
          actorId: patientId,
          action: 'UPLOAD',
          ipAddress: req.ip || null,
        },
      });

      return { doc, createdConsent };
    });

    return res.status(201).json({
      status: 'ok',
      data: {
        id: result.doc.id,
        category: result.doc.category,
        originalName: result.doc.originalName,
        mimeType: result.doc.mimeType,
        sizeBytes: Number(result.doc.sizeBytes),
        createdAt: result.doc.createdAt,
        consentCreated: Boolean(result.createdConsent),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/cases/:id/consents
 * Grants an accredited hospital access to view case medical records.
 */
export const grantCaseConsent = async (req, res, next) => {
  try {
    const { id: caseId } = req.params;
    const { hospitalId, scope = 'ALL_RECORDS' } = req.body;
    const patientId = req.user.id;

    // Verify case ownership
    const caseItem = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      select: { id: true, patientId: true, deletedAt: true },
    });

    if (!caseItem || caseItem.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    if (caseItem.patientId !== patientId) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own this medical case',
      });
    }

    // Verify hospital is APPROVED
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId, verificationStatus: 'APPROVED' },
      select: { id: true, name: true },
    });

    if (!hospital) {
      return res.status(404).json({
        status: 'fail',
        message: 'Accredited hospital not found',
      });
    }

    const consent = await prisma.consent.upsert({
      where: {
        caseId_hospitalId: {
          caseId: caseItem.id,
          hospitalId: hospital.id,
        },
      },
      update: {
        scope,
        revokedAt: null,
        grantedAt: new Date(),
      },
      create: {
        caseId: caseItem.id,
        hospitalId: hospital.id,
        scope,
        grantedAt: new Date(),
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    });

    return res.status(200).json({
      status: 'ok',
      data: consent,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/access
 * Returns a short-lived signed access link.
 * Allowed only if requester is the case owner, or a hospital with a valid (unrevoked) Consent.
 * Every access writes an AccessLog row.
 */
export const getDocumentAccess = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: {
          select: {
            id: true,
            patientId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!document || document.deletedAt !== null || !document.case || document.case.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical document not found',
      });
    }

    let isAuthorized = false;

    // 1. Is requester the patient owner?
    if (document.case.patientId === userId) {
      isAuthorized = true;
    }

    // 2. If requester is a HOSPITAL user, check for an unrevoked Consent
    if (!isAuthorized && userRole === 'HOSPITAL') {
      const hospital = await prisma.hospital.findUnique({
        where: { ownerId: userId },
        select: { id: true, verificationStatus: true },
      });

      if (hospital && hospital.verificationStatus === 'APPROVED') {
        const activeConsent = await prisma.consent.findFirst({
          where: {
            caseId: document.caseId,
            hospitalId: hospital.id,
            revokedAt: null,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });

        if (activeConsent) {
          isAuthorized = true;
        }
      }
    }

    // 3. Admin override for dispute/review
    if (!isAuthorized && userRole === 'ADMIN') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not have patient consent or permission to access this record.',
      });
    }

    // 4. Audit Log: write AccessLog row for every view request
    await prisma.accessLog.create({
      data: {
        documentId: document.id,
        caseId: document.caseId,
        actorId: userId,
        action: 'VIEW',
        ipAddress: req.ip || null,
      },
    });

    // 5. Generate short-lived signed link (expires in 300 seconds / 5 mins)
    const signedData = await storageService.getSignedUrl(document.storageKey, document.id, 300, userId);

    return res.status(200).json({
      status: 'ok',
      data: {
        documentId: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        accessUrl: signedData.url,
        expiresInSeconds: signedData.expiresInSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/records/raw/:token
 * Streams the actual file using the signed JWT token.
 * Validates signature, expiry, and verifies documentId against the database
 * to ensure the document still exists and has not been soft-deleted.
 */
export const streamRawDocument = async (req, res, next) => {
  try {
    const { token } = req.params;

    // 1. Verify JWT signature + expiry, resolve file path
    const { documentId, filePath, actorId } = storageService.verifyAndResolve(token);

    // 2. Verify the document still exists and is not soft-deleted
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, deletedAt: true, caseId: true, uploadedById: true },
    });

    if (!document || document.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Document has been deleted or does not exist.',
      });
    }

    // 3. Audit the download
    await prisma.accessLog.create({
      data: {
        documentId: document.id,
        caseId: document.caseId,
        actorId: actorId || document.uploadedById,
        action: 'DOWNLOAD',
        ipAddress: req.ip || null,
      },
    });

    // 4. Send file securely with headers
    return res.sendFile(filePath);
  } catch (error) {
    return res.status(403).json({
      status: 'fail',
      message: 'Access link has expired or is invalid. Please request a new access link.',
    });
  }
};

/**
 * DELETE /api/consents/:id
 * Revokes patient consent for a hospital.
 */
export const revokeConsent = async (req, res, next) => {
  try {
    const { id: consentId } = req.params;
    const patientId = req.user.id;

    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      include: {
        case: {
          select: {
            id: true,
            patientId: true,
          },
        },
      },
    });

    if (!consent) {
      return res.status(404).json({
        status: 'fail',
        message: 'Consent record not found',
      });
    }

    if (consent.case.patientId !== patientId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: You do not own the medical case associated with this consent',
      });
    }

    // Revoke consent
    const updated = await prisma.consent.update({
      where: { id: consent.id },
      data: { revokedAt: new Date() },
    });

    // Write audit log
    await prisma.accessLog.create({
      data: {
        caseId: consent.caseId,
        actorId: patientId,
        action: 'DELETE_REQUEST',
        ipAddress: req.ip || null,
      },
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Consent revoked successfully',
      data: {
        id: updated.id,
        revokedAt: updated.revokedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
