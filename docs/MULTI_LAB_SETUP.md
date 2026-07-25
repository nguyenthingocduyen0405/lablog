# Hướng dẫn chuyển LABLOG sang nhiều lab

Kiến trúc mới giữ toàn bộ dữ liệu hiện tại trong **OS Lab** và thêm khả năng tạo nhiều lab độc lập. Bài viết, lịch, mission, project, meeting, notification, chỗ ngồi và tiến độ mở khóa đều được tách bằng `lab_id`.

## Bạn cần làm gì

### 1. Sao lưu Supabase

Trước khi chạy migration, vào **Supabase Dashboard → Database → Backups** và tạo/kiểm tra bản backup gần nhất. Không deploy code mới trước bước migration, vì frontend mới sẽ đọc các bảng `labs` và `lab_members`.

### 2. Chạy migration

Có hai cách. Chỉ chọn một cách.

**Cách A — Supabase CLI**

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`YOUR_PROJECT_REF` nằm trong URL Dashboard: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`.

**Cách B — SQL Editor**

Mở file `supabase/migrations/20260802000000_multi_lab_foundation.sql`, sao chép toàn bộ nội dung, dán vào **Supabase Dashboard → SQL Editor → New query**, rồi bấm **Run**.

### 3. Kiểm tra dữ liệu sau migration

Chạy lần lượt trong SQL Editor:

```sql
select id, slug, name, join_code from public.labs order by created_at;

select lab_id, membership_role, count(*)
from public.lab_members
group by lab_id, membership_role;

select
  (select count(*) from public.posts where lab_id is null) as posts_without_lab,
  (select count(*) from public.missions where lab_id is null) as missions_without_lab,
  (select count(*) from public.team_projects where lab_id is null) as projects_without_lab;
```

Kết quả mong đợi:

- Có một dòng `os-lab`.
- Tài khoản cũ đều là thành viên OS Lab.
- Ba cột `*_without_lab` đều bằng `0`.

Nếu muốn đổi người quản lý OS Lab:

```sql
update public.lab_members
set membership_role = 'admin'
where lab_id = '11111111-1111-4111-8111-111111111111'
  and user_id = 'USER_UUID';
```

`USER_UUID` xem tại **Authentication → Users**. Không đặt nhiều người là `owner`; dùng `admin` cho giáo sư/trợ giảng.

### 4. Kiểm tra local

```powershell
npm run dev
```

Sau đó kiểm tra:

1. Đăng nhập bằng tài khoản cũ và xác nhận OS Lab vẫn còn dữ liệu.
2. Mở `/labs`, tạo một lab thử.
3. Sao chép mã mời, đăng nhập tài khoản khác và tham gia lab.
4. Tạo một post/calendar/mission trong lab thử.
5. Chuyển về OS Lab và xác nhận dữ liệu lab thử không xuất hiện.
6. Chuyển lại lab thử và xác nhận dữ liệu vẫn còn.

### 5. Deploy Vercel

Sau khi migration và local test thành công:

```powershell
git add app supabase/migrations/20260802000000_multi_lab_foundation.sql docs/MULTI_LAB_SETUP.md
git commit -m "feat: add multi-lab tenancy foundation"
git push origin main
```

Nếu Vercel đã kết nối đúng branch `main`, push sẽ tự tạo deployment. Trong Vercel kiểm tra **Deployments → Ready** rồi mở deployment mới nhất. Không cần thêm environment variable mới cho multi-lab; vẫn dùng các biến Supabase hiện tại.

## Cách vận hành

- Chủ lab vào `/labs` để tạo lab.
- Hệ thống sinh mã mời 8 ký tự.
- Thành viên nhập mã tại `/labs`.
- Bộ chọn lab trên header quyết định dữ liệu đang xem.
- OS Lab dùng game Chapter 1–3 hiện tại.
- Lab khác đọc Chapter/Mission từ `quest_chapters` và `quest_missions`.

Ví dụ thêm một Chapter cho lab khác:

```sql
insert into public.quest_chapters (
  lab_id, order_index, title_i18n, description_i18n
) values (
  'LAB_UUID',
  1,
  '{"ko":"기초 안전","vi":"An toàn cơ bản","en":"Basic safety"}',
  '{"ko":"랩 안전 규칙","vi":"Quy tắc an toàn phòng lab","en":"Lab safety rules"}'
);
```

Sau đó lấy `id` của Chapter và thêm Mission:

```sql
insert into public.quest_missions (
  chapter_id, order_index, mission_type, title_i18n,
  instructions_i18n, content, validation
) values (
  'CHAPTER_UUID',
  1,
  'quiz',
  '{"ko":"안전 퀴즈","vi":"Quiz an toàn","en":"Safety quiz"}',
  '{"ko":"정답을 고르세요","vi":"Chọn đáp án đúng","en":"Choose the correct answer"}',
  '{"options":["A","B","C"]}',
  '{"answer":"B"}'
);
```

Hiện màn hình LabQuest tổng quát hiển thị Chapter/Mission từ database; các mini-game OS đặc biệt vẫn chỉ chạy trong OS Lab. Bước phát triển tiếp theo nên là trang quản trị dạng form để giáo sư tạo nội dung mà không cần SQL, rồi thêm renderer/validator cho từng `mission_type`.

## Lưu ý an toàn

- Không đưa Supabase service-role key vào frontend hoặc Vercel biến có tiền tố `NEXT_PUBLIC_`.
- Mã mời chỉ dùng để tham gia lab; admin/owner phải được gán trong SQL hoặc trang quản trị sau này.
- Không xóa OS Lab vì đó là tenant chứa dữ liệu cũ.
- Nếu migration lỗi giữa chừng, không chạy lệnh xóa bảng. Ghi lại lỗi SQL và khôi phục backup nếu cần.
