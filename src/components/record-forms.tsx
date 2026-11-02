"use client";

import { useActionState } from "react";
import { CURRENCIES } from "@/lib/currencies";
import { formatMajorInput } from "@/lib/money";
import { idleState, type ActionState } from "@/lib/result";
import { clientAction, productAction, settingsAction } from "@/server/actions";
import { formatPercentInput } from "@/lib/document-input";
import type { BusinessProfile, CatalogueItem, Party } from "@/lib/views";
import { SubmitButton } from "./submit-button";

function Notice({ state }: { state: ActionState }) {
  if (state.ok || !state.message) return null;
  return (
    <p className="text-sm text-stamp" role="alert">
      {state.message}
    </p>
  );
}

export function ClientForm({ client }: { client?: Party }) {
  const [state, action] = useActionState(clientAction, idleState);
  return (
    <form action={action} className="card grid gap-4 p-5 sm:grid-cols-2">
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <label className="field">
        <span>Contact name</span>
        <input name="name" defaultValue={client?.name ?? ""} />
      </label>
      <label className="field">
        <span>Company</span>
        <input name="company" defaultValue={client?.company ?? ""} />
      </label>
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" defaultValue={client?.email ?? ""} />
      </label>
      <label className="field">
        <span>Phone</span>
        <input name="phone" defaultValue={client?.phone ?? ""} />
      </label>
      <label className="field sm:col-span-2">
        <span>Address</span>
        <input name="address" defaultValue={client?.address ?? ""} />
      </label>
      <label className="field">
        <span>City</span>
        <input name="city" defaultValue={client?.city ?? ""} />
      </label>
      <label className="field">
        <span>Country</span>
        <input name="country" defaultValue={client?.country ?? "Nigeria"} />
      </label>
      <label className="field sm:col-span-2">
        <span>Notes</span>
        <textarea name="notes" defaultValue={client?.notes ?? ""} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton>{client ? "Save client" : "Add client"}</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function ProductForm({ product }: { product?: CatalogueItem }) {
  const [state, action] = useActionState(productAction, idleState);
  return (
    <form action={action} className="card grid gap-4 p-5 sm:grid-cols-2">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <label className="field">
        <span>SKU</span>
        <input name="sku" defaultValue={product?.sku ?? ""} placeholder="WEB-FIX" required />
      </label>
      <label className="field">
        <span>Name</span>
        <input name="name" defaultValue={product?.name ?? ""} required />
      </label>
      <label className="field sm:col-span-2">
        <span>Description</span>
        <input name="description" defaultValue={product?.description ?? ""} />
      </label>
      <label className="field">
        <span>Unit price</span>
        <input
          name="unitPrice"
          inputMode="decimal"
          defaultValue={product ? formatMajorInput(product.unitPriceMinor) : ""}
          required
        />
      </label>
      <label className="field">
        <span>Currency</span>
        <select name="currency" defaultValue={product?.currency ?? "NGN"}>
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Unit</span>
        <input name="unit" defaultValue={product?.unit ?? "item"} placeholder="hour, day, project" />
      </label>
      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="taxable" defaultChecked={product?.taxable ?? true} />
          Taxable
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} />
          Active
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <SubmitButton>{product ? "Save item" : "Add to catalogue"}</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function SettingsForm({ settings }: { settings: BusinessProfile }) {
  const [state, action] = useActionState(settingsAction, idleState);
  return (
    <form action={action} className="grid gap-6">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-serif text-2xl sm:col-span-2">Business</h2>
        <label className="field">
          <span>Legal name</span>
          <input name="legalName" defaultValue={settings.legalName} required />
        </label>
        <label className="field">
          <span>Trading name</span>
          <input name="tradingName" defaultValue={settings.tradingName} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" defaultValue={settings.email} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" defaultValue={settings.phone} />
        </label>
        <label className="field sm:col-span-2">
          <span>Address</span>
          <textarea name="address" defaultValue={settings.address} />
        </label>
        <label className="field">
          <span>Website</span>
          <input name="website" defaultValue={settings.website} />
        </label>
        <label className="field">
          <span>TIN</span>
          <input name="tin" defaultValue={settings.tin} />
        </label>
        <label className="field sm:col-span-2">
          <span>Logo</span>
          <input name="logo" type="file" accept="image/png,image/jpeg" />
          {settings.logoDataUrl ? (
            <label className="mt-2 flex items-center gap-2 font-normal">
              <input type="checkbox" name="removeLogo" />
              Remove the current logo
            </label>
          ) : (
            <span className="font-normal text-ink-soft">PNG or JPEG, up to 400 KB. Shown on the PDF.</span>
          )}
        </label>
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-serif text-2xl sm:col-span-2">Tax and numbering</h2>
        <label className="field">
          <span>Default currency</span>
          <select name="defaultCurrency" defaultValue={settings.defaultCurrency}>
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} · {currency.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tax name</span>
          <input name="taxName" defaultValue={settings.taxName} />
        </label>
        <label className="field">
          <span>Tax rate (percent)</span>
          <input name="taxRate" defaultValue={formatPercentInput(settings.taxRateBps)} />
        </label>
        <label className="field">
          <span>Payment terms (days)</span>
          <input name="paymentTermsDays" defaultValue={String(settings.paymentTermsDays)} />
        </label>
        <label className="field">
          <span>Invoice prefix</span>
          <input name="invoicePrefix" defaultValue={settings.invoicePrefix} />
        </label>
        <label className="field">
          <span>Quote prefix</span>
          <input name="quotePrefix" defaultValue={settings.quotePrefix} />
        </label>
        <label className="field">
          <span>Number width</span>
          <input name="numberWidth" defaultValue={String(settings.numberWidth)} />
        </label>
        <label className="field sm:col-span-2">
          <span>Footer note</span>
          <textarea name="footerNote" defaultValue={settings.footerNote} />
        </label>
      </section>
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-serif text-2xl sm:col-span-2">Payment</h2>
        <p className="text-sm text-ink-soft sm:col-span-2">
          Paystack and Flutterwave are stubs. They build a link and do not call the provider. Links stay off unless
          PAYMENT_LINKS_ENABLED is true.
        </p>
        <label className="field">
          <span>Provider</span>
          <select name="paymentProvider" defaultValue={settings.paymentProvider}>
            <option value="none">Disabled</option>
            <option value="paystack">Paystack stub</option>
            <option value="flutterwave">Flutterwave stub</option>
          </select>
        </label>
        <label className="field">
          <span>Bank</span>
          <input name="bankName" defaultValue={settings.bankName} />
        </label>
        <label className="field">
          <span>Account name</span>
          <input name="bankAccountName" defaultValue={settings.bankAccountName} />
        </label>
        <label className="field">
          <span>Account number</span>
          <input name="bankAccountNumber" defaultValue={settings.bankAccountNumber} />
        </label>
      </section>
      <div className="flex items-center gap-3">
        <SubmitButton>Save settings</SubmitButton>
        <Notice state={state} />
      </div>
    </form>
  );
}
