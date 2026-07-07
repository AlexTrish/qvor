-- Выполнить после `prisma migrate dev`
-- Устанавливает начальное значение numeric_id с 100001

ALTER SEQUENCE users_numeric_id_seq RESTART WITH 100001;
