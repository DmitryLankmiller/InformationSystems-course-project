explain analyze
select 1
from feedback_object
where checksum = '413fadd9-68e5-4851-8ae3-94f380486bab';
/*                                                          QUERY PLAN
 --------------------------------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..86488.74 rows=1 width=4) (actual time=0.345..170.723 rows=1 loops=1)
 Workers Planned: 2
 Workers Launched: 2
 ->  Parallel Seq Scan on feedback_object  (cost=0.00..85488.64 rows=1 width=4) (actual time=106.437..161.319 rows=0 loops=3)
 Filter: (checksum = '413fadd9-68e5-4851-8ae3-94f380486bab'::text)
 Rows Removed by Filter: 1367066
 Planning Time: 0.035 ms
 Execution Time: 170.735 ms
 (8 rows)
 */
create index checksum_index on feedback_object (checksum);
explain analyze
select 1
from feedback_object
where checksum = '413fadd9-68e5-4851-8ae3-94f380486bab';
/*                                                             QUERY PLAN

 -------------------------------------------------------------------------------------------------------------------------------------
 Index Only Scan using checksum_index on feedback_object  (cost=0.56..8.57 rows=1 width=4) (actual time=0.046..0.046 rows=1 loops=1)
 Index Cond: (checksum = '413fadd9-68e5-4851-8ae3-94f380486bab'::text)
 Heap Fetches: 0
 Planning Time: 0.212 ms
 Execution Time: 0.054 ms
 (5 rows)
 */
explain analyze
select login,
    name,
    email
from app_user
where name like '%Олег%';
/*                                              QUERY PLAN
 -------------------------------------------------------------------------------------------------------
 Seq Scan on app_user  (cost=0.00..103.80 rows=1 width=160) (actual time=0.051..1.482 rows=23 loops=1)
 Filter: (name ~~ '%Олег%'::text)
 Rows Removed by Filter: 2799
 Planning Time: 0.074 ms
 Execution Time: 1.490 ms
 (5 rows)
 */


 /*
%aa%

          bcc
   bca           cbdaa
ba     bcb     ca       cd



 */
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX app_user_name_index ON app_user USING gin (name gin_trgm_ops);
/*                                                          QUERY PLAN
 -------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on app_user  (cost=21.65..77.83 rows=30 width=160) (actual time=0.066..0.139 rows=24 loops=1)
 Recheck Cond: (name ~~ '%Олег%'::text)
 Heap Blocks: exact=18
 ->  Bitmap Index Scan on app_user_name_index  (cost=0.00..21.64 rows=30 width=0) (actual time=0.043..0.044 rows=24 loops=1)
 Index Cond: (name ~~ '%Олег%'::text)
 Planning Time: 0.343 ms
 Execution Time: 0.188 ms
 (7 rows)
 */
explain analyze
select login,
    name,
    email
from app_user
where email like '%anton%';
/*                                              QUERY PLAN
 -------------------------------------------------------------------------------------------------------
 Seq Scan on app_user  (cost=0.00..108.78 rows=1 width=160) (actual time=0.028..1.500 rows=23 loops=1)
 Filter: (email ~~ '%anton%'::text)
 Rows Removed by Filter: 2919
 Planning Time: 0.143 ms
 Execution Time: 1.522 ms
 (5 rows)
 */
CREATE INDEX app_user_email_index ON app_user USING gin (email gin_trgm_ops);
explain analyze
select login,
    name,
    email
from app_user
where email like '%anton%';
/*                                                         QUERY PLAN
 -------------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on app_user  (cost=30.20..34.22 rows=1 width=160) (actual time=0.054..0.111 rows=23 loops=1)
 Recheck Cond: (email ~~ '%anton%'::text)
 Heap Blocks: exact=22
 ->  Bitmap Index Scan on app_user_email_index  (cost=0.00..30.20 rows=1 width=0) (actual time=0.038..0.038 rows=23 loops=1)
 Index Cond: (email ~~ '%anton%'::text)
 Planning Time: 0.187 ms
 Execution Time: 0.146 ms
 (7 rows)
 */
explain analyze
select *
from parsing_job
where status = 'parsing_done';
/*                                                   QUERY PLAN
 -----------------------------------------------------------------------------------------------------------------
 Seq Scan on parsing_job  (cost=0.00..2845.25 rows=1372 width=356) (actual time=0.044..12.628 rows=1346 loops=1)
 Filter: (status = 'parsing_done'::status_enum)
 Rows Removed by Filter: 39698
 Planning Time: 0.079 ms
 Execution Time: 12.755 ms
 (5 rows)
 */
create index on parsing_job (status);
/*
 -----------------------------------------------------------------------------------------------------------------------------------------------
 Index Scan using parsing_job_status_idx on parsing_job  (cost=0.29..1948.06 rows=1359 width=356) (actual time=0.025..1.456 rows=1346 loops=1)
 Index Cond: (status = 'parsing_done'::status_enum)
 Planning Time: 0.097 ms
 Execution Time: 1.583 ms
 (4 rows)
 */

explain analyze select create_stat_report(43546);
/*                                       QUERY PLAN
----------------------------------------------------------------------------------------
 Result  (cost=0.00..0.26 rows=1 width=4) (actual time=932.672..932.672 rows=1 loops=1)
 Planning Time: 0.019 ms
 Execution Time: 932.684 ms
(3 rows)
*/

create index on feedback_object (stars_rating);
create index on feedback_object (feedback_state);

explain analyze select create_stat_report(43546);
/*                                        QUERY PLAN
------------------------------------------------------------------------------------------
 Result  (cost=0.00..0.26 rows=1 width=4) (actual time=2164.870..2164.870 rows=1 loops=1)
 Planning Time: 0.017 ms
 Execution Time: 2164.882 ms
(3 rows)
*/
drop index feedback_object_feedback_state_idx;
drop index feedback_object_stars_rating_idxq;

create index on feedback_object using hash (stars_rating);
create index on feedback_object using hash  (feedback_state);

explain analyze select create_stat_report(43546);
/*                                        QUERY PLAN
------------------------------------------------------------------------------------------
 Result  (cost=0.00..0.26 rows=1 width=4) (actual time=1010.926..1010.926 rows=1 loops=1)
 Planning Time: 0.027 ms
 Execution Time: 1018.133 ms
(3 rows)
*/
drop index feedback_object_feedback_state_idx;
drop index feedback_object_stars_rating_idxq;

create index on feedback_object (parsing_job_id);
explain analyze select create_stat_report(43546);
/*                                     QUERY PLAN
------------------------------------------------------------------------------------
 Result  (cost=0.00..0.26 rows=1 width=4) (actual time=0.946..0.946 rows=1 loops=1)
 Planning Time: 0.017 ms
 Execution Time: 0.956 ms
(3 rows)
*/


app_db=# explain analyze select * from app_user where name like 'Se%';
                                                QUERY PLAN
-----------------------------------------------------------------------------------------------------------
 Seq Scan on app_user  (cost=0.00..7749.52 rows=4 width=1407) (actual time=13.351..20.139 rows=72 loops=1)
   Filter: (name ~~ 'Se%'::text)
   Rows Removed by Filter: 39090
 Planning Time: 0.376 ms
 Execution Time: 20.187 ms
(5 rows)

app_db=# create index on app_user(name);
CREATE INDEX
app_db=# explain analyze select * from app_user where name like 'Se%';
                                                QUERY PLAN
-----------------------------------------------------------------------------------------------------------
 Seq Scan on app_user  (cost=0.00..7749.52 rows=4 width=1407) (actual time=12.709..19.322 rows=72 loops=1)
   Filter: (name ~~ 'Se%'::text)
   Rows Removed by Filter: 39090
 Planning Time: 0.435 ms
 Execution Time: 19.353 ms
(5 rows)

app_db=# drop index app_user_name_idx;
DROP INDEX

app_db=# create index on app_user using gin (name gin_trgm_ops);
CREATE INDEX

app_db=# explain analyze select * from app_user where name like 'Se%';
                                                         QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------
 Bitmap Heap Scan on app_user  (cost=21.52..37.29 rows=4 width=1407) (actual time=0.132..0.330 rows=72 loops=1)
   Recheck Cond: (name ~~ 'Se%'::text)
   Rows Removed by Index Recheck: 22
   Heap Blocks: exact=90
   ->  Bitmap Index Scan on app_user_name_idx  (cost=0.00..21.52 rows=4 width=0) (actual time=0.094..0.095 rows=94 loops=1)
         Index Cond: (name ~~ 'Se%'::text)
 Planning Time: 0.357 ms
 Execution Time: 0.377 ms
(8 rows)

-- SET enable_indexscan = ON;
-- SET enable_bitmapscan = ON;
-- SET enable_seqscan = ON;

-- NoSeqScan(app_user)

explain analyze /*+ IndexScan(app_user app_user_name_idx) */ select * from app_user where name like 'Se%';
explain analyze /*+ IndexOnlyScan(app_user app_user_name_idx) */ select * from app_user where name like 'Se%';
explain analyze /*+ BitmapScan(app_user) */ select * from app_user where name like 'Se%';


% в начале, % в конце - разница в контексте индексов
Почему btree медленее gin/gist
Почему не получается заставить делать поиск по индексу?