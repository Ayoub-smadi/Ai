import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { z } from "../../../../lib/api-zod/node_modules/zod/index.js";

const router: IRouter = Router();
const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1600),
  })).max(8).optional(),
  context: z.enum(["chat", "plant-treatment", "plants", "landscape-editor"]).optional(),
}).strict();
const responseSchema = z.object({ reply: z.string().min(1).max(4000) });

const OUT_OF_SCOPE_REPLY = "هذا السؤال خارج نطاق خدماتي. أستطيع مساعدتك فقط في الزراعة والنباتات والري والتسميد وعلاج مشاكل النباتات وتصميم الحدائق.";
const AGRICULTURE_TERMS = /زراعة|زراعي|نبات|شتل|شتلات|شجرة|أشجار|ورق|أوراق|ساق|جذر|جذور|تربة|تراب|ري|سقاية|ماء|تسميد|سماد|مبيد|مرض|آفة|حشرة|ذبول|اصفرار|زيتون|ليمون|حمضيات|ورد|حديقة|لاندسكيب|تنسيق|مشتل|محصول|بذور|غرس|تقلي[م]|زهر|فاكهة|خضار|عشب|نجيلة|soil|plant|tree|crop|farm|farming|agriculture|irrigation|fertilizer|pest|disease|garden|landscape|nursery|watering|pruning|seed/i;
const GREETING = /^(مرحبا|مرحباً|اهلا|أهلا|السلام عليكم|شكرا|شكرًا|hello|hi|thanks|thank you)[!.،؟?\s]*$/i;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  for (const [knownIp, window] of requestsByIp) {
    if (window.resetAt <= now) requestsByIp.delete(knownIp);
  }
  const window = requestsByIp.get(ip);
  if (!window || window.resetAt <= now) {
    requestsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (window.count >= MAX_REQUESTS_PER_WINDOW) return true;
  window.count += 1;
  return false;
}

function isClearlyOutsideAgriculture(message: string): boolean {
  return !GREETING.test(message) && !AGRICULTURE_TERMS.test(message);
}

router.post("/agriculture-chat", async (req, res): Promise<void> => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_REQUEST" });
    return;
  }
  const { message, history = [], context = "chat" } = parsed.data;
  if (isClearlyOutsideAgriculture(message)) {
    res.json(responseSchema.parse({ reply: OUT_OF_SCOPE_REPLY }));
    return;
  }
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "RATE_LIMITED" });
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY || process.env.PLANT_ADVISOR_API_KEY || process.env.LANDSCAPE_OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI_NOT_CONFIGURED" });
    return;
  }

  const systemPrompt = [
    "أنت المساعد الزراعي الرسمي لمؤسسة القادري الزراعية في الأردن.",
    "اختصاصك حصراً: النباتات والشتلات والأشجار والمحاصيل والتربة والري والسقاية والتسميد والآفات والأمراض النباتية والمشاتل وتنسيق الحدائق واللاندسكيب.",
    `إذا كان السؤال لا يتعلّق مباشرة بهذه المجالات، أجب حرفياً: ${OUT_OF_SCOPE_REPLY}`,
    "لا تجب عن البرمجة أو الأخبار أو السياسة أو الرياضة أو الدراسة العامة أو الطب البشري أو القانون أو المال أو أي موضوع غير زراعي.",
    "إذا كان السؤال الزراعي ناقص التفاصيل، اسأل سؤالاً توضيحياً قصيراً بدلاً من اختراع معلومات.",
    "أجب بالعربية عندما يكتب المستخدم بالعربية، وبالإنجليزية عندما يكتب بالإنجليزية. كن عملياً ومختصراً.",
    "لا تقدّم تشخيصاً قطعياً من صورة واحدة، ولا تذكر جرعات مبيدات خطرة دون ملصق المنتج أو فحص مهندس زراعي. نبّه إلى فحص التربة أو مراجعة مهندس عند الحاجة.",
    `صفحة الاستخدام الحالية: ${context}. في صفحة plant-treatment ركّز على قراءة العلامات الظاهرة في النبات، وفي plants ركّز على العناية والري، وفي landscape-editor ركّز على توزيع النباتات والعناصر في المخطط.`,
  ].join("\n");

  try {
    const client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-6-luna",
      max_completion_tokens: 1200,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8),
        { role: "user", content: message },
      ],
    });
    const reply = completion.choices[0]?.message.content?.trim();
    if (!reply) {
      res.status(502).json({ error: "INVALID_AI_RESPONSE" });
      return;
    }
    res.json(responseSchema.parse({ reply }));
  } catch {
    res.status(502).json({ error: "AI_REQUEST_FAILED" });
  }
});

export default router;
