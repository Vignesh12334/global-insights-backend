import { supabase } from "../db/index.js";

async function getAllInsights(req, res) {
  let page = req.query.page || 1;
  let limit = req.query.limit || 10;

  const { data, error, count } = await supabase
    .from("insights")
    .select(
      `
            *,
            sectors (name),
            regions (name)
        `,
      { count: "exact" }
    )
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.json({
    data,
    page,
    limit,
    total: count,
  });
}

async function getAllSectors(req, res) {
  const { data, error } = await supabase
    .from("insights")
    .select(
      `
            sectors (
                name
            )
        `
    )
    .not("sectors", "is", null);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const sectorCounts = data.reduce((acc, item) => {
    const sectorName = item.sectors.name;
    acc[sectorName] = (acc[sectorName] || 0) + 1;
    return acc;
  }, {});

  const sectorsArray = Object.entries(sectorCounts).map(([name, count]) => ({
    name,
    count,
  }));

  res.json(sectorsArray);
}

async function getAllRegions(req, res) {
  const { data, error } = await supabase
    .from("insights")
    .select(
      `
            regions (
                name
            )
        `
    )
    .not("regions", "is", null);

  if (error) {
    res.status(400).send(error.message);
    return;
  }

  const regionCounts = data.reduce((acc, item) => {
    const regionName = item.regions.name;
    acc[regionName] = (acc[regionName] || 0) + 1;
    return acc;
  }, {});

  const regionsArray = Object.entries(regionCounts).map(([name, count]) => ({
    name,
    count,
  }));

  res.json(regionsArray);
}

async function getInsightsOverTime(req, res) {
  const { data, error } = await supabase
    .from("insights")
    .select("added")
    .not("added", "is", null);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const yearlyData = data.reduce((acc, item) => {
    const year = new Date(item.added).getFullYear();
    if (!acc[year]) {
      acc[year] = 0;
    }
    acc[year]++;
    return acc;
  }, {});

  const result = Object.entries(yearlyData)
    .map(([year, count]) => ({
      year: parseInt(year),
      count,
    }))
    .sort((a, b) => a.year - b.year);

  res.json(result);
}

async function getLikelihoodIntensity(req, res) {
  const { data, error } = await supabase
    .from("insights")
    .select(`
            likelihood,
            intensity,
            title,
            sectors (name),
            pestle
        `)
    .not("likelihood", "is", null)
    .not("intensity", "is", null);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  // Calculate average and standard deviation for outlier detection
  const avgLikelihood = data.reduce((sum, item) => sum + item.likelihood, 0) / data.length;
  const avgIntensity = data.reduce((sum, item) => sum + item.intensity, 0) / data.length;
  const stdLikelihood = Math.sqrt(data.reduce((sum, item) => sum + Math.pow(item.likelihood - avgLikelihood, 2), 0) / data.length);
  const stdIntensity = Math.sqrt(data.reduce((sum, item) => sum + Math.pow(item.intensity - avgIntensity, 2), 0) / data.length);

  const result = data.map(item => {
    // Mark as outlier if more than 2 standard deviations from mean
    const isOutlier = 
      Math.abs(item.likelihood - avgLikelihood) > 2 * stdLikelihood ||
      Math.abs(item.intensity - avgIntensity) > 2 * stdIntensity;

    return {
      likelihood: item.likelihood,
      intensity: item.intensity,
      title: item.title || 'Untitled',
      topic: item.title || 'No Topic',
      sector: item.sectors?.name || 'Unknown',
      pestle: item.pestle || 'Unknown',
      isOutlier
    };
  });

  res.json(result);
}

async function getRelevanceLikelihood(req, res) {
  const { data, error } = await supabase
    .from("insights")
    .select(`
      relevance,
      likelihood,
      sectors (name)
    `)
    .not("relevance", "is", null)
    .not("likelihood", "is", null)
    .not("sectors", "is", null);

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  const sectorData = data.reduce((acc, item) => {
    const sectorName = item.sectors.name;
    if (!acc[sectorName]) {
      acc[sectorName] = {
        totalRelevance: 0,
        totalLikelihood: 0,
        count: 0,
      };
    }
    acc[sectorName].totalRelevance += item.relevance;
    acc[sectorName].totalLikelihood += item.likelihood;
    acc[sectorName].count++;
    return acc;
  }, {});

  const result = Object.entries(sectorData).map(([sector, data]) => ({
    sector,
    averageRelevance: Number((data.totalRelevance / data.count).toFixed(2)),
    averageLikelihood: Number((data.totalLikelihood / data.count).toFixed(2)),
  }));

  res.json(result);
}

export { 
  getAllInsights, 
  getAllSectors, 
  getAllRegions,
  getInsightsOverTime,
  getLikelihoodIntensity,
  getRelevanceLikelihood
};
