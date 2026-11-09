// Public catalogue codes are independent of stable product IDs and detail URLs.
export const cataloguePrefix = (product) => product.model === "318" && product.categoryId !== "mixed-set"
  ? (product.capacities?.includes("2.0L") ? "318B" : "318A")
  : String(product.model || "319") + (product.categoryId === "mixed-set" ? "套装" : "");

export const catalogueCodeFor = (product) => product.catalogueCode || product.slug;

export const isValidCatalogueCode = (product) => {
  const prefix = cataloguePrefix(product);
  return /^(318[AB]|319|319套装)-[1-9]\d*$/.test(catalogueCodeFor(product))
    && catalogueCodeFor(product).startsWith(prefix + "-");
};

export function nextCatalogueCode(products, product) {
  const prefix = cataloguePrefix(product);
  const highest = products.reduce((max, item) => {
    const code = catalogueCodeFor(item) || "";
    if (!code.startsWith(prefix + "-")) return max;
    const sequence = Number(code.slice(prefix.length + 1));
    return Number.isSafeInteger(sequence) && sequence > max ? sequence : max;
  }, product.categoryId === "mixed-set" || product.model === "318" ? 0 : 19);
  return prefix + "-" + (highest + 1);
}

export const catalogueImageAlt = (product, value) =>
  String(value || "").replace(product.slug, catalogueCodeFor(product));
