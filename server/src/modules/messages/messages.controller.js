import prisma from '../../config/prisma.js';
import { createNotification } from '../notifications/notifications.service.js';

/**
 * Sanitizes plain text input by stripping any HTML tags.
 */
function sanitizePlainText(input) {
  if (!input) return '';
  return input
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .trim();
}

/**
 * Tag prefix helper for patient-to-hospital message partitioning
 */
function makeHospitalTag(hospitalId) {
  return `[TO:${hospitalId}]\n`;
}

export async function sendMessage(req, res, next) {
  try {
    const { caseId } = req.params;
    const { body, hospitalId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const cleanBody = sanitizePlainText(body);
    if (!cleanBody) {
      return res.status(400).json({
        status: 'fail',
        message: 'Message body cannot be empty',
      });
    }

    if (cleanBody.length > 2000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Message cannot exceed 2000 characters',
      });
    }

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        enquiries: {
          include: {
            hospital: true,
          },
        },
      },
    });

    if (!medicalCase || medicalCase.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    let targetHospitalId = hospitalId;
    let recipientUserId = null;
    let notificationLink = null;
    let storedBody = cleanBody;

    if (userRole === 'HOSPITAL') {
      // Find hospital owned by current user
      const hospital = await prisma.hospital.findUnique({
        where: { ownerId: userId },
      });

      if (!hospital) {
        return res.status(404).json({
          status: 'fail',
          message: 'Hospital profile not found',
        });
      }

      if (hospital.verificationStatus !== 'APPROVED') {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: Hospital must be verified and approved to message patients',
        });
      }

      // Check hospital has an enquiry for this case
      const enquiry = medicalCase.enquiries.find((e) => e.hospitalId === hospital.id);
      if (!enquiry) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: Hospital does not have an active inquiry for this case',
        });
      }

      targetHospitalId = hospital.id;
      recipientUserId = medicalCase.patientId;
      notificationLink = `/patient/cases/${caseId}`;
      storedBody = cleanBody; // Hospital sends plain text
    } else if (userRole === 'PATIENT') {
      // Patient ownership check
      if (medicalCase.patientId !== userId) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: You do not own this medical case',
        });
      }

      if (!targetHospitalId) {
        return res.status(400).json({
          status: 'fail',
          message: 'Target hospital ID is required for patient messages',
        });
      }

      // Check enquiry exists for target hospital
      const enquiry = medicalCase.enquiries.find((e) => e.hospitalId === targetHospitalId);
      if (!enquiry) {
        return res.status(404).json({
          status: 'fail',
          message: 'Target hospital does not have an inquiry for this case',
        });
      }

      recipientUserId = enquiry.hospital.ownerId;
      notificationLink = `/hospital/leads/${enquiry.id}`;
      // Prepend metadata tag for hospital thread partitioning
      storedBody = `${makeHospitalTag(targetHospitalId)}${cleanBody}`;
    } else {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied: Only patients and approved hospitals can send case messages',
      });
    }

    // Create Message record
    const messageRecord = await prisma.message.create({
      data: {
        caseId,
        senderId: userId,
        body: storedBody,
      },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            patientProfile: {
              select: {
                fullName: true,
              },
            },
            hospital: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Notify recipient (Note: Never log message text)
    if (recipientUserId) {
      await createNotification({
        userId: recipientUserId,
        type: 'NEW_MESSAGE',
        title: userRole === 'HOSPITAL' ? 'New Message from Hospital' : 'New Message from Patient',
        body: 'You received a new message regarding a medical case coordination thread.',
        link: notificationLink,
      });
    }

    // Format output with stripped tags
    const formatted = {
      id: messageRecord.id,
      caseId: messageRecord.caseId,
      senderId: messageRecord.senderId,
      senderRole: messageRecord.sender.role,
      senderName:
        messageRecord.sender.role === 'HOSPITAL'
          ? messageRecord.sender.hospital?.name || 'Hospital Team'
          : messageRecord.sender.patientProfile?.fullName || 'Patient',
      body: cleanBody,
      createdAt: messageRecord.createdAt,
    };

    return res.status(201).json({
      status: 'ok',
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { caseId } = req.params;
    const { hospitalId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    const medicalCase = await prisma.medicalCase.findUnique({
      where: { id: caseId },
      include: {
        enquiries: {
          include: {
            hospital: true,
          },
        },
      },
    });

    if (!medicalCase || medicalCase.deletedAt !== null) {
      return res.status(404).json({
        status: 'fail',
        message: 'Medical case not found',
      });
    }

    let targetHospitalId = hospitalId;
    let hospitalOwnerId = null;

    if (userRole === 'HOSPITAL') {
      const hospital = await prisma.hospital.findUnique({
        where: { ownerId: userId },
      });
      if (!hospital) {
        return res.status(404).json({
          status: 'fail',
          message: 'Hospital profile not found',
        });
      }

      const enquiry = medicalCase.enquiries.find((e) => e.hospitalId === hospital.id);
      if (!enquiry) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: Hospital does not have an inquiry for this case',
        });
      }

      targetHospitalId = hospital.id;
      hospitalOwnerId = hospital.ownerId;
    } else if (userRole === 'PATIENT') {
      if (medicalCase.patientId !== userId) {
        return res.status(403).json({
          status: 'fail',
          message: 'Access denied: You do not own this medical case',
        });
      }

      if (!targetHospitalId) {
        // If not provided and case only has 1 enquiry, default to it
        if (medicalCase.enquiries.length === 1) {
          targetHospitalId = medicalCase.enquiries[0].hospitalId;
          hospitalOwnerId = medicalCase.enquiries[0].hospital.ownerId;
        } else {
          return res.status(400).json({
            status: 'fail',
            message: 'hospitalId query parameter is required for multi-hospital threads',
          });
        }
      } else {
        const enquiry = medicalCase.enquiries.find((e) => e.hospitalId === targetHospitalId);
        if (!enquiry) {
          return res.status(404).json({
            status: 'fail',
            message: 'No inquiry found for specified hospital',
          });
        }
        hospitalOwnerId = enquiry.hospital.ownerId;
      }
    } else {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied',
      });
    }

    // Query messages for this case
    const tag = makeHospitalTag(targetHospitalId);
    const messages = await prisma.message.findMany({
      where: {
        caseId,
        OR: [
          // Sent by hospital user
          { senderId: hospitalOwnerId },
          // Sent by patient specifically targeted to this hospital
          {
            senderId: medicalCase.patientId,
            body: { startsWith: tag },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            role: true,
            patientProfile: {
              select: {
                fullName: true,
              },
            },
            hospital: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Clean bodies by stripping internal tag
    const formatted = messages.map((m) => {
      let displayBody = m.body;
      if (displayBody.startsWith(tag)) {
        displayBody = displayBody.slice(tag.length);
      }

      return {
        id: m.id,
        caseId: m.caseId,
        senderId: m.senderId,
        senderRole: m.sender.role,
        senderName:
          m.sender.role === 'HOSPITAL'
            ? m.sender.hospital?.name || 'Hospital Team'
            : m.sender.patientProfile?.fullName || 'Patient',
        body: displayBody,
        createdAt: m.createdAt,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  sendMessage,
  getMessages,
};
