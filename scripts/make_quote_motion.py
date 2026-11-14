from pathlib import Path
import math, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageOps

W, H, FPS, DURATION = 960, 540, 30, 24
ROOT = Path('/home/ubuntu/ai')
OUT = ROOT / 'artifacts/ayoub-ai/public/quote-request-motion-silent.mp4'
FRAMES = Path('/tmp/qadri_quote_motion_frames')
HOME_REF = ROOT / 'scripts/references/site-home.png'
QUOTES_REF = ROOT / 'scripts/references/site-quotes.png'
FRAMES.mkdir(parents=True, exist_ok=True)
for old in FRAMES.glob('frame_*.jpg'): old.unlink()

FONT_DIRS = ['/usr/share/fonts/truetype/noto','/usr/share/fonts/truetype/dejavu','/usr/share/fonts/opentype/noto']
def find_font(names):
    for directory in FONT_DIRS:
        for name in names:
            path = Path(directory) / name
            if path.exists(): return str(path)
    return '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
REG = find_font(['NotoSansArabic-Regular.ttf','NotoSansArabicUI-Regular.ttf','DejaVuSans.ttf'])
BOLD = find_font(['NotoSansArabic-Bold.ttf','NotoSansArabicUI-Bold.ttf','DejaVuSans-Bold.ttf'])
def font(size, bold=False): return ImageFont.truetype(BOLD if bold else REG, size)

def ease(x): return x*x*(3-2*x)
def rounded(draw, box, radius, fill, outline=None, width=1): draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
def centered(draw, text, y, f, fill, box=(0,0,W,H)):
    b = draw.textbbox((0,0), text, font=f)
    draw.text((box[0] + (box[2]-box[0]-(b[2]-b[0]))/2, y), text, font=f, fill=fill)
def rtl(draw, text, x, y, f, fill, anchor='ra'): draw.text((x,y), text, font=f, fill=fill, anchor=anchor)

def fit_reference(path):
    image = Image.open(path).convert('RGB')
    # Keep the actual website header and hero/catalog content in a 16:9 screen.
    return ImageOps.fit(image, (840, 472), method=Image.Resampling.LANCZOS, centering=(0.5, 0.22))
HOME = fit_reference(HOME_REF)
QUOTES = fit_reference(QUOTES_REF)

def screen_frame(draw, image, label):
    # Browser-like frame, using the real captured site as the screen content.
    x, y = 60, 42
    rounded(draw, (x-7,y-7,x+854,y+486), 20, '#071b14', '#83a77e66', 2)
    draw.ellipse((x+13,y+13,x+21,y+21), fill='#e5b86f')
    draw.ellipse((x+28,y+13,x+36,y+21), fill='#8ab777')
    draw.ellipse((x+43,y+13,x+51,y+21), fill='#d78070')
    draw.text((x+70,y+8), label, font=font(11), fill='#b7ceb0')
    draw.rounded_rectangle((x,y+32,x+840,y+504), radius=12, fill='#f7faf6')
    draw._image.paste(image, (x, y + 32))

def pointer(draw, x, y, phase=0):
    r = 15 + int(4*math.sin(phase*math.pi*2))
    draw.ellipse((x-r,y-r,x+r,y+r), outline='#e9c878', width=3)
    draw.ellipse((x-4,y-4,x+4,y+4), fill='#e9c878')
    draw.line((x+6,y+7,x+27,y+29), fill='#e9c878', width=4)
    draw.polygon([(x+24,y+26),(x+39,y+31),(x+31,y+18)], fill='#e9c878')

def badge(draw, box, text, fill='#1c4932'):
    rounded(draw, box, 13, fill, '#dcebd4', 1)
    b = draw.textbbox((0,0), text, font=font(13, True))
    draw.text(((box[0]+box[2]-b[2]+b[0])/2, (box[1]+box[3]-b[3]+b[1])/2-1), text, font=font(13, True), fill='#fffdf7')

def draw_checkout(draw, local):
    # A faithful, simplified checkout state in the same live site's visual language.
    rounded(draw, (60,42,900,532), 20, '#071b14', '#83a77e66', 2)
    draw.ellipse((80,55,88,63), fill='#e5b86f'); draw.ellipse((95,55,103,63), fill='#8ab777'); draw.ellipse((110,55,118,63), fill='#d78070')
    draw.text((140,49), 'alqadri-offers.online / quotes', font=font(11), fill='#b7ceb0')
    rounded(draw, (67,76,893,525), 12, '#f8faf7')
    rtl(draw, 'قادري', 480, 93, font(19, True), '#2f6a43', anchor='ma')
    rtl(draw, 'بيانات الطلب', 828, 134, font(19, True), '#24392b')
    draw.text((130,138), 'CONTACT & DELIVERY', font=font(10), fill='#7c9080')
    # selection card
    rounded(draw, (118,180,410,450), 16, '#ffffff', '#e1e9df')
    rtl(draw, 'النباتات المختارة', 380, 202, font(16, True), '#294631')
    draw.text((140,205), 'YOUR SELECTION', font=font(9), fill='#7c9080')
    for i,(name,size) in enumerate([('جولد ستار','متوسط'),('سرو توتم إيطالي','كبير')]):
        y=250+i*75
        rounded(draw,(140,y,388,y+57),11,'#f1f6ef')
        draw.ellipse((153,y+14,181,y+42),fill='#6e9b61' if i==0 else '#a7be83')
        rtl(draw,name,365,y+12,font(13,True),'#2c4933')
        rtl(draw,f'الحجم: {size} · الكمية: {1+i}',365,y+36,font(10),'#77887b')
    # form fields fill in as time advances
    fields=[('الاسم الكامل','أحمد القادري'),('رقم الهاتف','07 7777 2211'),('منطقة التوصيل','جرش — الرشايدة')]
    for i,(label,value) in enumerate(fields):
        y=181+i*64
        rtl(draw,label,822,y,font(12,True),'#526a57')
        rounded(draw,(500,y+21,822,y+61),9,'#fff','#d7e3d6')
        visible=max(0,min(len(value),int((local*4-i)*len(value)/2)))
        rtl(draw,value[:visible],805,y+31,font(13),'#294631')
    rounded(draw,(500,405,822,457),11,'#234b37')
    rtl(draw,'إرسال طلب عرض السعر', 660, 420, font(14,True), '#fff', anchor='ma')
    if local < .8: pointer(draw, 735, 430, local)

def draw_success(draw, local):
    draw_checkout(draw, 1)
    overlay=Image.new('RGBA',(W,H),(0,0,0,0)); od=ImageDraw.Draw(overlay)
    od.rectangle((0,0,W,H), fill='#0b2418aa')
    rounded(od,(248,145,712,430),24,'#f4faef','#b7d5ad',2)
    od.ellipse((430,185,530,285),fill='#5e9d68')
    od.line((455,235,478,258),fill='#fff',width=8); od.line((478,258,510,215),fill='#fff',width=8)
    centered(od,'تم استلام طلبك',302,font(27,True),'#24402c')
    centered(od,'سنتواصل معك لتأكيد العرض',345,font(15),'#617362')
    centered(od,'الطلب ينتقل الآن إلى التجهيز والتوصيل',381,font(12),'#7f8e80')
    draw._image.paste(overlay, (0, 0), overlay)

def draw_truck(draw, local):
    # Delivery scene with the same dark green / gold palette and a moving QADRI truck.
    draw.rectangle((0,0,W,H), fill='#b9d9d0')
    draw.rectangle((0,310,W,H), fill='#e4c993')
    draw.rectangle((0,405,W,H), fill='#b98b58')
    for i in range(9):
        x=(i*145-int(local*260))%1100-100
        draw.ellipse((x,210,x+115,320),fill='#689470')
        draw.rectangle((x+45,294,x+65,385),fill='#66734d')
        draw.ellipse((x+12,190,x+74,285),fill='#79a277')
    draw.line((0,407,W,407), fill='#7f5a3b', width=3)
    # speed marks
    for i in range(5):
        x=(i*160-int(local*500))%1000
        draw.line((x,370+i*8,x+70,370+i*8), fill='#f2e1b7', width=3)
    truck_x=int(-260 + local*1120)
    # trailer
    tx=truck_x; ty=250
    rounded(draw,(tx,ty,tx+420,ty+130),16,'#1b4b34','#123222',3)
    rounded(draw,(tx+22,ty+22,tx+398,ty+108),10,'#316b48','#9fc694',2)
    draw.text((tx+58,ty+43),'قادري',font=font(31,True),fill='#fffdf2')
    draw.text((tx+62,ty+82),'نباتاتك في الطريق',font=font(14),fill='#d9eacb')
    # cab
    rounded(draw,(tx+420,ty+48,tx+585,ty+170),17,'#254f38','#123222',3)
    draw.polygon([(tx+420,ty+48),(tx+540,ty+48),(tx+585,ty+91),(tx+585,ty+170),(tx+420,ty+170)],fill='#2b6845')
    rounded(draw,(tx+453,ty+66,tx+542,ty+116),7,'#b6d6d3','#e6f2dd',2)
    # bumper and wheels
    draw.rectangle((tx+568,ty+142,tx+610,ty+158), fill='#173422')
    for wx in [tx+75,tx+420,tx+525]:
        draw.ellipse((wx,ty+137,wx+55,ty+192),fill='#1b241e')
        draw.ellipse((wx+13,ty+150,wx+42,ty+179),fill='#d6c2a0')
        draw.ellipse((wx+21,ty+158,wx+34,ty+171),fill='#6e7d72')
    # plant crate animates upward then settles in the trailer
    lift=max(0,1-local*4) if local<.25 else 0
    cx=tx+175; cy=ty+34-int(lift*120)
    rounded(draw,(cx,cy,cx+92,cy+64),8,'#c3914e','#704f2e',2)
    draw.rectangle((cx+9,cy+12,cx+83,cy+20),fill='#e3bd72')
    draw.ellipse((cx+30,cy-25,cx+61,cy+13),fill='#5b8d5c'); draw.ellipse((cx+9,cy-10,cx+43,cy+18),fill='#6c9d65'); draw.ellipse((cx+48,cy-12,cx+82,cy+17),fill='#4f8055')
    centered(draw,'طلبك في الطريق',80,font(30,True),'#173e2a')
    centered(draw,'من موقع القادري إلى بابك',122,font(15),'#526e59')
    draw.text((48,490),'قريبًا تصلك نباتاتك بعناية',font=font(13),fill='#5e4932')

def frame_at(t):
    im=Image.new('RGB',(W,H),'#102f24'); d=ImageDraw.Draw(im)
    d.text((45,18),'QADRI AI  /  QUOTE DELIVERY',font=font(11,True),fill='#c8debd')
    p=t/DURATION
    if p < .17:
        local=p/.17; screen_frame(d,HOME,'موقع القادري الزراعي الذكي')
        pointer(d, 560+int(local*12), 150, local)
        if local>.62: badge(d,(650,452,840,486),'طلب عرض سعر',fill='#214d36')
    elif p < .38:
        local=(p-.17)/.21; screen_frame(d,QUOTES,'alqadri-offers.online / quotes')
        pointer(d, 490+int(math.sin(local*math.pi)*12), 345, local)
        if local>.4: badge(d,(615,452,842,486),'اختر الحجم والكمية',fill='#214d36')
    elif p < .60:
        draw_checkout(d,(p-.38)/.22)
    elif p < .75:
        draw_success(d,(p-.60)/.15)
    else:
        draw_truck(d,(p-.75)/.25)
    return im

for index in range(FPS*DURATION):
    frame_at(index/FPS).save(FRAMES/f'frame_{index:05d}.jpg', quality=93)
OUT.parent.mkdir(parents=True, exist_ok=True)
subprocess.run(['ffmpeg','-y','-framerate',str(FPS),'-i',str(FRAMES/'frame_%05d.jpg'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
print(OUT)
