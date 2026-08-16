// 공포 무드 이미지 풀 — Unsplash 큐레이션 (4:5 비율, 800x1000).
// 사용처: 카드 생성 시 사용자 선택, AI 자동포스팅, 크롤 데이터 fallback.

export interface HorrorImage {
  id: string;
  url: string;
  credit: string; // photographer, attribution 권장
  // 분위기 태그 (나중에 매칭에 활용 가능)
  mood: 'forest' | 'grave' | 'house' | 'candle' | 'fog' | 'night' | 'tunnel' | 'abandoned';
}

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=1000&fit=crop&auto=format&q=80`;

export const HORROR_IMAGES: HorrorImage[] = [
  { id: '1518709268805-4e9042af9f23', url: U('1518709268805-4e9042af9f23'), credit: 'Andy Holmes', mood: 'grave' },
  { id: '1509248961085-865eefdf7e2c', url: U('1509248961085-865eefdf7e2c'), credit: 'Jeremy Bishop', mood: 'fog' },
  { id: '1535378620166-273708d44e4c', url: U('1535378620166-273708d44e4c'), credit: 'Sergei Akulich', mood: 'forest' },
  { id: '1517999144091-3d9dca6d1e43', url: U('1517999144091-3d9dca6d1e43'), credit: 'Reinaldo Kevin', mood: 'abandoned' },
  { id: '1605379399843-5870eea9b74e', url: U('1605379399843-5870eea9b74e'), credit: 'Min An', mood: 'tunnel' },
  { id: '1485470733090-0aae1788d5af', url: U('1485470733090-0aae1788d5af'), credit: 'Sergei Akulich', mood: 'forest' },
  { id: '1505672678657-cc7037095e60', url: U('1505672678657-cc7037095e60'), credit: 'Pawel Czerwinski', mood: 'night' },
  { id: '1542273917363-3b1817f69a2d', url: U('1542273917363-3b1817f69a2d'), credit: 'C Dustin', mood: 'candle' },
  { id: '1518173946687-a4c8892bbd9f', url: U('1518173946687-a4c8892bbd9f'), credit: 'Tim Mossholder', mood: 'house' },
  { id: '1574482620811-1aa16ffe3c82', url: U('1574482620811-1aa16ffe3c82'), credit: 'Maksym Kaharlytskyi', mood: 'night' },
  { id: '1551763728-4b5b0a32a4dc', url: U('1551763728-4b5b0a32a4dc'), credit: 'Paolo Nicolello', mood: 'fog' },
  { id: '1500382017468-9049fed747ef', url: U('1500382017468-9049fed747ef'), credit: 'Federico Respini', mood: 'fog' },
  { id: '1542652735875-c50d77a7b9c3', url: U('1542652735875-c50d77a7b9c3'), credit: 'Andy Holmes', mood: 'house' },
  { id: '1572177812156-58036aae439c', url: U('1572177812156-58036aae439c'), credit: 'Noah Silliman', mood: 'abandoned' },
  { id: '1604147495798-57beb5d6af73', url: U('1604147495798-57beb5d6af73'), credit: 'Paolo Nicolello', mood: 'forest' },
  { id: '1635340128036-1adfutfa1a37', url: U('1635340128036-1adfutfa1a37'), credit: 'Houcine Ncib', mood: 'candle' },
];

// 결정적 의사난수 (seed → 같은 입력에 같은 이미지)
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function pickRandomImage(seed?: string): HorrorImage {
  const n = seed ? hash(seed) : Math.floor(Math.random() * HORROR_IMAGES.length);
  return HORROR_IMAGES[n % HORROR_IMAGES.length];
}

export function findImageById(id: string): HorrorImage | undefined {
  return HORROR_IMAGES.find(i => i.id === id);
}
