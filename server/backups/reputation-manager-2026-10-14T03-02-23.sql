--
-- PostgreSQL database dump
--

\restrict VjL6vNOQ80WcOWOhJh3OVs7ZpK3FkTbP3VCoDeZ0OHlU8PgA2yYQm0nYtTVlT0n

-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.businesses (
    id text NOT NULL,
    "userId" text NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    description text NOT NULL,
    "shareLink" character varying(255) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.businesses OWNER TO postgres;

--
-- Name: TABLE businesses; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.businesses IS 'CASCADE delete: removing user also removes their businesses';


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_id_seq OWNER TO postgres;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNER TO postgres;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id text NOT NULL,
    "businessId" text NOT NULL,
    author character varying(255) NOT NULL,
    rating integer NOT NULL,
    text text NOT NULL,
    platform character varying(255) DEFAULT 'ReputationManager'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: TABLE reviews; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.reviews IS 'CASCADE delete: removing business also removes its reviews';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: TABLE users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users IS 'Account creation timestamp (UTC)';


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.businesses (id, "userId", name, type, description, "shareLink", "createdAt") FROM stdin;
we-DHrcGeTOeDU	rO7_TL-69KjIXn	Auto Repair	Taller mecánico	Trabajo de excelencia y precios asequibles	IIDqUP8K73	2026-10-11 22:43:08.308
BRu7vDszkMZU4N	hZ4xTKRZkixM5w	Test Restaurant Phase1	Restaurante	Local de prueba para validar cach�	xsc-RTZELi	2026-10-11 22:56:48.844
H5KhafCZWn46Rt	aCCSUl6gE_jLP2	Business A	Restaurante	Business A	0WhZ_ruIWG	2026-10-11 23:06:38.864
IhiXaZW8tVm6I3	xsb376VE9G-bmQ	Business B	Tienda	Business B	BhIbY-rY8Z	2026-10-11 23:06:38.953
c9CN-3H65SYMBk	E8MZqhuvsRwYvZ	Updated 3	Test	Para probar escrituras	ftVHJICppC	2026-10-11 23:10:53.452
A77enzij_PFy-g	2k-TNLd0vkpvtB	Widget Test Biz	Test	Para probar widget	mdYHRvBthv	2026-10-11 23:16:04.934
K1tP8y3rq_5XT3	2k-TNLd0vkpvtB	Another Business	Test	Otro negocio	Pz8d7b_vsT	2026-10-11 23:16:06.382
gi2tfJIYzfxSOw	Xm9vjvVpqEjJRk	Business for Reviews	Shop	For review testing	bgmzbw6VUx	2026-10-14 02:33:41.002
foogIugaW6lBNE	Xm9vjvVpqEjJRk	Audit Test 2026 - Updated	Testing	Audit test business	NC-Lrvhtky	2026-10-14 02:40:08.192
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	001_init_schema.js	1	2026-10-13 22:06:19.637-04
2	002_add_indexes.js	1	2026-10-13 22:06:19.642-04
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviews (id, "businessId", author, rating, text, platform, "createdAt") FROM stdin;
MTuVq3BbiTQx5A	we-DHrcGeTOeDU	Carlos Pérez	5	Excelente servicio. Me atendieron muy bien, fueron profesionales y el precio fue razonable. Recomiendo este negocio.	ReputationManager	2026-10-11 22:44:45.072
kgmoE3LzQMeMMO	BRu7vDszkMZU4N	Test Client Phase1	5	Excelente servicio, el personal muy atento y la comida deliciosa. Recomendado 100%.	ReputationManager	2026-10-11 22:56:49.141
Tsow6HLyb1gtpb	BRu7vDszkMZU4N	Another Client	4	Muy bueno, aunque el servicio fue un poco lento.	ReputationManager	2026-10-11 22:56:50.717
PkZgEJPiosjIq7	BRu7vDszkMZU4N	Cache Test User	3	Prueba de refresco autom�tico del cach�.	ReputationManager	2026-10-11 22:57:06.783
ft9lGt_uZE6txR	c9CN-3H65SYMBk	TestReviewer1	5	Test review 1 content here	ReputationManager	2026-10-11 23:10:55.991
odBtrQ4dNOiKHx	c9CN-3H65SYMBk	TestReviewer2	5	Test review 2 content here	ReputationManager	2026-10-11 23:10:56.033
TucJ_eR0YrPtia	c9CN-3H65SYMBk	TestReviewer3	5	Test review 3 content here	ReputationManager	2026-10-11 23:10:56.081
yPcSmfxL46h5IT	A77enzij_PFy-g	Widget Tester	5	Test review for widget	ReputationManager	2026-10-11 23:16:05.203
w8xal1xwt-sdxr	gi2tfJIYzfxSOw	John Doe	5	Excellent experience, highly recommended!	ReputationManager	2026-10-14 02:34:03.6
BJTlheznD_DVoJ	foogIugaW6lBNE	Audit Inspector	5	Perfect functionality test. System working correctly!	ReputationManager	2026-10-14 02:40:08.549
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, "passwordHash", "createdAt") FROM stdin;
rO7_TL-69KjIXn	Yainier Gomez Rivero	yeinierrivero8@gmail.com	$2a$12$3KcJzY.BRpnCVQ4KbtOaR.IdpXgR4fbllSYQEY.Yxttvx.wcDp72.	2026-10-11 22:34:12.163
hZ4xTKRZkixM5w	Test User Phase1	test.phase1@example.com	$2a$12$JOdKczF.w1jOZiIc5X395OWNXDivR/0jNLbw3dAqbvK7AaP8ex0ja	2026-10-11 22:56:48.679
aCCSUl6gE_jLP2	User A Security	usera.sec@test.com	$2a$12$fex56LUYBqBxlNu95GbGL.5e4IP9G7m4HjHt/UpFLgUpxEbb60lTi	2026-10-11 23:06:38.477
xsb376VE9G-bmQ	User B Security	userb.sec@test.com	$2a$12$1vnTwgzpISAaejz0zK/GiOtca2b9WbmDWtzkCrVWHIkUaMRBe/D4O	2026-10-11 23:06:38.772
E8MZqhuvsRwYvZ	Security Test	sectest@test.com	$2a$12$CmwOaq.dx1g3cWj2woUj2.Ct/Z2jZt7XjV.coMdccAXFUJSla44..	2026-10-11 23:10:52.816
2k-TNLd0vkpvtB	Widget Test User	widget.test@test.com	$2a$12$x0cd2BMhiExeWCrk0PI4mOV0GntYTzKWktF0v793jMbe3Xz4hC6R.	2026-10-11 23:16:04.336
Xm9vjvVpqEjJRk	Test User	testuser1791945202@example.com	$2a$12$HhYuEdR5ZNCSSJpj.bC5e.J1mUEnp5reKSBXrIQqdY/0mUUPxTORK	2026-10-14 02:33:23.122
C-CLv7UWrcMpx6	Another User	anotheruser1791945260@example.com	$2a$12$lmQbXpJ77VvMPpno5YK/H.b9/bnW/kbQ5EelATum8P2Z2q.gyACtS	2026-10-14 02:34:20.911
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 2, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_sharelink_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_sharelink_unique UNIQUE ("shareLink");


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_businesses_share_link; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_share_link ON public.businesses USING btree ("shareLink");


--
-- Name: idx_businesses_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_user_created ON public.businesses USING btree ("userId", "createdAt");


--
-- Name: idx_businesses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_businesses_user_id ON public.businesses USING btree ("userId");


--
-- Name: idx_reviews_business_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_business_created ON public.reviews USING btree ("businessId", "createdAt");


--
-- Name: idx_reviews_business_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_business_id ON public.reviews USING btree ("businessId");


--
-- Name: idx_reviews_created_at_desc; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_created_at_desc ON public.reviews USING btree ("createdAt");


--
-- Name: idx_reviews_platform; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_platform ON public.reviews USING btree (platform);


--
-- Name: idx_reviews_rating; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: businesses businesses_userid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_userid_foreign FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_businessid_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_businessid_foreign FOREIGN KEY ("businessId") REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict VjL6vNOQ80WcOWOhJh3OVs7ZpK3FkTbP3VCoDeZ0OHlU8PgA2yYQm0nYtTVlT0n

