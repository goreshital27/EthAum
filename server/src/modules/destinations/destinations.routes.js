import { Router } from 'express';
import { getDestinations } from './destinations.controller.js';

const router = Router();

// GET /api/destinations
router.get('/', getDestinations);

export default router;
