# [E06] Escaneo de recibos (OCR)

> **Rama:** `feature/e06-receipt-scan`  
> **Fecha inicio:** 2026-05-12  
> **Estado:** revisada

---

## Contexto y motivación

Registrar un gasto manualmente requiere recordar importe, comercio, categoría y fecha. Fotografiar el ticket elimina esa fricción y permite capturar el gasto en el momento exacto. El flujo completo debe ser: abrir modal → foto → datos extraídos rellenan el formulario → usuario confirma → transacción creada.

---

## Objetivos

- Extraer automáticamente importe, fecha, comercio y categoría sugerida de una foto de ticket
- Integrar el flujo en el `QuickAddModal` existente sin romper el flujo manual
- El endpoint no crea la transacción — solo extrae datos para que el usuario los confirme

## No está en el alcance

- Almacenamiento de imágenes de tickets (solo procesamiento en memoria)
- OCR en documentos multipage o facturas PDF
- Historial de escaneos
- Soporte para recibos de cajero automático o extractos bancarios

---

## Diseño técnico

### Proveedor OCR: Tesseract.js (gratuito, sin API key)

Se usa **`tesseract.js`** en el servidor — OCR puro en Node.js/WASM, sin dependencias externas ni claves. El pipeline es:

```
base64 image → Tesseract.js → raw text → parseReceiptText() → { amount, date, merchant, suggestedCategory }
```

### Cambios en `@finanzas/shared`

```ts
// packages/shared/src/schemas/receipt.ts
export const ScanReceiptResponseSchema = z.object({
  amount: z.number().int().optional(), // centavos, ej: 1250 = 12.50
  date: z.string().optional(), // YYYY-MM-DD
  merchant: z.string().optional(), // "Mercadona", "McDonald's"
  suggestedCategory: z.string().optional(), // nombre de categoría sugerida
});
export type ScanReceiptResponse = z.infer<typeof ScanReceiptResponseSchema>;
```

Exportar desde `packages/shared/src/index.ts`.

### Cambios en `@finanzas/api`

#### Nueva dependencia

```
tesseract.js  ^5.0.0
```

#### Nuevo servicio `receipt.service.ts`

`packages/api/src/modules/transactions/receipt.service.ts`

Dos responsabilidades:

1. `runOCR(base64: string): Promise<string>` — llama a Tesseract, devuelve texto crudo
2. `parseReceiptText(text: string): ScanReceiptResponse` — extrae campos con regex

**Lógica del parser:**

- **Amount:** busca líneas con `TOTAL`, `IMPORTE`, `A PAGAR`, `AMOUNT DUE`; extrae el número más alto de esas líneas (en centavos). Fallback: mayor valor monetario del texto completo.
- **Date:** regex sobre patrones comunes: `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, `DD MMM YYYY` (ej. "12 MAY 2026"). Normaliza a `YYYY-MM-DD`.
- **Merchant:** primera línea no vacía del texto (los tickets suelen empezar con el nombre del establecimiento).
- **suggestedCategory:** keyword matching sobre el nombre del comercio:
  - `mercadona|lidl|carrefour|aldi|alcampo` → `Food`
  - `repsol|bp|galp|cepsa|shell` → `Transport`
  - `farmacia|pharmacy|clinica` → `Health`
  - `amazon|zara|mango|h&m` → `Shopping`
  - `netflix|spotify|steam|cinema` → `Entertainment`
  - Sin match → `Other`

#### Nuevo endpoint

| Método | Ruta                         | Auth | Body                                   | Respuesta                                           |
| ------ | ---------------------------- | ---- | -------------------------------------- | --------------------------------------------------- |
| POST   | `/transactions/scan-receipt` | JWT  | `{ image: string, mimeType?: string }` | `{ amount?, date?, merchant?, suggestedCategory? }` |

Schema Zod:

```ts
const ScanReceiptSchema = z.object({
  image: z.string().min(100),
  mimeType: z.enum(['image/jpeg', 'image/png']).default('image/jpeg'),
});
```

Manejo de errores:

- Si Tesseract falla → devuelve `{}` (todos los campos vacíos), no lanza 500
- Si `parseReceiptText` no encuentra un campo → ese campo queda `undefined` en la respuesta

#### Tests (`__tests__/receipt.service.test.ts`)

- Mock de `tesseract.js` — texto crudo de ticket de supermercado → extrae amount, date, merchant correctamente
- Texto sin línea "TOTAL" → amount `undefined`
- Texto con múltiples importes → extrae el mayor en línea "TOTAL"
- Tesseract lanza error → `parseReceiptText` devuelve `{}`

### Cambios en `@finanzas/mobile`

#### Nueva dependencia

```
expo-image-picker  ~16.0.0
```

> `expo-image-picker` incluye acceso a cámara y galería. No se añade `expo-camera` hasta necesitar un visor custom.

#### Nuevo API client

`packages/mobile/src/api/receipts.ts`

```ts
import { apiFetch } from './client';
import type { ScanReceiptResponse } from '@finanzas/shared';

export async function scanReceipt(
  base64Image: string,
  mimeType = 'image/jpeg',
): Promise<ScanReceiptResponse> {
  return apiFetch('/transactions/scan-receipt', {
    method: 'POST',
    body: JSON.stringify({ image: base64Image, mimeType }),
  });
}
```

#### Modificaciones en `QuickAddModal.tsx`

1. Botón **"Escanear ticket"** (icono `ScanLine` de lucide) visible solo cuando `type === 'expense'`, junto al header del modal.
2. Al pulsar: `ImagePicker.requestCameraPermissionsAsync()` → `launchCameraAsync({ base64: true, quality: 0.7 })`.
3. Enviar `base64` al endpoint; mostrar `ActivityIndicator` mientras espera.
4. Rellenar `amount`, `description` (con merchant), `date`, y buscar en `categories` la que coincida con `suggestedCategory`.
5. Si un campo no viene en la respuesta, queda con su valor actual (vacío o el que tenía el usuario).

#### Permisos

- Solicitar con `ImagePicker.requestCameraPermissionsAsync()` antes de abrir.
- Si rechazado: `Alert` explicando que el permiso de cámara es necesario para escanear tickets.
- Añadir `NSCameraUsageDescription` en `app.json` (plugin de expo-image-picker).

---

## Criterios de aceptación

- [ ] `POST /transactions/scan-receipt` devuelve `{ amount, date, merchant, suggestedCategory }` con imagen válida
- [ ] Si el OCR no extrae un campo, ese campo no aparece en la respuesta
- [ ] Botón "Escanear ticket" visible en `QuickAddModal` solo cuando tipo es "Gasto"
- [ ] Los campos extraídos rellenan el formulario; el usuario puede corregirlos
- [ ] Tests del service pasan con mock de tesseract.js
- [ ] `pnpm typecheck` y `pnpm test` en verde

---

## Plan de implementación

1. `shared`: añadir `ScanReceiptResponseSchema` y exportar
2. `api`: instalar `tesseract.js`, crear `receipt.service.ts` con OCR + parser
3. `api`: registrar ruta `POST /transactions/scan-receipt` en `transaction.routes.ts`
4. `api`: tests unitarios de `receipt.service.ts`
5. `mobile`: instalar `expo-image-picker`, crear `src/api/receipts.ts`
6. `mobile`: integrar botón + flujo de escaneo en `QuickAddModal.tsx`

---

## Notas adicionales

- La imagen se comprime a JPEG calidad 0.7 en mobile antes de enviar (parámetro `quality: 0.7` en ImagePicker).
- Tesseract.js descarga los datos de idioma (~4 MB `eng.traineddata`) en el primer arranque del servidor; luego queda cacheado.
- Para tickets en español añadir idioma `spa` en la llamada a Tesseract mejora la detección de fechas y nombres.
- El body limit de Fastify es 1 MB por defecto; una imagen comprimida al 70% suele pesar 150–300 KB en base64, dentro del límite.
