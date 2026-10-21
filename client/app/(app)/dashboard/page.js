"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Stethoscope, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeading from "@/components/ui/page-heading";
import { apiRequest } from "@/lib/api";
import { EmptyState, QueryState } from "@/components/ui/states";
import { ChartSkeleton } from "@/components/ui/skeleton";

const PERIODS = [
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "last90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];
const COLORS = [
  "#168a83",
  "#438eb0",
  "#7d77ba",
  "#d69642",
  "#4e9b6d",
  "#d27469",
  "#6398a8",
  "#ad7e9f",
  "#9aa8b0",
];
const dateLabel = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

function useDashboardQuery(endpoint, query, enabled) {
  return useQuery({
    queryKey: ["dashboard", endpoint, query],
    queryFn: () =>
      apiRequest(`/dashboard/${endpoint}?${new URLSearchParams(query)}`),
    enabled,
  });
}

function MetricCard({ label, value, note, Icon }) {
  return (
    <article className="summary-card">
      <div className="summary-top">
        <span>{label}</span>
        <span className="summary-icon">
          <Icon size={17} />
        </span>
      </div>
      <div className="summary-value">{value ?? "—"}</div>
      <div className="summary-note">{note}</div>
    </article>
  );
}

function ChartPanel({
  title,
  subtitle,
  loading,
  error,
  retry,
  empty,
  children,
}) {
  return (
    <section className="panel analytics-panel">
      <h2>{title}</h2>
      <p className="panel-subtitle">{subtitle}</p>
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <QueryState error={error} onRetry={retry} />
      ) : empty ? (
        <EmptyState
          title="No data for this period"
          message="Try a wider date range or add records to the workspace."
        />
      ) : (
        children
      )}
    </section>
  );
}

function RecentRecords({
  title,
  resource,
  items,
  loading,
  error,
  retry,
  emptyMessage,
}) {
  return (
    <section className="panel recent-panel">
      <h2>{title}</h2>
      <p className="panel-subtitle">Latest records in the workspace</p>
      {loading ? (
        <div
          className="recent-skeleton"
          aria-label={`Loading ${title}`}
          aria-busy="true"
        >
          <ChartSkeleton />
        </div>
      ) : error ? (
        <QueryState error={error} onRetry={retry} />
      ) : items.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        items.map((record) => (
          <Link
            className="recent-record"
            href={`/${resource}/${record._id}`}
            key={record._id}
          >
            <span className="recent-avatar">
              {(record.name || "?")
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </span>
            <span className="recent-copy">
              <strong>{record.name}</strong>
              <span>
                {resource === "doctors"
                  ? record.specialization
                  : `${record.condition || "Patient"} · ${record.doctor?.name || "No doctor"}`}
              </span>
            </span>
            <time dateTime={record.createdAt}>
              {dateLabel(record.createdAt)}
            </time>
          </Link>
        ))
      )}
    </section>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState("last30");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const customRangeTooLong = Boolean(
    fromDate &&
    toDate &&
    fromDate <= toDate &&
    Date.parse(`${toDate}T23:59:59.999Z`) -
      Date.parse(`${fromDate}T00:00:00.000Z`) >
      366 * 24 * 60 * 60 * 1000,
  );
  const customReady =
    range !== "custom" ||
    Boolean(fromDate && toDate && fromDate <= toDate && !customRangeTooLong);
  const params = useMemo(() => {
    if (range !== "custom") return { range };
    if (!fromDate || !toDate) return { range };
    return {
      range,
      from: new Date(`${fromDate}T00:00:00.000Z`).toISOString(),
      to: new Date(`${toDate}T23:59:59.999Z`).toISOString(),
    };
  }, [range, fromDate, toDate]);
  const summary = useDashboardQuery("summary", params, customReady);
  const trends = useDashboardQuery("trends", params, customReady);
  const doctorCounts = useDashboardQuery(
    "patients-per-doctor",
    params,
    customReady,
  );
  const distributions = useDashboardQuery("distributions", params, customReady);
  const summaryData = summary.data?.data;
  const trendItems = trends.data?.data?.items || [];
  const doctorRows = doctorCounts.data?.data?.items || [];
  const distributionData = distributions.data?.data;
  const hasTrendData = trendItems.some((item) => item.doctors || item.patients);
  const hasDoctorCountData = doctorRows.some((item) => item.patientCount);
  const specializationRows = distributionData?.specializations || [];
  const conditionRows = distributionData?.conditions || [];
  const customDateError =
    range === "custom" &&
    fromDate &&
    toDate &&
    (fromDate > toDate || customRangeTooLong);
  const rangeName = PERIODS.find(
    (item) => item.value === range,
  )?.label.toLowerCase();

  return (
    <div className="page-wrap">
      <PageHeading eyebrow="Overview" title="Dashboard">
        <div className="dashboard-filters">
          <label htmlFor="analytics-range">Date range</label>
          <select
            id="analytics-range"
            className="field"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            {PERIODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <label htmlFor="analytics-from">From</label>
              <input
                id="analytics-from"
                type="date"
                className="field"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
              <label htmlFor="analytics-to">To</label>
              <input
                id="analytics-to"
                type="date"
                className="field"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </>
          )}
        </div>
      </PageHeading>
      {customDateError && (
        <div className="alert" role="alert">
          {customRangeTooLong
            ? "Custom date ranges cannot exceed 366 days."
            : "The start date must be before the end date."}
        </div>
      )}
      {!customReady && !customDateError && (
        <div className="alert" role="status">
          Choose both dates to load custom analytics.
        </div>
      )}
      <div className="summary-grid">
        {summary.isError ? (
          <div className="panel dashboard-summary-error">
            <QueryState
              error={summary.error}
              onRetry={() => summary.refetch()}
            />
          </div>
        ) : summary.isPending || !summaryData ? (
          Array.from({ length: 4 }, (_, index) => (
            <article className="summary-card" key={index} aria-busy="true">
              <ChartSkeleton />
            </article>
          ))
        ) : (
          <>
            <MetricCard
              label="Total doctors"
              value={summaryData.totals.doctors}
              note="Current workspace total"
              Icon={Stethoscope}
            />
            <MetricCard
              label="Total patients"
              value={summaryData.totals.patients}
              note="Current workspace total"
              Icon={Users}
            />
            <MetricCard
              label="Doctors added"
              value={summaryData.createdInRange.doctors}
              note={`During the ${rangeName}`}
              Icon={Stethoscope}
            />
            <MetricCard
              label="Patients added"
              value={summaryData.createdInRange.patients}
              note={`During the ${rangeName}`}
              Icon={Activity}
            />
          </>
        )}
      </div>

      <div className="analytics-grid">
        <ChartPanel
          title="Record creation trends"
          subtitle="Doctors and patients created by day"
          loading={trends.isPending}
          error={trends.error}
          retry={() => trends.refetch()}
          empty={!hasTrendData}
        >
          <div className="analytics-chart analytics-chart-trend">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendItems}
                margin={{ top: 8, right: 14, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="doctorFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#168a83" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#168a83" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="patientFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#438eb0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#438eb0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf1f3" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                  tick={{ fontSize: 11, fill: "#778895" }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#778895" }}
                />
                <Tooltip
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date || ""
                  }
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="doctors"
                  name="Doctors"
                  stroke="#168a83"
                  fill="url(#doctorFill)"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="patients"
                  name="Patients"
                  stroke="#438eb0"
                  fill="url(#patientFill)"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Patients per doctor"
          subtitle="New patients assigned during this period · top 20"
          loading={doctorCounts.isPending}
          error={doctorCounts.error}
          retry={() => doctorCounts.refetch()}
          empty={doctorRows.length === 0 || !hasDoctorCountData}
        >
          <div className="analytics-chart analytics-chart-bar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={doctorRows}
                layout="vertical"
                margin={{ top: 2, right: 14, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#edf1f3" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#778895" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#536778" }}
                  tickFormatter={(value) =>
                    value.length > 16 ? `${value.slice(0, 15)}…` : value
                  }
                />
                <Tooltip />
                <Bar
                  dataKey="patientCount"
                  name="Patients"
                  fill="#168a83"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Doctors by specialization"
          subtitle={`Doctor records created during the ${rangeName}`}
          loading={distributions.isPending}
          error={distributions.error}
          retry={() => distributions.refetch()}
          empty={specializationRows.length === 0}
        >
          <div className="analytics-chart analytics-chart-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={specializationRows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="56%"
                  outerRadius="78%"
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {specializationRows.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <ChartPanel
          title="Patients by condition"
          subtitle={`Patient records created during the ${rangeName}`}
          loading={distributions.isPending}
          error={distributions.error}
          retry={() => distributions.refetch()}
          empty={conditionRows.length === 0}
        >
          <div className="analytics-chart analytics-chart-donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conditionRows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="56%"
                  outerRadius="78%"
                  paddingAngle={2}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {conditionRows.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartPanel>

        <RecentRecords
          title="Recent doctors"
          resource="doctors"
          items={summaryData?.recentDoctors || []}
          loading={summary.isPending}
          error={summary.error}
          retry={() => summary.refetch()}
          emptyMessage="No doctors have been added yet."
        />
        <RecentRecords
          title="Recent patients"
          resource="patients"
          items={summaryData?.recentPatients || []}
          loading={summary.isPending}
          error={summary.error}
          retry={() => summary.refetch()}
          emptyMessage="No patients have been added yet."
        />
      </div>
    </div>
  );
}
