# sloplint

Tìm những kiểu giao diện khiến một front-end web trông như do AI làm ra, rồi thay bằng cách mà
các design system chuyên nghiệp thật sự làm. Dùng được cho cả giao diện sản phẩm (màn quản trị,
dashboard, bảng, form) lẫn landing page.

[English](README.md)

> **Trạng thái: giai đoạn đầu.** Danh sách dấu hiệu, trọng số và bộ kiểm tra đều còn non. Sẽ có
> báo nhầm, và ID có thể đổi trước bản 1.0. Nếu bộ kiểm tra bắt nhầm, hãy mở issue kèm trang bị
> bắt, ID dấu hiệu và kết quả bạn mong đợi.

## "AI slop" là gì

Mô hình ngôn ngữ viết front-end bằng cách chọn phương án có xác suất cao nhất ở từng bước, mà
phương án xác suất cao nhất lại là thứ an toàn và phổ biến nhất trong dữ liệu huấn luyện: font
Inter, nút màu chàm, gradient tím, ba thẻ có icon dưới một hero căn giữa. Anthropic gọi hiện
tượng này là *distributional convergence* (hội tụ về trung tâm phân phối); kết quả là một giao
diện có thể thuộc về bất kỳ sản phẩm nào, và người xem đã quen nhận ra nó là "AI slop".

Từng kiểu riêng lẻ không sai, và nhiều template đã trông như vậy từ trước khi có AI. Thứ làm một
trang lộ ra là nhiều kiểu cùng xuất hiện một lúc, mà không có gì riêng của sản phẩm thế vào chỗ
đó.

## Bộ công cụ có gì

- **Danh sách 54 dấu hiệu** (*tell*) trong `skills/sloplint/tells.json`. Mỗi dấu hiệu có ID,
  phạm vi (app, landing hoặc cả hai), trọng số và cách sửa cụ thể.
- **Bộ kiểm tra DOM** (`skills/sloplint/checker/detect.js`) chạy ngay trong trang đã render
  và đo computed style, nên thấy đúng thứ mà CSS framework của bạn sinh ra.
- **Một CLI** mở trang trong Chromium ở khổ desktop và điện thoại, chấm điểm, rồi xuất báo cáo
  HTML kèm ảnh chụp có đánh dấu; thêm một lệnh quét tĩnh mã nguồn.
- **Một skill cho agent** (`skills/sloplint/SKILL.md`) dùng với Claude Code, Codex, Cursor và
  các agent khác, để tránh dấu hiệu ngay lúc viết code chứ không chỉ bắt lỗi sau.
- **Tài liệu tham khảo** ghi rõ căn cứ của từng cách sửa:
  - `references/tells.md`: từng dấu hiệu, vì sao trông như máy làm, sửa thế nào
  - `references/design-systems.md`: những điểm Cloudscape, Carbon, Atlassian, Primer, Fluent 2,
    Material 3 và Apple HIG cùng thống nhất, kèm con số và link
  - `references/copy.md`: từ sáo rỗng, nhãn CTA chung chung, chữ mẫu bị lọt ra ngoài và cách viết
    thông báo lỗi, bằng tiếng Anh và tiếng Việt
  - `references/sources.md`: các nghiên cứu, skill cộng đồng và design system mà bộ công cụ dựa
    vào

## Bắt đầu nhanh

> `sloplint` chưa lên npm. Trong lúc chờ, chạy thẳng từ GitHub bằng
> `npx github:callmehai/sloplint <lệnh>`, hoặc từ bản clone bằng
> `node skills/sloplint/checker/cli.mjs <lệnh>`. Cả hai nhận đúng các lệnh của `npx sloplint` bên dưới.

`scan` điều khiển Chromium qua Playwright, đã đi kèm sloplint. Chỉ cần tải trình duyệt một lần:

```bash
npx playwright install chromium
```

Quét một trang đang chạy:

```bash
npx sloplint scan http://localhost:5173 --scope app
```

Cú pháp đầy đủ:

```text
npx sloplint scan <url...> [--viewports 1440,390] [--scope app|landing|both]
                               [--config .slop.json] [--out slop-report] [--hover]
                               [--setup login.mjs] [--storage-state auth.json] [--wait 600]
```

`scan` mở từng URL trong Chromium ở từng độ rộng viewport (khổ 390 chạy với chế độ giả lập cảm
ứng), chạy bộ kiểm tra trong trang và ghi ra:

- `slop-report/report.json`: kết quả theo từng trang và viewport
- `slop-report/report.html`: báo cáo để đọc
- ảnh chụp màn hình có đánh dấu chỗ tìm thấy từng dấu hiệu

`--hover` rê chuột lên các phần tử tương tác ở khổ desktop và đo xem chúng có dịch chuyển không,
cần cho dấu hiệu M2. Nếu thư mục hiện tại có `.slop.json` thì tệp được đọc luôn, không cần
`--config`.

Màn cần đăng nhập: `--setup login.mjs` chạy một module trong mỗi browser context mới trước khi mở
trang, nên mỗi trang có phiên riêng (app xoay vòng refresh token sẽ làm hỏng storage state dùng
chung ngay sau trang đầu tiên):

```js
// login.mjs
export default async ({ context, url }) => {
  await context.request.post(new URL('/api/auth/login', url).href, { data: { email: process.env.SCAN_EMAIL, password: process.env.SCAN_PASSWORD } })
}
```

So sánh hai lần quét cùng các màn, trước và sau khi sửa:

```bash
npx sloplint scan <urls> --out before     # bản cũ
npx sloplint scan <urls> --out after      # bản mới, đúng các URL đó
npx sloplint diff before after --out slop-diff
```

`diff` ghép trang theo đường dẫn và độ rộng, rồi so từng phần tử đang hiển thị: chữ, các style
người xem thấy được (màu, cỡ chữ, độ đậm, nền, viền, bo góc, bóng, khoảng cách), `::before`/`::after`,
icon, và các dấu hiệu tìm thấy trên nó. Mỗi thay đổi là một thẻ có số: một câu nói đổi gì ("icon
added, ::before marker removed, background removed") và cùng một vùng cắt từ ảnh trước và ảnh
sau, khung xanh lá là dấu hiệu đã sửa, đỏ là dấu hiệu mới, xanh dương là thay đổi khác. Cùng một
thay đổi trên nhiều dòng gộp thành một thẻ; phần tử con bị thêm hoặc bỏ (icon, chip) tính là thay
đổi của phần tử cha. Ảnh toàn trang có khoanh mọi thay đổi nằm gập dưới mỗi trang.
`slop-diff/diff.json` chứa đúng các mục đó để agent đọc. Mỗi lần quét giữ thêm snapshot phần tử
và ảnh 2x đã mở bung các vùng cuộn cho việc này; `--no-snapshot` để bỏ qua.

Quét mã nguồn, không cần trình duyệt:

```bash
npx sloplint static src
```

`static <dir>` đọc các tệp CSS, SCSS, TSX, JSX, HTML, Vue và Svelte để tìm các dấu hiệu có ghi
`static` trong bảng bên dưới, rồi in kết quả dạng `file:line`.

### Không dùng CLI

Bộ kiểm tra chỉ là một arrow function, nên công cụ nào chạy được script trong trang cũng dùng được.

Playwright:

```js
import { readFileSync } from 'node:fs';

const detect = readFileSync('skills/sloplint/checker/detect.js', 'utf8');
const options = { ignore: ['.third-party-widget'], allow: {} };
const result = await page.evaluate(`(${detect})(${JSON.stringify(options)})`);
// result.findings: [{ id, label, selector, rect, detail, allowed?, reason? }]
```

chrome-devtools MCP: truyền nội dung `detect.js` vào tham số `function` của `evaluate_script`.

`options` nhận các mục `ignore` và `allow` của `.slop.json`. Phần chú thích đầu `detect.js` liệt
kê các tuỳ chọn còn lại, trong đó có `copy`: danh sách từ lấy từ khối JSON cuối
`references/copy.md` (CLI tự truyền vào; thiếu nó, bộ kiểm tra dùng một danh sách dựng sẵn ngắn
hơn). Bộ kiểm tra chạy riêng chỉ trả về các phát hiện, không tính điểm: hãy cộng trọng số trong
`tells.json` theo cách ở mục dưới.

## Cách tính điểm

Mỗi dấu hiệu có **trọng số đo trên trang thật** (xem [docs/calibration.md](docs/calibration.md)):
dấu hiệu đó xuất hiện trên trang do công cụ tạo web bằng AI làm nhiều hơn bao nhiêu lần so với trên
trang của các đội thiết kế chuyên nghiệp.

- **3**: nhiều hơn từ 4 lần trở lên (một font cho mọi thứ, một độ bo lớn cho mọi khung, viên
  thuốc "New" phía trên hero)
- **2**: nhiều hơn 2–4 lần (màu chính indigo, chữ gradient, bóng đổ nhạt dưới mọi thẻ)
- **1**: nhiều hơn một chút
- **0, lời khuyên**: trang chuyên nghiệp cũng dùng nhiều như vậy (gradient trang trí, chuyển động
  lặp mãi, chữ in hoa giãn cách, tương phản thấp). Vẫn được báo kèm cách sửa nhưng không tính điểm:
  đó là góp ý chất lượng thiết kế, không phải dấu vết do AI tạo.

Một dấu hiệu chỉ được tính khi đạt ngưỡng (`min` trong `tells.json`; ví dụ một gradient chưa thành
mẫu, hai cái mới thành). Điểm của trang là **tổng trọng số các dấu hiệu khác nhau có mặt**, sau
khi trừ ngoại lệ. Mỗi trang được chấm riêng ở từng viewport.

| Điểm | Mức |
|---|---|
| 0–2 | clean (sạch) |
| 3–6 | some slop (hơi slop) |
| 7+ | slop |

Độ phân tách (trang tách riêng khỏi tập học, `--scope landing`, 1440px):

| Tập | Trung vị | Sạch | Slop |
|---|---:|---:|---:|
| 33 trang chuyên nghiệp | 3 | 42% | 6% |
| 36 trang do AI tạo (`*.lovable.app`) | 11 | 6% | 78% |
| 78 trang Show HN | 4 | 31% | 23% |

Trang do AI tạo bị chấm cao hơn trang chuyên nghiệp trong 93% số cặp so sánh. Lần hiệu chỉnh này
học được kiểu "template của công cụ tạo web"; kiểu mới của agent viết code (eyebrow, nhãn mono,
chấm giữa) thì trang chuyên nghiệp cũng dùng, nên hiện chỉ báo dạng lời khuyên.

Điểm sạch nghĩa là trang đã tránh được các lựa chọn mặc định chung chung, chứ không có nghĩa là
trang đẹp: gỡ hết dấu hiệu mà không đặt gì vào chỗ trống thì trang vẫn trống.

## Ngoại lệ của dự án

Có dấu hiệu là lựa chọn có chủ đích. Thương hiệu thật sự màu tím, hay kiểu bảng dùng tiêu đề cột
in hoa, thì không phải slop. Ghi những trường hợp đó vào `.slop.json` (đọc từ thư mục hiện tại,
hoặc chỉ đường dẫn khác bằng `--config`):

```json
{
  "scope": "app",
  "allow": {
    "C1": "Sidebar gradient is part of the brand (ADR-12)",
    "T3": { "selector": "th", "reason": "Uppercase column headings are our table style" }
  },
  "ignore": [".third-party-widget"]
}
```

- `scope`: dấu hiệu nào được tính điểm. `app` bỏ qua dấu hiệu chỉ dành cho landing, `landing` bỏ
  qua dấu hiệu chỉ dành cho app; dấu hiệu có phạm vi `both` luôn được tính. `--scope` trên dòng
  lệnh được ưu tiên hơn trường này.
- `allow`: các dấu hiệu dự án chấp nhận, mỗi cái kèm lý do. Giá trị là chuỗi thì cho phép ở mọi
  chỗ; là object có `selector` thì chỉ cho phép trên các phần tử khớp selector đó. Phát hiện được
  cho phép vẫn hiện trong báo cáo, có đánh dấu, nhưng không cộng điểm.
- `ignore`: các selector mà phần tử khớp sẽ không bị kiểm tra, dành cho widget nhúng bạn không
  kiểm soát.

Mỗi ngoại lệ đều có lý do, để người review biết vì sao một kiểu được giữ lại. Skill cho agent đọc
cùng tệp này và sẽ không "sửa" những gì tệp đã cho phép.

## Trong CI: tự comment vào mỗi pull request

Repo này cũng là một GitHub Action. Dựng và chạy bản gốc lẫn bản của pull request, Action sẽ quét
cả hai, comment bảng tóm tắt vào pull request (một comment, cập nhật sau mỗi lần push), đính kèm
báo cáo đầy đủ có ảnh cắt trước/sau làm artifact, và đánh fail khi thay đổi làm xuất hiện dấu hiệu
mới. Ví dụ workflow và danh sách input xem ở [README tiếng Anh](README.md#in-ci-comment-every-pull-request)
và [`action.yml`](action.yml).

## Cài làm skill

**Claude Code.** Chép thư mục skill vào skill của người dùng hoặc của dự án:

```bash
cp -r skills/sloplint ~/.claude/skills/    # mọi dự án
cp -r skills/sloplint .claude/skills/      # chỉ dự án này
```

**Codex và các agent đọc AGENTS.md.** Giữ `skills/sloplint` trong repo và trỏ tới nó:

```markdown
## UI
Before building or reviewing any UI, read `skills/sloplint/SKILL.md` and follow it.
```

**Cursor.** Chép `integrations/cursor/sloplint.mdc` vào `.cursor/rules/`. Rule này được nạp
khi làm việc với tệp style và component, và trỏ Cursor tới `skills/sloplint/SKILL.md`; hãy
giữ thư mục skill đúng đường dẫn đó hoặc sửa đường dẫn trong rule.

## Danh sách dấu hiệu

Sinh từ `skills/sloplint/tells.json`, nên tên dấu hiệu giữ nguyên tiếng Anh như trong
registry. Phạm vi: `app` = giao diện sản phẩm, `landing` = trang marketing. Cách phát hiện:
`dom` = bộ kiểm tra trong trang, `static` = bộ quét mã nguồn, `manual` = cần người hoặc agent
đọc màn hình. Cách sửa nằm trong `references/tells.md`.

| ID | Tell | Scope | Weight | Detect |
|---|---|---|---|---|
| C1 | Decorative gradient | both | 0 | dom, static |
| C2 | Gradient text | both | 2 | dom, static |
| C3 | Default indigo/violet primary | both | 2 | dom, static |
| C4 | Accent sprawl | both | 0 | dom |
| C5 | Neon on near-black | landing | 0 | dom |
| C6 | Untouched framework palette | both | 1 | static |
| C7 | Cream + serif + terracotta | landing | 2 | dom |
| T1 | Default face as the whole identity | both | 3 | dom |
| T2 | Trend display face | landing | 2 | dom |
| T3 | Eyebrows and tracked caps | both | 0 | dom, static |
| T4 | One accented word in a headline | landing | 2 | dom |
| T5 | Monospace as costume | both | 0 | dom |
| T6 | Many near-equal sizes | both | 0 | dom |
| T7 | Text under 12px | both | 0 | dom |
| T8 | Stranded last word | landing | 0 | dom |
| S1 | One big radius on everything | both | 3 | dom |
| S2 | Mixed chip shapes and heights | both | 0 | dom |
| S3 | Coloured side stripe | both | 0 | dom, static |
| S4 | Soft shadow under every card | both | 2 | dom |
| S5 | Border + shadow on one resting box | both | 2 | dom |
| S6 | Glow and dramatic shadow | both | 1 | dom, static |
| S7 | Glassmorphism | both | 1 | dom, static |
| S8 | Cards inside cards | both | 0 | dom |
| S9 | Aurora/blob background | landing | 1 | dom, static |
| L1 | KPI tile row | app | 2 | dom |
| L2 | Icon in a tinted tile | both | 1 | dom |
| L3 | Icon soup chip | both | 1 | dom |
| L4 | Centred hero, then three icon cards | landing | 0 | dom |
| L5 | Pill badge above the hero | landing | 3 | dom |
| L6 | 01 / 02 / 03 markers | landing | 0 | dom |
| L7 | Fake window chrome | landing | 1 | dom |
| L8 | Emoji and sparkles as icons | both | 0 | dom, static |
| L9 | Decorative status dots | both | 2 | dom |
| L10 | Same badge on every row | app | 1 | dom |
| L11 | Middle-dot meta strings and glued arrows | both | 0 | dom, static |
| L12 | Dash for an empty value | app | 1 | dom |
| L13 | Competing primary buttons | both | 0 | dom |
| L14 | Hero or welcome banner inside the app | app | 2 | manual |
| L15 | Charts standing in for content | app | 2 | manual |
| M1 | Endless motion | both | 0 | dom, static |
| M2 | Hover lift and scale | both | 0 | dom, static |
| M3 | `transition: all` | both | 1 | dom, static |
| M4 | Fade-up on every section | landing | 2 | dom, static |
| M5 | Motion without a reduced-motion path | both | 1 | dom, static |
| W1 | Buzzword copy | both | 2 | dom |
| W2 | Generic call to action | both | 0 | dom |
| W3 | Copy that explains the screen | both | 1 | dom, manual |
| W4 | Exclamation marks and cheer | both | 0 | dom |
| W5 | Template leakage | both | 2 | dom |
| W6 | Invented social proof | landing | 0 | dom, manual |
| A1 | Low-contrast text | both | 0 | dom |
| A2 | Focus ring removed | both | 2 | static |
| A3 | Only the happy path | both | 2 | manual |
| A4 | A toast for every action | app | 1 | manual |

## Ghi công

Bộ công cụ này dựa trên công sức của nhiều người. Ghi chú đầy đủ ở
[references/sources.md](skills/sloplint/references/sources.md).

- **Adrian Krebs**, với nghiên cứu duy nhất có đo đạc các kiểu này, và phương pháp kiểm tra
  computed style trong trình duyệt thật.
- **Anthropic**, với cách giải thích "distributional convergence", cookbook về thẩm mỹ frontend
  và skill `frontend-design`.
- **Nielsen Norman Group**, với các bài về AI prototyping và icon lấp lánh (sparkle).
- Các skill cộng đồng: **taste-skill** (Leonxlnx), **Impeccable** (Paul Bakaus), **Hallmark**
  (Nutlope / Together AI), **Uncodixfy** (cyxzdev), **antislop** (miqdadbadjuber), **DeSlop**
  (nate-zz), **Anti-AI-UI** (Vanszs), **no-slop-ui** (LeoStehlik) và **anti-ai-slop**
  (Vinayak-Shukla-03).
- Đội ngũ đứng sau **Cloudscape, Carbon, Atlassian, Primer, Fluent 2, Material 3** và **Apple
  HIG**, với các hướng dẫn công khai làm nền cho mọi cách sửa.

Không có đoạn văn nào được chép từ các dự án trên; trích dẫn ngắn đều ghi nguồn tại chỗ.

## Giấy phép

MIT. Xem [LICENSE](LICENSE).
