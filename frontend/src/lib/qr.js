// ---------------------------------------------------------------------------
// Minimal, dependency-free QR code generator (byte mode, error-correction L).
// Self-contained implementation of the QR spec sufficient for encoding short
// URLs. Returns a boolean matrix (true = dark module). Rendered as SVG by the
// caller. No external packages.
//
// Supports versions 1–10 (up to ~154 bytes at ECC-L), which comfortably covers
// a verification URL. If the payload is longer, it throws.
// ---------------------------------------------------------------------------

// Galois field tables for Reed–Solomon.
const EXP = new Array(512);
const LOG = new Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const d of data) {
    const factor = d ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < gen.length - 1; i++) {
      res[i] ^= gfMul(gen[i], factor);
    }
  }
  return res;
}

// Capacity (data codewords) and EC codewords per block for ECC-L, versions 1-10.
// [version]: { size, ecPerBlock, blocks: [count, dataPerBlock] }
const VERSIONS = {
  1: { total: 26, ec: 7, groups: [[1, 19]] },
  2: { total: 44, ec: 10, groups: [[1, 34]] },
  3: { total: 70, ec: 15, groups: [[1, 55]] },
  4: { total: 100, ec: 20, groups: [[1, 80]] },
  5: { total: 134, ec: 26, groups: [[1, 108]] },
  6: { total: 172, ec: 18, groups: [[2, 68]] },
  7: { total: 196, ec: 20, groups: [[2, 78]] },
  8: { total: 242, ec: 24, groups: [[2, 97]] },
  9: { total: 292, ec: 30, groups: [[2, 116]] },
  10: { total: 346, ec: 18, groups: [[2, 68], [2, 69]] },
};

function sizeForVersion(v) {
  return 17 + v * 4;
}

// Build the data bit stream for byte mode.
function buildData(bytes, version) {
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(0b0100, 4); // byte mode
  const lenBits = version < 10 ? 8 : 16;
  push(bytes.length, lenBits);
  for (const b of bytes) push(b, 8);

  const v = VERSIONS[version];
  const dataCodewords = v.total - (countBlocks(v) * v.ec);
  const capacityBits = dataCodewords * 8;
  // terminator
  const term = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < term; i++) bits.push(0);
  // pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);
  // pad bytes
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bits.length < capacityBits) {
    push(pads[pi % 2], 8);
    pi++;
  }
  // to codewords
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }
  return codewords;
}

function countBlocks(v) {
  return v.groups.reduce((s, g) => s + g[0], 0);
}

// Interleave data + EC codewords across blocks.
function assembleCodewords(dataCodewords, version) {
  const v = VERSIONS[version];
  const blocks = [];
  let idx = 0;
  for (const [count, dataPer] of v.groups) {
    for (let c = 0; c < count; c++) {
      const data = dataCodewords.slice(idx, idx + dataPer);
      idx += dataPer;
      const ec = rsEncode(data, v.ec);
      blocks.push({ data, ec });
    }
  }
  const result = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) result.push(b.data[i]);
  }
  for (let i = 0; i < v.ec; i++) {
    for (const b of blocks) result.push(b.ec[i]);
  }
  return result;
}

// Matrix construction with function patterns + mask 0.
function buildMatrix(codewords, version) {
  const size = sizeForVersion(version);
  const m = Array.from({ length: size }, () => new Array(size).fill(null));

  const setFinder = (r, c) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i;
        const cc = c + j;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inRing = i >= 0 && i <= 6 && j >= 0 && j <= 6;
        const dark =
          inRing &&
          (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
        m[rr][cc] = inRing ? dark : false;
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  // timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (m[6][i] === null) m[6][i] = i % 2 === 0;
    if (m[i][6] === null) m[i][6] = i % 2 === 0;
  }
  // dark module
  m[size - 8][8] = true;

  // reserve format areas (set to false placeholder, filled later)
  const reserveFormat = () => {
    for (let i = 0; i <= 8; i++) {
      if (m[8][i] === null) m[8][i] = false;
      if (m[i][8] === null) m[i][8] = false;
    }
    for (let i = 0; i < 8; i++) {
      if (m[8][size - 1 - i] === null) m[8][size - 1 - i] = false;
      if (m[size - 1 - i][8] === null) m[size - 1 - i][8] = false;
    }
  };
  reserveFormat();

  // place data with mask 0 ((r+c)%2==0)
  let bitIdx = 0;
  const allBits = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) allBits.push((cw >> i) & 1);

  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // skip timing column
    for (let n = 0; n < size; n++) {
      const row = up ? size - 1 - n : n;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (m[row][cc] !== null) continue;
        let bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
        if ((row + cc) % 2 === 0) bit ^= 1; // mask 0
        m[row][cc] = bit === 1;
      }
    }
    up = !up;
  }

  // format info for ECC-L, mask 0 → precomputed 15-bit string.
  const formatBits = '111011111000100';
  const fb = formatBits.split('').map((x) => x === '1');
  // around top-left
  const fmtPos1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  fmtPos1.forEach(([r, c], i) => { m[r][c] = fb[i]; });
  // split copy
  for (let i = 0; i < 7; i++) m[size - 1 - i][8] = fb[i];
  for (let i = 0; i < 8; i++) m[8][size - 1 - (7 - i)] = fb[7 + i];

  return m.map((row) => row.map((v) => v === true));
}

function chooseVersion(len) {
  for (let v = 1; v <= 10; v++) {
    const info = VERSIONS[v];
    const dataCw = info.total - countBlocks(info) * info.ec;
    const lenBits = v < 10 ? 8 : 16;
    const needBits = 4 + lenBits + len * 8;
    if (needBits <= dataCw * 8) return v;
  }
  throw new Error('payload too long for supported QR versions (max ~150 bytes)');
}

// Public: generate a boolean matrix for a string payload.
export function qrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = chooseVersion(bytes.length);
  const dataCodewords = buildData(bytes, version);
  const finalCodewords = assembleCodewords(dataCodewords, version);
  return buildMatrix(finalCodewords, version);
}

// Public: render the matrix as an SVG string.
export function qrSvg(text, { size = 180, margin = 4, dark = '#0a0a0f', light = '#ffffff' } = {}) {
  const matrix = qrMatrix(text);
  const n = matrix.length;
  const total = n + margin * 2;
  const cell = size / total;
  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * cell;
        const y = (r + margin) * cell;
        rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${light}"/><g fill="${dark}">${rects}</g></svg>`;
}
