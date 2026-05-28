
create table public.pins (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null,
  lng double precision not null,
  title text not null,
  place_type text not null default 'spot',
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.pins(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  price_tier int not null check (price_tier between 1 and 3),
  body text not null,
  is_anonymous boolean not null default true,
  display_name text,
  created_at timestamptz not null default now()
);

create index reviews_pin_id_idx on public.reviews(pin_id);

alter table public.pins enable row level security;
alter table public.reviews enable row level security;

create policy "Anyone can read pins" on public.pins for select using (true);
create policy "Anyone can insert pins" on public.pins for insert with check (true);
create policy "Anyone can read reviews" on public.reviews for select using (true);
create policy "Anyone can insert reviews" on public.reviews for insert with check (true);

-- Seed
with p as (
  insert into public.pins (lat, lng, title, place_type, photo_url) values
    (48.8566, 2.3522, 'Canal Saint-Martin picnic spot', 'spot', null),
    (41.3825, 2.1769, 'Gràcia hostel strip', 'hostel', null),
    (52.5200, 13.4050, 'Hauptbahnhof area eats', 'food', null),
    (51.5074, -0.1278, 'King''s Cross student food', 'food', null),
    (52.3676, 4.9041, 'Amsterdam Centrum budget hotel', 'hotel', null),
    (50.1109, 8.6821, 'Frankfurt Hauptbahnhof', 'transport', null),
    (45.4642, 9.1900, 'Navigli canals sunset', 'view', 'https://images.unsplash.com/photo-1513581166391-887a96dde670?w=800&q=80')
  returning id, title
)
insert into public.reviews (pin_id, rating, price_tier, body, is_anonymous, display_name)
select p.id, r.rating, r.price_tier, r.body, r.is_anonymous, r.display_name
from p
join (values
  ('Canal Saint-Martin picnic spot', 5, 1, 'Cheap wine from the supermarket nearby. Locals chill here at sunset — felt safe and vibey.', true, null::text),
  ('Canal Saint-Martin picnic spot', 4, 1, 'Free views, bring your own food. Way better than tourist traps by the Seine.', true, null),
  ('Gràcia hostel strip', 4, 2, 'Bunks from €28 in shoulder season. Book early for weekends.', true, null),
  ('Gràcia hostel strip', 3, 2, 'Shared kitchen saves money. Metro 10 min walk.', false, 'Maya_T'),
  ('Hauptbahnhof area eats', 4, 1, 'Currywurst stand outside station — €4 and actually good.', true, null),
  ('Hauptbahnhof area eats', 2, 3, 'Sit-down place in the mall is overpriced for what you get.', true, null),
  ('King''s Cross student food', 5, 1, 'Meal deals at Tesco before your train — lifesaver on Interrail days.', true, null),
  ('King''s Cross student food', 4, 2, 'Food hall has £8 lunches if you need a sit-down.', false, 'rail_kid'),
  ('Amsterdam Centrum budget hotel', 4, 2, 'Small doubles ~€65/night if you book 2 weeks ahead. Canal view not worth the upgrade.', true, null),
  ('Amsterdam Centrum budget hotel', 3, 2, 'Breakfast extra — hit the bakery on the corner instead.', true, null),
  ('Frankfurt Hauptbahnhof', 4, 1, 'REWE in the station for cheap snacks before night trains.', true, null),
  ('Frankfurt Hauptbahnhof', 5, 1, 'Good interchange for Rhine-Main — lockers on platform 7 area.', true, null),
  ('Navigli canals sunset', 5, 1, 'Free golden hour. Grab aperitivo from the carrefour nearby.', true, null)
) as r(title, rating, price_tier, body, is_anonymous, display_name) on r.title = p.title;
