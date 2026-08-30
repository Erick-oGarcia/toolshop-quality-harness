/**
 * The consumer under contract: a catalog backend-for-frontend.
 *
 * It reads five fields out of a product payload that carries twelve. That gap is
 * the point of a consumer-driven contract — the provider stays free to change
 * everything this client never touches, and only a change to these five can
 * break it.
 */
export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
};

export type CatalogPage = {
  items: CatalogItem[];
  total: number;
};

type ProductPayload = {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
};

type ProductsResponse = {
  data: ProductPayload[];
  total: number;
};

export async function fetchCatalogPage(baseUrl: string, page: number): Promise<CatalogPage> {
  const response = await fetch(`${baseUrl}/products?page=${page}`);

  if (!response.ok) {
    throw new Error(`catalog request failed with ${response.status}`);
  }

  const body = (await response.json()) as ProductsResponse;

  return {
    total: body.total,
    items: body.data.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      inStock: product.in_stock,
    })),
  };
}
