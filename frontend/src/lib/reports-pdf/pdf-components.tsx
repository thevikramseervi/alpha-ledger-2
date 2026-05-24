import { StyleSheet, Text, View } from '@react-pdf/renderer';
import { PDF_COLORS, pdfStyles } from '@/lib/reports-pdf/pdf-styles';
import { pdfMoney } from '@/lib/reports-pdf/pdf-format';

type PdfStyle = ReturnType<typeof StyleSheet.create>[string];

export function PageFooter({ section }: { section: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerBrand}>Alpha Ledger</Text>
      <Text>{section}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

export function BrandMark() {
  return (
    <View style={pdfStyles.brandMark}>
      <Text style={pdfStyles.brandMarkText}>AL</Text>
    </View>
  );
}

export function PdfTable({
  headers,
  rows,
  widths,
  zebra = false,
  cellStyles,
}: {
  headers: string[];
  rows: string[][];
  widths: string[];
  zebra?: boolean;
  cellStyles?: Array<Array<PdfStyle | undefined>>;
}) {
  return (
    <View style={pdfStyles.table}>
      <View style={pdfStyles.tableHeader}>
        {headers.map((header, index) => (
          <Text
            key={`${header}-${index}`}
            style={[pdfStyles.tableHeaderCell, { width: widths[index] }]}
          >
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[
            pdfStyles.tableRow,
            ...(zebra && rowIndex % 2 === 1 ? [pdfStyles.tableRowAlt] : []),
          ]}
        >
          {row.map((cell, cellIndex) => (
            <Text
              key={`${rowIndex}-${cellIndex}`}
              style={[
                pdfStyles.tableCell,
                { width: widths[cellIndex] },
                ...(cellStyles?.[rowIndex]?.[cellIndex]
                  ? [cellStyles[rowIndex]![cellIndex]!]
                  : []),
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={pdfStyles.kpiCard}>
      <Text style={pdfStyles.kpiLabel}>{label}</Text>
      <Text style={[pdfStyles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

export function BarRow({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix?: string;
}) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 8.5, maxWidth: '65%' }}>{label}</Text>
        <Text style={{ fontSize: 8.5, color: PDF_COLORS.muted }}>
          {suffix ? `${suffix} · ` : ''}
          {pdfMoney(value)}
        </Text>
      </View>
      <View style={pdfStyles.barTrack}>
        <View
          style={[
            pdfStyles.barFill,
            { width: `${width}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

export function TableOfContents({ items }: { items: string[] }) {
  return (
    <View style={pdfStyles.tocBox}>
      <Text style={pdfStyles.tocTitle}>Contents</Text>
      {items.map((item) => (
        <Text key={item} style={pdfStyles.tocItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}
