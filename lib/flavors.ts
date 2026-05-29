// ============================================================
// 菜品风味标签映射
// 基于川菜特点，为每道菜标注风味维度
// ============================================================

export interface FlavorProfile {
  spicy: number;      // 辣度 0-10
  numbing: number;    // 麻度 0-10
  sour: number;       // 酸度 0-10
  sweet: number;      // 甜度 0-10
  salty: number;      // 咸度 0-10
  savory: number;     // 鲜度 0-10
  fragrant: number;   // 香度 0-10
}

// 菜品风味数据库
const FLAVOR_DATABASE: Record<string, FlavorProfile> = {
  // 经典川菜
  '麻婆豆腐': { spicy: 7, numbing: 8, sour: 1, sweet: 0, salty: 6, savory: 7, fragrant: 6 },
  '回锅肉': { spicy: 6, numbing: 2, sour: 1, sweet: 3, salty: 6, savory: 8, fragrant: 7 },
  '鱼香肉丝': { spicy: 5, numbing: 1, sour: 6, sweet: 5, salty: 5, savory: 6, fragrant: 5 },
  '宫保鸡丁': { spicy: 6, numbing: 3, sour: 2, sweet: 4, salty: 5, savory: 7, fragrant: 6 },
  '水煮肉片': { spicy: 9, numbing: 7, sour: 1, sweet: 0, salty: 6, savory: 7, fragrant: 5 },
  '辣子鸡': { spicy: 8, numbing: 5, sour: 0, sweet: 1, salty: 6, savory: 6, fragrant: 7 },
  '蒜泥白肉': { spicy: 4, numbing: 1, sour: 2, sweet: 1, salty: 5, savory: 7, fragrant: 8 },
  '担担面': { spicy: 7, numbing: 4, sour: 1, sweet: 2, salty: 6, savory: 7, fragrant: 7 },
  '红油抄手': { spicy: 7, numbing: 3, sour: 2, sweet: 1, salty: 5, savory: 6, fragrant: 6 },
  '酸菜鱼': { spicy: 5, numbing: 2, sour: 8, sweet: 1, salty: 5, savory: 8, fragrant: 5 },
  '毛血旺': { spicy: 9, numbing: 7, sour: 1, sweet: 0, salty: 7, savory: 8, fragrant: 5 },
  '夫妻肺片': { spicy: 7, numbing: 5, sour: 2, sweet: 1, salty: 6, savory: 7, fragrant: 6 },
  '棒棒鸡': { spicy: 5, numbing: 3, sour: 2, sweet: 2, salty: 5, savory: 6, fragrant: 6 },
  '口水鸡': { spicy: 6, numbing: 4, sour: 3, sweet: 2, salty: 5, savory: 7, fragrant: 6 },
  '钟水饺': { spicy: 5, numbing: 2, sour: 3, sweet: 4, salty: 5, savory: 6, fragrant: 5 },
  '赖汤圆': { spicy: 0, numbing: 0, sour: 0, sweet: 8, salty: 0, savory: 0, fragrant: 4 },
  '龙抄手': { spicy: 2, numbing: 1, sour: 1, sweet: 1, salty: 5, savory: 6, fragrant: 4 },
  '豆花饭': { spicy: 4, numbing: 3, sour: 1, sweet: 0, salty: 4, savory: 5, fragrant: 4 },
  '蛋炒饭': { spicy: 2, numbing: 0, sour: 0, sweet: 1, salty: 5, savory: 6, fragrant: 5 },
  '番茄鸡蛋面': { spicy: 0, numbing: 0, sour: 3, sweet: 3, salty: 4, savory: 5, fragrant: 4 },
  '酸辣土豆丝': { spicy: 5, numbing: 1, sour: 6, sweet: 1, salty: 4, savory: 3, fragrant: 4 },
  '虎皮青椒': { spicy: 4, numbing: 0, sour: 2, sweet: 2, salty: 4, savory: 5, fragrant: 6 },
  '干煸四季豆': { spicy: 4, numbing: 1, sour: 1, sweet: 1, salty: 5, savory: 5, fragrant: 6 },
  '麻辣香锅': { spicy: 9, numbing: 8, sour: 1, sweet: 1, salty: 6, savory: 7, fragrant: 7 },
  '烤鱼': { spicy: 7, numbing: 4, sour: 2, sweet: 1, salty: 6, savory: 8, fragrant: 7 },
  '小碗菜': { spicy: 5, numbing: 2, sour: 2, sweet: 2, salty: 5, savory: 6, fragrant: 5 },
  '钵钵鸡': { spicy: 6, numbing: 4, sour: 2, sweet: 1, salty: 5, savory: 6, fragrant: 6 },
  '重庆小面': { spicy: 7, numbing: 5, sour: 1, sweet: 1, salty: 6, savory: 6, fragrant: 7 },
  '冒菜': { spicy: 7, numbing: 4, sour: 2, sweet: 1, salty: 6, savory: 7, fragrant: 5 },
  '卤肉饭': { spicy: 2, numbing: 0, sour: 1, sweet: 3, salty: 5, savory: 7, fragrant: 6 },
  '酸辣粉': { spicy: 6, numbing: 2, sour: 7, sweet: 1, salty: 5, savory: 5, fragrant: 5 },
  '黄焖鸡': { spicy: 4, numbing: 1, sour: 1, sweet: 2, salty: 5, savory: 7, fragrant: 6 },
  '肥肠粉': { spicy: 6, numbing: 3, sour: 2, sweet: 1, salty: 6, savory: 7, fragrant: 6 },
  '冷锅串串': { spicy: 6, numbing: 4, sour: 2, sweet: 1, salty: 5, savory: 6, fragrant: 6 },
  '豌杂面': { spicy: 5, numbing: 2, sour: 1, sweet: 2, salty: 5, savory: 6, fragrant: 5 },
  '跷脚牛肉': { spicy: 3, numbing: 1, sour: 1, sweet: 1, salty: 5, savory: 8, fragrant: 6 },
};

// 风味维度标签
export const FLAVOR_LABELS = {
  spicy: '辣',
  numbing: '麻',
  sour: '酸',
  sweet: '甜',
  salty: '咸',
  savory: '鲜',
  fragrant: '香',
};

// 风味维度颜色
export const FLAVOR_COLORS = {
  spicy: '#ef4444',      // 红色
  numbing: '#8b5cf6',    // 紫色
  sour: '#f59e0b',       // 琥珀色
  sweet: '#ec4899',      // 粉色
  salty: '#6366f1',      // 靛色
  savory: '#10b981',     // 绿色
  fragrant: '#f97316',   // 橙色
};

// 获取菜品风味（未知菜品返回默认值）
export function getFlavorProfile(dishName: string): FlavorProfile {
  // 精确匹配
  if (FLAVOR_DATABASE[dishName]) {
    return FLAVOR_DATABASE[dishName];
  }

  // 模糊匹配
  for (const [key, value] of Object.entries(FLAVOR_DATABASE)) {
    if (dishName.includes(key) || key.includes(dishName)) {
      return value;
    }
  }

  // 根据菜品名推测风味
  const profile: FlavorProfile = { spicy: 3, numbing: 1, sour: 1, sweet: 1, salty: 4, savory: 4, fragrant: 4 };

  if (dishName.includes('辣') || dishName.includes('麻辣')) profile.spicy = 7;
  if (dishName.includes('麻')) profile.numbing = 6;
  if (dishName.includes('酸')) profile.sour = 6;
  if (dishName.includes('甜')) profile.sweet = 6;
  if (dishName.includes('香')) profile.fragrant = 7;

  return profile;
}

// 计算多道菜的平均风味
export function calculateAverageFlavor(dishes: string[]): FlavorProfile {
  if (dishes.length === 0) {
    return { spicy: 0, numbing: 0, sour: 0, sweet: 0, salty: 0, savory: 0, fragrant: 0 };
  }

  const profiles = dishes.map(getFlavorProfile);
  const avg: FlavorProfile = { spicy: 0, numbing: 0, sour: 0, sweet: 0, salty: 0, savory: 0, fragrant: 0 };

  for (const profile of profiles) {
    avg.spicy += profile.spicy;
    avg.numbing += profile.numbing;
    avg.sour += profile.sour;
    avg.sweet += profile.sweet;
    avg.salty += profile.salty;
    avg.savory += profile.savory;
    avg.fragrant += profile.fragrant;
  }

  const len = dishes.length;
  return {
    spicy: Math.round(avg.spicy / len),
    numbing: Math.round(avg.numbing / len),
    sour: Math.round(avg.sour / len),
    sweet: Math.round(avg.sweet / len),
    salty: Math.round(avg.salty / len),
    savory: Math.round(avg.savory / len),
    fragrant: Math.round(avg.fragrant / len),
  };
}
