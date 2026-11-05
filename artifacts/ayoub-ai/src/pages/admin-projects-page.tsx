import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { ArrowRight, ImagePlus, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { Link } from 'wouter';
import { getPortfolioProjects, savePortfolioProjects, type PortfolioProject } from '@/data/site-content';
import './admin-projects-image-upload.css';

const blankProject = (): PortfolioProject => ({ id: '', name: '', category: '', description: '', image: '', images: [], location: '', date: '' });
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_STORED_IMAGE_BYTES = 120 * 1024;
const MAX_PROJECT_IMAGES = 12;

async function compressProjectImage(file: File): Promise<string> {
  let bitmap: ImageBitmap | null = null;
  let image: HTMLImageElement | null = null;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      try { bitmap = await createImageBitmap(file); } catch { /* Fall back to the browser image decoder. */ }
    }
    if (!bitmap) {
      image = new Image();
      objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      await image.decode();
    }
    const source = bitmap || image!;
    const width = bitmap?.width || image!.naturalWidth;
    const height = bitmap?.height || image!.naturalHeight;
    if (!width || !height) throw new Error('تعذر قراءة أبعاد الصورة.');

    let scale = Math.min(1, 1400 / Math.max(width, height));
    let blob: Blob | null = null;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر تجهيز الصورة على هذا الجهاز.');
    for (let attempt = 0; attempt < 6; attempt += 1) {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', [0.84, 0.78, 0.72, 0.66, 0.6, 0.54][attempt]));
      if (!blob) throw new Error('تعذر ضغط الصورة.');
      if (blob.size <= MAX_STORED_IMAGE_BYTES) break;
      scale *= 0.82;
    }
    if (!blob || blob.size > MAX_STORED_IMAGE_BYTES) throw new Error('تعذر تصغير الصورة للحجم المناسب. جرّب صورة أصغر.');
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('تعذر قراءة الصورة. حاول مرة أخرى.'));
      reader.readAsDataURL(blob!);
    });
  } finally {
    bitmap?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState(getPortfolioProjects);
  const [draft, setDraft] = useState<PortfolioProject | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  const updateDraft = (patch: Partial<PortfolioProject>) => setDraft((current) => current ? { ...current, ...patch } : current);
  const openNewProject = () => { setDraft(blankProject()); setError(''); };
  const uploadImages = async (files: File[]) => {
    if (!files.length || !draft) return;
    const currentImages = draft.images?.length ? draft.images : draft.image ? [draft.image] : [];
    const room = MAX_PROJECT_IMAGES - currentImages.length;
    if (room <= 0) { setError(`وصلت للحد الأقصى (${MAX_PROJECT_IMAGES} صورة للمشروع).`); return; }
    const selected = files.slice(0, room);
    if (files.length > room) setError(`يمكن إضافة ${room} صورة فقط؛ الحد الأقصى ${MAX_PROJECT_IMAGES} صورة للمشروع.`);
    const invalid = selected.find((file) => !file.type.startsWith('image/') || file.size > MAX_SOURCE_IMAGE_BYTES);
    if (invalid) { setError(!invalid.type.startsWith('image/') ? 'اختر ملفات صور صالحة فقط.' : `حجم إحدى الصور أكبر من 8 ميغابايت (${invalid.name}).`); return; }
    setUploading(true);
    if (files.length <= room) setError('');
    try {
      const added: string[] = [];
      for (const file of selected) added.push(await compressProjectImage(file));
      updateDraft({ images: [...currentImages, ...added], image: currentImages[0] || added[0] || '' });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر تجهيز الصورة. حاول مرة أخرى.');
    } finally {
      setUploading(false);
      setDraggingImage(false);
    }
  };
  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    void uploadImages(files);
  };
  const dropImage = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDraggingImage(false);
    void uploadImages(Array.from(event.dataTransfer.files));
  };
  const projectImages = draft?.images?.length ? draft.images : draft?.image ? [draft.image] : [];
  const removeProjectImage = (index: number) => {
    const next = projectImages.filter((_, imageIndex) => imageIndex !== index);
    updateDraft({ images: next, image: next[0] || '' });
  };
  const setCoverImage = (index: number) => {
    const next = [...projectImages];
    const [cover] = next.splice(index, 1);
    next.unshift(cover);
    updateDraft({ images: next, image: cover });
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (uploading) return;
    if (!draft?.name.trim()) { setError('يرجى إدخال اسم المشروع.'); return; }
    const next = draft.id ? projects.map((project) => project.id === draft.id ? draft : project) : [{ ...draft, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }, ...projects];
    try {
      savePortfolioProjects(next);
      setProjects(next);
      setDraft(null);
      setError('');
    } catch {
      setError('تعذر الحفظ: مساحة التخزين في المتصفح ممتلئة. استخدم صورة أصغر أو أزل بعض الصور.');
    }
  };
  const remove = (id: string) => {
    if (!window.confirm('هل تريد حذف هذا المشروع؟')) return;
    const next = projects.filter((project) => project.id !== id);
    setProjects(next);
    savePortfolioProjects(next);
  };

  return <main className="admin-page content-admin-page" dir="rtl">
    <header className="admin-head">
      <div><div className="eyebrow">QADRI AI / PORTFOLIO</div><h1>إدارة المشاريع</h1><p className="page-desc">أضف مشاريعكم وأعمالكم لتظهر في صفحة مشاريعنا على الموقع.</p></div>
      <div className="admin-head-actions"><Link className="btn secondary small" href="/admin"><ArrowRight size={14} />لوحة التحكم</Link><button type="button" className="btn" onClick={openNewProject}><Plus size={15} />إضافة مشروع</button></div>
    </header>
    {projects.length ? <div className="content-admin-grid">{projects.map((project) => <article className="panel content-admin-card" key={project.id}>{project.image ? <img src={project.image} alt={project.name} /> : <div className="content-admin-card-placeholder"><ImagePlus size={24} /></div>}<div className="content-admin-card-body"><span className="eyebrow">{project.category || 'مشروع'}</span><h2>{project.name}</h2><p>{project.description || 'لا يوجد وصف.'}</p>{project.location && <small>{project.location}</small>}<div className="content-admin-card-actions"><button type="button" className="btn secondary small" onClick={() => { setDraft({ ...project }); setError(''); }}><Pencil size={14} />تعديل</button><button type="button" className="btn danger small" onClick={() => remove(project.id)}><Trash2 size={14} />حذف</button></div></div></article>)}</div> : <section className="panel content-admin-empty"><ImagePlus size={28} /><h2>لا توجد مشاريع بعد</h2><p>أضف أول مشروع ليظهر للزوار في صفحة مشاريعنا.</p><button type="button" className="btn" onClick={openNewProject}><Plus size={15} />إضافة مشروع</button></section>}
    {draft && <div className="content-admin-backdrop" onClick={() => !uploading && setDraft(null)}>
      <form className="panel content-admin-form project-admin-form" onSubmit={save} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="eyebrow">PROJECT DETAILS</span><h2>{draft.id ? 'تعديل المشروع' : 'إضافة مشروع جديد'}</h2></div><button type="button" className="icon-button" onClick={() => !uploading && setDraft(null)} aria-label="إغلاق" disabled={uploading}><X size={18} /></button></header>
        <label>اسم المشروع *<input required value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} /></label>
        <div className="content-admin-form-row"><label>التصنيف<input value={draft.category} onChange={(event) => updateDraft({ category: event.target.value })} placeholder="تنسيق حدائق، زراعة..." /></label><label>الموقع<input value={draft.location} onChange={(event) => updateDraft({ location: event.target.value })} placeholder="المدينة أو المنطقة" /></label></div>
        <label>وصف المشروع<textarea rows={4} value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} /></label>
        <section className="project-image-field" aria-label="صورة المشروع">
          <div className="project-image-field-heading"><span className="project-image-field-icon"><ImagePlus size={16} /></span><div><strong>صور المشروع</strong><small>ارفع عدة صور؛ ستظهر كمعرض خاص عند فتح المشروع.</small></div></div>
          <input ref={imageInput} className="project-image-file-input" type="file" accept="image/*" multiple onChange={selectImage} aria-label="رفع صور المشروع من الجهاز" />
          <button type="button" className={`project-image-dropzone${projectImages.length ? ' has-image' : ''}${draggingImage ? ' is-dragging' : ''}`} onClick={() => imageInput.current?.click()} onDragOver={(event) => { event.preventDefault(); setDraggingImage(true); }} onDragLeave={() => setDraggingImage(false)} onDrop={dropImage} disabled={uploading || projectImages.length >= MAX_PROJECT_IMAGES}>
            {projectImages.length ? <><img src={projectImages[0]} alt={`غلاف ${draft.name || 'المشروع'}`} /><span className="project-image-preview-shade" /><span className="project-image-preview-copy"><strong>{uploading ? 'جارٍ تجهيز الصور…' : `غلاف المشروع · ${projectImages.length} من ${MAX_PROJECT_IMAGES} صور`}</strong><small>أفلت صورًا أو اضغط لإضافة المزيد</small></span></> : <span className="project-image-empty"><span className="project-image-empty-icon"><Upload size={22} /></span><strong>{uploading ? 'جارٍ تجهيز الصور…' : 'أفلت عدة صور هنا أو اخترها من جهازك'}</strong><small>JPG أو PNG أو WebP</small></span>}
          </button>
          <div className="project-image-controls"><button type="button" className="btn secondary small" onClick={() => imageInput.current?.click()} disabled={uploading || projectImages.length >= MAX_PROJECT_IMAGES}><Upload size={14} />{uploading ? 'جاري تجهيز الصور…' : 'إضافة صور'}</button>{projectImages.length > 0 && <button type="button" className="btn danger small" onClick={() => updateDraft({ image: '', images: [] })} disabled={uploading}><Trash2 size={14} />إزالة كل الصور</button>}<span>حتى {MAX_PROJECT_IMAGES} صورة؛ الحد الأقصى 8 ميغابايت للصورة، وتُضغط تلقائيًا.</span></div>
          {projectImages.length > 0 && <div className="project-gallery-admin" aria-label="صور المشروع المرفوعة">{projectImages.map((image, index) => <div className={`project-gallery-admin__item${index === 0 ? ' is-cover' : ''}`} key={`${index}-${image.slice(-24)}`}><button type="button" className="project-gallery-admin__cover" title={index === 0 ? 'صورة الغلاف' : 'تعيين كغلاف'} onClick={() => setCoverImage(index)}><img src={image} alt={`صورة ${index + 1}`} />{index === 0 && <span>الغلاف</span>}</button><button type="button" className="project-gallery-admin__remove" aria-label={`إزالة الصورة ${index + 1}`} onClick={() => removeProjectImage(index)} disabled={uploading}>×</button></div>)}</div>}
        </section>
        <label>تاريخ المشروع<input type="date" value={draft.date} onChange={(event) => updateDraft({ date: event.target.value })} /></label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <footer><button type="button" className="btn secondary" onClick={() => !uploading && setDraft(null)} disabled={uploading}>إلغاء</button><button className="btn" type="submit" disabled={uploading}><Save size={15} />{uploading ? 'جارٍ تجهيز الصورة…' : 'حفظ المشروع'}</button></footer>
      </form>
    </div>}
  </main>;
}
