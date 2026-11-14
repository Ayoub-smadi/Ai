import { useRef, useState } from 'react';
import { Volume2, VolumeX, Play, Sparkles } from 'lucide-react';

type QuoteMotionLang = 'ar' | 'en';
const copy = (lang: QuoteMotionLang, en: string, ar: string) => lang === 'ar' ? ar : en;

const steps = [
  { ar: 'اختيار المنتجات', en: 'Choose products' },
  { ar: 'تحديد الكميات', en: 'Set quantities' },
  { ar: 'بيانات التواصل', en: 'Contact details' },
  { ar: 'إرسال الطلب', en: 'Send the request' },
];

export default function QuoteRequestMotionSection({ lang }: { lang: QuoteMotionLang }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (video.paused) void video.play().catch(() => undefined);
  };
  return <section className="quote-motion-section" dir={lang === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="quote-motion-title">
    <div className="quote-motion-inner">
      <div className="quote-motion-intro">
        <span className="quote-motion-kicker"><Sparkles size={14} />{copy(lang, 'A SIMPLE REQUEST, A CLEAR OFFER', 'من طلب بسيط إلى عرض واضح')}</span>
        <h2 id="quote-motion-title">{copy(lang, 'See how your quote comes together.', 'شاهد كيف يتحول طلبك إلى عرض سعر.')}</h2>
        <p>{copy(lang, 'A calm visual guide from choosing your plants to sending the details our team needs.', 'شرح بصري هادئ يبدأ من اختيار النباتات وينتهي بإرسال البيانات التي يحتاجها فريقنا.')}</p>
      </div>
      <div className="quote-motion-stage">
        <video ref={videoRef} className="quote-motion-video" src="/quote-request-motion.mp4" autoPlay muted loop playsInline preload="metadata" aria-label={copy(lang, 'Motion graphic explaining the quote request process', 'فيديو يشرح طريقة طلب عرض السعر')} />
        <div className="quote-motion-video-glow" aria-hidden="true" />
        <button type="button" className="quote-motion-sound" onClick={toggleSound} aria-label={muted ? copy(lang, 'Turn on calm music', 'تشغيل الموسيقى الهادئة') : copy(lang, 'Mute music', 'كتم الموسيقى')} title={muted ? copy(lang, 'Turn on calm music', 'تشغيل الموسيقى الهادئة') : copy(lang, 'Mute music', 'كتم الموسيقى')}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}<span>{muted ? copy(lang, 'Turn on music', 'تشغيل الموسيقى') : copy(lang, 'Mute music', 'كتم الصوت')}</span>
        </button>
        <div className="quote-motion-autoplay"><Play size={12} fill="currentColor" />{copy(lang, 'Autoplays', 'يعمل تلقائيًا')}</div>
      </div>
      <div className="quote-motion-steps" aria-label={copy(lang, 'Quote request steps', 'خطوات طلب عرض السعر')}>
        {steps.map((step, index) => <div className="quote-motion-step" key={step.en}><span>{String(index + 1).padStart(2, '0')}</span><strong>{copy(lang, step.en, step.ar)}</strong>{index < steps.length - 1 && <i aria-hidden="true" />}</div>)}
      </div>
    </div>
  </section>;
}
