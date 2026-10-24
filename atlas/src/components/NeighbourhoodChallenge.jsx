import React, { useState, useEffect } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus, Zap, Users, Target } from "lucide-react";

function getRank(wards, wardId) {
  const sorted = [...wards].sort((a, b) => (b.pledged_homes || 0) - (a.pledged_homes || 0));
  return sorted.findIndex(w => w.ward_id === wardId) + 1;
}

function getPct(pledged, target) {
  return Math.min(100, Math.round(((pledged || 0) / (target || 100)) * 100));
}

function getRankBadge(rank) {
  if (rank === 1) return { emoji: "🥇", color: "#fbbf24", label: "Leading!" };
  if (rank === 2) return { emoji: "🥈", color: "#94a3b8", label: "2nd Place" };
  if (rank === 3) return { emoji: "🥉", color: "#b45309", label: "3rd Place" };
  return { emoji: `#${rank}`, color: "#64748b", label: `Rank ${rank}` };
}

function getChallengeLine(thisWard, allWards) {
  if (!thisWard) return null;
  const sorted = [...allWards].sort((a, b) => (b.pledged_homes || 0) - (a.pledged_homes || 0));
  const rank = sorted.findIndex(w => w.ward_id === thisWard.ward_id) + 1;
  if (rank === 1) {
    const second = sorted[1];
    if (!second) return "🏆 Uncontested leader — no other ward close!";
    const gap = (thisWard.pledged_homes || 0) - (second.pledged_homes || 0);
    return `🏆 Leading by ${gap} pledges over ${second.name}. Keep the momentum!`;
  }
  const leader = sorted[0];
  const gap = (leader.pledged_homes || 0) - (thisWard.pledged_homes || 0);
  const prev = sorted[rank - 2];
  return `⚡ ${gap} more pledges to overtake ${leader.name}! You are ${rank - 1} position(s) behind.`;
}

export function NeighbourhoodChallenge({ wards, selectedWard, onSelectWard, events }) {
  const [prevRanks, setPrevRanks] = useState({});
  const [flashWardId, setFlashWardId] = useState(null);

  const sorted = [...wards].sort((a, b) => (b.pledged_homes || 0) - (a.pledged_homes || 0));

  // Detect rank changes when new events come in
  useEffect(() => {
    if (!events || events.length === 0) return;
    const latest = events[0];
    if (latest) {
      setFlashWardId(latest.ward_id);
      setTimeout(() => setFlashWardId(null), 2000);
    }
  }, [events]);

  const challengeLine = getChallengeLine(selectedWard, wards);
  const selectedRank = selectedWard ? getRank(wards, selectedWard.ward_id) : null;

  return (
    <div className="glass-panel" style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Trophy size={15} style={{ color: "#fbbf24" }} />
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>Neighbourhood Challenge</span>
        </div>
        <span style={{ fontSize: "10px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(251,191,36,0.2)", fontWeight: "600" }}>
          LIVE
        </span>
      </div>

      {/* Selected ward callout */}
      {selectedWard && selectedRank && (
        <div style={{ background: "linear-gradient(135deg, rgba(2,132,199,0.12), rgba(16,185,129,0.08))", border: "1px solid rgba(56,189,248,0.25)", borderRadius: "12px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "2px" }}>Your selected ward</div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "#f8fafc" }}>{selectedWard.name}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{selectedWard.panchayat}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px" }}>{getRankBadge(selectedRank).emoji}</div>
              <div style={{ fontSize: "10px", color: getRankBadge(selectedRank).color, fontWeight: "700" }}>
                {getRankBadge(selectedRank).label}
              </div>
            </div>
          </div>

          {/* Progress to target */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginBottom: "4px" }}>
              <span>{selectedWard.pledged_homes || 0} pledges</span>
              <span>Target: {selectedWard.target_homes || 100}</span>
            </div>
            <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${getPct(selectedWard.pledged_homes, selectedWard.target_homes)}%`,
                background: "linear-gradient(90deg, #0284c7, #38bdf8)",
                borderRadius: "4px",
                transition: "width 0.6s ease"
              }} />
            </div>
            <div style={{ fontSize: "10px", color: "#38bdf8", marginTop: "3px", textAlign: "right" }}>
              {getPct(selectedWard.pledged_homes, selectedWard.target_homes)}% to target
            </div>
          </div>

          {/* Challenge message */}
          {challengeLine && (
            <div style={{ fontSize: "11px", color: "#94a3b8", background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "8px 10px" }}>
              {challengeLine}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "600", marginBottom: "2px" }}>
          All Wards — Live Rankings
        </div>
        {sorted.map((ward, idx) => {
          const rank = idx + 1;
          const badge = getRankBadge(rank);
          const pct = getPct(ward.pledged_homes, ward.target_homes);
          const isSelected = selectedWard && selectedWard.ward_id === ward.ward_id;
          const isFlashing = flashWardId === ward.ward_id;
          const gapToFirst = rank === 1 ? 0 : (sorted[0].pledged_homes || 0) - (ward.pledged_homes || 0);

          return (
            <div
              key={ward.ward_id}
              onClick={() => onSelectWard(ward)}
              style={{
                padding: "12px 14px",
                borderRadius: "10px",
                border: `1px solid ${isSelected ? "rgba(56,189,248,0.4)" : isFlashing ? "rgba(16,185,129,0.4)" : "var(--border-subtle)"}`,
                background: isSelected
                  ? "rgba(56,189,248,0.08)"
                  : isFlashing
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "all 0.25s",
                animation: isFlashing ? "flash-green 2s ease" : "none"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {/* Rank */}
                <div style={{ fontSize: rank <= 3 ? "20px" : "13px", fontWeight: "700", color: badge.color, width: "30px", textAlign: "center", flexShrink: 0 }}>
                  {badge.emoji}
                </div>

                {/* Ward info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: isSelected ? "700" : "600", color: isSelected ? "#38bdf8" : "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ward.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      {isFlashing && <span style={{ fontSize: "10px", color: "#34d399", fontWeight: "700", animation: "pulse 0.5s ease infinite" }}>+1 ⚡</span>}
                      <span style={{ fontSize: "12px", fontWeight: "800", color: "#f8fafc", fontVariantNumeric: "tabular-nums" }}>
                        {ward.pledged_homes || 0}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>/ {ward.target_homes || 100}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: rank === 1
                        ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : isSelected
                          ? "linear-gradient(90deg, #0284c7, #38bdf8)"
                          : "linear-gradient(90deg, #475569, #64748b)",
                      borderRadius: "3px",
                      transition: "width 0.6s ease"
                    }} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{ward.panchayat}</span>
                    {gapToFirst > 0 ? (
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        <TrendingDown size={9} style={{ display: "inline", marginRight: "2px" }} />
                        {gapToFirst} behind leader
                      </span>
                    ) : (
                      <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: "600" }}>🏆 Leader</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        {[
          { icon: <Users size={13} />, label: "Total Pledges", value: wards.reduce((s, w) => s + (w.pledged_homes || 0), 0).toLocaleString(), color: "#38bdf8" },
          { icon: <Target size={13} />, label: "Total Target", value: wards.reduce((s, w) => s + (w.target_homes || 100), 0).toLocaleString(), color: "#94a3b8" },
          { icon: <Zap size={13} />, label: "kW Potential", value: `${(wards.reduce((s, w) => s + (w.pledged_homes || 0), 0) * 2.5).toFixed(0)} kW`, color: "#fbbf24" },
        ].map(item => (
          <div key={item.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "10px", border: "1px solid var(--border-subtle)", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", color: item.color, marginBottom: "4px" }}>{item.icon}</div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#f8fafc", fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
            <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }}>{item.label}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes flash-green {
          0%, 100% { background: rgba(255,255,255,0.03); }
          20% { background: rgba(16,185,129,0.15); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
