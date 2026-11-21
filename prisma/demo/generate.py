#!/usr/bin/env python3
"""Demó adatkészlet generátor az éles DB-hez.

Kimenet: demo-seed.sql és demo-cleanup.sql ebben a mappában.
Minden rekord id-ja `skooldemo_` előtagú, a programok neve `[DEMO]` előtagú,
így a cleanup csak ezeket törli. Determinisztikus (fix seed).

    python3 prisma/demo/generate.py
"""

import json
import random
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

rng = random.Random(20261120)
OUT = Path(__file__).parent
NOW = datetime(2026, 11, 20, 12, 0)  # UTC, naiv (a DB oszlop timestamp(3))


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, datetime):
        return "'" + v.strftime("%Y-%m-%d %H:%M:%S") + "'"
    if isinstance(v, list):
        return "ARRAY[" + ",".join(q(x) for x in v) + "]::text[]" if v else "ARRAY[]::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def dkey(last, first, email):
    def n(s):
        s = unicodedata.normalize("NFD", s)
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        return " ".join(s.lower().split())
    return "|".join(n(x) for x in (last, first, email))


def slug(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if c.isalnum() and ord(c) < 128).lower()


# ---------------------------------------------------------------- programok
# (név, cég, helyszín, kezdés, napok, kapacitás, jelentkezők száma, tagek, korosztály)
EVENTS = [
    ("Webfejlesztés alapjai", "TechNova Kft.", "Budapest", datetime(2024, 3, 16, 9), 1, 20, 26, ["web", "workshop"], "14-18"),
    ("Játékfejlesztés nyári tábor", "PixelForge Zrt.", "Szeged", datetime(2024, 7, 8, 9), 5, 24, 31, ["tábor", "játék"], "12-16"),
    ("AI és vibe coding nap", "DataWave Kft.", "Debrecen", datetime(2024, 11, 9, 9), 1, 15, 14, ["ai", "workshop"], "15-18"),
    ("Mobilapp workshop", "TechNova Kft.", "Budapest", datetime(2025, 2, 22, 9), 1, 18, 34, ["mobil", "workshop"], "14-18"),
    ("Robotika hétvége", "MechaLab Kft.", "Győr", datetime(2025, 5, 17, 9), 2, 16, 19, ["robotika", "hardver"], "12-15"),
    ("Kiberbiztonság nyári tábor", "SecureNet Zrt.", "Pécs", datetime(2025, 7, 14, 9), 5, 20, 23, ["tábor", "biztonság"], "15-18"),
    ("Adatvizualizáció workshop", "DataWave Kft.", "Budapest", datetime(2025, 10, 4, 9), 1, 16, 21, ["adat", "workshop"], "15-18"),
    ("Webfejlesztés alapjai", "TechNova Kft.", "Budapest", datetime(2026, 4, 11, 9), 1, 20, 22, ["web", "workshop"], "14-18"),
    ("AI és vibe coding hétvége", "DataWave Kft.", "Budapest", datetime(2026, 11, 19, 9), 4, 20, 30, ["ai", "workshop"], "14-18"),
    ("Téli játékfejlesztő tábor", "PixelForge Zrt.", "Szeged", datetime(2026, 12, 28, 9), 4, 24, 33, ["tábor", "játék"], "12-16"),
    # 2026 jún–okt: a dashboard túljelentkezés-trendjéhez (a végére fűzve, hogy a meglévő id-k ne tolódjanak)
    ("Mobilapp workshop", "TechNova Kft.", "Budapest", datetime(2026, 6, 13, 9), 1, 18, 23, ["mobil", "workshop"], "14-18"),
    ("Kiberbiztonság nyári tábor", "SecureNet Zrt.", "Pécs", datetime(2026, 7, 13, 9), 5, 20, 34, ["tábor", "biztonság"], "15-18"),
    ("Robotika hétvége", "MechaLab Kft.", "Győr", datetime(2026, 8, 22, 9), 2, 16, 15, ["robotika", "hardver"], "12-15"),
    ("Adatvizualizáció workshop", "DataWave Kft.", "Debrecen", datetime(2026, 9, 26, 9), 1, 16, 29, ["adat", "workshop"], "15-18"),
    ("Webfejlesztés alapjai őszi", "TechNova Kft.", "Budapest", datetime(2026, 10, 17, 9), 1, 20, 27, ["web", "workshop"], "14-18"),
]
INSTRUCTORS = ["Kovács Anna", "Szabó Réka", "Tóth Eszter", "Nagy Dóra"]
MENTOR_POOL = ["Balogh Petra", "Fehér Lili", "Varga Zsófia", "Molnár Kata", "Kiss Bianka", "Horváth Noémi", "Lakatos Emma"]

FIRST = ["Anna", "Boglárka", "Csenge", "Dorina", "Eszter", "Fanni", "Gréta", "Hanna", "Izabella", "Jázmin",
         "Kinga", "Laura", "Luca", "Mira", "Nóra", "Panna", "Petra", "Réka", "Sára", "Zoé", "Lili", "Emma",
         "Dóra", "Viktória", "Bianka", "Flóra", "Zsófia", "Lilla", "Noémi", "Szonja"]
LAST = ["Nagy", "Kovács", "Tóth", "Szabó", "Horváth", "Varga", "Kiss", "Molnár", "Németh", "Farkas",
        "Balogh", "Papp", "Takács", "Juhász", "Lakatos", "Mészáros", "Oláh", "Simon", "Rácz", "Fekete",
        "Szilágyi", "Török", "Fehér", "Balázs", "Gál", "Kis", "Szűcs", "Kocsis", "Orsós", "Pintér"]
TOWNS = ["Budapest", "Budapest", "Budapest", "Debrecen", "Szeged", "Győr", "Pécs", "Miskolc", "Kecskemét",
         "Érd", "Szentendre", "Vác", "Gödöllő", "Eger", "Sopron", "Tata", "Baja", "Zalaegerszeg"]
SCHOOLS = ["Fazekas Mihály Gimnázium", "Radnóti Miklós Gimnázium", "Petőfi Sándor Gimnázium", "Kossuth Lajos Gimnázium",
           "Szent István Gimnázium", "Bolyai János Gimnázium", "Móricz Zsigmond Gimnázium", "Táncsics Mihály Technikum",
           "Kandó Kálmán Technikum", "Arany János Általános Iskola", "Széchenyi István Gimnázium"]
HEARD_WHERE = ["Instagram", "Instagram", "Facebook", "Iskola", "Iskola", "Barát/ismerős", "Barát/ismerős", "TikTok", "Szülő", "Hírlevél"]
HEARD_WHOM = [None, None, "osztálytárs", "informatikatanár", "anya", "nővérem", "barátnőm"]
FOOD = [None, None, None, "vegetáriánus", "laktózmentes", "gluténmentes", "vegán"]
PAST_OTHER = [None, None, "Code Club", "Lego robotika szakkör", "Informatika verseny", "Codecademy"]
PROBLEMS = ["Excelben makrót írtam a családi költségvetéshez.", "Készítettem egy saját weboldalt a kutyámnak.",
            "Scratch-ben csináltam egy játékot.", "Megjavítottam a nagymamám laptopját.", None, None]

# ---------------------------------------------------------------- jelentkezők
applicants = []  # dict-ek
used = set()


def new_applicant(first=None, last=None, email=None, town=None, by=None):
    i = len(applicants) + 1
    while first is None or (last, first) in used:
        first, last = rng.choice(FIRST), rng.choice(LAST)
    used.add((last, first))
    by = by or rng.randint(2008, 2014)
    email = email or f"{slug(first)}.{slug(last)}{rng.randint(1, 99)}@demo.example"
    a = dict(
        id=f"skooldemo_applicant_{i:03d}", firstName=first, lastName=last, birthYear=by,
        schoolName=rng.choice(SCHOOLS), hometown=town or rng.choice(TOWNS),
        phoneNumber=f"+36 30 {rng.randint(100, 999)} {rng.randint(1000, 9999)}", email=email,
        parentFirstName=rng.choice(["Gábor", "Zoltán", "Péter", "Krisztina", "Andrea", "Ildikó", "László"]),
        parentLastName=last, parentMothersName=f"{rng.choice(LAST)} {rng.choice(['Mária', 'Erzsébet', 'Katalin', 'Judit'])}",
        parentAddress=f"{rng.randint(1000, 9999)} {town or 'Budapest'}, Fő utca {rng.randint(1, 120)}.",
        parentEmail=f"szulo.{slug(last)}{rng.randint(1, 99)}@demo.example",
        parentPhone=f"+36 20 {rng.randint(100, 999)} {rng.randint(1000, 9999)}",
        newsletter=rng.random() < 0.6, deletedAt=None, duplicateFlag=False, createdAt=None,
    )
    a["duplicateKey"] = dkey(last, first, email)
    applicants.append(a)
    return a


for _ in range(95):
    new_applicant()

# Duplikátum-párok: azonos név+e-mail (ékezet/kis-nagybetű eltéréssel), külön rekordként.
dup_pairs = []
for src in applicants[3:7]:
    d = new_applicant(first=src["firstName"].upper() if src is applicants[3] else src["firstName"],
                      last=src["lastName"], email=src["email"].upper() if src is applicants[4] else src["email"],
                      town=src["hometown"], by=src["birthYear"])
    used.discard((src["lastName"], src["firstName"]))
    d["duplicateKey"] = src["duplicateKey"]
    src["duplicateFlag"] = d["duplicateFlag"] = True
    dup_pairs.append((src, d))

# Már elvetett pár ("nem duplikáció"): azonos kulcs, de az admin jelölte, hogy két külön ember.
x = applicants[10]
y = new_applicant(first=x["firstName"], last=x["lastName"], email=x["email"], town="Miskolc", by=x["birthYear"] + 3)
y["duplicateKey"] = x["duplicateKey"]
x["duplicateFlag"] = y["duplicateFlag"] = True
dismissed = tuple(sorted([x["id"], y["id"]]))

# GDPR-törölt jelentkezők
deleted_ids = {applicants[20]["id"], applicants[21]["id"], applicants[22]["id"]}

# ---------------------------------------------------------------- jelentkezések
applications, history, feedbacks = [], [], []
STATUS_MIX_PAST = None


def phase(ev_from, ev_to):
    if ev_to < NOW:
        return "past"
    if ev_from <= NOW:
        return "ongoing"
    return "future"


events_rows = []
pool_regular = applicants[:60]  # visszatérők ebből a körből jönnek
for ei, (name, company, loc, start, days, cap, n_apps, tags, age) in enumerate(EVENTS, 1):
    eid = f"skooldemo_event_{ei:02d}"
    end = start + timedelta(days=days - 1, hours=8)
    mentors = rng.sample(MENTOR_POOL, 3 if cap < 20 else 4)
    events_rows.append(dict(
        id=eid, name=f"[DEMO] {name} {start.year}", **{"from": start}, to=end, companyName=company, location=loc,
        description=f"Demó program: {name.lower()} a(z) {company} támogatásával.", ageRange=age,
        instructor=INSTRUCTORS[ei % len(INSTRUCTORS)], mentors=mentors, tags=tags, capacity=cap,
        createdAt=start - timedelta(days=60),
    ))
    ph = phase(start, end)
    # résztvevők kiválasztása: 40% visszatérő, a többi bárki
    chosen = []
    pool = list(applicants)
    rng.shuffle(pool)
    chosen = rng.sample(pool_regular, int(n_apps * 0.4))
    for a in pool:
        if len(chosen) >= n_apps:
            break
        if a not in chosen:
            chosen.append(a)
    # duplikátum-párok mindkét tagja kerüljön be pár eventbe
    if ei in (2, 4, 8, 9):
        for s, d in dup_pairs:
            if s not in chosen:
                chosen.append(s)
            if d not in chosen and ei in (8, 9):
                chosen.append(d)

    open_from = start - timedelta(days=45)
    received = sorted(open_from + timedelta(minutes=rng.randint(0, 40 * 24 * 60)) for _ in chosen)
    # státuszok: az első `cap` (elbírálás sorrendje) kerül be, a többi várólista / elutasítva
    order = list(range(len(chosen)))
    rng.shuffle(order)
    for rank, idx in enumerate(order):
        a = chosen[idx]
        r = rng.random()
        if ph == "future":
            if rank < cap * 0.5:
                st = "accepted"
            elif rank < cap:
                st = "applied"
            elif r < 0.6:
                st = "waitlisted"
            else:
                st = "applied"
            if r < 0.05:
                st = "rejected"
        else:
            if rank < cap:
                if ph == "past":
                    st = "attended" if r > 0.1 else "accepted"  # 10% nem jelent meg
                else:
                    st = "attended" if r > 0.3 else "accepted"
            else:
                st = "waitlisted" if r < 0.5 else "rejected"
        aid = f"skooldemo_application_{ei:02d}_{idx + 1:03d}"
        if a["createdAt"] is None or received[idx] < a["createdAt"]:
            a["createdAt"] = received[idx]
        is_del = a["id"] in deleted_ids
        applications.append(dict(
            id=aid, receivedAt=received[idx], createdAt=received[idx], eventId=eid, applicantId=a["id"],
            foodPreference=None if is_del else rng.choice(FOOD),
            heardFromWhere=None if is_del else rng.choice(HEARD_WHERE),
            heardFromWhom=None if is_del else rng.choice(HEARD_WHOM),
            solvedProblem=None if is_del else rng.choice(PROBLEMS),
            pastExpInProg=None if is_del else rng.choice([None, "Scratch", "Python alapok", "HTML/CSS", "Semmi"]),
            pastParticipationOther=None if is_del else rng.choice(PAST_OTHER),
            pastParticipationSkool=any(x["applicantId"] == a["id"] for x in applications),
            pastParticipationSkoolDesc=None, comment=None if is_del else rng.choice([None, None, None, "Barátnőmmel együtt jönnék, ha lehet.", "Késve tudok érkezni az első napon."]),
            companyAwareness=rng.random() < 0.4, status=st, sourceKey=f"skooldemo|{aid}",
        ))
        # változásnapló az elbírált státuszokra
        if st != "applied":
            t = min(start - timedelta(days=rng.randint(3, 10)), NOW - timedelta(days=1))
            history.append(("application", "status", "applied", "accepted" if st == "attended" else st, aid, t))
            if st == "attended":
                history.append(("application", "status", "accepted", "attended", aid, end))

    # visszajelzések lezárt / folyamatban lévő (rész-) programokhoz
    if ph != "future":
        n_att = sum(1 for x in applications if x["eventId"] == eid and x["status"] == "attended")
        n_part = int(n_att * (0.75 if ph == "past" else 0.3))
        mood = [0.3, -0.6, 0.6, 0.1, -0.2, 0.4, -0.1, 0.5, 0.2, 0, 0.3, -0.3, 0.1, 0.4, 0.2][ei - 1]  # eventenként eltérő hangulat
        for k in range(n_part):
            def sc(bias=0.0):
                return max(1, min(5, round(rng.gauss(3.9 + mood + bias, 0.9))))
            ans = {f: sc() for f in ["s01KnowsTechJobs", "s02HeardCareers", "s03InterestedInTech", "s05TechOpenForGirls",
                                     "s06AppMakingExciting", "s08CanLearnProgramming", "s09AsksInMath",
                                     "s10StartsProgrammingTask", "s11ImaginesTechJob", "s12MeetSkoolees",
                                     "s13LikeMindedGirls", "s14BelongsToCommunity", "s15SkooleeIsCool"]}
            ans["s04ProgrammingForBoys"] = max(1, min(5, round(rng.gauss(1.6, 0.8))))
            ans["s07ProgrammingScary"] = max(1, min(5, round(rng.gauss(2.3 - mood, 1))))
            ans["mentorRating"], ans["instructorRating"], ans["interestChange"] = sc(0.3), sc(), sc(-0.3)
            avg = (ans["mentorRating"] + ans["instructorRating"]) / 2
            rec = "yes" if avg >= 4 else "maybe" if avg >= 3 else "no"
            if ei > 3:  # az első évben még nem volt ajánlási kérdés
                ans["recommend"] = rec
            ans["wouldStudyIt"] = rng.choice(["Igen", "Igen", "Talán", "Nem"])
            ans["feeling"] = rng.choice(["Nagyon jól éreztem magam!", "Jó volt, sokat tanultam.", "Kicsit fárasztó volt, de megérte.",
                                         "Szuper volt a hangulat.", "Elsőre ijesztő volt, aztán belejöttem."])
            ans["favoriteTopic"] = rng.choice(["A saját app elkészítése.", "A csapatmunka.", "AI-os játékgenerálás", "A cégnél tett látogatás.", "A prezentáció a végén."])
            if rng.random() < 0.6:
                ans["wishTopic"] = rng.choice(["Adatbázisok", "Több AI", "Mobil appok", "Kiberbiztonság", "Játékmotorok"])
            if rng.random() < 0.5:
                ans["messageToMentor"] = rng.choice(["Köszönöm a türelmet!", "Te voltál a legjobb mentor!", "Nagyon sokat segítettél."])
            if rng.random() < 0.4:
                ans["messageToGirls"] = rng.choice(["Gyertek, nem kell előtte tudni semmit!", "Megéri, ne féljetek!"])
            if avg < 3 and rng.random() < 0.8:
                ans["instructorImprove"] = rng.choice(["Lassabban magyarázhatna.", "Több szünet kellene.", "Túl gyors volt a tempó."])
            ans["firstTime"] = rng.choice(["Igen", "Igen", "Nem"])
            ans["birthYear"] = rng.randint(2008, 2014)
            ans["settlement"] = rng.choice(["Főváros", "Megyeszékhely", "Város", "Község"])
            search = " ".join(str(ans[k]) for k in ["instructorImprove", "feeling", "favoriteTopic", "wishTopic",
                                                    "messageToMentor", "messageToGirls"] if k in ans).lower()
            sub = end + timedelta(hours=rng.randint(1, 72)) if ph == "past" else NOW - timedelta(hours=rng.randint(1, 20))
            fid = f"skooldemo_feedback_{ei:02d}_p{k + 1:02d}"
            feedbacks.append((fid, eid, "participant", sub, ans, avg, ans.get("recommend"), search))
        if ph == "past":
            for k, m in enumerate(mentors):
                ov = max(1, min(5, round(rng.gauss(4.1 + mood, 0.7))))
                ans = {"overallRating": ov, "wouldMentorAgain": max(1, min(5, ov + rng.choice([0, 0, 1, -1]))),
                       "highlight": rng.choice(["A záró prezentációk.", "Amikor a lányok rájöttek, hogy megy nekik!", "A csapatok lelkesedése."]),
                       "leastLiked": rng.choice(["A wifi akadozott.", "Kevés volt az idő.", "Semmi."]),
                       "motivation": rng.choice(["Szeretném továbbadni, amit tudok.", "Én is így kezdtem.", "Fontosnak tartom a nők arányát az IT-ban."])}
                if ei > 3:
                    ans["recommend"] = "yes" if ov >= 4 else "maybe" if ov == 3 else "no"
                if rng.random() < 0.5:
                    ans["skoolSupport"] = "Előre küldött feladatleírás sokat segítene."
                search = " ".join(str(ans[k]) for k in ["highlight", "leastLiked", "skoolSupport", "motivation"] if k in ans).lower()
                feedbacks.append((f"skooldemo_feedback_{ei:02d}_m{k + 1:02d}", eid, "mentor", end + timedelta(hours=rng.randint(2, 96)),
                                  ans, float(ov), ans.get("recommend"), search))

# törlések naplója
for did in sorted(deleted_ids):
    a = next(x for x in applicants if x["id"] == did)
    t = datetime(2026, 9, 15, 10) + timedelta(days=rng.randint(0, 30))
    a.update(firstName="Törölt", lastName="jelentkező", email=None, phoneNumber=None, schoolName=None,
             parentFirstName=None, parentLastName=None, parentMothersName=None, parentAddress=None,
             parentEmail=None, parentPhone=None, newsletter=False, duplicateKey=None, duplicateFlag=False, deletedAt=t)
    history.append(("applicant", "deletedAt", None, t.isoformat(), did, t))

# akiknek nincs jelentkezése, azokat is megtartjuk (pl. csak hírlevélre feliratkozott import)
for a in applicants:
    a["createdAt"] = a["createdAt"] or datetime(2024, 2, 1, 10)

# ---------------------------------------------------------------- SQL
L = ["-- DEMÓ ADATOK. Generálva: prisma/demo/generate.py — kézzel ne szerkeszd.",
     "-- Minden id 'skooldemo_' előtagú; törlés: prisma/demo/demo-cleanup.sql",
     "BEGIN;", ""]
L.append("-- Biztonsági fék: ha már van demó adat, álljon meg (előbb futtasd a cleanupot).")
L.append("DO $$ BEGIN IF EXISTS (SELECT 1 FROM event WHERE id LIKE 'skooldemo\\_%') OR EXISTS (SELECT 1 FROM applicant WHERE id LIKE 'skooldemo\\_%') "
         "THEN RAISE EXCEPTION 'Már vannak skooldemo_ rekordok, előbb futtasd a demo-cleanup.sql-t'; END IF; END $$;\n")

L.append('INSERT INTO event (id, created_at, updated_at, name, "from", "to", company_name, location, "desc", age_range, instructor, mentors, tags, capacity) VALUES')
L.append(",\n".join(
    f"({q(e['id'])}, {q(e['createdAt'])}, {q(e['createdAt'])}, {q(e['name'])}, {q(e['from'])}, {q(e['to'])}, {q(e['companyName'])}, "
    f"{q(e['location'])}, {q(e['description'])}, {q(e['ageRange'])}, {q(e['instructor'])}, {q(e['mentors'])}, {q(e['tags'])}, {e['capacity']})"
    for e in events_rows) + ";\n")

cols = ["id", "created_at", "updated_at", "first_name", "last_name", "birth_year", "school_name", "hometown", "phone_number", "email",
        "parent_first_name", "parent_last_name", "parent_mothers_name", "parent_address", "parent_email", "parent_phone",
        "newsletter", "deleted_at", "duplicate_key", "duplicate_flag"]
keys = ["id", "createdAt", "createdAt", "firstName", "lastName", "birthYear", "schoolName", "hometown", "phoneNumber", "email",
        "parentFirstName", "parentLastName", "parentMothersName", "parentAddress", "parentEmail", "parentPhone",
        "newsletter", "deletedAt", "duplicateKey", "duplicateFlag"]
L.append(f"INSERT INTO applicant ({', '.join(cols)}) VALUES")
L.append(",\n".join("(" + ", ".join(q(a[k]) for k in keys) + ")" for a in applicants) + ";\n")

L.append(f"INSERT INTO duplicate_dismissal (id, applicant_a_id, applicant_b_id) VALUES ('skooldemo_dismissal_01', {q(dismissed[0])}, {q(dismissed[1])});\n")

cols = ["id", "received_at", "created_at", "updated_at", "event_id", "applicant_id", "food_preference", "heard_from_where", "heard_from_whom",
        "solved_problem", "past_exp_in_prog", "past_participation_other", "past_participation_skool", "past_participation_skool_desc",
        "comment", "company_awareness", "status", "source_key"]
keys = ["id", "receivedAt", "createdAt", "createdAt", "eventId", "applicantId", "foodPreference", "heardFromWhere", "heardFromWhom",
        "solvedProblem", "pastExpInProg", "pastParticipationOther", "pastParticipationSkool", "pastParticipationSkoolDesc",
        "comment", "companyAwareness", "status", "sourceKey"]
L.append(f"INSERT INTO application ({', '.join(cols)}) VALUES")
L.append(",\n".join("(" + ", ".join(
    (q(x[k]) + "::application_status") if k == "status" else q(x[k]) for k in keys) + ")" for x in applications) + ";\n")

L.append("INSERT INTO feedback (id, created_at, event_id, role, submitted_at, answers, overall_score, recommend, search_text, source_key) VALUES")
L.append(",\n".join(
    f"({q(f[0])}, {q(f[3])}, {q(f[1])}, {q(f[2])}::feedback_role, {q(f[3])}, {q(json.dumps(f[4], ensure_ascii=False))}::jsonb, "
    f"{f[5]}, {q(f[6])}, {q(f[7])}, {q('demo|' + f[0])})" for f in feedbacks) + ";\n")

L.append("INSERT INTO history (id, table_name, field_name, old_value, new_value, record_id, created_at) VALUES")
L.append(",\n".join(f"('skooldemo_history_{i:04d}', {q(h[0])}, {q(h[1])}, {q(h[2])}, {q(h[3])}, {q(h[4])}, {q(h[5])})"
                    for i, h in enumerate(history, 1)) + ";\n")
L.append("COMMIT;\n")
(OUT / "demo-seed.sql").write_text("\n".join(L), encoding="utf-8")

(OUT / "demo-cleanup.sql").write_text("""-- A demo-seed.sql által létrehozott összes adat törlése. Csak 'skooldemo_' id-jú rekordokat érint.
BEGIN;

-- Ha a felületen valódi jelentkezőt vontak össze demó jelentkezővel (vagy fordítva), a jelentkezések
-- átkerülhettek; a demó eseményhez tartozó jelentkezéseket az event kaszkád viszi.
DELETE FROM history
WHERE record_id LIKE 'skooldemo\\_%'
   OR (table_name = 'event' AND record_id IN (SELECT id FROM event WHERE id LIKE 'skooldemo\\_%'));

-- event_report, event_report_document, application, feedback: ON DELETE CASCADE
DELETE FROM event WHERE id LIKE 'skooldemo\\_%';

-- duplicate_dismissal és a maradék application: ON DELETE CASCADE
DELETE FROM applicant WHERE id LIKE 'skooldemo\\_%';

-- Ellenőrzés: mind 0 legyen
SELECT
  (SELECT count(*) FROM event       WHERE id LIKE 'skooldemo\\_%') AS events,
  (SELECT count(*) FROM applicant   WHERE id LIKE 'skooldemo\\_%') AS applicants,
  (SELECT count(*) FROM application WHERE id LIKE 'skooldemo\\_%') AS applications,
  (SELECT count(*) FROM feedback    WHERE id LIKE 'skooldemo\\_%') AS feedbacks,
  (SELECT count(*) FROM history     WHERE id LIKE 'skooldemo\\_%') AS history;

COMMIT;
""", encoding="utf-8")

# összefoglaló
from collections import Counter
print(f"events={len(events_rows)} applicants={len(applicants)} applications={len(applications)} feedback={len(feedbacks)} history={len(history)}")
for e in events_rows:
    c = Counter(x["status"] for x in applications if x["eventId"] == e["id"])
    n = sum(c.values())
    print(f"  {e['name']:<45} cap={e['capacity']:>2} jel={n:>2} {dict(c)}")
