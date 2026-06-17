// Re-export commonly used antd components
export {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Table,
  message,
  notification,
} from "antd";

import { Table } from "antd";
import type { TableProps } from "antd";

type ProTableProps<T extends object> = TableProps<T> & {
  search?: boolean | Record<string, unknown>;
  options?: boolean;
  request?: unknown;
};

export const ProTable = <T extends object>({ search, options, request, ...rest }: ProTableProps<T>) => (
  <Table {...rest} />
);
