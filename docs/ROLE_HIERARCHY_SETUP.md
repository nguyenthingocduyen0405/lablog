# Thiết lập phân quyền ba cấp

Sau khi chạy migration multi-lab, chạy tiếp:

    supabase/migrations/20260803000000_role_hierarchy.sql

Migration tạo ba cấp quyền:

- `platform_admins`: quản trị toàn bộ hệ thống.
- `lab_members.membership_role = owner/admin`: quản trị một Lab.
- `lab_members.membership_role = member`: thành viên thông thường.

Owner hiện tại của OS Lab được bootstrap thành Platform Admin đầu tiên. Kiểm tra:

```sql
select profile.name, admin.created_at
from public.platform_admins as admin
join public.profiles as profile on profile.id = admin.user_id;
```

Tài khoản mới không còn tự động tham gia OS Lab. Nếu nhập mã mời khi signup,
trigger sẽ thêm tài khoản vào đúng Lab. Nếu không nhập mã, người dùng được đưa
đến `/labs` để tạo hoặc tham gia Lab.

Các route quản trị:

- `/admin`: Platform Admin.
- `/labs/[slug]/admin`: Lab Owner/Admin.
- `/labs/[slug]`: portal thành viên.
