import express from 'express';
import { 
  getAllInsights, 
  getAllSectors, 
  getAllRegions,
  getInsightsOverTime,
  getLikelihoodIntensity,
  getRelevanceLikelihood 
} from '../controllers/insights.controllers.js';

const router = express.Router();

// GET routes
router.get('/all', getAllInsights);
router.get('/sectors', getAllSectors);
router.get('/regions', getAllRegions);
router.get('/insights-over-time', getInsightsOverTime);
router.get('/likelihood-intensity', getLikelihoodIntensity);
router.get('/relevance-likelihood', getRelevanceLikelihood);

export default router;
