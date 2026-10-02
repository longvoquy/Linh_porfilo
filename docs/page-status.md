# Tình trạng các trang

Cập nhật: 2026-09-30. Kiểm tra bằng cách đọc code trong `app/`, `content/` và `components/`, chưa mở từng trang trên trình duyệt.

## Tổng quan

| Trang | Đường dẫn | Tình trạng |
|---|---|---|
| Trang chủ | `/` | Xong |
| Awards & Honors | `/awards` | Xong (5 mục) |
| Leadership | `/leadership` | Xong (4 mục) |
| Volunteer & Philanthropy | `/volunteer` | Xong (2 mục) |
| Art Portfolio | `/art-portfolio` | Xong (8 tranh) |
| Research | `/research` | **Chưa có nội dung** |
| Passion Projects | `/passion-projects` | **Chưa có nội dung** |
| Internship | `/internship` | **Chưa có nội dung** |
| About Me | `/about` | **Đang phát triển** (trang giữ chỗ) |
| Timeline | `/timeline` | **Đang phát triển** (trang giữ chỗ) |
| Portfolio | `/portfolio` | **Đang phát triển** (trang giữ chỗ) |
| Resume | `/resume` | **Đang phát triển** (trang giữ chỗ) |
| Contact | `/contact` | **Đang phát triển** (trang giữ chỗ) |

Tổng cộng có 13 trang: 5 trang đã xong, 3 trang có khung nhưng chưa có nội dung, 5 trang mới chỉ là trang giữ chỗ.

## 1. Trang giữ chỗ (chỉ hiện "Coming soon")

Năm trang nằm trên thanh menu chính. Cả năm chỉ có tiêu đề và khối `ComingSoon`, chưa có nội dung thật. Mỗi file đều có ghi chú trong code: *"swap `ComingSoon` for real content"*.

- **About Me** — [app/about/page.tsx](../app/about/page.tsx)
- **Timeline** — [app/timeline/page.tsx](../app/timeline/page.tsx)
- **Portfolio** — [app/portfolio/page.tsx](../app/portfolio/page.tsx)
- **Resume** — [app/resume/page.tsx](../app/resume/page.tsx)
- **Contact** — [app/contact/page.tsx](../app/contact/page.tsx)

Cần lưu ý thêm về **Portfolio**: trong menu, mục này chứa danh sách 7 section ở dạng dropdown, nhưng trang `/portfolio` khi bấm vào lại đang trống. Cần quyết định trang này sẽ là trang tổng hợp 7 section, hay chỉ là nơi mở dropdown.

## 2. Section đã có khung nhưng chưa có nội dung

Ba section dưới đây đã có trang chạy được, nhưng thư mục `content/<section>/` chưa tồn tại nên trang hiện "Coming soon" tự động.

- **Research** — [app/research/page.tsx](../app/research/page.tsx)
- **Passion Projects** — [app/passion-projects/page.tsx](../app/passion-projects/page.tsx)
- **Internship** — [app/internship/page.tsx](../app/internship/page.tsx)

Cả ba đều là section trên carousel trang chủ. Trong đó **Research là section mà trang chủ mở sẵn khi vào web** (`INITIAL_SECTION = "research"` trong `HomeLanding.tsx`), nên khách vào web và bấm ngay sẽ thấy trang trống. Nên ưu tiên có nội dung cho Research trước, hoặc đổi section mở sẵn sang một section đã có nội dung. Nếu đổi thì phải xoay lại họa tiết trên nón bằng `PANEL_OFFSET` trong `hatTexture.ts`.

**Cách thêm nội dung:** tạo file JSON trong `content/<section>/`, import vào `content/all.ts`, đặt `status: "published"`. Chi tiết xem `AGENTS.md`.

## 3. Trang đã xong

| Trang | Số mục | Ghi chú |
|---|---|---|
| Awards | 5 (bebras, money-maze, nguyen-sieu-scholarship, owlypia, veo) | Ảnh lấy từ Cloudinary, làm mới mỗi giờ |
| Leadership | 4 (soccer-varsity, 2 mục student-council, sunrise-project) | Như trên |
| Volunteer | 2 (muc-hoa-nguyet-hoa, vinh-thanh) | Như trên |
| Art Portfolio | 8 tranh (tranh 1, 2, 4, 5, 6, 7, 8, 9) | Ảnh gắn thẳng đường dẫn trong file JSON. Chưa có `tranh-3`, cần kiểm tra có chủ ý bỏ qua hay còn thiếu |

Toàn bộ mục đang có đều ở trạng thái `published`, không có mục `coming-soon`.

## 4. Việc khác cần làm trước khi công khai

- **Link mạng xã hội trên trang chủ đang là `#`** (LinkedIn, Instagram, Email). Trang hiện hiển thị chúng dưới dạng biểu tượng không bấm được. Cần điền link thật trong `SOCIALS` ở [components/home/HomeLanding.tsx](../components/home/HomeLanding.tsx). Trang Contact cũng đang trống nên khách chưa có cách liên hệ nào.
- **Chưa cấu hình thông tin chia sẻ link (Open Graph)**, chưa có `robots` hay `sitemap`. Khi gửi link cho trường đại học, ảnh và mô tả xem trước sẽ do mạng xã hội tự chọn. Metadata hiện có chỉ là `title` và `description` trong [app/layout.tsx](../app/layout.tsx).
- **Còn 5 file mẫu của Next.js trong `public/`** (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`). Không dùng đến, có thể xóa.
- **Biến môi trường Cloudinary** (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) cần được thêm vào cấu hình khi deploy. Nếu thiếu, ba trang Awards, Leadership và Volunteer sẽ chỉ hiện chữ, không có ảnh.
- **Bản dịch:** hai file `en.json` và `vi.json` hiện có đủ khóa như nhau, không thiếu chữ nào.
