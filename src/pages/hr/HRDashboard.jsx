import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HRSidebar from "../../components/HRSidebar";
import { KPICard, Avatar, StatusPill, ScoreBadge } from "../../components/UI";
import { STATUS_LABELS } from "../../data/mock";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--s3)",
          border: "1px solid var(--b2)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
        }}
      >
        <div style={{ color: "var(--m1)", marginBottom: 4 }}>{label}</div>
        <div style={{ color: "#8AB8FF", fontWeight: 600 }}>
          {payload[0].value} applications
        </div>
        {payload[1] && (
          <div style={{ color: "var(--teal)", fontWeight: 600 }}>
            {payload[1].value} shortlisted
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function HRDashboard() {
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [jobPosts, setJobPosts] = useState([]);

  const statuses = [
    "all",
    "new",
    "reviewing",
    "shortlisted",
    "interview",
    "hired",
    "rejected",
  ];

  const normalizeStatus = (status) => {
    const raw = typeof status === "string" ? status.trim().toLowerCase() : "";
    if (raw === "pending") return "new";
    const allowed = new Set(statuses.filter((s) => s !== "all"));
    return allowed.has(raw) ? raw : "new";
  };

  const buildInitials = (name) => {
    if (!name) return "NA";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((part) => part[0].toUpperCase());
    return letters.join("") || "NA";
  };

  const normalizeCandidateFromApplication = (app, index) => {
    const name =
      app?.candidate?.name || app?.candidate_name || app?.name || "Candidate";
    const email =
      app?.candidate?.email || app?.candidate_email || app?.email || "";
    const role = app?.job?.title || app?.appliedRole || "";
    const location =
      app?.job?.work_mode || app?.job?.location || app?.location || "";
    const scoreValue = Number(
      app?.score?.value ?? app?.score ?? app?.resume_rate ?? 0,
    );

    return {
      id: app?._id || app?.id || `application-${index}`,
      postId:
        app?.post_id ||
        app?.postId ||
        app?.job_post_id ||
        app?.job?.post_id ||
        app?.job?.id ||
        app?.job_id ||
        "",
      name,
      email,
      location,
      appliedRole: role,
      appliedDate: app?.appliedDate || app?.createdAt || "",
      status: normalizeStatus(app?.status || app?.statue),
      score: Number.isFinite(scoreValue) ? scoreValue : 0,
      experience: app?.experience || "",
      emails: Array.isArray(app?.emails) ? app.emails : [],
      avatar: buildInitials(name),
      avatarColor: "blue",
    };
  };

  const buildWeeklyData = (items) => {
    const now = new Date();
    const buckets = Array.from({ length: 8 }, (_, index) => ({
      week: `W${index + 1}`,
      applications: 0,
      shortlisted: 0,
    }));

    items.forEach((item) => {
      const appliedDate = item.appliedDate ? new Date(item.appliedDate) : null;
      if (!appliedDate || Number.isNaN(appliedDate.getTime())) return;

      const diffWeeks = Math.floor(
        (now - appliedDate) / (7 * 24 * 60 * 60 * 1000),
      );
      if (diffWeeks < 0 || diffWeeks > 7) return;

      const bucketIndex = 7 - diffWeeks;
      buckets[bucketIndex].applications += 1;
      if (["shortlisted", "interview", "hired"].includes(item.status)) {
        buckets[bucketIndex].shortlisted += 1;
      }
    });

    return buckets;
  };

  useEffect(() => {
    let isActive = true;
    (async () => {
      setLoading(true);
      try {
        const { getHRJobs, getHrApplications, normalizeJob } =
          await import("../../services/api");
        const [rawJobs, apps] = await Promise.all([
          getHRJobs(),
          getHrApplications(),
        ]);
        const posts = Array.isArray(rawJobs)
          ? rawJobs.map(normalizeJob)
          : (rawJobs.posts || []).map(normalizeJob);
        const normalizedApps = Array.isArray(apps)
          ? apps.map((app, index) =>
              normalizeCandidateFromApplication(app, index),
            )
          : [];

        if (isActive) {
          setJobPosts(posts);
          setCandidates(normalizedApps);
        }
      } catch {
        if (isActive) {
          setJobPosts([]);
          setCandidates([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const filtered =
    filter === "all"
      ? candidates
      : candidates.filter((c) => c.status === filter);

  const avgScore = candidates.length
    ? Math.round(
        (candidates.reduce((a, c) => a + c.score, 0) / candidates.length) * 10,
      ) / 10
    : 0;
  const totalEmails = candidates.reduce(
    (a, c) => a + (c.emails?.length || 0),
    0,
  );

  const kpis = [
    {
      label: "Total Applicants",
      value: candidates.length,
      delta: "Live",
      deltaUp: true,
      color: "#5B8EF8",
    },
    {
      label: "Shortlisted",
      value: candidates.filter((c) => c.status === "shortlisted").length,
      delta: "Live",
      deltaUp: true,
      color: "#1ECFAA",
    },
    {
      label: "Avg AI Score",
      value: avgScore,
      delta: "Live",
      deltaUp: true,
      color: "#F0A030",
    },
    {
      label: "Emails Sent",
      value: totalEmails,
      delta: "Live",
      deltaUp: true,
      color: "#8B70F5",
    },
  ];

  const weeklyData = buildWeeklyData(candidates);
  const activeJobsCount = jobPosts.filter((j) => j.status === "active").length;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg)",
      }}
    >
      <HRSidebar />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid var(--b1)",
            background: "rgba(12,14,20,0.8)",
            backdropFilter: "blur(10px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              Recruitment Overview
            </h1>
            <div style={{ fontSize: 12.5, color: "var(--m2)", marginTop: 2 }}>
              April 2026 · {loading ? "…" : activeJobsCount} active roles
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost btn-sm">Export PDF</button>
            <Link to="/hr/jobs" className="btn btn-primary btn-sm">
              + Post New Job
            </Link>
          </div>
        </div>

        <div
          style={{
            padding: "28px 32px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 14,
            }}
          >
            {kpis.map((k, i) => (
              <KPICard
                key={i}
                {...k}
                value={loading ? "…" : k.value}
                delta={loading ? "Loading" : k.delta}
              />
            ))}
          </div>

          {/* Charts row */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
          >
            {/* Bar Chart */}
            <div className="card" style={{ padding: "20px 20px 14px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  Applications over time
                </div>
                <span className="pill pill-blue" style={{ fontSize: 10.5 }}>
                  8 weeks
                </span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <XAxis
                    dataKey="week"
                    tick={{ fill: "#545D80", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#545D80", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar
                    dataKey="applications"
                    fill="url(#blueGrad)"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="shortlisted"
                    fill="rgba(30,207,170,0.6)"
                    radius={[3, 3, 0, 0]}
                  />
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5B8EF8" />
                      <stop offset="100%" stopColor="#8B70F5" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Job Posts Summary */}
            <div className="card" style={{ padding: "20px" }}>
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 16,
                }}
              >
                Active Job Posts
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {loading && (
                  <div style={{ fontSize: 12.5, color: "var(--m2)" }}>
                    Loading job posts...
                  </div>
                )}
                {!loading && jobPosts.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--m2)" }}>
                    No active jobs yet.
                  </div>
                )}
                {!loading &&
                  jobPosts.map((job) => {
                    const jobId = job._id || job.id;
                    const jobCands = candidates.filter(
                      (c) => String(c.postId || "") === String(jobId || ""),
                    );
                    const avgScore = jobCands.length
                      ? Math.round(
                          jobCands.reduce((a, c) => a + c.score, 0) /
                            jobCands.length,
                        )
                      : 0;
                    const colorMap = {
                      Engineering: "#5B8EF8",
                      "AI Research": "#8B70F5",
                      Design: "#F0A030",
                      HR: "#22C55E",
                    };
                    const color = colorMap[job.department] || "#5B8EF8";
                    return (
                      <div
                        key={job.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 8,
                          transition: "background 0.15s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--b1)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 500,
                              color: "var(--text)",
                            }}
                          >
                            {job.title}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--m2)" }}>
                            {job.applicants} applicants
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color:
                                avgScore >= 80
                                  ? "var(--teal)"
                                  : avgScore >= 60
                                    ? "var(--amber)"
                                    : "var(--m2)",
                              fontFamily: "'Syne', sans-serif",
                            }}
                          >
                            {avgScore || "—"}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--m3)" }}>
                            avg score
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="card" style={{ overflow: "hidden" }}>
            {/* Table header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid var(--b1)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                All Candidates
              </div>
              <Link
                to="/hr/candidates"
                style={{
                  fontSize: 12.5,
                  color: "var(--blue)",
                  textDecoration: "none",
                }}
              >
                View all →
              </Link>
            </div>

            {/* Status tabs */}
            <div
              style={{
                display: "flex",
                gap: 2,
                padding: "12px 20px",
                borderBottom: "1px solid var(--b1)",
                overflowX: "auto",
              }}
            >
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 7,
                    background:
                      filter === s ? "var(--blue-dim)" : "transparent",
                    border:
                      filter === s
                        ? "1px solid rgba(91,142,248,0.2)"
                        : "1px solid transparent",
                    color: filter === s ? "#8AB8FF" : "var(--m2)",
                    fontSize: 12.5,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s]}
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>
                    {loading
                      ? "…"
                      : s === "all"
                        ? candidates.length
                        : candidates.filter((c) => c.status === s).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Table */}
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2.5fr 1.5fr 100px 120px 80px",
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--b1)",
                }}
              >
                {["Candidate", "Role", "AI Score", "Status", "Actions"].map(
                  (h) => (
                    <div
                      key={h}
                      style={{
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: "0.8px",
                        color: "var(--m2)",
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {h}
                    </div>
                  ),
                )}
              </div>
              {loading && (
                <div style={{ padding: "16px 20px", color: "var(--m2)" }}>
                  Loading candidates...
                </div>
              )}
              {!loading &&
                filtered.map((c) => (
                  <Link
                    key={c.id}
                    to={`/hr/candidates/${c.id}`}
                    style={{
                      textDecoration: "none",
                      display: "grid",
                      gridTemplateColumns: "2.5fr 1.5fr 100px 120px 80px",
                      padding: "13px 20px",
                      borderBottom: "1px solid var(--b1)",
                      alignItems: "center",
                      transition: "background 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "var(--b1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <Avatar
                        initials={c.avatar}
                        color={c.avatarColor}
                        size={34}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: "var(--text)",
                          }}
                        >
                          {c.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--m2)" }}>
                          {c.location}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "var(--m1)" }}>
                        {c.appliedRole}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--m3)" }}>
                        {c.experience} exp
                      </div>
                    </div>
                    <ScoreBadge score={c.score} showBar />
                    <StatusPill status={c.status} />
                    <span style={{ fontSize: 12.5, color: "var(--blue)" }}>
                      View →
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
