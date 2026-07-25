# ML Lab QA tenant

`20260804000000_seed_ml_lab.sql` creates a second tenant for testing the
three-level authorization model. The current OS Lab owner becomes the ML Lab
owner. The migration never copies member activity, posts, personal missions,
projects, meetings, rewards, or progress from OS Lab.

## Run it

1. Apply `20260802000000_multi_lab_foundation.sql` and
   `20260803000000_role_hierarchy.sql` first.
2. In Supabase Dashboard, open **SQL Editor**, paste the complete contents of
   `supabase/migrations/20260804000000_seed_ml_lab.sql`, and select **Run**.
3. Sign out and back in, then open `http://localhost:3000/labs`.
4. Open **ML Lab**. Its owner tools are available at `/labs/ml-lab/admin`,
   `/labs/ml-lab/settings`, and `/labs/ml-lab/quests`.

If OS Lab already has database-backed Quest chapters, their definitions are
copied to ML Lab. If it has none, the migration creates one ML onboarding
chapter with three missions. Running the migration again does not duplicate the
Lab, owner membership, chapter, or missions.

## Create a member account for testing

As the ML Lab owner, open `/labs/ml-lab/admin` and copy its invitation code.
Create a separate account in an incognito window and enter that code during
signup. That account receives only the `member` role in ML Lab. The owner can
promote it to Lab Admin from the same administration page.

## Verify in SQL Editor

```sql
select l.name, l.slug, p.name as owner_name, lm.membership_role
from public.labs as l
join public.lab_members as lm
  on lm.lab_id = l.id and lm.user_id = l.owner_id
join public.profiles as p on p.id = l.owner_id
where l.slug in ('os-lab', 'ml-lab')
order by l.slug;

select l.slug, count(distinct c.id) as chapters, count(m.id) as missions
from public.labs as l
left join public.quest_chapters as c on c.lab_id = l.id
left join public.quest_missions as m on m.chapter_id = c.id
where l.slug = 'ml-lab'
group by l.slug;
```
