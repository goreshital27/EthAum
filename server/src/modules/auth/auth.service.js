import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma.js';
import config from '../../config/index.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Generate a URL-friendly unique slug for a hospital
 */
const generateHospitalSlug = (name) => {
  const baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${baseSlug || 'hospital'}-${randomSuffix}`;
};

/**
 * Generate JWT containing only userId and role
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
    },
    config.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

/**
 * Set secure httpOnly cookie on response
 */
export const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/',
  });
};

/**
 * Clear auth cookie on response
 */
export const clearAuthCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  });
};

/**
 * Format user object for client response (strips passwordHash, extracts name & hospital verification)
 */
export const formatUser = (user) => {
  let name = '';
  if (user.role === 'PATIENT') {
    name = user.patientProfile?.fullName || '';
  } else if (user.role === 'HOSPITAL') {
    name = user.hospital?.name || '';
  } else if (user.role === 'ADMIN') {
    name = 'Admin';
  }

  const formatted = {
    id: user.id,
    email: user.email,
    name,
    role: user.role,
  };

  if (user.role === 'HOSPITAL') {
    formatted.verificationStatus = user.hospital?.verificationStatus || 'PENDING';
    if (user.hospital) {
      formatted.hospital = {
        id: user.hospital.id,
        name: user.hospital.name,
        slug: user.hospital.slug,
        city: user.hospital.city,
        country: user.hospital.country,
        verificationStatus: user.hospital.verificationStatus,
      };
    }
  }

  return formatted;
};

/**
 * Register a new user and corresponding profile inside ONE transaction
 */
export const registerUser = async (data) => {
  const { email, password, name, role, hospitalName, country, city } = data;
  const cleanEmail = email.trim().toLowerCase();

  // Check duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password with bcrypt cost 12
  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  // Execute in ONE database transaction
  const createdUser = await prisma.$transaction(async (tx) => {
    if (role === 'PATIENT') {
      const newUser = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: 'PATIENT',
          patientProfile: {
            create: {
              fullName: name.trim(),
            },
          },
        },
        include: {
          patientProfile: true,
          hospital: true,
        },
      });

      // If optional referralCode was provided, link new user as referredPatientId for that referrer
      if (data.referralCode && typeof data.referralCode === 'string') {
        const cleanCode = data.referralCode.trim();
        const refRecord = await tx.referral.findUnique({
          where: { code: cleanCode },
        });

        // Unknown codes are ignored with no error leak. A user cannot refer themselves.
        if (refRecord && refRecord.referrerId !== newUser.id) {
          if (!refRecord.referredPatientId) {
            await tx.referral.update({
              where: { id: refRecord.id },
              data: { referredPatientId: newUser.id },
            });
          } else {
            const cryptoModule = await import('crypto');
            await tx.referral.create({
              data: {
                code: `${cleanCode}-${cryptoModule.randomBytes(3).toString('hex')}`,
                referrerId: refRecord.referrerId,
                referredPatientId: newUser.id,
                status: 'PENDING',
              },
            });
          }
        }
      }

      return newUser;
    }

    if (role === 'HOSPITAL') {
      const slug = generateHospitalSlug(hospitalName);
      return await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: 'HOSPITAL',
          hospital: {
            create: {
              name: hospitalName.trim(),
              slug,
              city: city.trim(),
              country: country.trim(),
              verificationStatus: 'PENDING',
              accreditations: [],
              languages: [],
              internationalServices: [],
            },
          },
        },
        include: {
          patientProfile: true,
          hospital: true,
        },
      });
    }

    throw new Error('Unsupported role for self-registration');
  });

  const token = generateToken(createdUser);
  return { user: formatUser(createdUser), token };
};

/**
 * Validate credentials and authenticate user
 */
export const loginUser = async ({ email, password }) => {
  const cleanEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
    include: {
      patientProfile: true,
      hospital: true,
    },
  });

  // Generic error for non-existent user
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Generic error for password mismatch
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Account is deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  const token = generateToken(user);
  return { user: formatUser(user), token };
};
