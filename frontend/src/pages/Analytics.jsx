// src/pages/Analytics.jsx
import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ShoppingCart, BarChart2, RefreshCw, AlertTriangle, Package, Clock } from "lucide-react";
import { getForecast, getRecommendations, getCategoryTrends } from "../services/mlApi";
import { api } from "../services/api";
import "./Analytics.css";

// ─── Action config ────────────────────────────────────────────────────────────
const ACTION = {
  BUY:    { color: "var(--color-success)", bg: "rgba(16,185,129,0.12)",  label: "Buy"    },
  WATCH:  { color: "var(--color-warning)", bg: "rgba(245,158,11,0.12)",  label: "Watch"  },
  REDUCE: { color: "var(--color-danger)",  bg: "rgba(239,68,68,0.12)",   label: "Reduce" },
  OK:     { color: "var(--color-success)", bg: "rgba(16,185,129,0.12)",  label: "OK ✓"   },
  HOLD:   { color: "var(--color-warning)", bg: "rgba(245,158,11,0.12)",  label: "Hold"   },
};
const ac = (a) => ACTION[a?.toUpperCase()] || ACTION.WATCH;

const TREND = {
  RISING:  { color: "var(--color-success)", label: "📈 Rising"  },
  FALLING: { color: "var(--color-danger)",  label: "📉 Falling" },
  STABLE:  { color: "var(--color-warning)", label: "➡ Stable"   },
};
const tc = (t) => TREND[t?.toUpperCase()] || TREND.STABLE;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Spin = ({ msg }) => (
  <div className="an-loading"><div className="an-spinner"/><span>{msg}</span></div>
);
const Err = ({ msg }) => (
  <div className="an-error"><AlertTriangle size={15}/> {msg}</div>
);

// ─── Forecast decision card ───────────────────────────────────────────────────
function DecisionCard({ d }) {
  const cfg = ac(d.action);
  const days = Math.round(d.days_left ?? 0);
  const barColor = days > 14 ? "var(--color-success)" : days > 7 ? "var(--color-warning)" : "var(--color-danger)";
  const barPct = Math.min(100, Math.round((days / 30) * 100));

  return (
    <div className="an-decision" style={{ "--dc": cfg.color }}>
      <div className="an-decision-row">
        <div>
          <div className="an-decision-name">{d.item_name}</div>
          <div className="an-decision-msg">💬 {d.message}</div>
        </div>
        <span className="an-action-pill" style={{ background: cfg.bg, color: cfg.color }}>
          {d.action} — {cfg.label}
        </span>
      </div>

      <div className="an-stat-row">
        <div className="an-stat-box">
          <div className="an-stat-box-label">Daily Sales</div>
          <div className="an-stat-box-val">{d.daily_sale ?? 0}</div>
        </div>
        <div className="an-stat-box">
          <div className="an-stat-box-label">Current Stock</div>
          <div className="an-stat-box-val">{d.stock ?? 0}</div>
        </div>
        <div className="an-stat-box">
          <div className="an-stat-box-label">Days Left</div>
          <div className="an-stat-box-val" style={{ color: barColor }}>{days}</div>
        </div>
      </div>

      <div className="an-days-bar-wrap">
        <div className="an-days-bar-labels">
          <span>Stock runway</span>
          <span style={{ color: barColor, fontWeight: 600 }}>{days} days remaining</span>
        </div>
        <div className="an-days-bar">
          <div className="an-days-fill" style={{ width: `${barPct}%`, background: barColor }}/>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Analytics() {
  const [tab, setTab] = useState("forecast");

  const [items, setItems]       = useState([]);
  const [selId,  setSelId]      = useState("");
  const [decision, setDecision] = useState(null);
  const [fcLoad,   setFcLoad]   = useState(false);
  const [fcErr,    setFcErr]    = useState(null);

  const [recs,    setRecs]      = useState(null);
  const [filter,  setFilter]    = useState("ALL");
  const [recLoad, setRecLoad]   = useState(false);
  const [recErr,  setRecErr]    = useState(null);

  const [trends,  setTrends]    = useState(null);
  const [trLoad,  setTrLoad]    = useState(false);
  const [trErr,   setTrErr]     = useState(null);

  // ── Load inventory items ──────────────────────────────────────────────────
  useEffect(() => {
    api.getItems()
      .then(res => {
        const list =
          res?.data?.items ??
          res?.data?.content ??
          res?.data ??
          res?.items ??
          res?.content ??
          (Array.isArray(res) ? res : []);
        setItems(
          (Array.isArray(list) ? list : []).map(i => ({
            id:   i.id,
            name: i.name ?? i.itemName ?? 'Unknown',
          }))
        );
      })
      .catch(err => {
        console.error('Failed to load items:', err);
        setItems([]);
      });
  }, []);

  const fetchForecast = useCallback(async (id) => {
    if (!id) return;
    setFcLoad(true); setFcErr(null); setDecision(null);
    try {
      setDecision(await getForecast(id));
    } catch (e) {
      const raw = e?.message ?? e?.error?.message ?? String(e);
      const detailMatch = raw.match(/"detail"\s*:\s*"([^"]+)"/);
      setFcErr(detailMatch ? detailMatch[1] : raw);
    }
    finally { setFcLoad(false); }
  }, []);

  const fetchRecs = useCallback(async () => {
    setRecLoad(true); setRecErr(null);
    try   { setRecs(await getRecommendations()); }
    catch (e) { setRecErr(e.message); }
    finally   { setRecLoad(false); }
  }, []);

  const fetchTrends = useCallback(async () => {
    setTrLoad(true); setTrErr(null);
    try   { setTrends(await getCategoryTrends()); }
    catch (e) { setTrErr(e.message); }
    finally   { setTrLoad(false); }
  }, []);

  useEffect(() => {
    if (tab === "recs"   && !recs)   fetchRecs();
    if (tab === "trends" && !trends) fetchTrends();
  }, [tab]);

  const refresh = () => {
    if (tab === "forecast" && selId) fetchForecast(selId);
    if (tab === "recs")   { setRecs(null);   fetchRecs();   }
    if (tab === "trends") { setTrends(null); fetchTrends(); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const buyCount    = recs?.filter(r => r.action === "BUY").length    ?? "—";
  const watchCount  = recs?.filter(r => r.action === "WATCH").length  ?? "—";
  const reduceCount = recs?.filter(r => r.action === "REDUCE").length ?? "—";
  const risingCount = trends?.filter(t => t.trend === "RISING").length ?? "—";
  const totalCats   = trends?.length ?? "—";
  const recList     = !recs ? [] : filter === "ALL" ? recs : recs.filter(r => r.action === filter);

  const summaryCards = [
    { icon: "📦", label: "Stock Days",       value: decision ? `${Math.round(decision.days_left)}d` : "—", note: decision?.item_name || "Select an item", color: "var(--color-primary)" },
    { icon: "🛒", label: "Items to Buy",     value: buyCount,    note: "High demand",       color: "var(--color-success)" },
    { icon: "👁",  label: "Items to Watch",   value: watchCount,  note: "Monitor stock",     color: "var(--color-warning)" },
    { icon: "📉", label: "Reduce Stock",     value: reduceCount, note: "Demand falling",    color: "var(--color-danger)"  },
    { icon: "📈", label: "Rising Categories",value: `${risingCount}/${totalCats}`, note: trends?.[0]?.category || "—", color: "var(--color-accent)" },
  ];

  return (
    <div className="an-root">

      <h1 className="an-title">ML Analytics</h1>
      <p className="an-sub">AI-powered forecasts and smart recommendations for your shop</p>

      {/* Summary strip */}
      <div className="an-summary-grid">
        {summaryCards.map(s => (
          <div className="an-summary-card" key={s.label} style={{ "--c": s.color }}>
            <div className="an-summary-icon">{s.icon}</div>
            <div className="an-summary-label">{s.label}</div>
            <div className="an-summary-value" style={{ color: s.color }}>{s.value}</div>
            <div className="an-summary-note">{s.note}</div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="an-card">
        <div className="an-card-header">
          <div className="an-card-title">
            <BarChart2 size={18}/> ML Insights
          </div>
          <button className="an-btn" onClick={refresh}>
            <RefreshCw size={13}/> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="an-tabs">
          {[
            { id: "forecast", label: "Forecast",        Icon: Clock        },
            { id: "recs",     label: "Recommendations", Icon: ShoppingCart },
            { id: "trends",   label: "Trends",          Icon: TrendingUp   },
          ].map(t => (
            <button key={t.id} className={`an-tab ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}>
              <t.Icon size={14}/> {t.label}
            </button>
          ))}
        </div>

        {/* ── FORECAST ──────────────────────────────────────────────────── */}
        {tab === "forecast" && (
          <>
            <div className="an-select-row">
              <span className="an-select-label">Select Item</span>
              <select className="an-select" value={selId}
                onChange={e => { setSelId(e.target.value); fetchForecast(e.target.value); }}>
                <option value="">— Choose an item —</option>
                {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
              </select>
              {selId && (
                <button className="an-btn primary" disabled={fcLoad}
                  onClick={() => fetchForecast(selId)}>
                  <RefreshCw size={13}/> Re-run
                </button>
              )}
            </div>

            {!selId && <div className="an-empty">⬆ Select an item above to see its stock forecast</div>}
            {fcLoad && <Spin msg="Running forecast..."/>}
            {fcErr  && (
              <div style={{
                background: "color-mix(in srgb, var(--color-warning) 8%, var(--color-surface-hover))",
                border: "1px solid color-mix(in srgb, var(--color-warning) 30%, var(--color-border))",
                borderLeft: "4px solid var(--color-warning)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem 1.5rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.25rem" }}>⚠️</span>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-warning)", fontSize: "0.9rem" }}>
                    Forecast unavailable
                  </span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--color-text-dim)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                  {fcErr.toLowerCase().includes("not enough") || fcErr.toLowerCase().includes("sales data")
                    ? "Not enough sales history for this item. Keep selling and try again after a few more transactions."
                    : fcErr.toLowerCase().includes("unavailable") || fcErr.toLowerCase().includes("service")
                    ? "ML service is currently unavailable. Please wait a moment and try again."
                    : fcErr.toLowerCase().includes("not found") || fcErr.toLowerCase().includes("unauthorized")
                    ? "Item not found or access denied."
                    : "Something went wrong. Please try again."}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-dimmer)", fontFamily: "var(--font-display)" }}>
                  {fcErr}
                </div>
              </div>
            )}
            {decision && !fcLoad && <DecisionCard d={decision}/>}
          </>
        )}

        {/* ── RECOMMENDATIONS ───────────────────────────────────────────── */}
        {tab === "recs" && (
          <>
            {recLoad && <Spin msg="Loading recommendations..."/>}
            {recErr  && <Err msg={recErr}/>}
            {recs && !recLoad && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
                  {[
                    { label: "🛒 Buy",    count: buyCount,    color: "var(--color-success)" },
                    { label: "👁 Watch",  count: watchCount,  color: "var(--color-warning)" },
                    { label: "📉 Reduce", count: reduceCount, color: "var(--color-danger)"  },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: `color-mix(in srgb, ${s.color} 10%, var(--color-surface-hover))`,
                      border: `1px solid color-mix(in srgb, ${s.color} 25%, var(--color-border))`,
                      borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", textAlign: "center",
                    }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "0.68rem", color: s.color, fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: s.color }}>{s.count}</div>
                    </div>
                  ))}
                </div>

                <div className="an-filter-row">
                  {[
                    { key: "ALL",    label: "All"     },
                    { key: "BUY",    label: "🛒 Buy"   },
                    { key: "WATCH",  label: "👁 Watch" },
                    { key: "REDUCE", label: "📉 Reduce" },
                  ].map(f => (
                    <button key={f.key} className={`an-pill ${filter === f.key ? "active" : ""}`}
                      onClick={() => setFilter(f.key)}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {recList.length === 0
                  ? <div className="an-empty">No items match this filter</div>
                  : (
                    <div className="an-rec-grid">
                      {recList.map(r => {
                        const cfg = ac(r.action);
                        return (
                          <div className="an-rec-card" key={r.item_id} style={{ "--rc": cfg.color }}>
                            <div className="an-rec-head">
                              <div>
                                <div className="an-rec-name">{r.item_name}</div>
                                <div className="an-rec-cat">{r.category}</div>
                              </div>
                              <span className="an-action-pill" style={{ background: cfg.bg, color: cfg.color }}>
                                {r.action}
                              </span>
                            </div>
                            <div className="an-rec-msg">💬 {r.message}</div>
                            <div className="an-rec-foot">
                              <span>Current stock</span>
                              <strong>{r.stock} units</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </>
            )}
          </>
        )}

        {/* ── TRENDS ────────────────────────────────────────────────────── */}
        {tab === "trends" && (
          <>
            {trLoad && <Spin msg="Loading trends..."/>}
            {trErr  && <Err msg={trErr}/>}
            {trends && !trLoad && (
              trends.length === 0
                ? <div className="an-empty">No trend data available</div>
                : (
                  <div className="an-trend-list">
                    {trends.map(t => {
                      const cfg = tc(t.trend);
                      const barW = Math.min(100, Math.round(Math.abs(t.growth_rate ?? 0)));
                      return (
                        <div className="an-trend-row" key={t.category} style={{ "--tc": cfg.color }}>
                          <div className="an-trend-top">
                            <div className="an-trend-cat">{t.category}</div>
                            <span className="an-trend-badge" style={{
                              background: `color-mix(in srgb, ${cfg.color} 15%, transparent)`,
                              color: cfg.color,
                            }}>
                              {cfg.label}
                            </span>
                            <div className="an-trend-pct" style={{ color: cfg.color }}>
                              +{t.growth_rate ?? 0}%
                            </div>
                          </div>
                          <div className="an-bar-wrap">
                            <div className="an-bar-fill" style={{ width: `${barW}%`, background: cfg.color }}/>
                          </div>
                          {t.message && <div className="an-trend-msg">💬 {t.message}</div>}
                        </div>
                      );
                    })}
                  </div>
                )
            )}
          </>
        )}

      </div>
    </div>
  );
}
