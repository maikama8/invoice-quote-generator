import { Suspense } from "react";
import { Money } from "@/components/money";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/record-forms";
import { ConfirmSubmit } from "@/components/submit-button";
import { deleteProductAction } from "@/server/actions";
import { getCatalogue } from "@/server/books";

export const metadata = { title: "Catalogue" };

export default function CataloguePage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading the catalogue…</p>}>
      <Catalogue />
    </Suspense>
  );
}

async function Catalogue() {
  const products = await getCatalogue();
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Catalogue"
        lede="Prices stay in the currency they were written in. Adding one to a document does not convert it."
      />
      <ProductForm />
      <div className="mt-8 overflow-x-auto">
        <table className="data-table min-w-[44rem]">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item</th>
              <th>Unit</th>
              <th className="text-right">Price</th>
              <th>Tax</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} id={product.id}>
                <td className="font-medium">{product.sku}</td>
                <td>
                  {product.name}
                  {product.active ? null : <span className="ml-2 text-ink-soft">Inactive</span>}
                  {product.description ? <p className="text-ink-soft">{product.description}</p> : null}
                </td>
                <td>{product.unit}</td>
                <td className="text-right">
                  <Money minor={product.unitPriceMinor} currency={product.currency} />
                </td>
                <td>{product.taxable ? "Taxable" : "Exempt"}</td>
                <td>
                  <form action={deleteProductAction.bind(null, product.id)}>
                    <ConfirmSubmit message={`Remove ${product.name} from the catalogue?`}>Remove</ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
