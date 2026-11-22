import type { ReactNode } from "react";

// Each column knows how to show one cell from a row.
export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

// rowKey gives React a stable key; onRowClick is optional.
interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

// Generic table that can show any kind of admin record.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#EBD5D3] bg-white">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead className="bg-[#FAF6F5]">
          <tr>
            {/* Headings come from the same column list used for the cells. */}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`border-b border-[#EBD5D3] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#7A585B] ${column.headerClassName ?? ""}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Each row gets a unique key and can optionally respond to clicks. */}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-[#F2DCDA] transition last:border-b-0 hover:bg-[#FFF0F2] ${
                onRowClick ? "cursor-pointer" : ""
              }`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3.5 align-middle text-[#58111A] ${column.cellClassName ?? ""}`}
                >
                  {/* render(row) keeps this table reusable for different data shapes. */}
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
