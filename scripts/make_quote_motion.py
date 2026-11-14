from pathlib import Path
import math, shutil, subprocess
from PIL import Image, ImageDraw, ImageFont

W, H = 960, 540
FPS = 30
DURATION = 24
OUT = Path('/home/ubuntu/ai/artifacts/ayoub-ai/public/quote-request-motion-silent.mp4')
FRAMES = Path('/tmp/qadri_quote_motion_frames')
FRAMES.mkdir(parents=True, exist_ok=True)

FONT_DIRS = [
    '/usr/share/fonts/truetype/noto',
    '/usr/share/fonts/truetype/dejavu',
    '/usr/share/fonts/opentype/noto',
]
def find_font(names):
    for d in FONT_DIRS:
        for name in names:
            p = Path(d) / name
            if p.exists(): return str(p)
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
REG = find_font(['NotoSansArabic-Regular.ttf', 'NotoSansArabicUI-Regular.ttf', 'DejaVuSans.ttf'])
BOLD = find_font(['NotoSansArabic-Bold.ttf', 'NotoSansArabicUI-Bold.ttf', 'DejaVuSans-Bold.ttf'])

def font(size, bold=False): return ImageFont.truetype(BOLD if bold else REG, size)

def ease(x): return x*x*(3-2*x)

def alpha_layer(base, layer, opacity=255):
    if opacity < 255: layer.putalpha(layer.getchannel('A').point(lambda p: p*opacity//255))
    base.alpha_composite(layer)

def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def centered(draw, text, y, f, fill, box=(0,0,W,H)):
    b = draw.textbbox((0,0), text, font=f)
    x = box[0] + (box[2]-box[0]-(b[2]-b[0]))/2
    draw.text((x,y), text, font=f, fill=fill)

def rtl_text(draw, text, xy, f, fill, anchor='ra'):
    draw.text(xy, text, font=f, fill=fill, anchor=anchor)

def draw_pointer(draw, x, y, pulse):
    r = 18 + int(5*math.sin(pulse*math.pi*2))
    draw.ellipse((x-r,y-r,x+r,y+r), outline='#b9dd9c', width=3)
    draw.ellipse((x-5,y-5,x+5,y+5), fill='#f2c572')
    draw.line((x+6,y+7,x+27,y+29), fill='#f2c572', width=4)
    draw.polygon([(x+24,y+26),(x+38,y+31),(x+31,y+18)], fill='#f2c572')

def screen_base(draw, title, step, subtitle):
    rounded(draw, (92,58,868,488), 26, '#fffdf7')
    rounded(draw, (92,58,868,108), 26, '#173d2a')
    draw.rectangle((92,84,868,108), fill='#173d2a')
    draw.ellipse((122,78,148,104), fill='#d7a64f')
    draw.text((165,76), 'قادري', font=font(20, True), fill='#fffdf7')
    draw.text((165,99), 'طلب عرض سعر', font=font(12), fill='#bdd3be')
    rtl_text(draw, title, (825,83), font(22, True), '#fffdf7')
    draw.text((122,138), f'الخطوة {step} من 4', font=font(14, True), fill='#5a7860')
    draw.text((122,164), subtitle, font=font(13), fill='#869287')
    for i in range(4):
        x=122+i*92
        draw.rounded_rectangle((x,196,x+72,202), radius=3, fill='#dfe9df' if i>=step-1 else '#6f9e70')

def draw_frame(t):
    im=Image.new('RGBA',(W,H),'#102f24'); d=ImageDraw.Draw(im)
    # subtle botanical motion background
    for i in range(6):
        x=(i*177+int(t*13))%1100-70; y=40+(i%3)*190
        d.ellipse((x,y,x+170,y+170), fill='#1b4934')
        d.ellipse((x+55,y-18,x+125,y+95), fill='#24563b')
    d.text((52,34),'QADRI AI',font=font(13,True),fill='#b9d7b3')
    d.text((52,485),'من اختيارك إلى طلبك — ببساطة',font=font(14),fill='#b9d7b3')
    p=t/DURATION
    if p < .18:
        local=p/.18; title='ابدأ طلبك بخطوة واحدة'; step=1; sub='اختر المنتجات التي تريد عرض سعر لها'
        screen_base(d,title,step,sub)
        for i,(name,price) in enumerate([('شجرة زيتون', 'ابتداءً من 12 د.ا'),('فيكس حدائق','ابتداءً من 8 د.ا'),('ورد جوري','ابتداءً من 5 د.ا')]):
            x=125+i*235; y=240
            rounded(d,(x,y,x+205,y+160),16,'#f2f6ed', '#dbe7d9')
            d.ellipse((x+20,y+20,x+75,y+75),fill=['#8eae73','#6c9a62','#d8a451'][i])
            d.text((x+20,y+92),name,font=font(17,True),fill='#23422d')
            d.text((x+20,y+123),price,font=font(12),fill='#718173')
        draw_pointer(d, 360+int(ease(local)*330), 330, local)
    elif p < .39:
        local=(p-.18)/.21; title='اختر المنتجات والكميات'; step=2; sub='أضف ما يناسب مشروعك وعدّل الكمية بسهولة'
        screen_base(d,title,step,sub)
        rounded(d,(135,230,560,430),18,'#f4f7f0','#dbe6d8')
        d.text((170,255),'شجرة زيتون',font=font(22,True),fill='#23422d')
        d.text((170,300),'نباتات خارجية · حجم متوسط',font=font(14),fill='#718173')
        d.text((170,362),'الكمية',font=font(14,True),fill='#526a57')
        rounded(d,(300,340,475,395),12,'#ffffff','#cbdacb')
        d.text((378,351),str(min(3,1+int(local*3))),font=font(25,True),fill='#23422d',anchor='mm')
        for x,txt in [(318,'−'),(457,'+')]: d.text((x,368),txt,font=font(22,True),fill='#6c936c',anchor='mm')
        rounded(d,(610,255,825,392),16,'#e8f1e5')
        d.text((635,282),'ملخص الطلب',font=font(17,True),fill='#23422d')
        d.text((635,322),'1 منتج',font=font(14),fill='#617362')
        d.text((635,350),'الكمية: 3',font=font(14),fill='#617362')
        draw_pointer(d, 457, 368, local)
    elif p < .62:
        local=(p-.39)/.23; title='اكتب بيانات التواصل'; step=3; sub='حتى نتواصل معك ونجهز العرض المناسب'
        screen_base(d,title,step,sub)
        fields=[('الاسم الكامل','أحمد القادري'),('رقم الهاتف','07 7777 2211'),('العنوان','جرش — الرشايدة')]
        for i,(label,value) in enumerate(fields):
            y=235+i*62
            d.text((760,y),label,font=font(14,True),fill='#526a57',anchor='ra')
            rounded(d,(205,y+25,760,y+70),10,'#ffffff','#cbdacb')
            visible=int(len(value)*min(1,max(0,(local*3-i)*1.8)))
            d.text((730,y+35),value[:visible],font=font(17),fill='#23422d',anchor='ra')
        draw_pointer(d, 550, 330+int(local*115), local)
    else:
        local=(p-.62)/.38; title='أرسل الطلب وانتظر عرضك'; step=4; sub='فريق القادري يراجع طلبك ويتواصل معك قريبًا'
        screen_base(d,title,step,sub)
        if local < .52:
            rounded(d,(218,240,742,385),20,'#f4f8f1','#dbe8d8')
            d.text((480,265),'طريقة الاستلام',font=font(18,True),fill='#23422d',anchor='ma')
            for x,txt in [(305,'توصيل'),(555,'استلام من المشتل')]:
                rounded(d,(x,310,x+180,365),12,'#ffffff','#b7cfb7',3 if (x==305 and local>.18) else 1)
                d.text((x+90,328),txt,font=font(15,True),fill='#416b49',anchor='ma')
            draw_pointer(d, 395 if local<.25 else 615, 338, local)
        else:
            q=(local-.52)/.48
            rounded(d,(250,230,710,405),24,'#eff8eb','#b8d4b4')
            d.ellipse((430,258,530,358),fill='#5e9d68')
            d.line((455,310,478,333),fill='#fff',width=8)
            d.line((478,333,510,290),fill='#fff',width=8)
            centered(d,'تم استلام طلبك',370,font(25,True),'#23422d')
            centered(d,'سنتواصل معك لتأكيد العرض',405,font(15),'#617362')
            d.ellipse((480-int(q*110),305-int(q*42),480-int(q*110)+7,312-int(q*42)),fill='#d9e99f')
            d.ellipse((500+int(q*120),270-int(q*28),507+int(q*120),277-int(q*28)),fill='#e8c77c')
    return im.convert('RGB')

for idx in range(FPS*DURATION):
    frame=draw_frame(idx/FPS)
    frame.save(FRAMES/f'frame_{idx:05d}.jpg', quality=92)

OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(['ffmpeg','-y','-framerate',str(FPS),'-i',str(FRAMES/'frame_%05d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
print(OUT)
