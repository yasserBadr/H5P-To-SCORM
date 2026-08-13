# رفع المشروع إلى GitHub من دون ربط الحساب بـ Codex

هذه الطريقة لا تربط حساب GitHub بهذه الشاشة. المصادقة، عند الحاجة، تتم مباشرة
بين Git المثبت على جهازك وGitHub.

## الطريقة الموصى بها: Git من PowerShell

### 1. أنشئ مستودعًا خاصًا

1. افتح https://github.com/new وسجّل الدخول إلى GitHub.
2. اكتب اسمًا مثل `h5p-to-scorm`.
3. اختر **Private**.
4. لا تضف README أو `.gitignore` أو License، لأن المشروع يحتوي الملفات المطلوبة.
5. اضغط **Create repository** وانسخ رابط HTTPS للمستودع.

مثال للرابط:

```text
https://github.com/USERNAME/h5p-to-scorm.git
```

### 2. فك ضغط ملف المشروع

فك ضغط ملف المشروع الذي حمّلته في مجلد عادي، ثم افتح PowerShell داخل المجلد
الناتج.

### 3. ارفع الملفات

استبدل رابط المثال برابط مستودعك ثم نفّذ:

```powershell
git init
git add .
git commit -m "Initial H5P to SCORM application"
git branch -M main
git remote add origin https://github.com/USERNAME/h5p-to-scorm.git
git push -u origin main
```

قد يفتح Git نافذة المتصفح لتسجيل الدخول إلى GitHub. هذا تسجيل دخول خاص بـ Git
على جهازك وليس ربطًا بحسابك داخل Codex.

إذا ظهر خطأ يطلب اسمك وبريدك، نفّذ مرة واحدة:

```powershell
git config --global user.name "YOUR NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

ثم أعد أمري `git commit` و`git push`.

## رفع التحديثات لاحقًا

من داخل مجلد المشروع:

```powershell
git add .
git commit -m "Describe the update"
git push
```

## بديل للحفظ فقط عبر المتصفح

يمكن رفع ملف ZIP نفسه من صفحة المستودع عبر **Add file → Upload files**. هذه الطريقة
تحفظ النسخة الاحتياطية كملف واحد، لكنها لا تفك الضغط ولا تعرض ملفات الكود منفردة.
لذلك يُفضّل استخدام طريقة Git أعلاه للمشروع الفعلي.

## تنبيه

GitHub يحفظ الكود والملفات، لكنه لا يشغّل هذا التطبيق تلقائيًا. تشغيل التطبيق على
الإنترنت يحتاج خدمة استضافة تدعم Node.js وتخزين الملفات المؤقتة.
