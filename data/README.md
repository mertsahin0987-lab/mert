# Clipprr — Product Data

All products, prices, brands and colour variants live in CSV files in this folder.
You edit them in **Numbers / Excel / Google Sheets**, run one command, and the
app picks up your changes.

---

## The workflow

1. Open any of the `.csv` files in your spreadsheet app
2. Add / edit / delete rows
3. Save as CSV (overwriting the original file)
4. From the project root, run:
   ```
   npm run sync-data
   ```
5. Restart the app (`r` in the Expo terminal, or close/reopen)

---

## The files

### `products.csv`
One row per product. Required columns:

| Column | Meaning | Example |
|---|---|---|
| `id` | Unique product id (any short string) | `19` |
| `name` | Product name | `Magic Clip Cordless` |
| `brand` | Must match a name in `brands.csv` | `Wahl` |
| `category` | Category name (see categories list in app) | `Clippers` |
| `image` | Image filename (no extension) — must exist in `assets/products/<image>.png` | `magic-clip` |
| `price` | Base price used when sorting / filtering | `169.99` |
| `description` | Long description (wrap in `"quotes"` if it has commas) | `"Legendary 5-Star Magic Clip..."` |
| `isNew` | `true` / `false` — shows "NEW" badge | `false` |
| `trending` | `true` / `false` — surfaces on home | `true` |
| `upcomingRelease` | `true` / `false` — shows release countdown | `false` |
| `releaseDate` | `YYYY-MM-DD` — required if `upcomingRelease` is true | `2026-05-01` |

### `prices.csv`
One row per **product + retailer**. A product with 4 retailers = 4 rows.

| Column | Meaning | Example |
|---|---|---|
| `productId` | The `id` of the product in `products.csv` | `9` |
| `retailer` | Retailer name (any string — displayed as-is) | `Salons Direct` |
| `price` | Retailer's current price | `164.99` |
| `url` | Direct product page URL (your affiliate link if you have one) | `https://salonsdirect.com/...` |
| `inStock` | `true` / `false` | `true` |

### `brands.csv`
One row per brand.

| Column | Meaning | Example |
|---|---|---|
| `id` | Unique brand id | `9` |
| `name` | Brand name — must match `brand` in `products.csv` | `Hattori Hanzo` |
| `logo` | Logo filename (no extension) in `assets/brands/<logo>.png` | `hattori` |

### `colors.csv` (optional)
One row per product colour variant. Powers the colour swatch boxes on the product page.

| Column | Meaning | Example |
|---|---|---|
| `productId` | The product's id | `12` |
| `name` | Colour name | `Rose Gold` |
| `hex` | Hex colour for the dot indicator | `#E0BFB8` |
| `image` | Image filename to show in the swatch box (optional) | `gold-fx` |
| `linkedProductId` | If this colour is sold as a separate product, its id (optional) | `13` |

---

## Adding a new product — end-to-end

Say you want to add the **JRL Onyx Clipper**:

1. Drop the product image as `assets/products/jrl-onyx.png` (transparent background PNG)
2. Add to `products.csv`:
   ```
   19,Onyx Clipper,JRL,Clippers,jrl-onyx,239.99,"Matte black edition of the Fresh Fade.",true,true,false,
   ```
3. Add retailer prices to `prices.csv`:
   ```
   19,Salons Direct,234.99,https://salonsdirect.com/jrl-onyx,true
   19,Coolblades,239.99,https://coolblades.co.uk/jrl-onyx,true
   ```
4. Run `npm run sync-data`
5. The product is live in the app.

---

## Adding a new brand

1. Drop the logo as `assets/brands/<key>.png`
2. Add a row to `brands.csv` with that `<key>` in the `logo` column
3. You can now use the brand name in `products.csv`

---

## What the sync script checks

When you run `npm run sync-data`, you'll see:
- **Errors** (red) — missing required fields, bad references. The script refuses to write and tells you exactly which row.
- **Warnings** (yellow) — things that look suspicious but aren't fatal. E.g. a product with no retailer prices, or an image file that doesn't exist yet.

---

## Editing tips

- **Commas inside fields?** Wrap the whole field in `"quotes"`. Numbers/Excel does this automatically when you save as CSV.
- **Don't rename column headers.** The first row is the schema.
- **Don't edit `constants/generatedData.ts` by hand** — it gets overwritten every sync.
- **Numbers on Mac:** File → Export To → CSV. Choose "Unicode (UTF-8)".
- **Excel:** Save As → CSV UTF-8.
