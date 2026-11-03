import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { formatMoney } from '../lib/format';
import { useSettings } from '../store/SettingsContext';
import { useUI } from '../store/UIContext';
import { ProductImage } from '../components/ui';
import { AdminError, AdminModal, AdminPage, Field, useFetch } from './shared';

type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  categoryId: number;
  tagline: string;
  description: string;
  ingredients: string[];
  priceCents: number;
  compareAtCents: number | null;
  image: string;
  badge: string;
  calories: number | null;
  prepMinutes: number;
  available: boolean;
  stock: number;
  lowStockAt: number;
  featured: boolean;
  sort: number;
  sizes: Array<{ name: string; priceDeltaCents: number; isDefault: boolean }>;
  addonIds: number[];
};

type Category = { id: number; slug: string; name: string; tagline: string; sort: number };
type Addon = { id: number; name: string; priceCents: number; active: boolean };

type ProductsPayload = { products: AdminProduct[]; categories: Category[]; addons: Addon[] };

type FormState = {
  name: string;
  categoryId: string;
  price: string;
  compareAt: string;
  tagline: string;
  description: string;
  ingredients: string;
  image: string;
  badge: string;
  calories: string;
  prepMinutes: string;
  stock: string;
  lowStockAt: string;
  available: boolean;
  featured: boolean;
  sort: string;
  sizesText: string;
  addonIds: number[];
};

const EMPTY: FormState = {
  name: '',
  categoryId: '',
  price: '',
  compareAt: '',
  tagline: '',
  description: '',
  ingredients: '',
  image: '/img/signature-burger.jpg',
  badge: '',
  calories: '',
  prepMinutes: '15',
  stock: '100',
  lowStockAt: '10',
  available: true,
  featured: false,
  sort: '99',
  sizesText: 'Regular | 0',
  addonIds: [],
};

function toForm(product: AdminProduct): FormState {
  return {
    name: product.name,
    categoryId: String(product.categoryId),
    price: (product.priceCents / 100).toFixed(2),
    compareAt: product.compareAtCents ? (product.compareAtCents / 100).toFixed(2) : '',
    tagline: product.tagline,
    description: product.description,
    ingredients: product.ingredients.join(', '),
    image: product.image,
    badge: product.badge,
    calories: product.calories ? String(product.calories) : '',
    prepMinutes: String(product.prepMinutes),
    stock: String(product.stock),
    lowStockAt: String(product.lowStockAt),
    available: product.available,
    featured: product.featured,
    sort: String(product.sort),
    sizesText: product.sizes.map((size) => `${size.name} | ${(size.priceDeltaCents / 100).toFixed(2)}`).join('\n'),
    addonIds: product.addonIds,
  };
}

function parseSizes(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, delta] = line.split('|').map((part) => part.trim());
      return { name: name || 'Regular', priceDelta: Number(delta ?? 0) || 0, isDefault: index === 0 };
    });
}

export function AdminProducts() {
  const { data, error, loading, reload } = useFetch<ProductsPayload>('/admin/products');
  const { settings } = useSettings();
  const { notify } = useUI();
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (data && !form.categoryId) {
      setForm((current) => ({ ...current, categoryId: String(data.categories[0]?.id ?? '') }));
    }
  }, [data, form.categoryId]);

  const openCreate = () => {
    setForm({ ...EMPTY, categoryId: String(data?.categories[0]?.id ?? '') });
    setFormError('');
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (product: AdminProduct) => {
    setForm(toForm(product));
    setFormError('');
    setEditing(product);
    setCreating(false);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setFormError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    const payload = {
      name: form.name,
      categoryId: Number(form.categoryId),
      price: form.price,
      compareAt: form.compareAt || '',
      tagline: form.tagline,
      description: form.description,
      ingredients: form.ingredients,
      image: form.image,
      badge: form.badge,
      calories: form.calories || '',
      prepMinutes: form.prepMinutes,
      stock: form.stock,
      lowStockAt: form.lowStockAt,
      available: form.available,
      featured: form.featured,
      sort: form.sort,
      sizes: parseSizes(form.sizesText),
      addonIds: form.addonIds,
    };
    try {
      if (editing) {
        await api(`/admin/products/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        notify(`${form.name} updated.`, 'success');
      } else {
        await api('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        notify(`${form.name} added to the menu.`, 'success');
      }
      close();
      await reload();
    } catch (issue) {
      setFormError(issue instanceof ApiError ? issue.message : 'Could not save the dish.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (product: AdminProduct) => {
    if (!window.confirm(`Remove ${product.name}? Dishes with order history are archived instead.`)) return;
    try {
      const result = await api<{ archived?: boolean; deleted?: boolean }>(`/admin/products/${product.id}`, { method: 'DELETE' });
      notify(result.archived ? `${product.name} archived.` : `${product.name} deleted.`, 'success');
      await reload();
    } catch (issue) {
      notify(issue instanceof ApiError ? issue.message : 'Could not remove the dish.', 'error');
    }
  };

  const filtered = (data?.products ?? []).filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <AdminPage
      title="Menu & stock"
      sub="Every dish on the storefront is served from this table."
      action={
        <button type="button" className="btn btn--gold btn--sm" onClick={openCreate}>
          New dish
        </button>
      }
    >
      <AdminError message={error} />
      <div className="admin-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search dishes"
          aria-label="Search dishes"
        />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void reload()}>
          Refresh
        </button>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="note">
                  Loading menu…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="note">
                  No dishes yet. Create your first one.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      <ProductImage src={product.image} alt="" sizes="40px" className="table-thumb" />
                      <div>
                        <div style={{ fontSize: '0.86rem' }}>{product.name}</div>
                        <div className="note" style={{ fontSize: '0.7rem' }}>
                          {product.slug}
                          {product.featured ? ' · featured' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{data?.categories.find((category) => category.id === product.categoryId)?.name ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatMoney(product.priceCents, settings.currency)}</td>
                  <td>
                    <span style={{ color: product.stock <= product.lowStockAt ? '#e4756a' : 'var(--ink)' }}>{product.stock}</span>
                    <div className="note" style={{ fontSize: '0.68rem' }}>
                      low at {product.lowStockAt}
                    </div>
                  </td>
                  <td>
                    <span className={`status-pill status-pill--${product.available ? 'green' : 'muted'}`}>
                      {product.available ? 'Available' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(product)}>
                        Edit
                      </button>
                      <button type="button" className="btn btn--quiet" onClick={() => void remove(product)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-grid admin-grid--2" style={{ marginTop: '1rem' }}>
        <CategoryManager categories={data?.categories ?? []} onChange={reload} />
        <AddonManager addons={data?.addons ?? []} onChange={reload} />
      </div>

      {creating || editing ? (
        <AdminModal title={editing ? `Edit ${editing.name}` : 'New dish'} onClose={close} wide>
          <form onSubmit={submit}>
            <AdminError message={formError} />
            <div className="field-row field-row--2">
              <Field label="Name">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} />
              </Field>
              <Field label="Category">
                <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>
                  {data?.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label={`Price (${settings.currency})`}>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  required
                />
              </Field>
              <Field label="Compare-at price" hint="Optional — shows a struck-through price.">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.compareAt}
                  onChange={(event) => setForm({ ...form, compareAt: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Tagline">
              <input value={form.tagline} onChange={(event) => setForm({ ...form, tagline: event.target.value })} maxLength={160} />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={1200}
                style={{ minHeight: '90px' }}
              />
            </Field>
            <Field label="Ingredients" hint="Comma separated — shown as pills on the product page.">
              <input value={form.ingredients} onChange={(event) => setForm({ ...form, ingredients: event.target.value })} />
            </Field>
            <div className="field-row field-row--2">
              <Field label="Image URL" hint="Use /img/… for local assets or a full https:// URL.">
                <input value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} required />
              </Field>
              <Field label="Badge">
                <input value={form.badge} onChange={(event) => setForm({ ...form, badge: event.target.value })} maxLength={40} />
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label="Calories">
                <input
                  type="number"
                  min="0"
                  value={form.calories}
                  onChange={(event) => setForm({ ...form, calories: event.target.value })}
                />
              </Field>
              <Field label="Prep minutes">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={form.prepMinutes}
                  onChange={(event) => setForm({ ...form, prepMinutes: event.target.value })}
                />
              </Field>
            </div>
            <div className="field-row field-row--2">
              <Field label="Stock on hand">
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) => setForm({ ...form, stock: event.target.value })}
                />
              </Field>
              <Field label="Low-stock alert at">
                <input
                  type="number"
                  min="0"
                  value={form.lowStockAt}
                  onChange={(event) => setForm({ ...form, lowStockAt: event.target.value })}
                />
              </Field>
            </div>
            <Field label="Portion sizes" hint="One per line: Name | extra price. First line is the default.">
              <textarea
                value={form.sizesText}
                onChange={(event) => setForm({ ...form, sizesText: event.target.value })}
                style={{ minHeight: '70px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                placeholder={'Regular | 0\nLarge | 7'}
              />
            </Field>
            <Field label="Available extras">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {data?.addons.map((addon) => {
                  const selected = form.addonIds.includes(addon.id);
                  return (
                    <label key={addon.id} className={`size-option ${selected ? 'is-selected' : ''}`} style={{ fontSize: '0.78rem' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setForm({
                            ...form,
                            addonIds: selected ? form.addonIds.filter((id) => id !== addon.id) : [...form.addonIds, addon.id],
                          })
                        }
                      />
                      {addon.name} · {formatMoney(addon.priceCents, settings.currency)}
                    </label>
                  );
                })}
              </div>
            </Field>
            <div className="field-row field-row--2">
              <Field label="Sort order">
                <input
                  type="number"
                  value={form.sort}
                  onChange={(event) => setForm({ ...form, sort: event.target.value })}
                />
              </Field>
              <div style={{ display: 'grid', gap: '0.4rem', alignContent: 'end', paddingBottom: '0.8rem' }}>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.available}
                    onChange={(event) => setForm({ ...form, available: event.target.checked })}
                  />
                  Visible &amp; orderable
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                  />
                  Feature on the homepage
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
              <button type="submit" className="btn btn--gold" disabled={busy}>
                {busy ? <span className="spinner" /> : null}
                {editing ? 'Save changes' : 'Create dish'}
              </button>
              <button type="button" className="btn btn--ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        </AdminModal>
      ) : null}
    </AdminPage>
  );
}

function CategoryManager({ categories, onChange }: { categories: Category[]; onChange: () => Promise<void> }) {
  const [draft, setDraft] = useState({ name: '', tagline: '' });
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Record<number, { name: string; tagline: string }>>({});
  const { notify } = useUI();

  useEffect(() => {
    const next: Record<number, { name: string; tagline: string }> = {};
    for (const category of categories) next[category.id] = { name: category.name, tagline: category.tagline };
    setRows(next);
  }, [categories]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api('/admin/categories', { method: 'POST', body: JSON.stringify(draft) });
      setDraft({ name: '', tagline: '' });
      notify('Category added.', 'success');
      await onChange();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not add the category.');
    }
  };

  const save = async (id: number) => {
    const row = rows[id];
    if (!row) return;
    try {
      await api(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(row) });
      notify('Category updated.', 'success');
      await onChange();
    } catch (issue) {
      notify(issue instanceof ApiError ? issue.message : 'Could not save.', 'error');
    }
  };

  const remove = async (id: number) => {
    try {
      await api(`/admin/categories/${id}`, { method: 'DELETE' });
      notify('Category deleted.', 'success');
      await onChange();
    } catch (issue) {
      notify(issue instanceof ApiError ? issue.message : 'Could not delete.', 'error');
    }
  };

  return (
    <div className="panel">
      <h2 className="panel__title">Categories</h2>
      <AdminError message={error} />
      <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.8rem' }}>
        {categories.map((category) => (
          <div key={category.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.3rem', alignItems: 'center' }}>
            <input
              value={rows[category.id]?.name ?? ''}
              onChange={(event) => setRows({ ...rows, [category.id]: { ...rows[category.id], name: event.target.value } })}
              aria-label={`Name for ${category.name}`}
              style={{ padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(8,10,11,0.7)', fontSize: '0.8rem' }}
            />
            <input
              value={rows[category.id]?.tagline ?? ''}
              onChange={(event) => setRows({ ...rows, [category.id]: { ...rows[category.id], tagline: event.target.value } })}
              aria-label={`Tagline for ${category.name}`}
              placeholder="Tagline"
              style={{ padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(8,10,11,0.7)', fontSize: '0.8rem' }}
            />
            <button type="button" className="btn btn--quiet" onClick={() => void save(category.id)}>
              Save
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => void remove(category.id)} aria-label={`Delete ${category.name}`}>
              ×
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={create} style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.3rem' }}>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="New category"
          required
          aria-label="New category name"
          style={{ padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(8,10,11,0.7)', fontSize: '0.8rem' }}
        />
        <input
          value={draft.tagline}
          onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
          placeholder="Tagline"
          aria-label="New category tagline"
          style={{ padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(8,10,11,0.7)', fontSize: '0.8rem' }}
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          Add
        </button>
      </form>
    </div>
  );
}

function AddonManager({ addons, onChange }: { addons: Addon[]; onChange: () => Promise<void> }) {
  const [draft, setDraft] = useState({ name: '', price: '' });
  const [error, setError] = useState('');
  const { notify } = useUI();

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await api('/admin/addons', { method: 'POST', body: JSON.stringify(draft) });
      setDraft({ name: '', price: '' });
      notify('Extra added.', 'success');
      await onChange();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Could not add the extra.');
    }
  };

  const toggle = async (addon: Addon) => {
    try {
      await api(`/admin/addons/${addon.id}`, { method: 'PATCH', body: JSON.stringify({ active: !addon.active }) });
      await onChange();
    } catch {
      notify('Could not update the extra.', 'error');
    }
  };

  const remove = async (addon: Addon) => {
    try {
      await api(`/admin/addons/${addon.id}`, { method: 'DELETE' });
      notify('Extra removed.', 'success');
      await onChange();
    } catch {
      notify('Could not remove the extra.', 'error');
    }
  };

  return (
    <div className="panel">
      <h2 className="panel__title">Available extras</h2>
      <AdminError message={error} />
      <div style={{ display: 'grid', gap: '0.35rem', marginTop: '0.8rem' }}>
        {addons.map((addon) => (
          <div key={addon.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
            <span style={{ flex: 1 }}>{addon.name}</span>
            <span className="note">{formatMoney(addon.priceCents, 'SAR')}</span>
            <button type="button" className="btn btn--quiet" onClick={() => void toggle(addon)}>
              {addon.active ? 'Active' : 'Hidden'}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => void remove(addon)} aria-label={`Delete ${addon.name}`}>
              ×
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={create} style={{ marginTop: '0.9rem', display: 'grid', gridTemplateColumns: '1fr 90px auto', gap: '0.3rem' }}>
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="Extra name"
          required
          aria-label="New extra name"
          style={{ padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(8,10,11,0.7)', fontSize: '0.8rem' }}
        />
        <input
          value={draft.price}
          onChange={(event) => setDraft({ ...draft, price: event.target.value })}
          placeholder="4.00"
          type="number"
          step="0.01"
          min="0"
          required
          aria-label="New extra price"
          style={{ padding: '0.5rem 0.6rem', borderRadius: 8, border: '1px solid var(--line)', background: 'rgba(8,10,11,0.7)', fontSize: '0.8rem' }}
        />
        <button type="submit" className="btn btn--ghost btn--sm">
          Add
        </button>
      </form>
    </div>
  );
}
