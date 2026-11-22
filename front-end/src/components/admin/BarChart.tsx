// One bar needs only a label and its number.
export interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  title?: string;
  suffix?: string;
}

// A simple CSS bar chart, so no chart library is needed.
export function BarChart({ data, title, suffix = "" }: BarChartProps) {
  // Use at least 1 to avoid dividing by zero; all bars are relative to the largest value.
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <div className="rounded-3xl border border-[#EBD5D3] bg-white p-5 shadow-sm sm:p-6">
      {title && (
        <h3 className="mb-5 font-display text-lg font-semibold text-[#58111A]">{title}</h3>
      )}
      {/* Avoid showing an empty chart when the API returns no rows. */}
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#7A585B]">
          No chart data was returned by the server.
        </p>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-[#58111A]">{item.label}</span>
                <span className="shrink-0 font-bold text-[#800020]">
                  {item.value}{suffix}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F2DCDA]">
                {/* Small values still get 2% width so they remain visible. */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#800020] to-[#722F37] transition-all duration-500"
                  style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
