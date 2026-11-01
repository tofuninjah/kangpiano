// Korean copy, written for Korean and Korean-American parents rather than
// translated line by line. This file is the source of truth for what the
// Korean page says. The Claude Doc "Kang Piano: Korean page copy (draft)"
// is where Hyejeong reviews it: her approved wording is copied here before
// merge, and after that the doc is a frozen record, not something to keep
// in sync. Later changes are made here and shown to her again.
// Until she answers, lines about her training, experience and students say
// no more than the English page does: 음악 전공 졸업 for "Music graduate",
// 오랜 레슨 경력 for "Many years", 어린이부터 성인까지 for "First-timers to
// returning adults".
import { koreanList, withParticle } from '../../lib/korean';
import { inHomeTowns } from '../../lib/schedule';
import { locations, type Day } from '../schedule';
import type { Lesson, PageCopy } from './types';

/**
 * Hangul for every town in the schedule, keyed by its English name.
 * tests/schedule.test.ts fails if a schedule town is missing here.
 */
export const KOREAN_TOWN_NAMES: Readonly<Record<string, string>> = {
  'ʻEwa Beach': '에바 비치',
  Kapolei: '카폴레이',
  Mililani: '밀릴라니',
};

const DAY_NAMES: Record<Day, string> = {
  Monday: '월요일',
  Tuesday: '화요일',
  Wednesday: '수요일',
  Thursday: '목요일',
  Friday: '금요일',
  Saturday: '토요일',
  Sunday: '일요일',
};

function townName(town: string): string {
  const name = KOREAN_TOWN_NAMES[town];
  if (!name) {
    throw new Error(`No Korean name for "${town}" in src/data/copy/ko.ts`);
  }
  return name;
}

const townList = (towns: readonly string[]) => koreanList(towns.map(townName));

/**
 * "에바 비치와 카폴레이는 댁으로 찾아가고, 밀릴라니에 있는 저희 집에서도
 * 가르칩니다." Each clause ends in -고 except the last, which ends the
 * sentence. "에 있는" says her home is in that town, not that its students
 * must come to her.
 */
function teachingSentence(): string {
  const clauses = locations.map((location, index) => {
    const last = index === locations.length - 1;
    if (location.host === 'student') {
      const towns = withParticle(townList(location.towns), 'topic');
      return `${towns} 댁으로 ${last ? '찾아갑니다' : '찾아가고'}`;
    }
    const also = index > 0 ? '도' : '';
    const verb = last ? '가르칩니다' : '가르치고';
    return `${townList(location.towns)}에 있는 저희 집에서${also} ${verb}`;
  });
  return `${clauses.join(', ')}.`;
}

/** "에바 비치·카폴레이 방문 레슨, 밀릴라니 선생님 댁 레슨" for search results. */
function teachingSummary(): string {
  return locations
    .map((location) => {
      const towns = location.towns.map(townName).join('·');
      const kind = location.host === 'student' ? '방문 레슨' : '선생님 댁 레슨';
      return `${towns} ${kind}`;
    })
    .join(', ');
}

const homeTowns = inHomeTowns();

const lessons: readonly Lesson[] = [
  {
    title: '피아노가 처음인 분',
    detail: '경험이 없어도, 악기를 잘 몰라도 괜찮습니다.',
  },
  {
    title: '다시 시작하는 분',
    detail: '예전에 배운 것을 복습하고, 쉬었던 곳부터 다시 이어 갑니다.',
  },
  {
    title: '보충 레슨이 필요한 분',
    detail:
      '다른 선생님께 배우는 중이라면, 정규 레슨 사이에 필요한 부분을 집중해서 도와드립니다.',
  },
  {
    title: '악보 읽기, 리듬, 이론',
    detail: '건반 위치와 계이름, 여러 리듬, 기초 음악 이론을 배웁니다.',
  },
  {
    title: '바빠도 내 속도대로',
    detail: '정해진 진도에 쫓기지 않고, 생활에 맞춰 배웁니다.',
  },
  ...(homeTowns.length > 0
    ? [
        {
          title: '집에서 편하게',
          detail: `${withParticle(townList(homeTowns), 'topic')} 댁으로 찾아갑니다. 댁에 있는 피아노로, 이동 없이 배울 수 있습니다.`,
        },
      ]
    : []),
  {
    title: '한국어로도, 영어로도',
    detail:
      '아이는 편한 언어로 배우고, 부모님과는 한국어로 상담하실 수 있습니다.',
  },
];

const siteName = '강혜정 피아노·바이올린';

export const ko = {
  meta: {
    title: '하와이 오아후 피아노·바이올린 레슨 · 강혜정 선생님',
    siteName,
    description: `하와이 오아후 1:1 피아노·바이올린 레슨. ${teachingSummary()}. 목원대 출신 한인 선생님, 한국어·영어 레슨 가능.`,
  },
  skipLink: '본문 바로가기',
  name: '강혜정',
  instruments: '피아노·바이올린',
  callNumber: (phone) => `전화하기 ${phone}`,
  townName,
  dayName: (day) => DAY_NAMES[day],
  header: {
    navLabel: '주 메뉴',
    nav: {
      schedule: '레슨 장소·요일',
      lessons: '레슨 안내',
      about: '선생님 소개',
      contact: '문의',
    },
    menu: '메뉴',
    closeMenu: '메뉴 닫기',
  },
  hero: {
    eyebrow: '1:1 개인 레슨 · 오아후 · 어린이부터 성인까지',
    heading: { lead: '피아노 레슨,', emphasis: '댁에서도 저희 집에서도' },
    teachingSentence: teachingSentence(),
    requestLink: '첫 레슨 신청하기',
    imageAlt: '따뜻한 빛 속에서 피아노 건반을 치는 손',
  },
  credentials: [
    { title: '대전 목원대학교', detail: '음악 전공 졸업' },
    { title: '한국·하와이', detail: '오랜 레슨 경력' },
    { title: '한국어·영어', detail: '모두 레슨 가능' },
  ],
  schedule: {
    eyebrow: '요일별 레슨 일정',
    heading: { lead: '레슨 장소와', emphasis: '요일' },
    note: '레슨은 예약제입니다. 전화 주시면 가족 일정에 맞는 시간을 함께 정하겠습니다.',
    daysLabel: '레슨 요일',
    locationTitle: (host) =>
      host === 'student' ? '방문 레슨' : '선생님 댁 레슨',
    // English beside the Hangul so parents can match the town on a map.
    townLabel: (town) => ({ name: townName(town), english: town }),
  },
  lessons: {
    eyebrow: '레슨 안내',
    heading: { lead: '학생에게', emphasis: '맞춘 레슨' },
    intro:
      '모든 레슨은 1:1로, 학생의 속도에 맞춰 진행합니다. 처음 시작하는 분도, 오랜만에 다시 시작하는 분도 환영합니다.',
    items: lessons,
  },
  about: {
    heading: '강혜정 선생님 소개',
    quote: {
      lead: '피아노는 언제나 그 자리에서,',
      emphasis: '마음을 다 쏟아낼 수 있게 기다려 줍니다.',
    },
    bio: '강혜정 선생님은 대전 목원대학교에서 음악을 전공했고, 한국과 하와이에서 오랫동안 피아노와 바이올린을 가르쳐 왔습니다. 피아노가 생각을 맑게 하고 손끝 감각을 길러 주며, 지친 하루를 내려놓을 수 있는 평생의 쉼터가 되어 준다고 믿습니다.',
    portraitAlt: '피아노 앞의 강혜정 선생님',
    whyTitle: '왜 피아노를 배우면 좋을까요?',
    why: [
      {
        lead: '손과 머리를 함께',
        text: '정확하면서도 마음을 담아 연주하는 법을 익히다 보면 집중력과 손의 감각이 함께 자랍니다.',
      },
      {
        lead: '가족이 함께하는 음악',
        text: '캐럴이든 영화 음악이든, 피아노 주위에 모여 함께 노래하는 시간은 오래 남는 추억이 됩니다.',
      },
      {
        lead: '평생의 친구',
        text: '기쁜 날에도 힘든 날에도 피아노는 늘 곁에 있어 줍니다.',
      },
    ],
  },
  callBar: {
    callNow: '지금 전화하기',
    callNowLabel: (phone) => `지금 전화하기, ${phone}`,
    request: '레슨 신청',
  },
  contact: {
    eyebrow: '첫 레슨 신청',
    heading: { lead: '첫 레슨 일정을', emphasis: '함께 정해요.' },
    intro: '전화가 가장 빠릅니다. 아래에 간단히 남겨 주시면 연락드리겠습니다.',
    callLabel: '전화',
    name: '이름',
    contact: '연락처 (전화번호 또는 이메일)',
    age: '학생 나이',
    ageHint: '예: 7세, 성인',
    town: '지역',
    townPlaceholder: '지역을 선택해 주세요',
    otherTown: '기타 지역',
    message: '미리 알려 주실 내용',
    optional: '선택',
    honeypot: '이 칸은 비워 두세요',
    submit: '신청하기',
    privacyNote: '입력하신 정보는 연락드릴 때만 사용합니다.',
  },
  formResult: {
    sent: {
      title: `신청 완료 · ${siteName}`,
      eyebrow: '신청 완료',
      heading: '감사합니다. 신청이 접수되었습니다.',
      body: '곧 연락드리겠습니다. 지금 바로 이야기 나누시려면 전화 주세요.',
    },
    notSent: {
      title: `전송 실패 · ${siteName}`,
      eyebrow: '전송되지 않음',
      heading: '죄송합니다. 신청이 전송되지 않았습니다.',
      body: '돌아가서 입력 내용을 확인하시거나, 전화로 연락 주세요.',
    },
    back: '홈으로 돌아가기',
  },
} satisfies PageCopy;
