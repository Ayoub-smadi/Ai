import { ArrowDown, ArrowLeft, Award, Droplets, Globe2, Leaf, Mail, MapPin, Phone, Sprout, TreePine } from 'lucide-react';
import { Link } from 'wouter';

const gallery = [
  ['nursery-gallery-01.jpg', 'واجهة مشتل القادري الزراعي'],
  ['nursery-gallery-02.jpg', 'نباتات الزينة والزهور في المشتل'],
  ['nursery-gallery-03.jpg', 'أشجار الزينة والأحواض'],
  ['nursery-gallery-04.jpg', 'أشتال ونباتات متنوعة'],
  ['nursery-gallery-05.jpg', 'ممرات الأشجار والنباتات'],
  ['nursery-gallery-06.jpg', 'نباتات معروضة في المشتل'],
  ['nursery-gallery-07.jpg', 'أشجار الزيتون والنباتات المثمرة'],
  ['nursery-gallery-08.jpg', 'مشتل النباتات والزهور'],
  ['nursery-gallery-09.jpg', 'المساحات الخضراء والأشجار'],
  ['nursery-gallery-10.jpg', 'نباتات الزينة والزهور'],
  ['nursery-gallery-11.jpg', 'تنسيق النباتات في المشتل'],
  ['nursery-gallery-12.jpg', 'نباتات المشتل الخارجية'],
  ['nursery-gallery-13.jpg', 'ممر الأشجار في المشتل'],
  ['nursery-gallery-14.jpg', 'واجهة مشتل القادري'],
  ['nursery-gallery-15.jpg', 'أحواض وأصص زراعية'],
  ['nursery-gallery-16.jpg', 'أشجار الزينة وأحواض الزهور'],
  ['nursery-gallery-17.jpg', 'مجسمات الحدائق والنباتات'],
  ['nursery-gallery-18.jpg', 'أشجار الزيتون والأشجار المثمرة'],
  ['nursery-gallery-19.jpg', 'أشتال حرجية في المشتل'],
  ['nursery-gallery-20.jpg', 'نباتات وأشجار المشتل'],
  ['nursery-gallery-21.jpg', 'العناية بالأشجار والأشتال'],
  ['nursery-gallery-22.jpg', 'تنسيق الأشجار والحدائق'],
  ['nursery-gallery-23.jpg', 'أشجار ونباتات زينة'],
  ['nursery-gallery-24.jpg', 'الأشتال والنباتات المتنوعة'],
] as const;

const projects = [
  'القيادة العامة للقوات المسلحة', 'العمليات الخاصة', 'التوريد للبلديات والمؤسسات الحكومية',
  'مستشفى الأميرة بسمة', 'طريق المطار', 'حدائق الملك عبدالله',
  'الإشراف على مشروع العبدلي البوليفارد', 'البوتاس العربية', 'تنفيذ عطاءات الإسكان العسكري',
];

const branches = ['فرع جرش – الرشايدة', 'فرع جرش – السيل', 'فرع إربد – كفر يوبا', 'فرع الكرك – الثنية'];

export default function AboutUsPage() {
  return <main className="about-page" dir="rtl" lang="ar">
    <header className="about-page-topbar"><Link href="/" className="about-site-brand"><img src="/chatbot.png" alt="" /><span><strong>مشاتل القادري الزراعية</strong><small>جرش · منذ 1967</small></span></Link><nav aria-label="التنقل"><Link href="/">الرئيسية</Link><Link href="/projects">مشاريعنا وأعمالنا</Link><Link href="/store">المتجر</Link></nav></header>
    <section className="about-hero" style={{ backgroundImage: "linear-gradient(90deg, rgba(2,6,24,.14), rgba(2,6,24,.84)), url('/about/nursery-cover.jpg')" }}>
      <div className="about-hero-content"><span className="about-kicker"><span /> منذ عام 1967 · جرش، الأردن</span><h1>مشاتل القادري<br /><em>الزراعية</em></h1><p>من جرش، نزرع منذ ستة عقود.</p><div className="about-hero-tags"><span>أشتال الزيتون</span><span>الأشجار المثمرة والحرجية</span><span>نباتات الزينة</span><span>مواد زراعية</span></div><a className="about-scroll-link" href="#about-story">اكتشف حكايتنا <ArrowDown size={16} /></a></div>
      <div className="about-hero-index"><strong>1967</strong><span>بداية الحكاية</span></div>
    </section>

    <section className="about-story-section" id="about-story"><div className="about-section-shell"><div className="about-section-heading"><span className="about-section-kicker">نبذة عن المؤسسة</span><h2>بدأت بشتلة زيتون،<br /><span>وكبرت بالمثابرة.</span></h2><p>من بذرة صغيرة في جرش، نمت حكاية عائلية أصبحت من أعرق المشاتل الزراعية في الأردن والمنطقة.</p></div>
      <div className="about-stats"><article><strong>1967</strong><span>سنة التأسيس</span></article><article><strong>650</strong><span>دونمًا في جرش</span></article><article><strong>6</strong><span>عقود من الخبرة</span></article></div>
      <div className="about-story-grid"><div className="about-story-copy"><h3>جذور راسخة في أرض جرش</h3><p>تأسست مشاتل القادري الزراعية عام 1967 على يد الحاج أحمد عبد الرحمن القادري (أبو عقاب)، على مساحة 650 دونمًا في جرش. وكانت البداية بإنتاج أشتال الزيتون خصوصًا، والأشتال المثمرة عمومًا.</p><p>بدأت المشاتل بتجارة النباتات، ثم انتقلت إلى إنتاج النباتات المثمرة والحرجية، وأصناف الزيتون ونباتات الزينة، حتى أصبحت من أكبر المشاتل على مستوى المملكة الأردنية.</p><div className="about-story-rule"><Leaf size={19} /><span>نختار الصنف الذي يلائم الأرض والمناخ.</span></div></div><figure className="about-founder-photo"><img src="/about/founder-ahmad.jpg" alt="الحاج أحمد عبد الرحمن القادري، أبو عقاب، مؤسس المشاتل" loading="lazy" /><figcaption><span>المؤسس</span><strong>الحاج أحمد عبد الرحمن القادري</strong><small>أبو عقاب</small></figcaption></figure></div>
      <div className="about-values-grid"><article><span className="about-value-number">01</span><h3>صنف يناسب الأرض</h3><p>ندرس احتياجات السوق وطبيعة المنطقة ومناخها، ونختار الأصناف التي تلائمها وتثري القطاع الزراعي.</p></article><article><span className="about-value-number">02</span><h3>إنتاج محلي مستمر</h3><p>حرصنا على إنتاج أصناف خارجية محليًا، لتقليل الاعتماد على الاستيراد والكلفة، وتشجيع التنوع والتوسع.</p></article><article><span className="about-value-number">03</span><h3>خبرة تتوارثها الأجيال</h3><p>ورث الأبناء روح المثابرة والإصرار، وتواصل المؤسسة تلبية احتياجات السوق الزراعي بخبرة عملية متراكمة.</p></article></div>
    </div></section>

    <section className="about-award-section"><div className="about-award-inner"><div className="about-award-copy"><span className="about-section-kicker">تقدير وطني</span><h2>ميدالية اليوبيل الفضي</h2><p>في سبتمبر 2024، أنعم جلالة الملك عبدالله الثاني بميدالية اليوبيل الفضي على مؤسسة القادري الزراعية، تقديرًا لإسهاماتها التاريخية في خدمة الأردن والمجتمع المحلي.</p><p>جاء هذا التكريم بالتزامن مع احتفالات المملكة بمرور 25 عامًا على تولي جلالته سلطاته الدستورية، ليكون وسامًا نعتز به ومسؤولية تدفعنا إلى مواصلة العطاء.</p><div className="about-award-seal"><Award size={18} /><span>وسام نعتز به ومسؤولية نواصل بها العطاء</span></div></div><figure className="about-award-photo"><img src="/about/silver-jubilee-medal.jpg" alt="ميدالية اليوبيل الفضي" loading="lazy" /></figure></div></section>

    <section className="about-market-section"><div className="about-section-shell"><div className="about-market-head"><div><span className="about-section-kicker">من المشتل إلى السوق</span><h2>خبرة تمتد إلى<br /><span>أسواق المنطقة.</span></h2></div><div className="about-market-copy"><p>امتدت خدمات التوريد والاستيراد إلى السوق الأردني والدول المجاورة، من خلال شبكة واسعة من العلاقات التجارية والشراكات الاستراتيجية في القطاع الزراعي.</p><p>وساهمت خبرة المؤسسة في إدارة عمليات الاستيراد والتصدير في توفير مستلزمات الإنتاج والمنتجات الزراعية بجودة عالية وفي الوقت المناسب، وتحسين كفاءة سلاسل التوريد وفتح أسواق جديدة.</p></div></div><figure className="about-supply-photo"><img src="/about/supply-chain.jpg" alt="تجهيز ونقل الأشتال من المشتل" loading="lazy" /><figcaption>من جرش إلى السوق المحلي ودول الجوار والخليج العربي</figcaption></figure><div className="about-route-line"><span>جرش</span><i /><span>السوق المحلي</span><i /><span>دول الجوار والخليج العربي</span></div></div></section>

    <section className="about-work-section"><div className="about-section-shell"><div className="about-work-heading"><span className="about-section-kicker">أعمال ومشاريع منفذة</span><h2>نزرع الجمال،<br /><span>وننجز على أرض الواقع.</span></h2><p>نفخر بتنفيذ مشاريع زراعية وتجميلية لجهات وطنية في المملكة، شملت أعمال الزراعة وتنسيق الحدائق وتمديد شبكات الري، مع الالتزام بالجودة في كل مرحلة.</p></div><div className="about-services-grid"><article><span><Sprout size={22} /></span><h3>الزراعة</h3><p>توريد وزراعة الأشجار المثمرة والحرجية ونباتات الزينة بأصناف تناسب طبيعة الموقع والمناخ.</p></article><article><span><TreePine size={22} /></span><h3>تنسيق الحدائق</h3><p>تصميم وتنسيق الحدائق والمساحات الخضراء والمواقع العامة بلمسة جمالية متناسقة.</p></article><article><span><Droplets size={22} /></span><h3>شبكات الري</h3><p>تمديد وتركيب شبكات الري الحديثة بما يضمن كفاءة استخدام المياه وسلامة النباتات.</p></article></div><div className="about-projects-block"><h3>من أبرز الجهات والمشاريع</h3><div className="about-projects-list">{projects.map((project, index) => <div key={project}><span>{String(index + 1).padStart(2, '0')}</span><strong>{project}</strong></div>)}</div></div></div></section>

    <section className="about-gallery-section"><div className="about-section-shell"><div className="about-gallery-heading"><div><span className="about-section-kicker">من أرض المشتل</span><h2>جولة في مشتل القادري</h2></div><p>مشاهد من النباتات والأشجار والمساحات التي نعتني بها في جرش.</p></div><div className="about-gallery-grid">{gallery.map(([src, alt], index) => <figure className={`about-gallery-item about-gallery-item-${(index % 6) + 1}`} key={src}><img src={`/about/${src}`} alt={alt} loading="lazy" /><figcaption>{alt}</figcaption></figure>)}</div></div></section>

    <section className="about-contact-section"><div className="about-section-shell"><div className="about-contact-heading"><span className="about-section-kicker">نحن بالقرب منكم</span><h2>تواصل معنا</h2><p>يسعدنا تواصلكم وزيارتكم لمشاتل القادري الزراعية.</p></div><div className="about-contact-grid"><a href="tel:+962777772211"><span><Phone size={19} /></span><small>اتصل بنا</small><strong dir="ltr">00962777772211</strong></a><a href="mailto:tamerqadri@gmail.com"><span><Mail size={19} /></span><small>البريد الإلكتروني</small><strong dir="ltr">tamerqadri@gmail.com</strong></a><a href="https://www.alqadrioffers.online" target="_blank" rel="noreferrer"><span><Globe2 size={19} /></span><small>موقع المؤسسة</small><strong dir="ltr">alqadrioffers.online</strong></a></div><div className="about-contact-actions"><Link href="/quotes">طلب عرض سعر <ArrowLeft size={15} /></Link><Link href="/store">تصفح المتجر <ArrowLeft size={15} /></Link></div></div></section>

    <section className="about-branches-section"><div className="about-section-shell"><div className="about-branches-heading"><span className="about-section-kicker">قريبون منكم</span><h2>مواقع الفروع</h2><p>نستقبلكم في فروعنا عبر الأردن.</p></div><div className="about-branches-grid">{branches.map((branch, index) => <article key={branch}><span className="about-branch-icon"><MapPin size={18} /></span><div><small>فرع {String(index + 1).padStart(2, '0')}</small><h3>{branch.replace(/^فرع\s*/, '')}</h3></div><ArrowLeft size={17} /></article>)}</div></div></section>

    <section className="about-closing"><div className="about-closing-mark"><Leaf size={22} /></div><p>سنستمر بمواكبة كل ما هو جديد في عالم الزراعة،<br />وتلبية ما يلزم هذا المجال المبارك والمتميّز.</p><span>مشاتل القادري الزراعية · جرش، الأردن · منذ 1967</span></section>
  </main>;
}
