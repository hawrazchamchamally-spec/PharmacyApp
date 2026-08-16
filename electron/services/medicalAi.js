const https = require('https');

// ----------------------------------------------------
// OFFLINE MEDICAL SAFETY RULE ENGINE
// ----------------------------------------------------
const DRUG_RULES = [
  // HYPERTENSION
  {
    conditionKeys: ['ضغط', 'ضغط دم', 'hypertension'],
    drugKeywords: ['ibuprofen', 'diclofenac', 'naproxen', 'celecoxib', 'meloxicam', 'pseudoephedrine', 'phenylephrine', 'إيبوبروفين', 'فولتارين', 'ديكلوفيناك', 'نابروكسين', 'سيليكوكسب', 'سودوإيفيدرين'],
    riskLevel: 'متوسط',
    analysis: 'هذا الدواء ينتمي لمجموعة المسكنات (NSAIDs) أو مضادات الاحتقان، والتي تسبب انحباس الصوديوم والسوائل وتؤدي لارتفاع ضغط الدم وإضعاف فاعلية أدوية الضغط.',
    suggestion: 'استخدام Paracetamol (باراسيتامول / بنادول) كمسكن آمن ومناسب لمرضى ضغط الدم.'
  },

  // DIABETES
  {
    conditionKeys: ['سكر', 'سكري', 'diabetes'],
    drugKeywords: ['prednisolone', 'dexamethasone', 'hydrocortisone', 'betamethasone', 'بريدنيزولون', 'ديكساميثازون', 'كورتيزون'],
    riskLevel: 'حرج',
    analysis: 'مركبات الكورتيزون تسبب ارتفاعاً حاداً ومفاجئاً في مستويات سكر الدم وتصعّب السيطرة على قراءات السكر.',
    suggestion: 'تجنب مركبات الكورتيزون إلا بدواعي طبية ماسة وتحت إشراف مباشر مع تعديل جرعات الانسولين/الخافضات.'
  },

  // PREGNANCY
  {
    conditionKeys: ['حمل', 'حامل', 'pregnancy'],
    drugKeywords: ['captopril', 'enalapril', 'valsartan', 'losartan', 'ibuprofen', 'diclofenac', 'naproxen', 'atorvastatin', 'simvastatin', 'warfarin', 'doxycycline', 'ciprofloxacin', 'كابتوبريل', 'فولتارين', 'ديكلوفيناك', 'إيبوبروفين', 'ورفارين', 'دواكسيسيكلين', 'سيبروفلوكساسين'],
    riskLevel: 'حرج',
    analysis: 'المادة الفعالة غير آمنة تماماً أثناء الحمل (Category C/D/X) وقد تسبب تشوهات جنينية أو تأثيراً سمياً على كليتي الجنين أو خطر النزيف.',
    suggestion: 'استبدال الدواء بـ Paracetamol للآلام، أو استشارة طبيب النسائية لاختيار بديل آمن معتمد أثناء الحمل.'
  },

  // RENAL IMPAIRMENT
  {
    conditionKeys: ['كلى', 'فشل كلوي', 'renal', 'kidney'],
    drugKeywords: ['ibuprofen', 'diclofenac', 'naproxen', 'celecoxib', 'metformin', 'gentamicin', 'فولتارين', 'ديكلوفيناك', 'إيبوبروفين', 'سيدوفاج', 'ميتفورمين'],
    riskLevel: 'حرج',
    analysis: 'استخدام هذه المادة لدى مرضى الكلى يقلل التدفق الدموي الكببي ويسبب تراجعاً حاداً في وظائف الكلية وتراكم سمية الدواء.',
    suggestion: 'تقليل الجرعة أو استبدال الدواء بمسكن آمن مثل Paracetamol مع مراقبة وظائف الكلية.'
  },

  // ASTHMA
  {
    conditionKeys: ['ربو', 'حساسية صدر', 'asthma'],
    drugKeywords: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'propranolol', 'atenolol', 'أسبرين', 'فولتارين', 'إيبوبروفين', 'أندرال', 'بروبرانولول'],
    riskLevel: 'حرج',
    analysis: 'أدوية الـ NSAIDs أو محصرات بيتا قد تحفز نوبات ضيق تنفس وتشنج قصبات حاد لدى مرضى الربو (Aspirin-Induced Asthma).',
    suggestion: 'استخدام Paracetamol كبديل مسكن آمن، وتجنب محصرات بيتا غير الانتقائية.'
  }
];

// DRUG-DRUG INTERACTIONS
const INTERACTION_RULES = [
  {
    drugsA: ['warfarin', 'ورفارين'],
    drugsB: ['aspirin', 'ibuprofen', 'diclofenac', 'naproxen', 'أسبرين', 'فولتارين', 'إيبوبروفين'],
    riskLevel: 'حرج',
    analysis: 'تداخل دوائي حرج: الجمع بين مضادات التجلط (الورفارين) والمسكنات يضاعف خطر حدوث نزيف حاد بالجهاز الهضمي.',
    suggestion: 'تجنب الجمع تماماً واستبدال المسكن بـ Paracetamol.'
  },
  {
    drugsA: ['captopril', 'enalapril', 'lisinopril', 'كابتوبريل', 'إينالابريل'],
    drugsB: ['spironolactone', 'potassium', 'سبيرونولاكتون', 'بوتاسيوم'],
    riskLevel: 'متوسط',
    analysis: 'تداخل دوائي: قد يسبب الارتفاع المفاجئ لمستويات البوتاسيوم في الدم (Hyperkalemia).',
    suggestion: 'مراقبة مستوى البوتاسيوم في الدم بانتظام.'
  },
  {
    drugsA: ['clarithromycin', 'erythromycin', 'كلاثروميسين'],
    drugsB: ['simvastatin', 'atorvastatin', 'سيمفاستاتين', 'أتورفاستاتين'],
    riskLevel: 'حرج',
    analysis: 'تداخل دوائي حرج: يعطل التخلص من أدوية الكوليسترول مما قد يؤدي لتلف العضلات الشديد (Rhabdomyolysis).',
    suggestion: 'إيقاف دواء الكوليسترول مؤقتاً طوال فترة علاج المضاد الحيوي.'
  }
];

function checkOfflineSafety(cartItems = [], patientConditions = []) {
  if (!cartItems.length) return null;

  const activeConditions = (patientConditions || []).map(c => c.toLowerCase());

  // 1. Check Condition-Drug Contradictions
  for (const rule of DRUG_RULES) {
    const matchesCondition = rule.conditionKeys.some(ck => 
      activeConditions.some(ac => ac.includes(ck))
    );

    if (matchesCondition) {
      for (const item of cartItems) {
        const itemText = `${item.trade_name || ''} ${item.generic_name || ''}`.toLowerCase();
        const matchesDrug = rule.drugKeywords.some(dk => itemText.includes(dk));

        if (matchesDrug) {
          return {
            hasRisk: true,
            riskLevel: rule.riskLevel,
            triggerItem: item.trade_name,
            analysis: `[تضارب مع حالة المريض الصحية]: دواء (${item.trade_name}) يتعارض مع حالة المريض. ${rule.analysis}`,
            suggestion: rule.suggestion
          };
        }
      }
    }
  }

  // 2. Check Drug-Drug Interactions within cart items
  if (cartItems.length > 1) {
    for (let i = 0; i < cartItems.length; i++) {
      for (let j = i + 1; j < cartItems.length; j++) {
        const textA = `${cartItems[i].trade_name || ''} ${cartItems[i].generic_name || ''}`.toLowerCase();
        const textB = `${cartItems[j].trade_name || ''} ${cartItems[j].generic_name || ''}`.toLowerCase();

        for (const rule of INTERACTION_RULES) {
          const matchA = rule.drugsA.some(d => textA.includes(d));
          const matchB = rule.drugsB.some(d => textB.includes(d));
          const matchA_rev = rule.drugsA.some(d => textB.includes(d));
          const matchB_rev = rule.drugsB.some(d => textA.includes(d));

          if ((matchA && matchB) || (matchA_rev && matchB_rev)) {
            return {
              hasRisk: true,
              riskLevel: rule.riskLevel,
              triggerItem: `${cartItems[i].trade_name} + ${cartItems[j].trade_name}`,
              analysis: `[تداخل بين الأدوية بالسلة]: ${rule.analysis}`,
              suggestion: rule.suggestion
            };
          }
        }
      }
    }
  }

  return {
    hasRisk: false,
    riskLevel: 'آمن',
    analysis: 'جميع المواد بالسلة آمنة وموافقة للحالة الصحية المحددة للمريض.',
    suggestion: 'لا توجد موانع استعمال أو تداخلات دوائية مسجلة.'
  };
}

// Online Gemini API Caller (with automatic fallback to offline engine)
async function checkMedicalSafety({ cartItems = [], patientConditions = [] }) {
  const offlineResult = checkOfflineSafety(cartItems, patientConditions);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !cartItems.length) {
    return offlineResult;
  }

  try {
    const promptText = `
أنت مساعد صيدلي طبي خبير باللغة العربية.
قم بفحص الأدوية المضافة لسلّة الشراء والحالة الصحية للمريض التالية:

أدوية السلة:
${cartItems.map(i => `- ${i.trade_name} (المادة العلمية: ${i.generic_name || 'غير محدد'})`).join('\n')}

الحالات الصحية للمريض:
${patientConditions.length ? patientConditions.join('، ') : 'سليم / لا توجد أمراض مزمنة'}

يرجى الإجابة بتنسيق JSON حصراً كالتالي دون أي مقدمات:
{
  "hasRisk": boolean,
  "riskLevel": "حرج" | "متوسط" | "منخفض" | "آمن",
  "analysis": "شرح طبي مختصر بأسلوب صيدلاني دقيق للخطورة أو التداخل إن وجد",
  "suggestion": "اقتراح المادة البديلة الآمنة المعتمدة للصيدلي"
}
`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3500
    };

    const apiResult = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const textResponse = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              const jsonResult = JSON.parse(textResponse);
              resolve(jsonResult);
            } else {
              reject(new Error('Invalid Gemini API response structure'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Gemini API timeout'));
      });
      req.write(postData);
      req.end();
    });

    return apiResult;
  } catch (err) {
    console.warn('⚠️ [Medical AI] Online API error/timeout, using Offline Safety Engine fallback:', err.message);
    return offlineResult;
  }
}

module.exports = { checkMedicalSafety, checkOfflineSafety };
