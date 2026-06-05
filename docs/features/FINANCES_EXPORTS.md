# Finances CSV Exports & Portability

This document details the CSV export implementation for the Atlas Finances module, ensuring privacy, data ownership, and interoperability.

## Privacy & Security First

All exports are generated **entirely in the user's browser** (locally).
- No network requests are made.
- No transaction data is sent to cloud servers or Supabase.
- The browser downloads the CSV directly from a locally constructed memory Blob.
- A confirmation notice is shown to the user in their language (EN/ES) explaining this guarantee.

## Export Features

### 1. Scope Selection
Users can select between two export scopes from the **Finances > Transactions** panel:
1. **Export Current View**: Exports only the transactions that match the currently selected month, type, category, currency, and text filters.
2. **Export All Transactions**: Exports the entire transaction history from local storage.

### 2. File Name Format
The generated files use a consistent timestamped naming scheme:
- **Filtered view**: `atlas-finances-transactions-filtered-YYYY-MM-DD.csv`
- **All transactions**: `atlas-finances-transactions-YYYY-MM-DD.csv`

### 3. Excel Compatibility
To support seamless import into spreadsheet software (such as Microsoft Excel, Google Sheets, or LibreOffice):
- A **UTF-8 Byte Order Mark (BOM)** (`\xEF\xBB\xBF`) is prepended to the CSV data. This prevents accented Spanish characters (e.g., `ó`, `ñ`, `í`) from becoming corrupted (mojibake).
- The exporter follows **RFC 4180** rules for CSV escaping: any field containing commas, double quotes, or newlines is wrapped in double quotes, and internal double quotes are escaped as `""`.

## CSV Structure & Columns

The export contains the following columns, ordered by utility:

| Column (EN) | Columna (ES) | Type | Description / Localized UI Mapping |
| :--- | :--- | :--- | :--- |
| **Date** | **Fecha** | Date | ISO Date string (`YYYY-MM-DD`). |
| **Type** | **Tipo** | Text | The type of cashflow (`Income` / `Expense` or `Ingreso` / `Gasto`). |
| **Amount** | **Monto** | Numeric | Absolute decimal value of the transaction. |
| **Currency** | **Moneda** | Text | Currency code (e.g., `USD`, `PYG`). |
| **Category** | **Categoría** | Text | Categories such as `Food`, `Salary`, etc. |
| **Description** | **Descripción** | Text | User-provided description. Preserves commas/newlines. |
| **Account** | **Cuenta** | Text | Name of the linked account (e.g., `My Wallet`). Fallback is `Legacy / Unlinked` or `Histórico / Sin cuenta`. |
| **Account Type** | **Tipo de Cuenta** | Text | Localized type of account (e.g., `bank`, `cash`, `credit_card`). |
| **Payment Method** | **Método de Pago** | Text | Payment method (e.g., `Credit`, `Debit`, `Bank Transfer`). |
| **Planned Source** | **Origen Planificado** | Text | `Yes` / `No` (or `Sí` / `No`) indicating if this was spawned from a planned payment/income. |
| **Created At** | **Creado El** | DateTime | ISO Timestamp of record creation. |

> [!NOTE]
> Database internal IDs (e.g., `id`, `accountId`) are excluded from the default CSV export to keep files clean and human-readable, as they are not helpful for standard accounting spreadsheets.

## Future Enhancements

1. **CSV Import Module**:
   - Allow importing CSV exports to restore transaction history.
   - Detect duplicates based on unique hashes of `(date, amount, currency, description)`.
2. **Account Statement Import (OFX/QIF/CSV)**:
   - Match bank statement files to existing accounts.
   - Smart mapping tools to auto-categorize statement entries.
3. **Rule-Based Cleansing**:
   - Auto-categorize incoming transactions based on regular expressions matching user descriptions.
