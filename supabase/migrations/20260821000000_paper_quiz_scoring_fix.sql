-- Repair the already-deployed Paper Quiz RPC. GREATEST and LEAST are SQL
-- expressions in PostgreSQL and cannot be schema-qualified.

do $migration$
declare
  function_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.submit_paper_quiz(uuid,jsonb)'::pg_catalog.regprocedure
  )
  into function_definition;

  function_definition := pg_catalog.replace(
    function_definition,
    'pg_catalog.greatest',
    'greatest'
  );
  function_definition := pg_catalog.replace(
    function_definition,
    'pg_catalog.least',
    'least'
  );
  execute function_definition;
end;
$migration$;
