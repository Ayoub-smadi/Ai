# AYOUB AI Webdev migration

## Open the existing GitHub project in Webdev
- [x] Preserve the existing bilingual AYOUB AI codebase and workspace structure from GitHub repository `Ayoub-smadi/Ai`.
- [x] Keep the existing Clerk, workspace, agent, knowledge, CSV, profile, and saved AI test-response flows intact.
- [x] Verify the frontend runs on the Webdev runtime port: Vite serves the site on the declared Preview port 3000 with `BASE_PATH=/`, and `GET /manus-routes.json` plus every page route returns HTTP 200.
- [x] Keep the workspace commands working on the Webdev runtime: `pnpm install --frozen-lockfile` and `pnpm run typecheck` pass for all nine workspace packages.
- [ ] Run the API on its Webdev port 5000 behind the Vite `/api` proxy. Blocked until a PostgreSQL connection is configured.

## External Neon readiness
- [x] Keep PostgreSQL connection settings compatible with the repository's `DATABASE_URL` and optional `MIGRATION_DATABASE_URL` variables; `lib/db` reads `NEON_DATABASE_URL` first and falls back to `DATABASE_URL`.
- [ ] Provide Neon connection values through protected Webdev secret input before running migrations.
- [ ] Apply the checked-in Drizzle migrations (`pnpm --filter @workspace/db run migrate`) only after the Neon connection is confirmed; never use `push-force` against production.
- [ ] Supply `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` so sign-in uses the real Clerk instance instead of the public preview router. Without them the public site works and protected API requests are rejected with 401.
- [ ] Supply `OPENAI_API_KEY` for agent test responses and plant photo diagnosis. Without it those endpoints return an explicit unavailable error rather than a simulated answer.
- [ ] Use one server-side OpenAI key/model for the public agricultural assistant and keep every AI surface limited to agriculture; non-agricultural questions must return the exact out-of-scope response.
- [ ] Connect `/chat`, `/plant-treatment`, `/landscape-editor`, and `/plants` to the agricultural AI behavior without exposing provider credentials in the Vite bundle.

## Homepage founder identity card
- [x] Show the supplied Eng. Thamer Al-Qadri business card inside the homepage typewriter section (`FounderBiographyTicker`), next to the paragraph that is typed and deleted, as a distinct panel rather than a plain image.
- [x] Recolor the card to the site palette: deep green `#315c3c`, navy `#020618`, paper white and the existing soft green band tints; the lime-green artwork of the source image is replaced by recolored SVG arcs.
- [x] Keep every contact value from the supplied card and make them live links: `tel:+962777772211`, `mailto:tamerqadri@gmail.com`, `https://www.alqadrioffers.online`, and Jerash — Jordan as plain text.
- [x] Cut the portrait out of the supplied card and fade its lower edge so it blends into the panel, with bilingual labels for English and Arabic visitors and reduced-motion fallbacks.

## Scope boundaries
- Do not add live WhatsApp, Instagram, Messenger, customer inbox, public chat widget, document retrieval, invitations, or role administration in this migration.


## Export invoice builder
- [x] Add an Admin sidebar action directly below `كتب رسمية` named `فواتير تصدير`, routed at `/admin/export-invoices` and protected by the existing AdminGuard.
- [x] Build a complete dynamic export-invoice workspace for `مؤسسة القادري الزراعية`: `استيراد وتصدير الاشتال الزراعية`, facility number, Jordan/Jerash contact header, source and address, importer and address, destination/source-to, date, and invoice number.
- [x] Support repeatable invoice lines with item, weight, quantity, origin defaulting to `أردني`, notes, dinars, and fils; calculate the total live, show `المجموع`, and spell the amount out in Arabic under `المجموع كتابةً`.
- [x] Include live official preview, local save/edit/delete history, search, new invoice, print layout, `إضافة بند`, and the closing export declaration `لا مانع للتصدير`.
- [x] Keep the form responsive and style the document as a distinctive, print-ready agricultural export invoice rather than a generic admin form.


## Real-world 3D landscape walkthrough
- [x] Replace the previous CSS/isometric illustration with a real Three.js WebGL scene using perspective camera, real depth, lighting, shadows, ground, garden boundary, and 3D geometry for trees, water, lawn, paths, lights, and pergola.
- [x] Add a dedicated `ابدأ المشي داخل الحديقة` mode with pointer-lock mouse look, WASD/arrow movement, sprint with Shift, bounded movement, ESC exit, and an on-screen Arabic usage hint.
- [x] Keep the scene editable: AI concept prompt, add/remove landscape elements, per-element scale and rotation controls, automatic local persistence, and export action.


## تدقيق وتوثيق دليل النباتات — 611 سجلًا
- [ ] تدقيق جميع النباتات الـ611، مع الحفاظ على معرّف كل سجل وتصنيفاته، وعدم اختلاق هوية أو معلومات لصنف ملتبس.
- [ ] توفير الاسم بالعربية، والاسم بالإنجليزية، والاسم العلمي لكل سجل عندما تدعمه المراجع؛ وإظهار غير الموثق بدل التخمين.
- [ ] كتابة وصف بالعربية يتضمن طرق الزراعة والعناية والموطن/المناطق المناسبة والأمراض أو الآفات المعروفة وطرق الوقاية منها، وكتابة Description in English بمحتوى مكافئ؛ لا يُعرض ادعاء زراعي بلا سند.
- [ ] إبقاء التصنيفات سطرًا لكل تصنيف بصيغة «رئيسي | فرعي»، وإظهار المناطق فقط حيث تؤيدها مصادر موثوقة، لا قائمة عامة مشتركة.
- [ ] إرفاق مراجع قابلة للفتح للمعلومات؛ تشمل ويكيبيديا للتحقق من الاسم/التصنيف، ومصادر زراعية موثوقة لمعلومات الزراعة والآفات.
- [ ] عدم عرض صورة على أنها للصنف المحدد إلا إذا تأكد التطابق؛ إظهار المصدر والرخصة، وإخفاء الصور غير المؤكدة مع إتاحة استبدالها من محرر الأدمن برفع صورة.
- [ ] مزامنة تعديلات المحرر والصور عبر تخزين Neon الموجود عند تهيئة اتصال قاعدة البيانات؛ عدم الادعاء باستمرارية التخزين إذا لم يكن الاتصال متاحًا.
- [ ] إزالة النصوص العامة أو التوصيات المشتركة غير المرتبطة بمصدر عن النبات؛ الحقول غير الموثقة تبقى ظاهرة كحالة تحقق، لا كمعلومة أو اقتراح.


## Store product detail pages and selectable variants
- [x] Clicking a listed store product opens its own `/store/:productId` page and product tiles remain limited to inventory entries.
- [x] Product detail supports size/color variant selection and updates the displayed price from the selected variant; no variant data is invented for existing products.
- [x] Store management can create and edit variant rows with size, color, and a required valid price; the chosen variant and price persist as a separate cart line through checkout and the order record.

## Store order sales invoices
- [x] From `/admin/store-orders`, create or reopen an invoice for an order with invoice type «مبيعات» and payment method «أونلاين».
- [x] Edit invoice number/date, customer and delivery details, item names, quantities and unit prices; persist edits with the order so the invoice can be reopened later.
- [x] Preview the sales invoice and download it as a PDF.

## Store add-to-cart and option selection
- [x] Store-card action reads «إضافة إلى السلة»; items without variants add immediately without redirect, while products with variants open their detail page for selection.
- [x] Variant choices are buttons; choosing a color/size updates its configured image, specifications, and price, and keeps the cart count/link available.
- [x] Store admin can enter an image URL and specifications per variant; no variant data is invented for products without configured options.

## Plant guide green palette
- [x] Remove the yellow accents from the “دليل نباتات القادري” feature on the homepage and the `/plants` guide hero; use green tones consistent with the site while preserving readable contrast.
