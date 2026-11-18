import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, RotateCcw, Sprout, X } from 'lucide-react';

export default function PlantTreatmentPage({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const isArabic = lang === 'ar';
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

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
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return <main className="plant-treatment-page" dir={isArabic ? 'rtl' : 'ltr'}>
    <section className="plant-treatment-hero">
      <div className="plant-treatment-copy">
        <span className="plant-treatment-eyebrow"><Sprout size={15} /> {isArabic ? 'خدمة للمزارع والمهندس الزراعي' : 'For growers and agronomists'}</span>
        <h1>{isArabic ? 'صوّر نبتتك، واستعد لفهم ما تحتاجه' : 'Photograph your plant and prepare to understand what it needs'}</h1>
        <p>{isArabic ? 'التقط صورة واضحة للنبتة أو أوراقها المصابة، لتكون جاهزة للمشاركة مع خدمة التشخيص الذكي عند تفعيلها.' : 'Capture a clear photo of the plant or affected leaves. It will be ready to use when smart diagnosis is enabled.'}</p>
        <div className="plant-treatment-status"><span /> {isArabic ? 'التصوير متاح الآن · تحليل الذكاء الاصطناعي سيُفعّل عند ربط الخدمة' : 'Photo capture is available · AI analysis will be enabled after connecting the service'}</div>
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

      {photo && <button type="button" className="plant-treatment-retake" onClick={() => setPhoto(null)}><RotateCcw size={14} />{isArabic ? 'إزالة الصورة والبدء من جديد' : 'Remove photo and start again'}</button>}
      <p className="plant-treatment-privacy">{isArabic ? 'تبقى الصورة على جهازك في هذه المرحلة ولا تُرسل إلى أي خدمة. لن يظهر تشخيص آلي حتى يتم ربط واجهة الذكاء الاصطناعي.' : 'For now, your photo stays on your device and is not sent anywhere. Automated diagnosis will be available after the AI service is connected.'}</p>
    </section>

    <section className="plant-treatment-next"><span className="plant-treatment-next-icon"><Sprout size={18} /></span><div><strong>{isArabic ? 'الخطوة التالية' : 'Next step'}</strong><p>{isArabic ? 'سيتم تفعيل تحليل الصورة وإرشادات العناية بعد ربط واجهة API الخاصة بالذكاء الاصطناعي.' : 'Image analysis and care guidance will be enabled after connecting the AI API.'}</p></div></section>
  </main>;
}
