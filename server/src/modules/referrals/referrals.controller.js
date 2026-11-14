import prisma from '../../config/prisma.js';
import crypto from 'crypto';

/**
 * GET /api/referrals/me
 * Patient referral program portal endpoint.
 * Protected: PATIENT only.
 * Returns the authenticated patient's stable referral code, shareable link,
 * list of referred patients (first name only, status), and total commission earned in USD.
 */
export async function getMyReferrals(req, res, next) {
  try {
    const patientId = req.user.id;

    // 1. Fetch any existing referrals created by this patient
    let existingReferrals = await prisma.referral.findMany({
      where: { referrerId: patientId },
      orderBy: { createdAt: 'asc' },
    });

    let stableCode;

    if (existingReferrals.length > 0) {
      // Pick the primary stable code (prefer codes without generated hex/part suffixes)
      const primary =
        existingReferrals.find(
          (r) => !r.code.includes('-part') && !/-[0-9a-fA-F]{6}$/i.test(r.code)
        ) || existingReferrals[0];
      stableCode = primary.code;
    } else {
      // 2. Lazily generate a stable code on first visit
      const user = await prisma.user.findUnique({
        where: { id: patientId },
        include: { patientProfile: true },
      });

      const rawName = user?.patientProfile?.fullName || 'PATIENT';
      const cleanName =
        rawName.trim().split(/\s+/)[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'PATIENT';

      // Ensure code is unique in the database
      let uniqueCode = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const candidate = `REF-${cleanName}-${randomNum}`;
        const existing = await prisma.referral.findUnique({
          where: { code: candidate },
        });
        if (!existing) {
          uniqueCode = candidate;
          break;
        }
      }

      if (!uniqueCode) {
        uniqueCode = `REF-${cleanName}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      }

      const createdRef = await prisma.referral.create({
        data: {
          code: uniqueCode,
          referrerId: patientId,
          referredPatientId: null,
          status: 'PENDING',
          commissionRateBps: 500,
          currency: 'USD',
        },
      });

      existingReferrals = [createdRef];
      stableCode = uniqueCode;
    }

    // 3. Compute total commission earned (sum of commissionCents on this referrer's referrals)
    const allReferrals = await prisma.referral.findMany({
      where: { referrerId: patientId },
    });

    const totalCommissionCents = allReferrals.reduce(
      (sum, r) => sum + (r.commissionCents || 0),
      0
    );
    const totalCommissionDollars = (totalCommissionCents / 100).toFixed(2);

    // 4. Fetch list of referred patients (first name only, status, commission earned)
    const referredRows = await prisma.referral.findMany({
      where: {
        referrerId: patientId,
        referredPatientId: { not: null },
      },
      include: {
        referredPatient: {
          include: {
            patientProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const referredPatients = referredRows.map((r) => {
      const fullName = r.referredPatient?.patientProfile?.fullName || 'Patient';
      // First name only for privacy
      const firstName = fullName.trim().split(/\s+/)[0] || 'Patient';
      return {
        id: r.id,
        firstName,
        status: r.status,
        commissionCents: r.commissionCents || 0,
        commissionDollars: ((r.commissionCents || 0) / 100).toFixed(2),
        currency: r.currency || 'USD',
        createdAt: r.createdAt,
      };
    });

    return res.status(200).json({
      status: 'ok',
      data: {
        code: stableCode,
        shareLink: `/register?ref=${stableCode}`,
        totalCommissionCents,
        totalCommissionDollars,
        commissionRateBps: 500,
        commissionRatePercent: 5,
        referredPatients,
        totalReferredCount: referredPatients.length,
      },
    });
  } catch (error) {
    next(error);
  }
}
