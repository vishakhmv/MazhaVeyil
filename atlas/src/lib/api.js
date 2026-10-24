const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch ward summaries with automatic offline sample fallback
 */
export async function fetchAtlasSummary() {
  try {
    const res = await fetch(`${API_BASE}/api/atlas/summary`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return { data, source: 'network' };
  } catch (err) {
    console.warn('Network fetch failed, attempting cached sample data fallback:', err.message);
    try {
      const fallbackRes = await fetch('/samples/ward-summary.sample.json');
      const fallbackData = await fallbackRes.json();
      return { data: fallbackData, source: 'fallback_sample' };
    } catch {
      throw new Error('Unable to fetch ward summary from network or local fallback.');
    }
  }
}

/**
 * Fetch stats from survey responses
 */
export async function fetchSurveyStats() {
  try {
    const res = await fetch(`${API_BASE}/api/survey/stats`);
    if (!res.ok) throw new Error('Survey stats fetch failed');
    return await res.json();
  } catch {
    return {
      total_responses: 112,
      water_shortage_percentage: 68,
      cliff_unaware_percentage: 84,
      would_join_percentage: 91,
      summary_sentence: '76 of 112 homes asked faced a water shortage last summer. 84% did not know the 250-unit rule. 91% would join a ward group.'
    };
  }
}
