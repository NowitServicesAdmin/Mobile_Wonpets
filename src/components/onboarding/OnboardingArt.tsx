import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

/**
 * Vector illustrations for the three onboarding slides.
 * Everything is drawn in code (no bitmaps) on a 360 x 320 canvas, so it stays crisp on every screen.
 */

const O = '#FF6B00';
const INK = '#13213F';
const FUR = '#EDA94F';
const FUR_DARK = '#C97F2E';
const FUR_LIGHT = '#F6C27A';
const CREAM = '#FBE0B8';
const BROWN = '#3A2820';
const GREY = '#D8D0C7';
const SKIN = '#F0B48E';

/* ───────────────────────── small reusable pieces ───────────────────────── */

function PawG({ x, y, s = 1, fill = '#F7B987', opacity = 1, rotate = 0 }: { x: number; y: number; s?: number; fill?: string; opacity?: number; rotate?: number }) {
  return (
    <G opacity={opacity} transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s * 0.5}) translate(-32 -32)`}>
      <Ellipse cx="32" cy="43" rx="15" ry="12" fill={fill} />
      <Ellipse cx="13" cy="29" rx="6" ry="8.5" fill={fill} transform="rotate(-20 13 29)" />
      <Ellipse cx="25" cy="16" rx="6" ry="8.5" fill={fill} />
      <Ellipse cx="39" cy="16" rx="6" ry="8.5" fill={fill} />
      <Ellipse cx="51" cy="29" rx="6" ry="8.5" fill={fill} transform="rotate(20 51 29)" />
    </G>
  );
}

const HEART = 'M12 20.5 C4 14.5 3 10.5 3 8.5 C3 5.5 5.2 4 7.5 4 C9.5 4 11.2 5.2 12 6.8 C12.8 5.2 14.5 4 16.5 4 C18.8 4 21 5.5 21 8.5 C21 10.5 20 14.5 12 20.5 Z';

/** Line icons on a 24 x 24 grid. */
const ICONS = {
  heartPulse: (
    <>
      <Path d={HEART} />
      <Path d="M6 12 H9 L10.5 9 L13 15 L14.5 12 H18" />
    </>
  ),
  habits: (
    <>
      <Rect x="4" y="4" width="16" height="16" rx="4" />
      <Path d="M8 12.5 L11 15.5 L16.5 9" />
    </>
  ),
  folder: (
    <>
      <Path d="M3 7 C3 5.9 3.9 5 5 5 H9.5 L11.5 7.5 H19 C20.1 7.5 21 8.4 21 9.5 V17 C21 18.1 20.1 19 19 19 H5 C3.9 19 3 18.1 3 17 Z" />
      <Path d="M12 10.5 V16 M9.3 13.2 H14.7" />
    </>
  ),
  calendar: (
    <>
      <Rect x="4" y="5" width="16" height="15" rx="3" />
      <Path d="M4 10 H20 M8 3 V7 M16 3 V7 M9 15 L11 17 L15 13" />
    </>
  ),
  stethoscope: (
    <>
      <Path d="M6 3 V9 C6 11.5 8 13.5 10 13.5 C12 13.5 14 11.5 14 9 V3" />
      <Path d="M10 13.5 V15 C10 18 12.5 19.5 15 19.5 C17.5 19.5 19 17.5 19 15.5" />
      <Circle cx="19" cy="13.3" r="2.2" />
    </>
  ),
  clipboard: (
    <>
      <Rect x="5" y="4.5" width="14" height="16.5" rx="2.5" />
      <Rect x="9" y="2.5" width="6" height="4" rx="1.5" />
      <Path d="M12 10.5 V16 M9.3 13.2 H14.7" />
    </>
  ),
  cart: (
    <>
      <Path d="M3 4 H5.5 L7.5 15 H18 L20 8 H6.6" />
      <Circle cx="9" cy="19" r="1.5" />
      <Circle cx="17" cy="19" r="1.5" />
      <Path d="M10.5 11 H16" />
    </>
  ),
  tag: (
    <>
      <Path d="M3 12 V4 H11 L21 14 L14 21 Z" />
      <Circle cx="7.6" cy="8.6" r="1.3" />
      <Path d="M10.5 15 L14.5 11" />
    </>
  ),
} as const;

/** White rounded feature chip: icon + one or two lines of label. */
function Chip({ x, y, w, icon, lines }: { x: number; y: number; w: number; icon: keyof typeof ICONS; lines: string[] }) {
  const h = 62;
  return (
    <G>
      <Rect x={x - 1} y={y + 7} width={w + 2} height={h} rx={17} fill="#E8893A" opacity={0.07} />
      <Rect x={x} y={y + 4} width={w} height={h} rx={16} fill="#E8893A" opacity={0.12} />
      <Rect x={x} y={y} width={w} height={h} rx={16} fill="#FFFFFF" />
      <G
        transform={`translate(${x + w / 2 - 13} ${y + 8}) scale(1.08)`}
        stroke={O}
        strokeWidth={1.9}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICONS[icon]}
      </G>
      {lines.map((t, i) => (
        <SvgText
          key={t}
          x={x + w / 2}
          y={lines.length === 1 ? y + 50 : y + 46 + i * 11}
          fontSize={9.6}
          fontWeight="700"
          fill={INK}
          textAnchor="middle"
        >
          {t}
        </SvgText>
      ))}
    </G>
  );
}

/** Front-facing golden retriever head. (cx, cy) = centre of head, s = scale. */
function DogFace({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <G transform={`translate(${cx} ${cy}) scale(${s})`}>
      <Path d="M-50 -32 C-78 -24 -82 26 -62 52 C-50 60 -37 46 -35 20 C-33 -2 -37 -22 -50 -32Z" fill={FUR_DARK} />
      <Path d="M50 -32 C78 -24 82 26 62 52 C50 60 37 46 35 20 C33 -2 37 -22 50 -32Z" fill={FUR_DARK} />
      <Ellipse cx="0" cy="0" rx="56" ry="52" fill={FUR} />
      <Ellipse cx="0" cy="-24" rx="16" ry="27" fill={FUR_LIGHT} />
      <Ellipse cx="0" cy="20" rx="33" ry="27" fill={CREAM} />
      <Circle cx="-27" cy="-6" r="6.2" fill="#2B1B14" />
      <Circle cx="27" cy="-6" r="6.2" fill="#2B1B14" />
      <Circle cx="-25" cy="-8.4" r="2.1" fill="#FFFFFF" />
      <Circle cx="29" cy="-8.4" r="2.1" fill="#FFFFFF" />
      <Path d="M-36 -20 C-31 -24 -24 -24 -19 -20 M19 -20 C24 -24 31 -24 36 -20" stroke={FUR_DARK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <Path d="M-10 8 C-10 2.5 10 2.5 10 8 C10 14 4 18 0 18 C-4 18 -10 14 -10 8Z" fill={BROWN} />
      <Ellipse cx="-3.5" cy="6.2" rx="3" ry="1.6" fill="#FFFFFF" opacity={0.45} />
      <Path d="M-9 31 C-9 49 9 49 9 31 C5 34 -5 34 -9 31Z" fill="#F26B83" />
      <Path d="M0 18 V27 M0 27 C-6 35 -18 34 -21 26 M0 27 C6 35 18 34 21 26" stroke={BROWN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M0 34 V42" stroke="#D9506A" strokeWidth="1.8" strokeLinecap="round" />
    </G>
  );
}

/** Front-facing grey tabby cat head. */
function CatFace({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <G transform={`translate(${cx} ${cy}) scale(${s})`}>
      <Path d="M-40 -6 L-35 -46 L-8 -27Z" fill="#CFC5BB" />
      <Path d="M-34 -13 L-32 -34 L-18 -25Z" fill="#F4B6BC" />
      <Path d="M40 -6 L35 -46 L8 -27Z" fill="#CFC5BB" />
      <Path d="M34 -13 L32 -34 L18 -25Z" fill="#F4B6BC" />
      <Ellipse cx="0" cy="0" rx="43" ry="37" fill={GREY} />
      <Path d="M0 -35 V-22 M-10 -34 L-8 -23 M10 -34 L8 -23" stroke="#A59A90" strokeWidth="3" strokeLinecap="round" />
      <Ellipse cx="-14" cy="13" rx="17" ry="12.5" fill="#FFFFFF" />
      <Ellipse cx="14" cy="13" rx="17" ry="12.5" fill="#FFFFFF" />
      <Ellipse cx="-17" cy="-4" rx="6" ry="7" fill="#8CC26F" />
      <Ellipse cx="17" cy="-4" rx="6" ry="7" fill="#8CC26F" />
      <Ellipse cx="-17" cy="-4" rx="2.2" ry="5" fill="#1D1D1D" />
      <Ellipse cx="17" cy="-4" rx="2.2" ry="5" fill="#1D1D1D" />
      <Circle cx="-15" cy="-7" r="1.6" fill="#FFFFFF" />
      <Circle cx="19" cy="-7" r="1.6" fill="#FFFFFF" />
      <Path d="M-4.5 6 H4.5 L0 11.5Z" fill="#F28B9B" />
      <Path d="M0 11.5 V16 M0 16 C-4 20 -10 19 -12 15.5 M0 16 C4 20 10 19 12 15.5" stroke="#7A6A60" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <Path d="M-26 11 L-52 6 M-26 16 L-52 18 M26 11 L52 6 M26 16 L52 18" stroke="#BDB2A8" strokeWidth="1.2" strokeLinecap="round" />
    </G>
  );
}

/** White bunny, sitting. */
function Rabbit({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <G transform={`translate(${cx} ${cy}) scale(${s})`}>
      <Ellipse cx="0" cy="38" rx="31" ry="26" fill="#FFFFFF" />
      <Ellipse cx="0" cy="38" rx="31" ry="26" fill="none" stroke="#F1E1D2" strokeWidth="1.5" />
      <Ellipse cx="-13" cy="-48" rx="9.5" ry="27" fill="#FFFFFF" stroke="#F1E1D2" strokeWidth="1.5" transform="rotate(-10 -13 -48)" />
      <Ellipse cx="-13" cy="-47" rx="4.5" ry="19" fill="#F8B9C4" transform="rotate(-10 -13 -47)" />
      <Ellipse cx="14" cy="-48" rx="9.5" ry="27" fill="#FFFFFF" stroke="#F1E1D2" strokeWidth="1.5" transform="rotate(12 14 -48)" />
      <Ellipse cx="14" cy="-47" rx="4.5" ry="19" fill="#F8B9C4" transform="rotate(12 14 -47)" />
      <Ellipse cx="0" cy="0" rx="30" ry="26" fill="#FFFFFF" stroke="#F1E1D2" strokeWidth="1.5" />
      <Circle cx="-11" cy="-3" r="3.2" fill="#2B1B14" />
      <Circle cx="11" cy="-3" r="3.2" fill="#2B1B14" />
      <Circle cx="-10" cy="-4.2" r="1" fill="#FFFFFF" />
      <Circle cx="12" cy="-4.2" r="1" fill="#FFFFFF" />
      <Ellipse cx="-19" cy="7" rx="5" ry="3.2" fill="#F8B9C4" opacity={0.7} />
      <Ellipse cx="19" cy="7" rx="5" ry="3.2" fill="#F8B9C4" opacity={0.7} />
      <Path d="M-3 5 H3 L0 9Z" fill="#F28B9B" />
      <Path d="M0 9 V12 M0 12 C-3 15 -7 14 -8 12 M0 12 C3 15 7 14 8 12" stroke="#B08A7A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </G>
  );
}

/** Soft peach hill behind every scene. */
function Blob({ id }: { id: string }) {
  return (
    <>
      <Defs>
        <LinearGradient id={`${id}-blob`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD9B8" />
          <Stop offset="1" stopColor="#FFEEDD" />
        </LinearGradient>
      </Defs>
      <Path d="M0 118 C44 92 96 122 156 112 C224 100 292 66 360 102 L360 320 L0 320Z" fill={`url(#${id}-blob)`} opacity={0.9} />
      <Path d="M0 214 C60 194 120 214 190 208 C260 202 310 186 360 200 L360 320 L0 320Z" fill="#FFE6CF" opacity={0.7} />
    </>
  );
}

/* ───────────────────────── slide 1 · health ───────────────────────── */

function SlideHealth() {
  return (
    <>
      <Defs>
        <LinearGradient id="s1-shield" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB347" />
          <Stop offset="1" stopColor="#FF7A00" />
        </LinearGradient>
      </Defs>
      <Blob id="s1" />
      <PawG x={24} y={38} s={0.9} rotate={-20} opacity={0.55} />
      <PawG x={322} y={150} s={0.8} rotate={20} opacity={0.55} />

      {/* shield */}
      <G>
        <Path d="M185 30 L240 50 V96 C240 128 216 152 185 166 C154 152 130 128 130 96 V50Z" fill="url(#s1-shield)" />
        <G transform="translate(185 98) scale(0.86) translate(-185 -98)">
          <Path d="M185 30 L240 50 V96 C240 128 216 152 185 166 C154 152 130 128 130 96 V50Z" fill="#FFD7A0" />
        </G>
        <G transform="translate(185 98) scale(0.74) translate(-185 -98)">
          <Path d="M185 30 L240 50 V96 C240 128 216 152 185 166 C154 152 130 128 130 96 V50Z" fill="#FFF8F0" />
        </G>
        <G transform="translate(153.5 66) scale(2.6)" fill="none" stroke={O} strokeWidth={0.95} strokeLinecap="round" strokeLinejoin="round">
          <Path d={HEART} />
          <Path d="M6 12 H9 L10.5 9 L13 15 L14.5 12 H18" />
        </G>
      </G>

      <Chip x={12} y={64} w={84} icon="heartPulse" lines={['Track Health']} />
      <Chip x={268} y={56} w={78} icon="habits" lines={['Habits']} />
      <Chip x={16} y={132} w={76} icon="folder" lines={['Records']} />

      {/* outline heart + chew toy */}
      <G transform="translate(284 176) scale(1.15)" fill="none" stroke="#F0613A" strokeWidth={1.8} strokeLinejoin="round">
        <Path d={HEART} />
      </G>
      <G transform="translate(304 266) rotate(-38)">
        <Rect x="-18" y="-5" width="36" height="10" rx="5" fill="#A78BFA" />
        <Circle cx="-18" cy="-5" r="5.4" fill="#A78BFA" />
        <Circle cx="-18" cy="5" r="5.4" fill="#A78BFA" />
        <Circle cx="18" cy="-5" r="5.4" fill="#A78BFA" />
        <Circle cx="18" cy="5" r="5.4" fill="#A78BFA" />
        <Rect x="-14" y="-3" width="28" height="3" rx="1.5" fill="#FFFFFF" opacity={0.35} />
      </G>

      {/* dog + cat */}
      <Ellipse cx="112" cy="340" rx="76" ry="44" fill="#E39A41" />
      <Ellipse cx="112" cy="344" rx="40" ry="36" fill={CREAM} />
      <DogFace cx={112} cy={250} />

      <Ellipse cx="230" cy="336" rx="48" ry="34" fill={GREY} />
      <Ellipse cx="226" cy="334" rx="22" ry="28" fill="#FFFFFF" />
      <CatFace cx={226} cy={282} />
    </>
  );
}

/* ───────────────────────── slide 2 · vet ───────────────────────── */

function SlideVet() {
  return (
    <>
      <Defs>
        <LinearGradient id="s2-screen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E3F5F8" />
          <Stop offset="1" stopColor="#BFE5EC" />
        </LinearGradient>
      </Defs>
      <Blob id="s2" />
      <PawG x={26} y={36} s={0.9} rotate={-20} opacity={0.55} />
      <PawG x={330} y={168} s={0.8} rotate={20} opacity={0.55} />

      <Chip x={8} y={62} w={86} icon="calendar" lines={['Appointments']} />
      <Chip x={136} y={20} w={90} icon="stethoscope" lines={['Doctor', 'Consultation']} />
      <Chip x={264} y={68} w={84} icon="clipboard" lines={['Medical', 'Records']} />

      {/* video call card */}
      <G transform="translate(262 140) rotate(4 44 60)">
        <Rect x="-2" y="6" width="92" height="122" rx="18" fill="#E8893A" opacity={0.18} />
        <Rect x="0" y="0" width="88" height="122" rx="16" fill="#1E2A44" />
        <Rect x="4" y="4" width="80" height="94" rx="12" fill="url(#s2-screen)" />
        <Path d="M16 98 C16 76 28 68 44 68 C60 68 72 76 72 98Z" fill="#FFFFFF" />
        <Path d="M36 69 L44 84 L52 69Z" fill="#7FD0D9" />
        <Path d="M33 72 C30 86 34 92 44 92 C54 92 58 86 55 72" stroke="#3B4252" strokeWidth="2" fill="none" />
        <Rect x="39" y="58" width="10" height="12" rx="4" fill="#E3A47C" />
        <Ellipse cx="44" cy="46" rx="14" ry="16" fill="#F0B994" />
        <Path d="M30 44 C28 28 44 25 54 30 C60 34 60 40 58 45 C54 38 46 36 38 38 C34 40 31 42 30 44Z" fill="#2D2420" />
        <Path d="M38 50 C40 48 43 48 45 50 M46 50 C48 48 51 48 53 50" stroke="#2D2420" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <Path d="M39 56 C42 60 48 60 51 56" stroke="#B5524B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <Rect x="58" y="8" width="22" height="16" rx="5" fill="#FFFFFF" opacity={0.9} />
        <Circle cx="69" cy="16" r="4" fill="#BFE5EC" />
        <Circle cx="30" cy="110" r="8.5" fill="#EF4444" />
        <Path d="M25.5 111.5 C28 108.5 32 108.5 34.5 111.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <Circle cx="58" cy="110" r="8.5" fill="#22C55E" />
        <Path d="M54.5 107 V113 M54.5 110 L61 107 V113Z" stroke="#FFFFFF" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      </G>

      {/* dog */}
      <Ellipse cx="222" cy="334" rx="54" ry="40" fill="#E39A41" />
      <DogFace cx={222} cy={274} s={0.72} />

      {/* vet */}
      <G transform="translate(8 18)">
      <Ellipse cx="108" cy="158" rx="38" ry="44" fill="#2E1F1B" />
      <Path d="M48 326 C48 252 68 216 108 210 C148 216 168 252 168 326Z" fill="#FFFFFF" stroke="#F1E4D8" strokeWidth="1.5" />
      <Path d="M92 212 L108 248 L124 212Z" fill="#7FD0D9" />
      <Path d="M92 212 L80 238 L108 250 M124 212 L136 238 L108 250" stroke="#E8DCD0" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      <Path d="M89 214 C82 242 90 266 108 268 C126 266 134 242 127 214" stroke="#3B4252" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Circle cx="108" cy="270" r="5.5" fill="#9AA3B2" stroke="#3B4252" strokeWidth="1.5" />
      <Rect x="100" y="184" width="16" height="28" rx="6" fill="#E3A47C" />
      <Ellipse cx="108" cy="160" rx="29" ry="33" fill={SKIN} />
      <Path d="M78 160 C74 120 104 112 124 118 C140 124 144 144 139 162 C133 142 120 134 102 136 C90 138 82 146 78 160Z" fill="#2E1F1B" />
      <Circle cx="94" cy="112" r="13" fill="#2E1F1B" />
      <Path d="M93 161 C96 157 101 157 104 161 M113 161 C116 157 121 157 124 161" stroke="#2E1F1B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Path d="M97 173 C103 183 115 183 121 173Z" fill="#FFFFFF" stroke="#B5524B" strokeWidth="1.6" strokeLinejoin="round" />
      <Circle cx="89" cy="170" r="5" fill="#F59E8A" opacity={0.55} />
      <Circle cx="129" cy="170" r="5" fill="#F59E8A" opacity={0.55} />
      {/* arm petting the dog */}
      <Path d="M150 236 C170 236 184 242 196 252" stroke="#EADBCB" strokeWidth="28" strokeLinecap="round" fill="none" />
      <Path d="M150 236 C170 236 184 242 196 252" stroke="#FFFFFF" strokeWidth="25" strokeLinecap="round" fill="none" />
      <Ellipse cx="204" cy="248" rx="12" ry="9" fill={SKIN} transform="rotate(25 204 248)" />
      </G>
    </>
  );
}

/* ───────────────────────── slide 3 · shop ───────────────────────── */

function SlideShop() {
  return (
    <>
      <Defs>
        <LinearGradient id="s3-bag" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFA02E" />
          <Stop offset="1" stopColor="#FF6B00" />
        </LinearGradient>
        <LinearGradient id="s3-bowl" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB04A" />
          <Stop offset="1" stopColor="#FF7A12" />
        </LinearGradient>
      </Defs>
      <Blob id="s3" />
      <PawG x={28} y={150} s={0.8} rotate={-18} opacity={0.55} />
      <PawG x={330} y={206} s={0.7} rotate={22} opacity={0.5} />

      <Chip x={14} y={70} w={82} icon="cart" lines={['Pet', 'Shopping']} />
      <Chip x={262} y={56} w={86} icon="tag" lines={['Coupons', '& Offers']} />

      <Ellipse cx="190" cy="308" rx="156" ry="10" fill="#F0BF98" opacity={0.55} />

      {/* kraft bag with dog label */}
      <Path d="M62 176 C62 150 98 150 98 176" stroke="#C98F4F" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Rect x="40" y="172" width="86" height="134" rx="7" fill="#EBBB80" />
      <Rect x="40" y="172" width="86" height="16" rx="7" fill="#DDA766" />
      <Rect x="40" y="188" width="86" height="118" fill="#EBBB80" />
      <Path d="M126 172 L134 180 V298 L126 306Z" fill="#D49A58" />
      <Circle cx="83" cy="236" r="29" fill="#FFFFFF" />
      <DogFace cx={83} cy={238} s={0.4} />
      <Rect x="58" y="274" width="50" height="6" rx="3" fill="#FFFFFF" opacity={0.7} />

      {/* purple bottle */}
      <Rect x="112" y="228" width="14" height="12" rx="3" fill="#6D3FE0" />
      <Rect x="104" y="238" width="30" height="68" rx="9" fill="#8B5CF6" />
      <Rect x="109" y="256" width="20" height="26" rx="5" fill="#FFFFFF" />
      <PawG x={119} y={269} s={0.55} fill="#8B5CF6" />

      {/* cat sitting on the orange bag */}
      <Path d="M172 168 C172 128 228 128 228 168" stroke="#C94F00" strokeWidth="5" fill="none" strokeLinecap="round" />
      <Path d="M236 172 C264 170 272 146 260 128" stroke={GREY} strokeWidth="10" strokeLinecap="round" fill="none" />
      <Ellipse cx="204" cy="168" rx="40" ry="28" fill={GREY} />
      <Ellipse cx="204" cy="170" rx="18" ry="22" fill="#FFFFFF" />

      {/* orange bag */}
      <Rect x="148" y="164" width="108" height="142" rx="9" fill="url(#s3-bag)" />
      <Path d="M148 164 H256 V182 H148Z" fill="#FFFFFF" opacity={0.12} />
      <PawG x={202} y={238} s={1.5} fill="#FFFFFF" />
      <CatFace cx={204} cy={120} s={0.92} />

      {/* food bowl */}
      <Path d="M188 274 H278 C278 298 260 310 233 310 C206 310 188 298 188 274Z" fill="url(#s3-bowl)" />
      <Ellipse cx="233" cy="274" rx="45" ry="9" fill="#FFB75C" />
      <Ellipse cx="233" cy="274" rx="38" ry="6" fill="#7A3E1B" />
      {[[212, 268], [224, 264], [237, 266], [250, 268], [218, 272], [232, 270], [245, 272], [228, 260], [240, 261]].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={5.6} fill={i % 2 ? '#B5651D' : '#9A4F14'} />
      ))}
      <PawG x={233} y={293} s={0.55} fill="#FFFFFF" />

      {/* bunny */}
      <Rabbit cx={316} cy={252} s={0.82} />

      {/* % badge */}
      <G transform="translate(306 148) rotate(12)">
        <Rect x="-17" y="-13" width="34" height="34" rx="10" fill="#E8893A" opacity={0.2} />
        <Rect x="-17" y="-17" width="34" height="34" rx="10" fill={O} />
        <SvgText x="0" y="8" fontSize="23" fontWeight="800" fill="#FFFFFF" textAnchor="middle">%</SvgText>
      </G>
    </>
  );
}

/* ───────────────────────── export ───────────────────────── */

export type OnboardingArtKind = 'health' | 'vet' | 'shop';

export default function OnboardingArt({ kind }: { kind: OnboardingArtKind }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 320" preserveAspectRatio="xMidYMax meet">
      {kind === 'health' ? <SlideHealth /> : kind === 'vet' ? <SlideVet /> : <SlideShop />}
    </Svg>
  );
}