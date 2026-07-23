# Unicode and Font Audit

**Audit date:** 2026-07-22  
**Status:** database/source fixed and verified; browser computed font pending.

## Root cause and first corrupt layer

The canonical seed source was valid UTF-8, but SQLAlchemy business models used `String`/`Text`. On SQL Server those mapped to `VARCHAR`, and the live schema confirmed:

```text
employees.full_name  varchar(150)
tasks.title          varchar(200)
tasks.description    varchar(max)
```

The live rows already contained literal question marks, so corruption began at the database write/storage layer, before JSON, React, DOM, or font rendering.

Before:

```text
Hu?nh Lê Thành Nhân <!-- utf8-check: intentional-corrupt-fixture -->
Tái c?u trúc UI Dashboard Figma <!-- utf8-check: intentional-corrupt-fixture -->
Xác minh lu?c d? co s? d? li?u SQL Server <!-- utf8-check: intentional-corrupt-fixture -->
```

After migration `7b31f6e4c2a0` and the explicit development repair command:

```text
Huỳnh Lê Thành Nhân
Tái cấu trúc UI Dashboard Figma
Xác minh lược đồ cơ sở dữ liệu SQL Server
```

The same columns now report `nvarchar(150)`, `nvarchar(200)`, and `nvarchar(max)`.

## Source and migration changes

- business models now use `Unicode`, `UnicodeText`, and NVARCHAR-compatible definitions;
- Alembic migration drops/recreates dependent SQL Server unique/default constraints safely;
- `repair_unicode_seed_data.py` is dry-run by default and only repairs exact canonical seed keys/values;
- `DB_V2.sql` was converted from UTF-16LE BOM to UTF-8;
- corrupted authentication literals were repaired;
- `frontend/check-utf8.mjs` rejects invalid UTF-8, replacement characters, known mojibake, and suspicious question marks in Vietnamese words;
- representative Node and backend assertions cover source/JSON serialization and SQL Server type compilation.

## Font pipeline

Before, CSS requested Inter and Outfit without bundling font files or defining `@font-face`; the actual font was therefore an environment-dependent fallback. The centralized stack now requests:

```css
'Segoe UI', 'Noto Sans', Arial, sans-serif
```

These families have Vietnamese coverage on their normal target platforms. No external font was downloaded. Build output contains no font asset request, so there is no font CORS/path failure. Actual Chrome glyph font and weight checks (400/500/600/700) remain **not tested** until the runtime database connection is restored.

## Automated evidence

- `npm run check:utf8`: pass.
- `npm run test`: 3/3 pass.
- backend direct Unicode/JSON/NVARCHAR assertions in the production dependency image: pass.
- live SQL Server schema and values: pass.
