import psycopg2
from faker import Faker
import random as rand


###############################################
############### DATABASE CONFIG ###############
###############################################

connection_params = {
    "dbname": "app_db",
    "user": "admin",
    "password": "admin123",
    "host": "172.17.112.1",
    "port": 5432,
}

connection = psycopg2.connect(**connection_params)

cursor = connection.cursor()

cursor.execute("SELECT 1")
result = cursor.fetchone()
if result and result[0] == 1:
    print("✅Подключение успешно!")
else:
    print("❌Ошибка подключения:")
    exit(1)

###############################################
############## GENERATING CONFIG ##############
###############################################

USERS_COUNT = 20
PROJECTS_COUNT = 20

USERS_IN_PROJECT_MIN = 1
USERS_IN_PROJECT_MAX = 5

PARSING_JOB_PER_USER_ROLE_MIN = 3
PARSING_JOB_PER_USER_ROLE_MAX = 10

PARSING_LINKS_PER_PARSING_JOB_MIN = 10
PARSING_LINKS_PER_PARSING_JOB_MAX = 30

INIT_2_IN_PROGRESS_PERCENT = 0.8
INIT_2_COLLECTING_LINKS_PERCENT = 0.8
COLLECTING_LINKS_2_LINKS_COLLECTED_PERCENT = 0.5
LINKS_COLLECTED_2_IN_PROGRESS_PERCENT = 0.9
IN_PROGRESS_2_PAUSED_PERCENT = 0.1
IN_PROGRESS_2_ERROR_PERCENT = 0.1
IN_PROGRESS_2_PARSING_DONE_PERCENT = 0.6
PARSING_DONE_2_CREATING_REPORT_PERCENT = 0.8
CREATING_REPORT_2_DONE_PERCENT = 0.8

FEEDBACK_OBJECTS_PER_PARSING_JOB = 500

CARD_OBJECTS_PER_PARSING_JOB_MIN = 0
CARD_OBJECTS_PER_PARSING_JOB_MAX = 5

LIKED_CARDS_PERCENT = 0.3


###############################################
############### GENERATING DATA ###############
###############################################
LOOPS_COUNT = 20
for i in range(1, LOOPS_COUNT + 1):
    print("LOOP: ", i, "/", LOOPS_COUNT, sep="")
    fake = Faker("ru_RU")

    def make_unique(value: str):
        return value + "_" + fake.uuid4()

    def gen_unique_email():
        email = fake.email()
        email_parts = email.split("@")
        return email_parts[0] + "_" + fake.uuid4() + "@" + email_parts[1]

    def gen_unique_url():
        return fake.url() + "/" + fake.uuid4()

    # Generate users:
    class User:
        id: str

        def __init__(self, login: str, name: str, email: str):
            self.login = login
            self.name = name
            self.email = email

    users = [
        User(make_unique(fake.user_name()), fake.name(), gen_unique_email())
        for _ in range(USERS_COUNT)
    ]

    insert_user_query = """
    INSERT INTO app_user (login, name, email)
    VALUES (%s, %s, %s)
    RETURNING id;
    """
    for user in users:
        cursor.execute(insert_user_query, (user.login, user.name, user.email))
        data = cursor.fetchone()
        user.id = data[0]
        print("Inserted user with id:", user.id)

    connection.commit()

    # Generate projects

    class Project:
        id: str
        owner_id: str

        def __init__(self, name, description):
            self.name = name
            self.description = description

    projects = [
        Project(make_unique("project"), fake.text()) for _ in range(PROJECTS_COUNT)
    ]

    insert_project_query = """
    INSERT INTO project (name, description)
    VALUES (%s, %s)
    RETURNING id;
    """
    insert_project_owner_query = """
    INSERT INTO user_per_project (user_id, project_id, user_role)
    VALUES (%s, %s, 'project_owner');
    """
    for project in projects:
        cursor.execute(insert_project_query, (project.name, project.description))
        data = cursor.fetchone()
        project.id = data[0]
        print("Inserted project with id:", project.id)
        user_owner_id = fake.random_element(users).id
        cursor.execute(insert_project_owner_query, (user_owner_id, project.id))
        project.owner_id = user_owner_id
        print(
            "Inserted project owner for user_id",
            user_owner_id,
            "and project_id",
            project.id,
        )

    connection.commit()

    # GENERATE USER PER PROJECT

    class UserPerProject:
        def __init__(self, user_id: int, project_id: int, user_role: str):
            self.user_id = user_id
            self.project_id = project_id
            self.user_role = user_role

    user_per_project: list[UserPerProject] = []

    insert_user_per_project_query = """
    INSERT INTO user_per_project (user_id, project_id, user_role)
    VALUES (%s, %s, %s);
    """
    for project in projects:
        user_per_project.append(
            UserPerProject(project.owner_id, project.id, "project_owner")
        )
        users_in_project = fake.random_int(
            min=USERS_IN_PROJECT_MIN, max=USERS_IN_PROJECT_MAX
        )
        # We already have user owner in project
        for _ in range(1, users_in_project):
            user = fake.random_element(users)
            if project.owner_id == user.id:
                continue
            user_role = fake.random_element(["editor", "guest"])
            cursor.execute(
                insert_user_per_project_query, (user.id, project.id, user_role)
            )
            user_per_project.append(UserPerProject(user.id, project.id, user_role))
            print(
                "Inserted user_role",
                user_role,
                "for user_id",
                user.id,
                "and project_id",
                project.id,
            )

    connection.commit()

    # GENERATE PARSING JOBS

    class SearchByText:
        id: str
        links_collected: bool = False

        def __init__(self, parsing_job_id, search_input, items_limit, items_sort_type):
            self.parsing_job_id = parsing_job_id
            self.search_input = search_input
            self.items_limit = items_limit
            self.items_sort_type = items_sort_type

    class ParsingLink:
        id: str
        is_parsed: bool = False

        def __init__(self, parsing_job_id, url):
            self.parsing_job_id = parsing_job_id
            self.url = url

    class ParsingJob:
        id: str
        status: str = "init"
        parsing_links: list[ParsingLink] = []
        search_by_text: SearchByText | None

        def __init__(
            self,
            user_creator_id,
            project_id,
            name,
            description,
            search_type,
            feedbacks_per_item_limit,
            feedbacks_sort_type,
        ):
            self.user_creator_id = user_creator_id
            self.project_id = project_id
            self.name = name
            self.description = description
            self.search_type = search_type
            self.feedbacks_per_item_limit = feedbacks_per_item_limit
            self.feedbacks_sort_type = feedbacks_sort_type

    parsing_jobs: list[ParsingJob] = []

    SORT_TYPES = ["date_asc", "date_desc", "rating_asc", "rating_desc"]

    insert_parsing_job_query = """
    INSERT INTO parsing_job (user_creator_id, project_id, name, description, search_type, feedbacks_per_item_limit, feedbacks_sort_type)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    RETURNING id;
    """
    for upp in user_per_project:
        if upp.user_role == "guest":
            continue

        parsing_jobs_count = fake.random_int(
            min=PARSING_JOB_PER_USER_ROLE_MIN, max=PARSING_JOB_PER_USER_ROLE_MAX
        )
        for _ in range(parsing_jobs_count):
            parsing_job = ParsingJob(
                user_creator_id=upp.user_id,
                project_id=upp.project_id,
                name=make_unique("parsing_job"),
                description=fake.text(),
                search_type=fake.random_element(["by_links", "by_text"]),
                feedbacks_per_item_limit=(
                    None if rand.random() < 0.3 else fake.random_int(min=1, max=200)
                ),
                feedbacks_sort_type=fake.random_element(SORT_TYPES),
            )
            cursor.execute(
                insert_parsing_job_query,
                (
                    parsing_job.user_creator_id,
                    parsing_job.project_id,
                    parsing_job.name,
                    parsing_job.description,
                    parsing_job.search_type,
                    parsing_job.feedbacks_per_item_limit,
                    parsing_job.feedbacks_sort_type,
                ),
            )
            data = cursor.fetchone()
            parsing_job.id = data[0]
            parsing_jobs.append(parsing_job)
            print("Inserted parsing job with id", parsing_job.id)

    connection.commit()

    # GENERATE PARSING JOB'S INFO OBJECTS

    def gen_parsing_link(parsing_job_id: int) -> ParsingLink:
        return ParsingLink(parsing_job_id, gen_unique_url())

    insert_search_by_text_query = """
    INSERT INTO search_by_text (parsing_job_id, search_input, items_limit, items_sort_type)
    VALUES (%s, %s, %s, %s)
    RETURNING id;
    """
    insert_parsing_link_query = """
    INSERT INTO parsing_link (parsing_job_id, url)
    VALUES (%s, %s)
    RETURNING id;
    """
    for parsing_job in parsing_jobs:
        if parsing_job.search_type == "by_text":
            search_by_text = SearchByText(
                parsing_job.id,
                fake.sentence(),
                fake.random_int(1, 1000),
                fake.random_element(SORT_TYPES),
            )
            cursor.execute(
                insert_search_by_text_query,
                (
                    search_by_text.parsing_job_id,
                    search_by_text.search_input,
                    search_by_text.items_limit,
                    search_by_text.items_sort_type,
                ),
            )
            data = cursor.fetchone()
            search_by_text.id = data[0]
            parsing_job.search_by_text = search_by_text
        elif parsing_job.search_type == "by_links":
            parsing_links_count = fake.random_int(
                min=PARSING_LINKS_PER_PARSING_JOB_MIN,
                max=PARSING_LINKS_PER_PARSING_JOB_MAX,
            )
            for _ in range(parsing_links_count):
                parsing_link = gen_parsing_link(parsing_job.id)
                cursor.execute(
                    insert_parsing_link_query,
                    (parsing_link.parsing_job_id, parsing_link.url),
                )
                data = cursor.fetchone()
                parsing_link.id = data[0]
                parsing_job.parsing_links.append(parsing_link)
                print(
                    "Inserted parsing link with id",
                    parsing_link.id,
                    "for parsing job with id",
                    parsing_job.id,
                )

    connection.commit()

    # MOVE PARSING JOBS TO STATUSES

    parsing_jobs_by_text = [p for p in parsing_jobs if p.search_type == "by_text"]
    parsing_jobs_by_links = [p for p in parsing_jobs if p.search_type == "by_links"]

    update_status_query = """
    UPDATE parsing_job
    SET status = %s
    WHERE id = %s;
    """

    def set_status(parsing_jobs: list[ParsingJob], status: str):
        for parsing_job in parsing_jobs:
            cursor.execute(update_status_query, (status, parsing_job.id))
            parsing_job.status = status
            print("Set", status, "for parsing job with id", parsing_job.id)
        connection.commit()

    set_link_is_parsed_by_id_query = """
    UPDATE parsing_link
    SET is_parsed = TRUE
    WHERE id = %s;
    """

    set_all_links_is_parsed_query = """
    UPDATE parsing_link
    SET is_parsed = TRUE
    WHERE parsing_job_id = %s;
    """

    def set_links_is_parsed_for_parsing_job(
        parsing_job: ParsingJob, parsed_percent: float = 1.0
    ):
        if parsed_percent == 1.0:
            cursor.execute(set_all_links_is_parsed_query, (parsing_job.id,))
            for link in parsing_job.parsing_links:
                link.is_parsed = True
        else:
            parsed_links = fake.random_elements(
                parsing_job.parsing_links,
                int(parsed_percent * len(parsing_job.parsing_links)),
                unique=True,
            )
            for parsed_link in parsed_links:
                cursor.execute(set_link_is_parsed_by_id_query, (parsed_link.id,))
                parsed_link.is_parsed = True
                print("Set link is parsed for parsing_link with id", parsed_link.id)
        connection.commit()

    parsing_jobs_in_progress = fake.random_elements(
        parsing_jobs_by_links,
        int(INIT_2_IN_PROGRESS_PERCENT * len(parsing_jobs_by_links)),
        unique=True,
    )

    set_status(parsing_jobs_in_progress, "in_progress")

    parsing_jobs_collecting_links = fake.random_elements(
        parsing_jobs_by_text,
        int(INIT_2_COLLECTING_LINKS_PERCENT * len(parsing_jobs_by_text)),
        unique=True,
    )

    set_status(parsing_jobs_collecting_links, "collecting_links")

    parsing_jobs_links_collected = fake.random_elements(
        parsing_jobs_collecting_links,
        int(
            COLLECTING_LINKS_2_LINKS_COLLECTED_PERCENT
            * len(parsing_jobs_collecting_links)
        ),
        unique=True,
    )

    set_status(parsing_jobs_links_collected, "links_collected")

    parsing_jobs_links_collected = fake.random_elements(
        parsing_jobs_collecting_links,
        int(
            COLLECTING_LINKS_2_LINKS_COLLECTED_PERCENT
            * len(parsing_jobs_collecting_links)
        ),
        unique=True,
    )

    set_status(parsing_jobs_links_collected, "links_collected")

    parsing_jobs_in_progress_new = fake.random_elements(
        parsing_jobs_links_collected,
        int(LINKS_COLLECTED_2_IN_PROGRESS_PERCENT * len(parsing_jobs_links_collected)),
        unique=True,
    )

    set_status(parsing_jobs_in_progress_new, "in_progress")
    parsing_jobs_in_progress = list(parsing_jobs_in_progress)
    parsing_jobs_in_progress.extend(parsing_jobs_in_progress_new)
    parsing_jobs_for_feedback_objects = parsing_jobs_in_progress.copy()

    parsing_jobs_paused = fake.random_elements(
        parsing_jobs_in_progress,
        int(IN_PROGRESS_2_PAUSED_PERCENT * len(parsing_jobs_in_progress)),
        unique=True,
    )

    set_status(parsing_jobs_paused, "paused")
    for pj in parsing_jobs_paused:
        # set_links_is_parsed_for_parsing_job(pj, 0.6)
        parsing_jobs_in_progress.remove(pj)

    parsing_jobs_error = fake.random_elements(
        parsing_jobs_in_progress,
        int(IN_PROGRESS_2_ERROR_PERCENT * len(parsing_jobs_in_progress)),
        unique=True,
    )

    set_status(parsing_jobs_error, "error")
    for pj in parsing_jobs_error:
        # set_links_is_parsed_for_parsing_job(pj, 0.3)
        parsing_jobs_in_progress.remove(pj)

    parsing_jobs_parsing_done = fake.random_elements(
        parsing_jobs_in_progress,
        int(IN_PROGRESS_2_PARSING_DONE_PERCENT * len(parsing_jobs_in_progress)),
        unique=True,
    )

    set_status(parsing_jobs_parsing_done, "parsing_done")
    for pj in parsing_jobs_parsing_done:
        # set_links_is_parsed_for_parsing_job(pj, 1)
        parsing_jobs_in_progress.remove(pj)

    parsing_jobs_creating_report = fake.random_elements(
        parsing_jobs_parsing_done,
        int(PARSING_DONE_2_CREATING_REPORT_PERCENT * len(parsing_jobs_parsing_done)),
        unique=True,
    )

    set_status(parsing_jobs_creating_report, "creating_report")

    parsing_jobs_done = fake.random_elements(
        parsing_jobs_creating_report,
        int(CREATING_REPORT_2_DONE_PERCENT * len(parsing_jobs_creating_report)),
        unique=True,
    )

    set_status(parsing_jobs_done, "done")

    # GENERATE FEEDBACK OBJECTS
    class FeedbackObject:
        def __init__(
            self,
            parsing_job_id,
            s3_key,
            checksum,
            stars_rating,
            feedback_state,
            feedback_date,
        ):
            self.parsing_job_id = parsing_job_id
            self.s3_key = s3_key
            self.checksum = checksum
            self.stars_rating = stars_rating
            self.feedback_state = feedback_state
            self.feedback_date = feedback_date

    def gen_feedback_object(parsing_job_id: str) -> FeedbackObject:
        return FeedbackObject(
            parsing_job_id,
            fake.uuid4(),
            fake.uuid4(),
            fake.random_int(1, 5),
            fake.random_element(["purchased", "returned", "canceled", "pinned"]),
            fake.date_time(),
        )

    insert_feedback_object_query = """
    INSERT INTO feedback_object (parsing_job_id, s3_key, checksum, stars_rating, feedback_state, feedback_date)
    VALUES (%s, %s, %s, %s, %s, %s);
    """
    fbs = []
    for pj in parsing_jobs_for_feedback_objects:
        fbs.extend(
            [
                gen_feedback_object(pj.id)
                for _ in range(FEEDBACK_OBJECTS_PER_PARSING_JOB)
            ]
        )
    insert_data = [
        (
            fb.parsing_job_id,
            fb.s3_key,
            fb.checksum,
            fb.stars_rating,
            fb.feedback_state,
            fb.feedback_date,
        )
        for fb in fbs
    ]
    print("LOOP: ", i, "/", LOOPS_COUNT, sep="")
    print("Start inserting", len(fbs), "feedback objects...")
    cursor.executemany(
        insert_feedback_object_query,
        insert_data,
    )
    connection.commit()
    print(
        "Inserted",
        len(fbs),
        "feedback objects for parsing job with id",
        pj.id,
    )

    # GENERATE REPORTS
    insert_ai_report_query = """
    INSERT INTO ai_report (parsing_job_id, ai_answer, duration_s)
    VALUES (%s, %s, %s);
    """

    insert_statistical_report_query = """
    INSERT INTO statistical_report (parsing_job_id, feedbacks_count)
    VALUES (%s, %s)
    RETURNING id;
    """

    insert_stars_count_query = """
    INSERT INTO stars_count (statistical_report_id, star_1_count, star_2_count, star_3_count, star_4_count, star_5_count)
    VALUES (%s, %s, %s, %s, %s, %s);
    """

    insert_feedback_states_count_query = """
    INSERT INTO feedback_states_count (statistical_report_id, purchased_count, returned_count, canceled_count)
    VALUES (%s, %s, %s, %s);
    """

    insert_top_5_words_query = """
    INSERT INTO top_5_words (statistical_report_id, word_1, word_1_count, word_2, word_2_count, word_3, word_3_count, word_4, word_4_count, word_5, word_5_count)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """

    for pj in parsing_jobs_done:
        cursor.execute(
            insert_ai_report_query, (pj.id, fake.text(), fake.random_int(1, 60))
        )
        cursor.execute(
            insert_statistical_report_query, (pj.id, FEEDBACK_OBJECTS_PER_PARSING_JOB)
        )
        data = cursor.fetchone()
        statistical_report_id = data[0]
        cursor.execute(
            insert_stars_count_query,
            (
                statistical_report_id,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 5,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 5,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 5,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 5,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 5,
            ),
        )
        cursor.execute(
            insert_feedback_states_count_query,
            (
                statistical_report_id,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 3,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 3,
                FEEDBACK_OBJECTS_PER_PARSING_JOB / 3,
            ),
        )
        cursor.execute(
            insert_top_5_words_query,
            (
                statistical_report_id,
                fake.word(),
                fake.random_int(min=81, max=100),
                fake.word(),
                fake.random_int(min=61, max=80),
                fake.word(),
                fake.random_int(min=51, max=60),
                fake.word(),
                fake.random_int(min=41, max=50),
                fake.word(),
                fake.random_int(min=31, max=40),
            ),
        )
        connection.commit()
        print("Inserted reports for parsing job with id", pj.id)

    # GENERATE CARD OBJECTS
    class CardObject:
        id: str

        def __init__(self, parsing_job_id, s3_key, checksum):
            self.parsing_job_id = parsing_job_id
            self.s3_key = s3_key
            self.checksum = checksum

    insert_card_object_query = """
    INSERT INTO card_object (parsing_job_id, s3_key, checksum)
    VALUES (%s, %s, %s)
    RETURNING id;
    """

    card_objects: list[CardObject] = []
    for pj in parsing_jobs_done:
        card_objects_count = fake.random_int(
            CARD_OBJECTS_PER_PARSING_JOB_MIN, CARD_OBJECTS_PER_PARSING_JOB_MAX
        )
        for _ in range(card_objects_count):
            c = CardObject(pj.id, fake.uuid4(), fake.uuid4())
            cursor.execute(
                insert_card_object_query, (c.parsing_job_id, c.s3_key, c.checksum)
            )
            data = cursor.fetchone()
            c.id = data[0]
            card_objects.append(c)
            print("Inserted card object with id", c.id)
        connection.commit()

    # GENERATE LIKED CARDS

    insert_liked_cards_query = """
    INSERT INTO liked_cards (user_id, card_object_id)
    VALUES (%s, %s);
    """

    liked_cards_count = int(LIKED_CARDS_PERCENT * len(card_objects))
    liked_cards = fake.random_elements(card_objects, liked_cards_count, unique=True)
    for c in liked_cards:
        user_id = fake.random_element(users).id
        cursor.execute(insert_liked_cards_query, (user_id, c.id))

    connection.commit()


cursor.close()
connection.close()

print("✅Generating done!")
