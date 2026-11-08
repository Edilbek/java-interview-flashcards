import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  H1,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Text,
  useCanvasState,
  useEffect,
  useMemo,
  useState,
} from "cursor/canvas";

type Topic = "ioc" | "boot" | "tx" | "data" | "observe";

type StudyCard = {
  id: string;
  topic: Topic;
  stuck: boolean;
  prompt: string;
  answer: string;
};

const TOPIC_LABEL: Record<Topic, string> = {
  "ioc": "Spring IoC",
  "boot": "Boot и запрос",
  "tx": "Транзакции",
  "data": "Spring Data",
  "observe": "Observability"
};

const CARDS: StudyCard[] = [
{
  id: "bean-vs-container",
  topic: "ioc",
  stuck: true,
  prompt: "TransferService — это бин или контейнер? А ApplicationContext?",
  answer: "TransferService — бин, один объект под управлением контейнера. ApplicationContext — сам контейнер. Он создаёт бины и передаёт один в конструктор другого. Второй контейнер он не создаёт.",
},
{
  id: "who-news",
  topic: "ioc",
  stuck: false,
  prompt: "Кто вызывает конструктор TransferService в приложении на Spring?",
  answer: "Контейнер. Он сначала создаёт JdbcAccountRepository, потом TransferService и кладёт репозиторий в его конструктор. В учебном прогоне без Spring эти new писал main.",
},
{
  id: "why-constructor",
  topic: "ioc",
  stuck: false,
  prompt: "Почему репозиторий передают в конструктор, а не создают через new внутри сервиса?",
  answer: "Зависимость приходит снаружи. Сервис не привязан к одной строке new JdbcAccountRepository(). На это место можно передать другую реализацию, в тесте — заглушку без базы.",
},
{
  id: "why-interface",
  topic: "ioc",
  stuck: false,
  prompt: "Зачем конструктор принимает AccountRepository, а не JdbcAccountRepository?",
  answer: "Сервис зависит от договора «умею отдать баланс», а не от JDBC. В тесте передают заглушку с фиксированным балансом. Конкретный класс годился бы только один.",
},
{
  id: "what-bean",
  topic: "ioc",
  stuck: true,
  prompt: "Что такое бин?",
  answer: "Один объект, которым управляет контейнер. TransferService — один бин, репозиторий — другой. Складом всех сервисов бин не является. Репозиторий лежит внутри сервиса только потому, что конструктор его попросил.",
},
{
  id: "singleton-count",
  topic: "ioc",
  stuck: false,
  prompt: "Пришло 1000 платежей. Сколько объектов TransferService создаст контейнер, если область видимости не указана?",
  answer: "Один. По умолчанию бин singleton: один объект на весь ApplicationContext. Тысяча платежей вызывает методы того же экземпляра.",
},
{
  id: "no-request-field",
  topic: "ioc",
  stuck: false,
  prompt: "Почему сумму текущего перевода не кладут в поле singleton-сервиса?",
  answer: "Поле одно на все потоки. Два перевода затрут сумму друг друга, как в гонке balance++. Сумма и id счёта живут в аргументах метода и в локальных переменных. В полях оставляют зависимости, которые не меняются между запросами.",
},
{
  id: "post-construct-order",
  topic: "ioc",
  stuck: false,
  prompt: "Что выполняется раньше: конструктор или @PostConstruct? Когда вызывается @PreDestroy?",
  answer: "Сначала конструктор, зависимости уже переданы. Потом один раз @PostConstruct: прогреть кэш, проверить соединение. @PreDestroy вызывается при остановке контейнера, не в конце каждого платежа.",
},
{
  id: "what-post-construct",
  topic: "ioc",
  stuck: true,
  prompt: "Что такое @PostConstruct?",
  answer: "Пометка на методе, который контейнер вызывает один раз сразу после конструктора. Репозиторий уже лежит в поле. На каждый платёж этот метод не вызывается. Платёж идёт в обычный метод сервиса.",
},
{
  id: "boot-starts",
  topic: "boot",
  stuck: false,
  prompt: "Что создаёт SpringApplication.run до того, как приложение отвечает на запросы?",
  answer: "Контейнер ApplicationContext, бины и встроенный Tomcat, по умолчанию на порту 8080. Стартер spring-boot-starter-web приносит сервер и Jackson.",
},
{
  id: "what-tomcat",
  topic: "boot",
  stuck: true,
  prompt: "Что такое Tomcat в цепочке запроса?",
  answer: "HTTP-сервер на месте Puma. Принимает соединение, берёт поток из пула и вызывает приложение по контракту Servlet. Про @RestController он не знает. Boot запускает его внутри того же процесса.",
},
{
  id: "chain-names",
  topic: "boot",
  stuck: true,
  prompt: "Назови цепочку Spring и соответствие Puma, Rack, middleware, routes.rb, before_action, Model, View.",
  answer: "Tomcat → Servlet → Spring. Tomcat — Puma. Servlet — Rack. Filter chain — middleware. DispatcherServlet и @PostMapping — routes.rb. HandlerInterceptor — before_action. Service и Repository — Model. Jackson — View.",
},
{
  id: "request-body",
  topic: "boot",
  stuck: false,
  prompt: "Откуда берётся аргумент request в методе create с @RequestBody?",
  answer: "Из JSON тела POST /transfers. Jackson собирает из него объект TransferRequest. Кусок пути вроде /accounts/A в этот аргумент не попадает.",
},
{
  id: "path-variable",
  topic: "boot",
  stuck: false,
  prompt: "В GET /accounts/A откуда берётся строка \"A\"?",
  answer: "Из пути. Шаблон /accounts/{id} и аргумент с @PathVariable. Это не тело запроса.",
},
{
  id: "rule-in-service",
  topic: "boot",
  stuck: false,
  prompt: "Почему правило «нельзя увести счёт в минус» пишут в TransferService, а не в контроллере?",
  answer: "Контроллер достаёт данные запроса и вызывает сервис. Правило перевода и запись в базу живут в сервисе, там же @Transactional. Контроллер остаётся тонким.",
},
{
  id: "rollback-runtime",
  topic: "tx",
  stuck: false,
  prompt: "debit уже выполнился, credit бросил IllegalStateException. Что останется в базе по счёту A?",
  answer: "Ничего от этого перевода. IllegalStateException — RuntimeException, обёртка делает rollback. Обе записи базы внутри метода откатываются. Объект в памяти сам назад не откатывается.",
},
{
  id: "what-wrapper",
  topic: "tx",
  stuck: true,
  prompt: "Почему транзакцию открывает обёртка, а не код метода transfer?",
  answer: "В методе написаны только debit и credit. @Transactional сообщает контейнеру, что вокруг вызова нужна транзакция. Контейнер не переписывает тело метода: снаружи лежит другой объект. Он открывает транзакцию, вызывает настоящий transfer, затем делает commit или rollback.",
},
{
  id: "self-invocation",
  topic: "tx",
  stuck: true,
  prompt: "Почему this.transfer(...) из другого метода того же класса не открывает транзакцию?",
  answer: "Контроллер держит ссылку на обёртку. this внутри настоящего объекта указывает на сам объект, обёртка этот вызов не видит. Транзакцию включает только вызов снаружи, через бин.",
},
{
  id: "checked-commit",
  topic: "tx",
  stuck: false,
  prompt: "Метод с @Transactional бросил проверяемое исключение, rollbackFor не указан. Будет commit или rollback?",
  answer: "Commit. По умолчанию откатывают RuntimeException и Error. Проверяемое исключение транзакцию не откатывает, пока не написан rollbackFor = Exception.class. Нехватку денег поэтому бросают как IllegalStateException.",
},
{
  id: "where-transactional",
  topic: "tx",
  stuck: false,
  prompt: "Куда ставят @Transactional и что означает all or nothing?",
  answer: "На публичный метод сервиса, не на контроллер. Вызов снаружи — одна транзакция: commit всех записей базы внутри метода или rollback всех. Обёртка открывает её до входа в метод и закрывает после выхода.",
},
{
  id: "why-spring-data",
  topic: "data",
  stuck: true,
  prompt: "Зачем Spring Data, если репозиторий можно написать классом с EntityManager?",
  answer: "Класс с EntityManager приходится вести самому: каждый поиск — свой метод и текст запроса. Интерфейс, который расширяет JpaRepository, оставляет имя метода. Контейнер создаёт бин и сам выполняет SQL. Свой @Query пишут, когда имени мало, например для join fetch.",
},
{
  id: "find-by-number",
  topic: "data",
  stuck: false,
  prompt: "Кто пишет SQL для findByNumber?",
  answer: "Spring Data. Имя метода читается как «поле number равно аргументу». Отдельного класса с текстом запроса нет. save приходит из JpaRepository и тоже уже реализован.",
},
{
  id: "n-plus-one",
  topic: "data",
  stuck: false,
  prompt: "findAll вернул 50 счетов, цикл вызывает getCards() у каждого. Сколько запросов уйдёт в базу?",
  answer: "51. Один запрос за список счетов и по запросу карт на каждый счёт. @OneToMany по умолчанию ленивое: первое обращение к cards отправляет отдельный SELECT, пока сессия открыта.",
},
{
  id: "join-fetch",
  topic: "data",
  stuck: false,
  prompt: "Что меняет join fetch a.cards в цикле по счетам?",
  answer: "Карты приезжают вместе со счетами в одном запросе. getCards() читает уже загруженный список и в базу больше не ходит. Это аналог includes в Rails.",
},
{
  id: "why-not-eager",
  topic: "data",
  stuck: false,
  prompt: "Почему не пометить cards как EAGER навсегда?",
  answer: "Карты будут грузиться при каждой загрузке счёта, в том числе когда нужен только баланс. Ленивая связь остаётся обычной. Жадную подгрузку указывают в конкретном запросе через join fetch.",
},
{
  id: "open-trace",
  topic: "observe",
  stuck: false,
  prompt: "Клиент говорит, что перевод повис по таймауту. Что открыть: график p99, трейс этого запроса или строку лога без traceId?",
  answer: "Трейс этого запроса. По отрезкам видно, какой шаг съел время: замок в базе, сервис или контроллер. p99 говорит про все переводы сразу. Строка без traceId не собирает путь этого прохода.",
},
{
  id: "counter-no-id",
  topic: "observe",
  stuck: true,
  prompt: "Счётчик ошибок вырос. Почему по нему нельзя найти перевод? Можно ли вместо traceId использовать paymentId?",
  answer: "Счётчик — одно число, без id операций. paymentId и traceId туда не кладут: уникальный id на каждую точку ломает сбор метрик. paymentId — id перевода как операции, по нему ищут лог. traceId — id одного HTTP-запроса, по нему открывают трейс. Повтор может иметь тот же paymentId и новый traceId.",
},
{
  id: "log-fields",
  topic: "observe",
  stuck: true,
  prompt: "Что положить в лог проведённого перевода и что не класть?",
  answer: "Кладут paymentId, Idempotency-Key, id счетов, сумму в тыйынах и исход. Не кладут номер карты целиком, CVV и пароль. traceId в строку попадает из контекста запроса, его фильтр ставит в начале пути.",
},
{
  id: "trace-vs-log",
  topic: "observe",
  stuck: false,
  prompt: "Чем трейс отличается от строки лога?",
  answer: "Лог — одно событие: перевод проведён или отклонён. Трейс — шаги одного запроса под общим traceId: фильтр, контроллер, сервис, UPDATE в базе. Тревога смотрит на метрику, разбор одного платежа идёт по трейсу и логу.",
},
];

type Mode = "all" | "stuck" | "open";

export default function JavaSpringFlashcards() {
  const [mode, setMode] = useCanvasState<Mode>("spring-only-mode", "all");
  const [topic, setTopic] = useCanvasState<string>("spring-only-topic", "all");
  const [index, setIndex] = useCanvasState("spring-only-index", 0);
  const [known, setKnown] = useCanvasState<string[]>("spring-only-known", []);
  const [revealed, setRevealed] = useState(false);

  const filtered = useMemo(() => {
    return CARDS.filter((card) => {
      if (mode === "stuck" && !card.stuck) return false;
      if (mode === "open" && known.includes(card.id)) return false;
      if (topic !== "all" && card.topic !== topic) return false;
      return true;
    });
  }, [mode, topic, known]);

  useEffect(() => {
    if (filtered.length > 0 && index > filtered.length - 1) {
      setIndex(filtered.length - 1);
    }
  }, [filtered.length, index, setIndex]);

  const knownCount = CARDS.filter((card) => known.includes(card.id)).length;
  const stuckCount = CARDS.filter((card) => card.stuck).length;
  const current = filtered.length === 0 ? undefined : filtered[Math.min(index, filtered.length - 1)];

  function go(delta: number) {
    if (filtered.length === 0) return;
    setIndex((i) => (i + delta + filtered.length) % filtered.length);
    setRevealed(false);
  }

  function markKnown() {
    if (!current) return;
    setKnown((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
    setRevealed(false);
    if (mode === "open") {
      if (index >= filtered.length - 1) setIndex(0);
      return;
    }
    setIndex((i) => (i + 1) % filtered.length);
  }

  function markAgain() {
    if (!current) return;
    setKnown((prev) => prev.filter((id) => id !== current.id));
    setRevealed(false);
    go(1);
  }

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>Карточки Spring</H1>
        <Text tone="secondary">IoC, жизненный цикл, путь запроса, транзакции, Spring Data и observability.</Text>
      </Stack>
      <Row gap={16}>
        <Stat value={String(CARDS.length)} label="Всего карточек" />
        <Stat value={String(knownCount)} label="Отмечено «помню»" tone="success" />
        <Stat value={String(stuckCount)} label="Где путались" tone="warning" />
      </Row>
      <Row gap={8} wrap>
        <Pill active={mode === "all"} onClick={() => { setMode("all"); setIndex(0); setRevealed(false); }}>Все</Pill>
        <Pill active={mode === "stuck"} onClick={() => { setMode("stuck"); setIndex(0); setRevealed(false); }}>Где путались</Pill>
        <Pill active={mode === "open"} onClick={() => { setMode("open"); setIndex(0); setRevealed(false); }}>Ещё не помню</Pill>
        <Select
          value={topic}
          onChange={(value) => { setTopic(value); setIndex(0); setRevealed(false); }}
          options={[{"value": "all", "label": "Все темы"}, {"value": "ioc", "label": "Spring IoC"}, {"value": "boot", "label": "Boot и запрос"}, {"value": "tx", "label": "Транзакции"}, {"value": "data", "label": "Spring Data"}, {"value": "observe", "label": "Observability"}]}
        />
      </Row>
      {current ? (
        <Stack gap={12}>
          <Card size="lg">
            <CardHeader trailing={current.stuck ? <Pill active>Разбирали отдельно</Pill> : <Pill>База</Pill>}>
              {TOPIC_LABEL[current.topic]}
            </CardHeader>
            <CardBody>
              <Stack gap={14}>
                <Text weight="semibold">{current.prompt}</Text>
                {revealed ? (
                  <Stack gap={10}>
                    <Divider />
                    <Text>{current.answer}</Text>
                  </Stack>
                ) : (
                  <Text tone="tertiary" size="small">Ответ скрыт. Сначала сформулируй его сам.</Text>
                )}
              </Stack>
            </CardBody>
          </Card>
          <Row gap={8} align="center" wrap>
            <Button variant="secondary" onClick={() => setRevealed((open) => !open)}>
              {revealed ? "Скрыть ответ" : "Показать ответ"}
            </Button>
            <Button variant="primary" onClick={markKnown}>Помню</Button>
            <Button variant="ghost" onClick={markAgain}>Ещё раз</Button>
            <Button variant="ghost" onClick={() => go(-1)}>Назад</Button>
            <Button variant="ghost" onClick={() => go(1)}>Дальше</Button>
            <Text tone="tertiary" size="small">
              {Math.min(index, filtered.length - 1) + 1} из {filtered.length}
              {known.includes(current.id) ? " · уже отмечена" : ""}
            </Text>
          </Row>
        </Stack>
      ) : (
        <Stack gap={8}>
          <Text weight="semibold">В этом наборе карточек не осталось.</Text>
          <Text tone="secondary">Сними фильтр или сбрось отметки. В новой колоде пометки «где путались» появятся после разбора.</Text>
        </Stack>
      )}
      <Row>
        <Button variant="ghost" onClick={() => { setKnown([]); setIndex(0); setRevealed(false); }}>
          Сбросить отметки
        </Button>
      </Row>
    </Stack>
  );
}
