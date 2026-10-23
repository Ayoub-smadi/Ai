import assert from "node:assert/strict";
import test from "node:test";
import { parseProductCsv } from "./product-csv";

test("parses quoted, bilingual CSV fields and preserves precise prices", () => {
  const result = parseProductCsv(
    '\uFEFFname_english,name_arabic,aliases,description,price,currency,availability,stock_quantity\r\n"Olive, tree","شجرة زيتون","zaytoon|olive ""tree""","Line one\nLine two",12.5000,jod,in stock,8',
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.products.length, 1);
  const product = result.products[0].product;
  assert.equal(product.nameEnglish, "Olive, tree");
  assert.equal(product.nameArabic, "شجرة زيتون");
  assert.deepEqual(product.aliases, ["zaytoon", 'olive "tree"']);
  assert.equal(product.description, "Line one\nLine two");
  assert.equal(product.price, "12.5000");
  assert.equal(product.currency, "JOD");
  assert.equal(product.availability, "in_stock");
  assert.equal(product.stockQuantity, 8);
});

test("reports invalid rows while retaining valid rows", () => {
  const result = parseProductCsv(
    "name_english,price\nMissing price,-1\nValid tree,2.4500",
  );

  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].rowNumber, 3);
  assert.equal(result.products[0].product.nameEnglish, "Valid tree");
  assert.deepEqual(result.errors, [
    "Row 2: price must be a non-negative decimal with up to four places.",
  ]);
});

test("rejects duplicate mapped headers and missing name columns", () => {
  const duplicate = parseProductCsv(
    "name_english,english_name\nTree,Olive tree",
  );
  assert.match(duplicate.errors[0], /more than one column for nameEnglish/);

  const missingName = parseProductCsv("price,category\n2.50,trees");
  assert.deepEqual(missingName.errors, [
    "Include a name_arabic or name_english column in the header row.",
  ]);
});

test("enforces the 500-row limit and rejects malformed quoted fields", () => {
  const tooManyRows = `name_english\n${Array.from(
    { length: 501 },
    (_, index) => `Tree ${index + 1}`,
  ).join("\n")}`;
  assert.deepEqual(parseProductCsv(tooManyRows), {
    products: [],
    errors: ["A single CSV import can contain at most 500 product rows."],
  });

  assert.throws(
    () => parseProductCsv('name_english\n"Unclosed tree'),
    /unclosed quoted field/,
  );
});
