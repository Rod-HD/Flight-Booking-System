# Hệ thống thiết kế giao diện: Quản lý bán vé chuyến bay (Nhóm 12)

Internal web app for an airline ticket office (two roles: Quản lý = manager/admin, Nhân viên bán vé = ticket agent).
Visual language is modelled on the look and feel of https://newweb.vietjetair.com/vi (bright red + warm yellow, big rounded cards,
3D glossy red icons, pill buttons, soft floating shadows, lively hover motion). The product has ITS OWN name and logo:
wordmark "Quản lý bán vé chuyến bay" next to a white paper-plane glyph inside a red rounded square. Do not use any third-party logo or mascot.
All UI text is Vietnamese with full diacritics.

## Brand
- Product name (always shown with the logo, top-left of every screen): **Quản lý bán vé chuyến bay**
- Personality: energetic, friendly, fast, trustworthy. Lots of white space, red as the hero colour, yellow only for the primary call to action.

## Colour tokens
| Token | Value | Use |
|---|---|---|
| red-500 (primary) | #EC2029 | header, active tab underline, card title on hover, links, selected states, danger buttons |
| red-700 | #B3141B | pressed / hover of red buttons |
| red-900 | #6F0000 | deep end of red gradients |
| red-50 | rgba(236,32,41,0.08) | hover wash on rows, chips, icon buttons |
| yellow-400 | #FFDD00 | top of yellow gradient |
| yellow-500 | #FBB612 | primary CTA, tags, badges |
| yellow-600 | #F9A51A | bottom of yellow gradient, CTA hover |
| ink-900 | #1F2A33 | headings |
| ink-700 | #333333 | body text |
| ink-500 | #6B7680 | secondary text, descriptions, placeholders |
| line | #E8E8E8 | hairlines, table borders, input borders |
| surface-0 | #FFFFFF | page background, raised cards |
| surface-1 | #F5F5F6 | resting service cards, table header, input fill |
| surface-2 | #EFECEB | chips, disabled |
| success | #1E9E5A | Hoạt động, Đã bán, thành công |
| warning | #F9A51A | Chờ thanh toán |
| neutral | #8A949E | Đã hủy, Đã khóa |

Gradients
- Header (over hero): linear-gradient(180deg, #F02823 0%, rgba(237,39,36,.86) 30%, rgba(231,36,37,.5) 62%, rgba(223,32,48,0) 100%)
- Primary CTA (yellow pill): linear-gradient(180deg, #FFEB63 0%, #F5D200 100%), text #1F2A33 bold
- Accent yellow: linear-gradient(26.73deg, #F9A51A 13.7%, #FBB612 29.8%, #FFDD00 66.81%)
- Danger / brand red block: linear-gradient(180deg, #EC2029 0%, #D91A21 100%)

## Typography
- Font: KoHo (Google Font) 400/500/600/700; fallback Be Vietnam Pro, sans-serif. Sans-serif everywhere.
- Display 40/48 bold, H1 32/40 bold, H2 24/32 bold, H3 18/26 semibold, body 16/24 regular, small 14/20, caption 12/16.
- Main items, card titles, table headers, field labels of required inputs, totals and prices are **bold**.

## Shape, elevation, spacing
- Radius: pills and buttons 999px; cards 24px; inputs 12px; dialogs 24px; table container 16px; tags 999px.
- Shadows: resting cards none; raised/hover card 0 18px 42px rgba(74,84,95,.18); sticky bars 0 8px 24px rgba(0,0,0,.08); dialogs 0 24px 56px rgba(31,42,51,.28).
- Spacing scale 4, 8, 12, 16, 24, 32, 48, 64. Page max width 1280, side gutter 32.

## Components
- **Top notice bar**: 44px, white with red bell icon and one line of text, prev/next round ghost buttons and a close X; on scroll it turns red with white text.
- **Header**: 72px. Over the hero: transparent on the red fade gradient, white logo and white nav text. After scroll: white bar with rounded bottom corners (24px) and shadow, red logo, dark text. Left: logo + wordmark, thin divider, nav links. Right: one translucent pill group (Trợ giúp, user name + role), then a grey-outline pill "Đăng xuất". The current section link is bold with a 3px red (or white over hero) underline.
- **Service card** (the main-menu tile): 3D glossy red icon 56px top-left, bold title 18px, one-line grey description 14px. Resting: surface-1, no shadow, title ink-900. Hover / focus: background white, lifts 6px, raised shadow, title turns red-500, icon scales to 1.08. Selected/current: white with 2px red border and red title.
- **Promo card** (tall, for shortcuts and tips): yellow pill tag on top, 2 to 3 lines of text, large illustration at the bottom. Resting: white with 1px red border, dark text. Hover or active slide: filled red-500, text white and bolder, illustration gains a white sticker outline and scales 1.05; tag stays yellow.
- **Buttons**: primary = yellow gradient pill with dark bold text and a small arrow; secondary = white pill with 1px red border and red text (hover fills red, text white); danger (Xóa, Hủy, Khóa) = solid red pill with white bold text; quiet (Đóng, Thoát, Đăng xuất) = white pill with grey #C0C9D2 border and dark text. Icon buttons are 40px circles.
- **Sticky action/search bar**: floating white container, 16px radius, 2px red border, a red tab strip on top (selected tab bold with white underline) and a white field row with labelled fields separated by hairlines and a yellow CTA on the right.
- **Inputs**: 48px high, 12px radius, 1px #E8E8E8 border, small grey label above the value, red border and soft red glow on focus, red helper text on error. Required labels end with a red asterisk.
- **Tables**: white container with 16px radius; header row surface-1 with bold dark labels; 56px rows; row hover = red-50 wash; selected row = 3px red bar on the left and bold text; numeric columns right-aligned; status shown as coloured pills.
- **Status pills**: Đã bán / Hoạt động green, Chờ thanh toán amber, Đã hủy / Đã khóa grey.
- **Carousel**: slides with rounded 24px corners, auto-advance every 5s, sliding transition 420ms cubic-bezier(.2,.8,.2,1); controls under the slides = round prev arrow, a pill track of dots where the active dot is a wider red capsule, round next arrow.
- **Dialogs (thông báo)**: centred white card, 24px radius, icon in a tinted circle (red for delete/cancel confirmation, green for success, amber for warning), bold title, message, buttons right-aligned; destructive confirm button red, "Không" quiet.
- **Toast**: bottom-right white pill with coloured left icon, auto-dismiss.
- **Empty state**: small 3D illustration, bold line, grey hint.

## Motion (must be visible in every design state)
- Colour, background and shadow transitions 200ms; transforms 220 to 420ms with cubic-bezier(.2,.8,.2,1).
- Hovering any interactive item changes its text colour to red and brightens its background; the clicked/current item stays highlighted.
- Cards lift on hover; icons scale up slightly; primary button arrow nudges 4px right.
- Carousel auto-plays and pauses on hover.

## Imagery
- Icons: glossy 3D red objects with small yellow accents on transparent background, one per feature:
  chuyến bay = red airplane; bán vé = red ticket with yellow star; đặt vé = red calendar with a seat/clock; danh sách vé = stack of tickets;
  phiếu đặt chỗ = red clipboard with clock; báo cáo = red bar chart with yellow coin; quy định = red gear with checklist; phân quyền = red shield with key/user;
  tra cứu = red magnifier over a suitcase; nhập Excel = red folder with green sheet; trợ giúp = red headset.
- Key visuals: bright sky, white clouds, red-and-yellow aircraft tail/wing, airport counter scenes; warm and optimistic.
