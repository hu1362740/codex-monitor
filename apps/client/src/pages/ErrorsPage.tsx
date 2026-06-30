import { Button, Empty, Input, Select, Space, Table, Typography } from "antd";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ErrorEvent } from "../api/types";
import { monitorApi } from "../api/client";

interface ErrorFilters {
  keyword: string;
  source?: string;
  release?: string;
}

/**
 * @description 判断错误事件是否命中关键词，覆盖错误名、消息、页面地址和来源字段。
 * @param event ErrorEvent，待筛选的错误事件。
 * @param keyword string，用户输入的关键词。
 * @returns boolean，返回 true 表示关键词匹配或关键词为空。
 */
function matchesKeyword(event: ErrorEvent, keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [event.name, event.message, event.source, event.url, event.release]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalized));
}

/**
 * @description 判断错误事件是否命中来源筛选。
 * @param event ErrorEvent，待筛选的错误事件。
 * @param source string | undefined，用户选择的来源。
 * @returns boolean，返回 true 表示来源匹配或未选择来源。
 */
function matchesSource(event: ErrorEvent, source?: string) {
  return !source || event.source === source;
}

/**
 * @description 判断错误事件是否命中版本筛选。
 * @param event ErrorEvent，待筛选的错误事件。
 * @param release string | undefined，用户选择的版本。
 * @returns boolean，返回 true 表示版本匹配或未选择版本。
 */
function matchesRelease(event: ErrorEvent, release?: string) {
  return !release || event.release === release;
}

/**
 * @description 根据页面筛选条件过滤错误事件列表。
 * @param events ErrorEvent[]，接口返回的错误事件列表。
 * @param filters ErrorFilters，页面当前筛选条件。
 * @returns ErrorEvent[]，过滤后的错误事件列表。
 */
function filterErrors(events: ErrorEvent[], filters: ErrorFilters) {
  return events.filter(
    (event) => matchesKeyword(event, filters.keyword) && matchesSource(event, filters.source) && matchesRelease(event, filters.release)
  );
}

/**
 * @description 从错误事件中提取去重后的下拉选项。
 * @param events ErrorEvent[]，接口返回的错误事件列表。
 * @param field "source" | "release"，需要提取的字段。
 * @returns Array<{ label: string; value: string }>，Ant Design Select 可用的选项。
 */
function buildOptions(events: ErrorEvent[], field: "source" | "release") {
  return Array.from(new Set(events.map((event) => event[field]).filter(Boolean) as string[])).map((value) => ({
    label: value,
    value
  }));
}

/**
 * @description 展示当前选中应用的错误事件列表，并支持展开查看错误堆栈和本地筛选。
 * @param applicationId string，顶部应用选择器当前选中的应用 ID。
 * @returns JSX.Element，错误监控页面。
 */
export function ErrorsPage({ applicationId }: { applicationId: string }) {
  const [filters, setFilters] = useState<ErrorFilters>({ keyword: "" });
  const query = useQuery({ queryKey: ["errors", applicationId], queryFn: () => monitorApi.errors(applicationId), enabled: Boolean(applicationId) });
  const events = query.data ?? [];
  const filteredEvents = useMemo(() => filterErrors(events, filters), [events, filters]);
  const sourceOptions = useMemo(() => buildOptions(events, "source"), [events]);
  const releaseOptions = useMemo(() => buildOptions(events, "release"), [events]);

  /**
   * @description 更新关键词筛选条件。
   * @param value string，用户输入的关键词。
   * @returns void，无返回值。
   */
  function updateKeyword(value: string) {
    setFilters((current) => ({ ...current, keyword: value }));
  }

  /**
   * @description 更新来源筛选条件。
   * @param value string | undefined，用户选择的来源。
   * @returns void，无返回值。
   */
  function updateSource(value?: string) {
    setFilters((current) => ({ ...current, source: value }));
  }

  /**
   * @description 更新版本筛选条件。
   * @param value string | undefined，用户选择的版本。
   * @returns void，无返回值。
   */
  function updateRelease(value?: string) {
    setFilters((current) => ({ ...current, release: value }));
  }

  /**
   * @description 清空页面当前筛选条件。
   * @returns void，无返回值。
   */
  function resetFilters() {
    setFilters({ keyword: "" });
  }

  if (!applicationId) return <Empty description="请先选择应用" />;
  return (
    <section>
      <Typography.Title level={3}>错误监控</Typography.Title>
      <Space className="filter-bar" wrap>
        <Input.Search
          className="filter-keyword"
          allowClear
          placeholder="搜索错误、消息、页面"
          value={filters.keyword}
          onChange={(event) => updateKeyword(event.target.value)}
        />
        <Select
          className="filter-select"
          allowClear
          placeholder="来源"
          options={sourceOptions}
          value={filters.source}
          onChange={updateSource}
        />
        <Select
          className="filter-select"
          allowClear
          placeholder="版本"
          options={releaseOptions}
          value={filters.release}
          onChange={updateRelease}
        />
        <Button onClick={resetFilters}>重置</Button>
        <Typography.Text type="secondary">
          {filteredEvents.length}/{events.length}
        </Typography.Text>
      </Space>
      <Table
        rowKey="id"
        loading={query.isLoading}
        dataSource={filteredEvents}
        expandable={{ expandedRowRender: (row) => <pre className="stack">{row.mappedStack || row.stack || "暂无堆栈"}</pre> }}
        columns={[
          { title: "错误", dataIndex: "name", width: 180 },
          { title: "消息", dataIndex: "message", ellipsis: true },
          { title: "来源", dataIndex: "source", width: 120 },
          { title: "页面", dataIndex: "url", ellipsis: true },
          { title: "版本", dataIndex: "release", width: 140 },
          { title: "时间", dataIndex: "occurredAt", width: 220 }
        ]}
      />
    </section>
  );
}
