import type { Transaction, FinanceAccount } from "@/types/atlas";
import { t } from "@/lib/i18n";

/**
 * Escapes standard CSV fields containing commas, double quotes, or newlines
 * according to RFC 4180 rules.
 */
function escapeCSVValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates UTF-8 encoded CSV content from a transactions ledger list.
 */
export function generateFinanceCsv(
  transactions: Transaction[],
  accounts: FinanceAccount[],
  language: "en" | "es",
): string {
  const headers = language === "es"
    ? [
        "Fecha",
        "Tipo",
        "Monto",
        "Moneda",
        "Categoría",
        "Descripción",
        "Cuenta",
        "Tipo de Cuenta",
        "Método de Pago",
        "Origen Planificado",
        "Creado El",
      ]
    : [
        "Date",
        "Type",
        "Amount",
        "Currency",
        "Category",
        "Description",
        "Account",
        "Account Type",
        "Payment Method",
        "Planned Source",
        "Created At",
      ];

  const rows = [headers.join(",")];

  transactions.forEach((tRecord) => {
    const acc = accounts.find((a) => a.id === tRecord.accountId);
    
    // Determine type label (localized)
    let typeLabel: string = tRecord.type;
    if (language === "es") {
      typeLabel = tRecord.type === "income" ? "Ingreso" : "Gasto";
    } else {
      typeLabel = tRecord.type === "income" ? "Income" : "Expense";
    }

    // Determine account details
    let accountName = "";
    let accountType = "";
    if (tRecord.accountId) {
      if (acc) {
        accountName = acc.name;
        accountType = language === "es"
          ? t(language, `finances.accounts.type.${acc.type}`, acc.type)
          : acc.type;
      } else {
        accountName = language === "es" ? "Desvinculado" : "Unlinked";
        accountType = "N/A";
      }
    } else {
      accountName = language === "es" ? "Histórico / Sin cuenta" : "Legacy / Unlinked";
      accountType = "N/A";
    }

    // Determine planned source tag
    let plannedLabel = "";
    if (tRecord.tag === "planned") {
      plannedLabel = language === "es" ? "Sí" : "Yes";
    } else {
      plannedLabel = language === "es" ? "No" : "No";
    }

    const rowData = [
      escapeCSVValue(tRecord.date),
      escapeCSVValue(typeLabel),
      escapeCSVValue(tRecord.amount),
      escapeCSVValue(tRecord.currency),
      escapeCSVValue(tRecord.category),
      escapeCSVValue(tRecord.description),
      escapeCSVValue(accountName),
      escapeCSVValue(accountType),
      escapeCSVValue(tRecord.paymentMethod),
      escapeCSVValue(plannedLabel),
      escapeCSVValue(tRecord.createdAt),
    ];

    rows.push(rowData.join(","));
  });

  return rows.join("\n");
}

/**
 * Triggers a browser-local CSV download with UTF-8 BOM prefix
 */
export function downloadCSV(csvContent: string, filename: string) {
  // UTF-8 Byte Order Mark (BOM) to ensure spreadsheet software parses foreign accents correctly
  const BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
  const blob = new Blob([BOM, csvContent], { type: "text/csv;charset=utf-8;" });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
