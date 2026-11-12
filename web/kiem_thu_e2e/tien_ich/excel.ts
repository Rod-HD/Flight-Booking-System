// Đọc và tạo tập tin Excel (.xlsx) tối giản cho kiểm thử, không cần thư viện ngoài.
// Tập tin .xlsx là tập tin zip chứa các phần XML; ở đây chỉ dùng kiểu lưu không nén khi tạo.
import { crc32, inflateRawSync } from 'node:zlib';

interface MucZip {
  ten: string;
  duLieu: Buffer;
}

/** Đọc mọi phần trong tập tin zip qua thư mục trung tâm (kể cả khi phần đầu cục bộ không ghi kích thước). */
export function docZip(tapTin: Buffer): Map<string, Buffer> {
  const ketQua = new Map<string, Buffer>();
  // bản ghi kết thúc thư mục trung tâm nằm gần cuối tập tin
  let viTriCuoi = -1;
  for (let i = tapTin.length - 22; i >= Math.max(0, tapTin.length - 65_557); i--) {
    if (tapTin.readUInt32LE(i) === 0x06054b50) {
      viTriCuoi = i;
      break;
    }
  }
  if (viTriCuoi < 0) throw new Error('Tập tin không phải zip hợp lệ');
  const soMuc = tapTin.readUInt16LE(viTriCuoi + 10);
  let viTri = tapTin.readUInt32LE(viTriCuoi + 16);
  for (let i = 0; i < soMuc; i++) {
    const cachNen = tapTin.readUInt16LE(viTri + 10);
    const coNen = tapTin.readUInt32LE(viTri + 20);
    const doDaiTen = tapTin.readUInt16LE(viTri + 28);
    const doDaiThem = tapTin.readUInt16LE(viTri + 30);
    const doDaiGhiChu = tapTin.readUInt16LE(viTri + 32);
    const viTriCucBo = tapTin.readUInt32LE(viTri + 42);
    const ten = tapTin.toString('utf8', viTri + 46, viTri + 46 + doDaiTen);
    const batDau = viTriCucBo + 30 + tapTin.readUInt16LE(viTriCucBo + 26) + tapTin.readUInt16LE(viTriCucBo + 28);
    const tho = tapTin.subarray(batDau, batDau + coNen);
    ketQua.set(ten, cachNen === 8 ? inflateRawSync(tho) : Buffer.from(tho));
    viTri += 46 + doDaiTen + doDaiThem + doDaiGhiChu;
  }
  return ketQua;
}

/** Tên các trang tính và toàn bộ chuỗi chữ xuất hiện trong tập tin Excel. */
export function docExcel(tapTin: Buffer): { trang: string[]; chu: string[] } {
  const phan = docZip(tapTin);
  const workbook = phan.get('xl/workbook.xml')?.toString('utf8') ?? '';
  // thẻ có thể kèm tiền tố không gian tên, ví dụ <x:sheet name="...">
  const trang = [...workbook.matchAll(/<(?:\w+:)?sheet [^>]*name="([^"]+)"/g)].map((m) => giaiMaXml(m[1]));
  const chu: string[] = [];
  for (const [ten, duLieu] of phan) {
    if (ten === 'xl/sharedStrings.xml' || ten.startsWith('xl/worksheets/')) {
      for (const m of duLieu.toString('utf8').matchAll(/<((?:\w+:)?t)(?: [^>]*)?>([^<]*)<\/\1>/g)) chu.push(giaiMaXml(m[2]));
    }
  }
  return { trang, chu };
}

function giaiMaXml(s: string) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function maHoaXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tenCot(chiSo: number) {
  let ten = '';
  let n = chiSo + 1;
  while (n > 0) {
    const du = (n - 1) % 26;
    ten = String.fromCharCode(65 + du) + ten;
    n = Math.floor((n - 1) / 26);
  }
  return ten;
}

function ghiZip(cacMuc: MucZip[]): Buffer {
  const phanCucBo: Buffer[] = [];
  const phanTrungTam: Buffer[] = [];
  let viTri = 0;
  for (const m of cacMuc) {
    const ten = Buffer.from(m.ten, 'utf8');
    const crc = crc32(m.duLieu);
    const dau = Buffer.alloc(30);
    dau.writeUInt32LE(0x04034b50, 0);
    dau.writeUInt16LE(20, 4);
    dau.writeUInt16LE(0x0800, 6); // tên mã hóa UTF-8
    dau.writeUInt16LE(0, 8); // lưu không nén
    dau.writeUInt32LE(crc, 14);
    dau.writeUInt32LE(m.duLieu.length, 18);
    dau.writeUInt32LE(m.duLieu.length, 22);
    dau.writeUInt16LE(ten.length, 26);
    phanCucBo.push(dau, ten, m.duLieu);

    const tt = Buffer.alloc(46);
    tt.writeUInt32LE(0x02014b50, 0);
    tt.writeUInt16LE(20, 4);
    tt.writeUInt16LE(20, 6);
    tt.writeUInt16LE(0x0800, 8);
    tt.writeUInt32LE(crc, 16);
    tt.writeUInt32LE(m.duLieu.length, 20);
    tt.writeUInt32LE(m.duLieu.length, 24);
    tt.writeUInt16LE(ten.length, 28);
    tt.writeUInt32LE(viTri, 42);
    phanTrungTam.push(tt, ten);
    viTri += 30 + ten.length + m.duLieu.length;
  }
  const trungTam = Buffer.concat(phanTrungTam);
  const cuoi = Buffer.alloc(22);
  cuoi.writeUInt32LE(0x06054b50, 0);
  cuoi.writeUInt16LE(cacMuc.length, 8);
  cuoi.writeUInt16LE(cacMuc.length, 10);
  cuoi.writeUInt32LE(trungTam.length, 12);
  cuoi.writeUInt32LE(viTri, 16);
  return Buffer.concat([...phanCucBo, trungTam, cuoi]);
}

export interface TrangTinh {
  ten: string;
  /** dòng đầu là tiêu đề cột; chuỗi ghi thành chữ, số ghi thành số */
  dong: (string | number | null)[][];
}

/** Tạo tập tin Excel gồm các trang tính cho trước. */
export function taoExcel(cacTrang: TrangTinh[]): Buffer {
  const xml = (s: string) => Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s, 'utf8');
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const muc: MucZip[] = [
    {
      ten: '[Content_Types].xml',
      duLieu: xml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          cacTrang
            .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
            .join('') +
          '</Types>',
      ),
    },
    {
      ten: '_rels/.rels',
      duLieu: xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          `<Relationship Id="rId1" Type="${NS_R}/officeDocument" Target="xl/workbook.xml"/>` +
          '</Relationships>',
      ),
    },
    {
      ten: 'xl/workbook.xml',
      duLieu: xml(
        `<workbook xmlns="${NS}" xmlns:r="${NS_R}"><sheets>` +
          cacTrang.map((t, i) => `<sheet name="${maHoaXml(t.ten)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
          '</sheets></workbook>',
      ),
    },
    {
      ten: 'xl/_rels/workbook.xml.rels',
      duLieu: xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          cacTrang.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
          `<Relationship Id="rId${cacTrang.length + 1}" Type="${NS_R}/styles" Target="styles.xml"/>` +
          '</Relationships>',
      ),
    },
    {
      ten: 'xl/styles.xml',
      duLieu: xml(
        `<styleSheet xmlns="${NS}">` +
          '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
          '</styleSheet>',
      ),
    },
    ...cacTrang.map((t, i) => ({
      ten: `xl/worksheets/sheet${i + 1}.xml`,
      duLieu: xml(
        `<worksheet xmlns="${NS}"><sheetData>` +
          t.dong
            .map(
              (dong, d) =>
                `<row r="${d + 1}">` +
                dong
                  .map((o, c) => {
                    const ref = `${tenCot(c)}${d + 1}`;
                    if (o === null || o === '') return '';
                    if (typeof o === 'number') return `<c r="${ref}"><v>${o}</v></c>`;
                    return `<c r="${ref}" t="inlineStr"><is><t>${maHoaXml(o)}</t></is></c>`;
                  })
                  .join('') +
                '</row>',
            )
            .join('') +
          '</sheetData></worksheet>',
      ),
    })),
  ];
  return ghiZip(muc);
}
