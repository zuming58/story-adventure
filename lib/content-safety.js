const NEGATION_PREFIX =
  "(?:禁止|不要|不能|避免|不应|不得|无|没有|拒绝|远离|学会不|不可以)";

const UNSAFE_PATTERNS = [
  {
    label: "成人或色情内容",
    pattern:
      /色情|情色|黄色|性爱|性行为|性暗示|性感|裸露|裸体|裸身|成人内容|少儿不宜|接吻|亲嘴|开房|约炮|porn|sex|nude/i,
  },
  {
    label: "成人恋爱内容",
    pattern:
      /恋爱|表白|早恋|男朋友|女朋友|暧昧|约会|分手|情人|情侣|亲密关系/i,
  },
  {
    label: "血腥或重暴力",
    pattern:
      /血腥|鲜血|流血|砍死|杀死|杀人|屠杀|尸体|尸块|肢解|断头|枪杀|刺穿|酷刑|虐待|打死|打断腿|打残/i,
  },
  {
    label: "极端恐怖内容",
    pattern:
      /鬼片|厉鬼|恶灵|诅咒|附身|丧尸|僵尸|恐怖片|吓死|噩梦成真|鬼魂索命/i,
  },
  {
    label: "自伤或危险模仿",
    pattern:
      /自杀|自残|割腕|跳楼|上吊|服毒|炸弹|爆炸物|毒品|吸毒|纵火|放火|吞刀片|触电挑战/i,
  },
  {
    label: "仇恨、霸凌或辱骂",
    pattern:
      /仇恨|种族歧视|纳粹|霸凌|欺凌|辱骂|骂人|人身攻击|滚蛋|傻逼|白痴|废物|去死/i,
  },
];

const ALLOWLIST_PATTERNS = [
  /床上蹦|床上跳|蹦来蹦去|跳进云朵|小怪物|大灰狼|迷路|追逐|冒险|谜题|魔法|怪兽|影子|旧钟楼|发光地图/i,
];

export function assertChildSafeText(value, fieldName = "内容") {
  const rawText = String(value || "").trim();
  const text = stripAllowedPlayfulPhrases(normalizeSafetyText(rawText));

  if (!text) {
    return;
  }

  const matched = UNSAFE_PATTERNS.find((item) => item.pattern.test(text));

  if (!matched) {
    return;
  }

  const error = new Error(
    `${fieldName}可能不太适合儿童绘本。换成更安全、积极、像冒险开头的说法试试。`,
  );
  error.statusCode = 422;
  error.code = "CHILD_SAFETY_BLOCKED";
  error.reason = matched.label;
  throw error;
}

function normalizeSafetyText(text) {
  return text
    .replace(
      new RegExp(
        `${NEGATION_PREFIX}(?:出现|描写|包含|生成|学习|模仿|使用)?(?:任何)?(?:色情|情色|成人|性感|血腥|暴力|恐怖|自伤|仇恨|歧视|辱骂|骂人|危险|水印|logo)`,
        "gi",
      ),
      "",
    )
    .replace(
      /(?:低龄安全|儿童安全|非写实|正向解决|安全绘本|适合儿童|绘本风格|温暖积极)/g,
      "",
    );
}

function stripAllowedPlayfulPhrases(text) {
  return ALLOWLIST_PATTERNS.reduce((current, pattern) => current.replace(pattern, ""), text);
}

export function assertChildSafeStoryParts(parts, fieldName = "故事内容") {
  assertChildSafeText(parts.filter(Boolean).join("\n"), fieldName);
}

export const CHILD_SAFE_STORY_RULES = [
  "儿童安全边界必须严格执行：禁止色情、成人恋爱、成人情感、血腥、重暴力、极端恐怖、自伤、危险模仿、仇恨、霸凌或辱骂内容。",
  "允许轻微童话式冲突，例如迷路、谜题、大灰狼追逐、影子误会、时间紧迫、小怪物求助，但必须低龄安全、非写实、不制造强烈惊吓。",
  "允许孩子气、夸张、活泼的开头，例如在床上蹦来蹦去、跳进云朵世界、遇到会说话的小怪物。",
  "所有冲突都要用智慧、合作、勇气、善意或幽默方式解决，不能鼓励危险行为。",
  "不要描写真实伤害细节，不要出现成人化亲密关系，不要使用吓人的血腥画面。",
].join("\n");

export const CHILD_SAFE_IMAGE_RULES = [
  "儿童安全边界：禁止色情、性感、成人恋爱、血腥、重暴力、极端恐怖、自伤、危险模仿、仇恨、霸凌或辱骂画面。",
  "允许轻微童话式紧张感，但画面必须温暖、安全、非写实，像儿童绘本或漫画，不要恐怖片氛围。",
  "不要伤口、血迹、武器攻击、惊悚怪物、成人亲密动作、文字、logo 或水印。",
].join("\n");
