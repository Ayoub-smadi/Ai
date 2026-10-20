import type { Product, ProductInput } from "@workspace/api-client-react";

const CSV_COLUMNS = [
  "name_arabic",
  "name_english",
  "aliases",
  "description",
  "category",
  "price",
  "currency",
  "unit",
  "package_size",
  "availability",
  "stock_quantity",
  "sku",
  "notes",
] as const;

const HEADER_FIELDS: Record<string, keyof ProductInput> = {
  name_arabic: "nameArabic",
  arabic_name: "nameArabic",
  namearabic: "nameArabic",
  name_english: "nameEnglish",
  english_name: "nameEnglish",
  nameenglish: "nameEnglish",
  aliases: "aliases",
  alternative_names: "aliases",
  alt_names: "aliases",
  description: "description",
  category: "category",
  price: "price",
  currency: "currency",
  unit: "unit",
  package_size: "packageSize",
  packagesize: "packageSize",
  availability: "availability",
  stock_quantity: "stockQuantity",
  stockquantity: "stockQuantity",
  sku: "sku",
  notes: "notes",
};

export type ProductCsvRow = { rowNumber: number; product: ProductInput };

export type ProductCsvImportResult = {
  products: ProductCsvRow[];
  errors: string[];
};

function parseCsvRecords(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      if (cell.length > 0) throw new Error("A quoted field must start at the beginning of a CSV cell.");
      quoted = true;
    } else if (character === ",") {
      record.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      record.push(cell);
      if (record.some((value) => value.trim() !== "")) records.push(record);
      record = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  if (cell.length > 0 || record.length > 0) {
    record.push(cell);
    if (record.some((value) => value.trim() !== "")) records.push(record);
  }
  return records;
}

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s-]+/g, "_");
}

function readProduct(row: string[], columns: Map<keyof ProductInput, number>, rowNumber: number): ProductInput {
  const value = (key: keyof ProductInput) => {
    const index = columns.get(key);
    return index === undefined ? "" : (row[index] ?? "").trim();
  };
  const nameArabic = value("nameArabic");
  const nameEnglish = value("nameEnglish");
  if (!nameArabic && !nameEnglish) {
    throw new Error(`Row ${rowNumber}: add a name_arabic or name_english value.`);
  }

  const price = value("price");
  if (price && !/^\d+(?:\.\d{1,4})?$/.test(price)) {
    throw new Error(`Row ${rowNumber}: price must be a non-negative decimal with up to four places.`);
  }

  const currency = value("currency") || "JOD";
  if (!/^[A-Za-z]{3}$/.test(currency)) {
    throw new Error(`Row ${rowNumber}: currency must be a three-letter code such as JOD or USD.`);
  }

  const availabilityInput = value("availability").toLocaleLowerCase().replace(/[\s-]+/g, "_");
  const availability = availabilityInput || "unknown";
  if (availability !== "in_stock" && availability !== "out_of_stock" && availability !== "unknown") {
    throw new Error(`Row ${rowNumber}: availability must be in_stock, out_of_stock, or unknown.`);
  }

  const stockText = value("stockQuantity");
  let stockQuantity: number | undefined;
  if (stockText) {
    if (!/^\d+$/.test(stockText)) {
      throw new Error(`Row ${rowNumber}: stock_quantity must be a non-negative whole number.`);
    }
    stockQuantity = Number(stockText);
    if (!Number.isSafeInteger(stockQuantity) || stockQuantity > 2_147_483_647) {
      throw new Error(`Row ${rowNumber}: stock_quantity is outside the supported range.`);
    }
  }

  const aliases = value("aliases")
    .split("|")
    .map((alias) => alias.trim())
    .filter(Boolean);
  return {
    nameArabic: nameArabic || undefined,
    nameEnglish: nameEnglish || undefined,
    aliases,
    description: value("description") || undefined,
    category: value("category") || undefined,
    price: price || undefined,
    currency: currency.toUpperCase(),
    unit: value("unit") || undefined,
    packageSize: value("packageSize") || undefined,
    availability,
    stockQuantity,
    sku: value("sku") || undefined,
    notes: value("notes") || undefined,
  };
}

export function parseProductCsv(text: string): ProductCsvImportResult {
  const records = parseCsvRecords(text);
  if (records.length < 2) {
    return { products: [], errors: ["The CSV needs a header row and at least one product row."] };
  }
  if (records.length > 501) {
    return { products: [], errors: ["A single CSV import can contain at most 500 product rows."] };
  }

  const columns = new Map<keyof ProductInput, number>();
  for (const [index, rawHeader] of records[0].entries()) {
    const field = HEADER_FIELDS[normalizeHeader(rawHeader)];
    if (!field) continue;
    if (columns.has(field)) {
      return { products: [], errors: [`The CSV contains more than one column for ${String(field)}.`] };
    }
    columns.set(field, index);
  }
  if (!columns.has("nameArabic") && !columns.has("nameEnglish")) {
    return { products: [], errors: ["Include a name_arabic or name_english column in the header row."] };
  }

  const products: ProductCsvRow[] = [];
  const errors: string[] = [];
  for (const [index, row] of records.slice(1).entries()) {
    const rowNumber = index + 2;
    const extraCells = row.slice(records[0].length);
    if (extraCells.some((value) => value.trim() !== "")) {
      errors.push(`Row ${rowNumber}: found values beyond the header columns.`);
      continue;
    }
    try {
      products.push({ rowNumber, product: readProduct(row, columns, rowNumber) });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Row ${rowNumber}: invalid product data.`);
    }
  }
  return { products, errors };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportProductsCsv(products: readonly Product[]): string {
  const rows = [
    CSV_COLUMNS,
    ...products.map((product) => [
      product.nameArabic,
      product.nameEnglish,
      product.aliases.join("|"),
      product.description,
      product.category,
      product.price,
      product.currency,
      product.unit,
      product.packageSize,
      product.availability,
      product.stockQuantity,
      product.sku,
      product.notes,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`;
}

export const PRODUCT_CSV_TEMPLATE = `\uFEFF${CSV_COLUMNS.join(",")}\r\n`;
