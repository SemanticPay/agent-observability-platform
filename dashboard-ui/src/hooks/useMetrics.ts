import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:8000";

export interface MetricsSummary {
  total_cost: number;
  total_runs: number;
  total_tool_calls: number;
  avg_execution_duration: number;
  time_range: string;
}

export interface AgentMetrics {
  agent_id: string;
  cost?: number;
  tokens?: number;
  tool_calls?: number;
  llm_requests?: number;
  duration?: number;
}

export interface ToolMetrics {
  name: string;
  calls: number;
  avg_duration: number;
}

export interface AgentDetailMetrics {
  name: string;
  model: string;
  cost: number;
  runs: number;
  avg_duration: number;
  tools: ToolMetrics[];
  workflows: string[];
  subagents: string[];
}

export interface TimeSeriesData {
  time_series: {
    cost: Array<{ timestamp: string; value: number }>;
    tokens: Array<{ timestamp: string; value: number }>;
    tool_calls: Array<{ timestamp: string; value: number }>;
    duration: Array<{ timestamp: string; value: number }>;
  };
  hours: number;
  step: string;
}

export interface AgentInfo {
  name: string;
  model: string;
  tools: string[];
  workflows: string[];
}

export function useMetricsSummary(timeRange: string = "1h", refreshInterval: number = 30000) {
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/metrics/summary?time_range=${timeRange}`);
        if (!response.ok) throw new Error("Failed to fetch metrics");
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  return { data, loading, error };
}

export function useMetricsByAgent(timeRange: string = "1h", refreshInterval: number = 30000) {
  const [data, setData] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/metrics/by-agent?time_range=${timeRange}`);
        if (!response.ok) throw new Error("Failed to fetch agent metrics");
        const result = await response.json();
        setData(result.agents || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval]);

  return { data, loading, error };
}

export function useMetricsTimeSeries(hours: number = 24, step: string = "5m", refreshInterval: number = 60000) {
  const [data, setData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/metrics/time-series?hours=${hours}&step=${step}`);
        if (!response.ok) throw new Error("Failed to fetch time series");
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [hours, step, refreshInterval]);

  return { data, loading, error };
}

export function useAgentsInfo() {
  const [data, setData] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/agents/info`);
        if (!response.ok) throw new Error("Failed to fetch agent info");
        const result = await response.json();
        setData(result.agents || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 1 minute for info changes
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}

export function useAgentsDetail(refreshInterval: number = 30000) {
  const [data, setData] = useState<AgentDetailMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/metrics/agents/detail`);
        if (!response.ok) throw new Error("Failed to fetch agents detail");
        const result = await response.json();
        setData(result.agents || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading, error };
}
