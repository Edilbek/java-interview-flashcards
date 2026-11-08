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

type Topic = "encapsulation" | "inheritance" | "polymorphism" | "abstraction";

type StudyCard = {
  id: string;
  topic: Topic;
  stuck: boolean;
  prompt: string;
  answer: string;
};

const TOPIC_LABEL: Record<Topic, string> = {
  "encapsulation": "Инкапсуляция",
  "inheritance": "Наследование",
  "polymorphism": "Полиморфизм",
  "abstraction": "Абстракция"
};

const CARDS: StudyCard[] = [
{
  id: "encapsulation",
  topic: "encapsulation",
  stuck: false,
  prompt: "Что такое инкапсуляция на примере счёта?",
  answer: "Поле balanceTyiyn закрыто private. Снаружи нельзя написать account.balanceTyiyn = -1. Баланс меняется только через debit и credit, и там же проверяется, что денег хватает. Инвариант «баланс не отрицательный» живёт в одном месте, а не в каждом вызывающем коде.",
},
{
  id: "why-private",
  topic: "encapsulation",
  stuck: false,
  prompt: "Почему публичное поле хуже метода, даже если метод просто возвращает значение?",
  answer: "Публичное поле позволяет любому коду записать что угодно и обойти проверку. Метод можно позже дополнить проверкой, журналом или ленивой загрузкой, и вызывающие места не переписывают. Поле, которое уже торчит наружу, так закрыть труднее: чужой код уже пишет в него напрямую.",
},
{
  id: "inheritance",
  topic: "inheritance",
  stuck: false,
  prompt: "Что класс получает через extends?",
  answer: "Наследник получает поля и методы родителя и может добавить свои или заменить метод родителя. Отношение читается как «является»: SpecialAccount является Account. Вызов метода, который наследник не переопределил, выполняет тело родителя.",
},
{
  id: "is-a-has-a",
  topic: "inheritance",
  stuck: false,
  prompt: "Когда наследование, а когда поле с другим объектом?",
  answer: "Наследование — «является». Поле — «содержит». TransferService содержит репозиторий, он не является репозиторием, поэтому не пишут extends AccountRepository, если речь о классе сервиса. Репозиторий хранят полем и получают в конструкторе. Неверное «является» потом мешает подставить другой класс.",
},
{
  id: "composition",
  topic: "inheritance",
  stuck: false,
  prompt: "Что такое композиция в TransferService?",
  answer: "Сервис держит внутри себя готовую зависимость, AccountRepository, и делегирует ей работу с базой. Поведение сбора перевода остаётся у сервиса, доступ к строкам — у репозитория. Заменить JDBC-репозиторий на заглушку можно, не плодя наследника сервиса.",
},
{
  id: "polymorphism",
  topic: "polymorphism",
  stuck: false,
  prompt: "Где здесь полиморфизм: AccountRepository accounts = new JdbcAccountRepository()?",
  answer: "Тип переменной — интерфейс, фактический объект — класс JDBC. Вызов accounts.balance(\"A\") выполняет метод того объекта, который реально лежит в куче. Завтра в ту же переменную можно положить заглушку, строка вызова не изменится. Это и есть подстановка разных форм под одним договором.",
},
{
  id: "dispatch",
  topic: "polymorphism",
  stuck: false,
  prompt: "По чему выбирается тело метода при override: по типу переменной в тексте или по объекту?",
  answer: "По фактическому объекту в куче. Переменная может быть объявлена как Account, а указывать на SpecialAccount. Вызов debit пойдёт в debit наследника, если он его переопределил. Компилятор лишь проверяет, что такой метод у объявленного типа есть.",
},
{
  id: "abstraction",
  topic: "abstraction",
  stuck: false,
  prompt: "Что спрятано за интерфейсом AccountRepository?",
  answer: "Способ достать баланс: JDBC, заглушка или что-то ещё. Вызывающий код видит метод balance и не знает про SQL. Абстракция здесь — договор без лишних деталей. Прятать стоит то, что может меняться отдельно от правила перевода.",
},
{
  id: "abstract-vs-iface",
  topic: "abstraction",
  stuck: false,
  prompt: "Когда общая база — абстрактный класс, а когда интерфейс?",
  answer: "Абстрактный класс уместен, если наследникам нужны общие поля и уже написанные методы, и родитель заведомо один. Интерфейс уместен как договор без состояния, и таких договоров у класса может быть несколько. Счёт с общим куском поведения ближе к абстрактному классу. «Умею сохранять» и «умею считать комиссию» — два интерфейса.",
},
{
  id: "one-extends",
  topic: "inheritance",
  stuck: false,
  prompt: "Сколько классов можно указать в extends и сколько интерфейсов в implements?",
  answer: "Класс наследует ровно один класс. Если extends не написан, родитель — Object. Интерфейсов в implements может быть несколько. Поэтому общее поведение с полей часто кладут в один родительский класс, а дополнительные договоры набирают интерфейсами.",
},
{
  id: "override-safety",
  topic: "polymorphism",
  stuck: false,
  prompt: "Что сломается, если в наследнике ошибиться в типе параметра и не поставить @Override?",
  answer: "Получится перегрузка, новый метод, а не замена старого. Вызов с прежним типом аргумента пойдёт в метод родителя. Поведение, которого ждали от наследника, молча не включится. @Override в этом случае не компилируется и показывает, что заменять нечего.",
},
{
  id: "super-call",
  topic: "inheritance",
  stuck: false,
  prompt: "Куда попадают super.debit(amount) и super(id) в конструкторе?",
  answer: "super.debit вызывает тело метода родителя, даже если наследник свой debit уже написал. super(id) вызывает конструктор родителя и обязан быть первой строкой конструктора наследника. Так родитель успевает заполнить свои поля до кода наследника.",
},
{
  id: "cohesion",
  topic: "encapsulation",
  stuck: false,
  prompt: "Что значит, что у класса высокая связность?",
  answer: "Его поля и методы про одну задачу. TransferService проводит перевод. Сборка текста СМС и разбор HTTP — другие задачи, им место в других классах. Класс, в котором лежит и баланс, и отправка почты, и формат JSON, меняют по разным причинам и читают целиком ради любой правки.",
},
{
  id: "coupling",
  topic: "abstraction",
  stuck: false,
  prompt: "Какая связь слабее: сервис знает JdbcAccountRepository или только AccountRepository?",
  answer: "Слабее связь с интерфейсом. Сервис тогда не зависит от SQL, транзакций JDBC и конкретного класса. Его можно собрать с заглушкой. Знание конкретного JdbcAccountRepository тянет за собой детали базы в правило перевода.",
},
{
  id: "behavior-near-data",
  topic: "encapsulation",
  stuck: false,
  prompt: "Почему проверку «денег хватает» кладут в Account.debit, а не копируют в каждый сервис?",
  answer: "Рядом с полем баланса. Иначе каждый новый сценарий списания рискует забыть проверку и записать отрицательный баланс. Сервис перевода решает, какой перевод провести, и вызывает debit. Правило самого счёта остаётся на счёте.",
},
];

type Mode = "all" | "stuck" | "open";

export default function JavaOopFlashcards() {
  const [mode, setMode] = useCanvasState<Mode>("java-oop-mode", "all");
  const [topic, setTopic] = useCanvasState<string>("java-oop-topic", "all");
  const [index, setIndex] = useCanvasState("java-oop-index", 0);
  const [known, setKnown] = useCanvasState<string[]>("java-oop-known", []);
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
        <H1>Карточки ООП</H1>
        <Text tone="secondary">Инкапсуляция, наследование, полиморфизм и абстракция на переводе и счёте.</Text>
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
          options={[{"value": "all", "label": "Все темы"}, {"value": "encapsulation", "label": "Инкапсуляция"}, {"value": "inheritance", "label": "Наследование"}, {"value": "polymorphism", "label": "Полиморфизм"}, {"value": "abstraction", "label": "Абстракция"}]}
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
