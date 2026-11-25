import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, LoaderCircle, RotateCcw, Sprout, X } from 'lucide-react';

export default function PlantTreatmentPage({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const isArabic = lang === 'ar';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [analysis, setAnalysis] = useState<{ summaryAr: string; observationsAr: string[]; stressLevel: string; wateringAdviceAr: string; caveatAr: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (cameraOpen && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [cameraOpen]);

  const openCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(isArabic ? 'الكاميرا غير متاحة في هذا المتصفح أو الاتصال. جرّب فتح الصفحة عبر HTTPS أو اختر صورة من جهازك.' : 'Camera access is not available here. Try HTTPS or choose an image from your device.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError(isArabic ? 'لم نتمكن من فتح الكاميرا. اسمح للمتصفح باستخدامها، أو اختر صورة من جهازك.' : 'We could not open the camera. Allow camera access or choose an image from your device.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.9));
    stopCamera();
  };

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCameraError(isArabic ? 'اختر ملف صورة صالحًا.' : 'Please choose a valid image file.');
      return;
    }
    setCameraError('');
    stopCamera();
    const reader = new FileReader();
    reader.onload = () => { setPhoto(String(reader.result)); setAnalysis(null); };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return <main className="plant-treatment-page" dir={isArabic ? 'rtl' : 'ltr'}>
    <section className="plant-treatment-hero">
      <div className="plant-treatment-copy">
        <span className="plant-treatment-eyebrow"><Sprout size={15} /> {isArabic ? 'خدمة للمزارع والمهندس الزراعي' : 'For growers and agronomists'}</span>
        <h1>{isArabic ? 'صوّر نبتتك، واستعد لفهم ما تحتاجه' : 'Photograph your plant and prepare to understand what it needs'}</h1>
        <p>{isArabic ? 'التقط صورة واضحة للنبتة أو أوراقها المصابة، ثم اطلب تحليلًا زراعيًا حذرًا يساعدك على فهم العلامات الظاهرة وإرشادات الري.' : 'Capture a clear photo of the plant or affected leaves, then request a cautious agricultural analysis of visible signs and watering guidance.'}</p>
        <div className="plant-treatment-status"><span /> {isArabic ? 'تحليل زراعي بالذكاء الاصطناعي · لا يُستخدم للطب البشري أو الأسئلة غير الزراعية' : 'Agricultural AI analysis · not for human medicine or non-agricultural questions'}</div>
      </div>
    </section>

    <section className="plant-treatment-card" aria-label={isArabic ? 'تصوير النبات' : 'Plant photo capture'}>
      <div className="plant-treatment-card-head">
        <div><span className="eyebrow">{isArabic ? 'فحص النبات' : 'Plant check'}</span><h2>{photo ? (isArabic ? 'صورة النبتة جاهزة' : 'Plant photo is ready') : (isArabic ? 'أضف صورة للنبتة' : 'Add a plant photo') }</h2></div>
        {photo && <button type="button" className="icon-button" onClick={() => setPhoto(null)} aria-label={isArabic ? 'حذف الصورة' : 'Remove image'}><X size={17} /></button>}
      </div>

      <div className={`plant-treatment-preview ${photo || cameraOpen ? 'has-content' : ''}`}>
        {photo ? <img src={photo} alt={isArabic ? 'الصورة المختارة للنبتة' : 'Selected plant photo'} /> : cameraOpen ? <video ref={videoRef} autoPlay playsInline muted aria-label={isArabic ? 'معاينة كاميرا النبات' : 'Plant camera preview'} /> : <div className="plant-treatment-empty"><span className="plant-treatment-camera-icon"><Camera size={27} /></span><strong>{isArabic ? 'وجّه الكاميرا نحو النبتة' : 'Point the camera at the plant'}</strong><span>{isArabic ? 'صوّر الأوراق والسيقان بوضوح، وفي إضاءة جيدة.' : 'Capture the leaves and stems clearly in good light.'}</span></div>}
      </div>

      {cameraError && <p className="plant-treatment-error" role="alert">{cameraError}</p>}

      <div className="plant-treatment-actions">
        {cameraOpen ? <><button type="button" className="btn plant-treatment-primary" onClick={capturePhoto}><Camera size={16} />{isArabic ? 'التقط الصورة' : 'Take photo'}</button><button type="button" className="btn secondary" onClick={stopCamera}>{isArabic ? 'إغلاق الكاميرا' : 'Close camera'}</button></> : photo ? <><button type="button" className="btn plant-treatment-primary" onClick={openCamera}><Camera size={16} />{isArabic ? 'التقط صورة جديدة' : 'Take a new photo'}</button><button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={16} />{isArabic ? 'اختر صورة أخرى' : 'Choose another photo'}</button></> : <><button type="button" className="btn plant-treatment-primary" onClick={openCamera}><Camera size={16} />{isArabic ? 'افتح الكاميرا' : 'Open camera'}</button><button type="button" className="btn secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={16} />{isArabic ? 'ارفع صورة من الجهاز' : 'Choose photo from device'}</button></>}
        <input ref={fileRef} className="plant-treatment-file-input" type="file" accept="image/*" capture="environment" onChange={choosePhoto} aria-label={isArabic ? 'اختر صورة للنبتة' : 'Choose a plant photo'} />
      </div>

      {photo && <div className="plant-treatment-ai-actions"><button type="button" className="btn plant-treatment-primary" disabled={analyzing} onClick={async () => { setAnalyzing(true); setCameraError(''); try { const response = await fetch('/api/plant-advisor/analyze-plant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plantName: 'نبات غير محدد', ageYears: 1, currentLiters: 10, imageDataUrl: photo }) }); const data = await response.json() as { summaryAr?: string; observationsAr?: string[]; stressLevel?: string; wateringAdviceAr?: string; caveatAr?: string; error?: string }; if (!response.ok || !data.summaryAr) throw new Error(data.error || 'AI_REQUEST_FAILED'); setAnalysis({ summaryAr: data.summaryAr, observationsAr: data.observationsAr || [], stressLevel: data.stressLevel || 'غير واضح', wateringAdviceAr: data.wateringAdviceAr || '', caveatAr: data.caveatAr || '' }); } catch (error) { setCameraError(error instanceof Error && error.message === 'AI_NOT_CONFIGURED' ? 'تحليل AI غير مفعّل على الخادم بعد.' : 'تعذر تحليل الصورة الآن. جرّب صورة أوضح.'); } finally { setAnalyzing(false); } }}>{analyzing ? <LoaderCircle size={15} className="animate-spin" /> : <Sprout size={15} />}{analyzing ? 'جارٍ التحليل…' : 'حلّل النبتة بالـAI'}</button></div>}
      {analysis && <section className="plant-treatment-result" aria-live="polite"><strong>نتيجة التحليل الزراعي: {analysis.stressLevel}</strong><p>{analysis.summaryAr}</p>{analysis.observationsAr.length > 0 && <ul>{analysis.observationsAr.map((observation) => <li key={observation}>{observation}</li>)}</ul>}<p><b>إرشاد الري:</b> {analysis.wateringAdviceAr}</p><small>{analysis.caveatAr}</small></section>}
      {photo && <button type="button" className="plant-treatment-retake" onClick={() => { setPhoto(null); setAnalysis(null); }}><RotateCcw size={14} />{isArabic ? 'إزالة الصورة والبدء من جديد' : 'Remove photo and start again'}</button>}
      <p className="plant-treatment-privacy">{isArabic ? 'ترسل الصورة إلى خادم التحليل الزراعي فقط عند الضغط على زر التحليل، ولا يظهر تشخيص قطعي من صورة واحدة.' : 'The image is sent to the agricultural analysis server only after you press analyze. One image cannot provide a definitive diagnosis.'}</p>
    </section>

    <section className="plant-treatment-next"><span className="plant-treatment-next-icon"><Sprout size={18} /></span><div><strong>{isArabic ? 'مساعد زراعي فقط' : 'Agriculture-only assistant'}</strong><p>{isArabic ? 'يمكنك استخدام التحليل هنا، أو فتح المحادثة العامة للأسئلة عن النبات والتربة والري واللاندسكيب.' : 'Use the analysis here, or open the public chat for plant, soil, irrigation and landscape questions.'}</p></div></section>
  </main>;
}
