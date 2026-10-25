import type { ZodIssue } from "zod";
import type { StoredProduct } from "./product-schema";

export type SpecRow = { label: string; value: string; unit: string };
export type PinRow = { pin: string; label: string; note: string };
export type FaqRow = { q: string; a: string };
export type ImageRow = { src: string; alt: string; note: string; width: string; height: string };

/** Everything the form shows, as the strings in the inputs. The same shape is built from a saved record or from a post. */
export type ProductValues = {
  part_number: string;
  manufacturer: string;
  mpn: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  package_type: string;
  mounting_type: string;
  voltage: string;
  logic_level: string;
  in_the_bag: string;
  not_included: string;
  limits: string;
  datasheet: string;
  price: string;
  min_qty: string;
  qty_multiple: string;
  low_stock_at: string;
  shelf_qty: string;
  initial_qty: string;
  specs: SpecRow[];
  key_specs: string[];
  pinout: PinRow[];
  faq: FaqRow[];
  companions: string[];
  images: ImageRow[];
  published: boolean;
};

export const SCALARS = [
  "part_number",
  "manufacturer",
  "mpn",
  "name",
  "category",
  "summary",
  "description",
  "package_type",
  "mounting_type",
  "voltage",
  "logic_level",
  "in_the_bag",
  "not_included",
  "limits",
  "datasheet",
  "price",
  "min_qty",
  "qty_multiple",
  "low_stock_at",
  "shelf_qty",
  "initial_qty",
] as const;

export function emptyValues(): ProductValues {
  return {
    part_number: "",
    manufacturer: "",
    mpn: "",
    name: "",
    category: "",
    summary: "",
    description: "",
    package_type: "",
    mounting_type: "",
    voltage: "",
    logic_level: "",
    in_the_bag: "",
    not_included: "",
    limits: "",
    datasheet: "",
    price: "",
    min_qty: "1",
    qty_multiple: "1",
    low_stock_at: "10",
    shelf_qty: "",
    initial_qty: "0",
    specs: [],
    key_specs: [],
    pinout: [],
    faq: [],
    companions: [],
    images: [],
    published: true,
  };
}

const text = (value: FormDataEntryValue | null): string => (typeof value === "string" ? value.trim() : "");
const list = (form: FormData, name: string): string[] => form.getAll(name).map((value) => text(value));

export function valuesFromForm(form: FormData): ProductValues {
  const values = emptyValues();
  for (const name of SCALARS) values[name] = text(form.get(name));
  const rows = <T>(names: string[], build: (cells: string[]) => T): T[] => {
    const columns = names.map((name) => list(form, name));
    const length = Math.max(0, ...columns.map((column) => column.length));
    return Array.from({ length }, (_, index) => build(columns.map((column) => column[index] ?? "")));
  };
  values.specs = rows(["spec_label", "spec_value", "spec_unit"], ([label = "", value = "", unit = ""]) => ({ label, value, unit })).filter((row) => row.label || row.value || row.unit);
  values.pinout = rows(["pin_pin", "pin_label", "pin_note"], ([pin = "", label = "", note = ""]) => ({ pin, label, note })).filter((row) => row.pin || row.label || row.note);
  values.faq = rows(["faq_q", "faq_a"], ([q = "", a = ""]) => ({ q, a })).filter((row) => row.q || row.a);
  values.images = rows(["image_src", "image_alt", "image_note", "image_w", "image_h"], ([src = "", alt = "", note = "", width = "", height = ""]) => ({ src, alt, note, width, height })).filter((row) => row.src);
  values.key_specs = list(form, "key_spec").filter(Boolean);
  values.companions = list(form, "companion").filter(Boolean);
  values.published = form.get("published") === "on";
  return values;
}

export function valuesFromRecord(record: StoredProduct, published: boolean, qty = 0): ProductValues {
  return {
    part_number: record.part_number,
    manufacturer: record.manufacturer,
    mpn: record.mpn,
    name: record.name,
    category: record.category,
    summary: record.summary,
    description: record.description,
    package_type: record.package_type,
    mounting_type: record.mounting_type,
    voltage: record.voltage ?? "",
    logic_level: record.logic_level ?? "",
    in_the_bag: record.in_the_bag,
    not_included: record.not_included ?? "",
    limits: record.limits ?? "",
    datasheet: record.datasheet ?? "",
    price: String(record.price),
    min_qty: String(record.min_qty),
    qty_multiple: String(record.qty_multiple),
    low_stock_at: String(record.low_stock_at),
    shelf_qty: record.shelf_qty ? String(record.shelf_qty) : "",
    initial_qty: String(qty),
    specs: record.specs.map((spec) => ({ label: spec.label, value: spec.value, unit: spec.unit ?? "" })),
    key_specs: [...record.key_specs],
    pinout: (record.pinout ?? []).map((pin) => ({ pin: pin.pin, label: pin.label, note: pin.note ?? "" })),
    faq: (record.faq ?? []).map((row) => ({ q: row.q, a: row.a })),
    companions: [...(record.companions ?? [])],
    images: (record.images ?? []).map((image) => ({
      src: image.src,
      alt: image.alt,
      note: image.note ?? "",
      width: image.width ? String(image.width) : "",
      height: image.height ? String(image.height) : "",
    })),
    published,
  };
}

function whole(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function optional(value: string): string | undefined {
  return value === "" ? undefined : value;
}

function optionalList<T>(rows: T[]): T[] | undefined {
  return rows.length > 0 ? rows : undefined;
}

/** The raw object the shared schema validates. Numbers that are not digits stay text so the schema names them. */
export function recordFromValues(values: ProductValues, stockQty: number): Record<string, unknown> {
  return {
    part_number: values.part_number,
    manufacturer: values.manufacturer,
    mpn: values.mpn,
    name: values.name,
    category: values.category,
    price: whole(values.price),
    currency: "PKR",
    stock_qty: stockQty,
    package_type: values.package_type,
    mounting_type: values.mounting_type,
    voltage: optional(values.voltage),
    specs: values.specs.map((row) => ({ label: row.label, value: row.value, unit: optional(row.unit) })),
    summary: values.summary,
    key_specs: values.key_specs,
    logic_level: optional(values.logic_level),
    pinout: optionalList(values.pinout.map((row) => ({ pin: row.pin, label: row.label, note: optional(row.note) }))),
    companions: optionalList(values.companions),
    not_included: optional(values.not_included),
    faq: optionalList(values.faq.map((row) => ({ q: row.q, a: row.a }))),
    low_stock_at: whole(values.low_stock_at),
    shelf_qty: values.shelf_qty === "" ? undefined : whole(values.shelf_qty),
    datasheet: optional(values.datasheet),
    images: optionalList(
      values.images.map((row) => ({
        src: row.src,
        alt: row.alt,
        note: optional(row.note),
        width: row.width === "" ? undefined : whole(row.width),
        height: row.height === "" ? undefined : whole(row.height),
      })),
    ),
    in_the_bag: values.in_the_bag,
    limits: optional(values.limits),
    min_qty: whole(values.min_qty),
    qty_multiple: whole(values.qty_multiple),
    description: values.description,
  };
}

export type FieldErrors = Record<string, string>;

const REQUIRED_NAMES: Record<string, string> = {
  part_number: "Enter the part number.",
  manufacturer: "Enter the manufacturer.",
  mpn: "Enter the manufacturer part number.",
  name: "Enter a name.",
  summary: "Write one sentence about what it does.",
  description: "Write a short description.",
  package_type: "Enter the package, like TO-220.",
  mounting_type: "Enter the mounting type, like Through-hole.",
  in_the_bag: "Say what is in the bag.",
};

/** One plain sentence per problem, keyed by the field path (`specs.0.label`). */
export function describeIssue(issue: ZodIssue): { path: string; message: string } {
  const path = issue.path.map(String).join(".");
  const top = String(issue.path[0] ?? "");
  const message = String(issue.message);
  let text = message;
  if (issue.code === "custom") text = message;
  else if (top === "category") text = "Choose a category.";
  else if (top === "summary" && issue.code === "too_big") text = "Keep the summary to 160 characters or fewer.";
  else if (top === "key_specs") text = "Pick 2 to 4 key specs.";
  else if (top === "faq" && issue.path.length === 1) text = "Add at least 3 questions, or remove them all.";
  else if (top === "faq") text = "Fill in the question and its answer.";
  else if (top === "specs" && issue.path.length === 1) text = "Add at least one spec.";
  else if (top === "specs") text = "Each spec needs a label and a value.";
  else if (top === "pinout") text = "Each pin needs a number or name and a label.";
  else if (top === "images") text = issue.path[2] === "alt" ? "Describe the photo for people who cannot see it." : "This photo is not usable.";
  else if (top === "datasheet") text = "Datasheet must be an absolute https link.";
  else if (issue.code === "invalid_type" || issue.code === "too_small" || issue.code === "too_big") {
    text = ["price", "min_qty", "qty_multiple", "low_stock_at", "shelf_qty"].includes(top) ? "Enter a whole number." : (REQUIRED_NAMES[top] ?? "This is required.");
  }
  if (top === "price" && issue.code !== "custom") text = "Price must be a whole number of rupees.";
  if (REQUIRED_NAMES[top] && (issue.code === "too_small" || issue.code === "invalid_type")) text = REQUIRED_NAMES[top] as string;
  return { path, message: text };
}

export function errorsFromIssues(issues: readonly ZodIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const { path, message } = describeIssue(issue);
    if (!(path in errors)) errors[path] = message;
  }
  return errors;
}
