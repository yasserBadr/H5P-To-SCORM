# H5P Interactive Video to SCORM 1.2

تطبيق ويب يحوّل ملفًا واحدًا أو عدة ملفات `H5P.InteractiveVideo` إلى حزمة SCORM 1.2 جاهزة للرفع إلى أنظمة إدارة التعلم.

## العربية

### المزايا

- رفع عدة ملفات H5P وترتيبها داخل مقرر واحد.
- معاينة الفيديو التفاعلي قبل التصدير.
- تصدير حزمة مستقلة تتضمن مشغل H5P والمكتبات المطلوبة.
- حفظ موضع المتعلم وحالة الإكمال والنتيجة عبر SCORM.
- احتساب إكمال الفيديو عند وصوله إلى النهاية.
- تنقل حر أو تسلسلي مع تخصيص ألوان واجهة SCORM.

### التشغيل

يتطلب Node.js 20 أو أحدث وnpm:

```powershell
npm install
npm run dev
```

افتح `http://localhost:3000`، ارفع ملفات `.h5p`، اضبط الإعدادات، ثم اختر **تصدير SCORM 1.2 ZIP**.

### الاختبار والإنتاج

```powershell
npm test
npm run build
npm start
```

### Docker

```powershell
docker compose up --build
```

> ارفع ملف ZIP الناتج إلى نظام التعلم دون فك ضغطه. لا تفتح `index.html` مباشرة عبر `file://`.

## English

A Next.js web application that converts one or more `H5P.InteractiveVideo` files into a self-contained SCORM 1.2 package.

### Features

- Upload and reorder multiple H5P files.
- Preview interactive video content before export.
- Bundle the H5P runtime, libraries, and content in the exported package.
- Track learner location, completion, and score through SCORM.
- Mark a video complete when playback reaches the end.
- Free or sequential navigation with customizable SCORM theme colors.

### Local development

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`, upload `.h5p` files, configure the course, and select **Export SCORM 1.2 ZIP**.

### Test and production

```powershell
npm test
npm run build
npm start
```

### Docker

```powershell
docker compose up --build
```

Upload the generated ZIP to your LMS without extracting it. Do not open `index.html` through `file://`.

### Supported scope

- Input: `H5P.InteractiveVideo`
- Output: SCORM 1.2
- Temporary uploads and generated packages are excluded from Git by `.gitignore`.
