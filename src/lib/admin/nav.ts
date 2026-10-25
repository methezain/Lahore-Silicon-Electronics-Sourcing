export type AdminSection = "overview" | "orders" | "stock" | "products";

export type AdminNavItem = {
  key: AdminSection;
  label: string;
  href: string;
  built: boolean;
};

export const adminNav: readonly AdminNavItem[] = [
  { key: "overview", label: "Overview", href: "/admin", built: true },
  { key: "orders", label: "Orders", href: "/admin/orders", built: true },
  { key: "stock", label: "Stock", href: "/admin/stock", built: true },
  { key: "products", label: "Products", href: "/admin/products", built: true },
];
