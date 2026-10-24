/**
 * Compute the updated campaign status based on current pledged count,
 * target count, closes_at timestamp, and existing status.
 *
 * State machine:
 * open --(pledged >= target)--> target_reached --(quotes enabled)--> quotes_open
 * open --(now > closes_at)----> expired
 * any  --(admin)-------------> closed
 *
 * Status never moves backwards automatically (e.g. from target_reached back to open).
 */
export function computeCampaignStatus(campaign, currentPledgedCount, now = new Date()) {
  const currentStatus = campaign.status;

  // Closed campaigns remain closed unless explicitly changed by admin
  if (currentStatus === 'closed') {
    return 'closed';
  }

  // Quotes open stays quotes open unless manually closed
  if (currentStatus === 'quotes_open') {
    return 'quotes_open';
  }

  // If already reached target, check if quotes should open or maintain target_reached
  if (currentStatus === 'target_reached') {
    return campaign.quotes_enabled ? 'quotes_open' : 'target_reached';
  }

  // If expired, stays expired unless target was already hit before expiry
  if (currentStatus === 'expired') {
    return 'expired';
  }

  // Check expiry condition for open campaigns
  const closeDate = new Date(campaign.closes_at);
  const isPastClosing = now.getTime() > closeDate.getTime();

  // Check if target is reached
  if (currentPledgedCount >= campaign.target_homes) {
    return campaign.quotes_enabled ? 'quotes_open' : 'target_reached';
  }

  if (isPastClosing) {
    return 'expired';
  }

  return 'open';
}

/**
 * Calculates days left until campaign closing date
 */
export function calculateDaysLeft(closesAt, now = new Date()) {
  const diffMs = new Date(closesAt).getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
