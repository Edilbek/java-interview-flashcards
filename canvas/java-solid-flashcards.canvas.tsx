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

type Topic = "overview" | "s" | "o" | "l" | "i" | "d";

type StudyCard = {
  id: string;
  topic: Topic;
  stuck: boolean;
  prompt: string;
  answer: string;
};

const TOPIC_LABEL: Record<Topic, string> = {
  "overview": "Все пять",
  "s": "S",
  "o": "O",
  "l": "L",
  "i": "I",
  "d": "D"
};

const CARDS: StudyCard[] = [
{
  id: "solid-names",
  topic: "overview",
  stuck: false,
  prompt: "Расшифруй SOLID.",
  answer: "S — single responsibility, одна причина для изменения. O — open/closed, расширять без правки старого кода. L — Liskov substitution, наследник умеет стоять там, где ждут родителя. I — interface segregation, узкие интерфейсы вместо одного толстого. D — dependency inversion, зависеть от договора, а не от конкретного класса. Это критерии устройства кода. Компилятор их не проверяет.",
},
{
  id: "s-def",
  topic: "s",
  stuck: false,
  prompt: "В чём одна причина изменения у TransferService?",
  answer: "Сервис меняют, когда меняется правило перевода: как списать, как зачислить, как отказать при нехватке денег. Текст СМС, код HTTP-ответа и вёрстка выписки — другие причины. Их правят, даже если правило перевода не менялось. Если всё это лежит в одном классе, любая из причин заставляет менять и заново проверять перевод.",
},
{
  id: "s-bad",
  topic: "s",
  stuck: false,
  prompt: "Какой класс нарушает single responsibility?",
  answer: "Класс, в котором метод transfer и списывает деньги, и собирает текст пуша, и сам пишет JSON в сокет. Три независимые причины правок сходятся в одном файле. Перевод остаётся в сервисе, текст сообщения собирает отдельный класс, HTTP остаётся в контроллере.",
},
{
  id: "o-def",
  topic: "o",
  stuck: false,
  prompt: "Что значит «открыт для расширения, закрыт для изменения» на комиссии перевода?",
  answer: "Новая комиссия добавляется новым классом, который выполняет уже существующий интерфейс Commission, а не новой веткой if внутри transfer. Старый метод перевода продолжает вызывать commission.calculate(amount) и не обрастает знаниями о каждой новой схеме. Расширение — новый класс. Изменение — правка уже работающего switch.",
},
{
  id: "o-bad",
  topic: "o",
  stuck: false,
  prompt: "Где здесь нарушение open/closed?",
  answer: "В методе, который сам решает схему: if (type.equals(\"CARD\")) ... else if (type.equals(\"SWIFT\")) ... else if (type.equals(\"QR\")). Каждая новая схема — правка этого метода и риск задеть старые ветки. Схема должна приходить снаружи уже как объект со своим calculate.",
},
{
  id: "l-def",
  topic: "l",
  stuck: false,
  prompt: "Что запрещает подстановка Лисков?",
  answer: "Наследник должен выдерживать договор родителя. Код, который держит Account и вызывает debit, не должен ломаться, если вместо базового счёта подставили наследника. Если SavingsAccount.debit всегда бросает «снятие запрещено», хотя Account.debit обещает списать при достаточном балансе, подстановка ломает вызывающий код. Наследник сузил обещание.",
},
{
  id: "l-bad",
  topic: "l",
  stuck: false,
  prompt: "Почему квадрат как наследник прямоугольника — плохой пример подстановки?",
  answer: "У прямоугольника ширину и высоту меняют по отдельности, площадь равна произведению. У квадрата установка ширины обязана поменять и высоту, иначе это уже не квадрат. Код, который у Rectangle увеличил только ширину и проверяет площадь, на Square получит другой результат. Наследник не смог встать на место родителя незаметно.",
},
{
  id: "i-def",
  topic: "i",
  stuck: false,
  prompt: "Зачем дробить толстый интерфейс?",
  answer: "Класс не должен реализовывать методы, которые ему не нужны. Если AccountRepository требует и balance, и sendSms, и renderPdf, JDBC-классу приходится оставлять пустые методы или тащить телефонного провайдера. Отдельные интерфейсы AccountRepository и NotificationSender каждый реализует тот, кому это и есть работа.",
},
{
  id: "i-bad",
  topic: "i",
  stuck: false,
  prompt: "Какой признак, что интерфейс пора делить?",
  answer: "Реализации выбрасывают UnsupportedOperationException из части методов или оставляют их пустыми. Вызывающий код всё равно видит эти методы и может их вызвать. Узкий интерфейс оставляет в договоре только то, что нужно этому сценарию. Вторую способность подключают вторым интерфейсом.",
},
{
  id: "d-def",
  topic: "d",
  stuck: false,
  prompt: "Куда направлен dependency inversion в уже знакомом TransferService?",
  answer: "Сервис зависит от AccountRepository, договора, а не от JdbcAccountRepository. Конкретный класс создаёт контейнер и передаёт его в конструктор. Правило перевода не вызывает new детального класса. Деталь подстраивается под договор, а не договор под JDBC.",
},
{
  id: "d-bad",
  topic: "d",
  stuck: false,
  prompt: "Какая строка внутри сервиса ломает инверсию зависимостей?",
  answer: "AccountRepository accounts = new JdbcAccountRepository(dataSource) прямо в конструкторе или методе сервиса. Сервис сам выбрал деталь и сам её собрал. Тест без базы уже не подставить. Зависимость должна прийти аргументом конструктора, тип аргумента — интерфейс.",
},
{
  id: "which-s",
  topic: "overview",
  stuck: false,
  prompt: "В transfer одновременно меняют баланс, пишут HTTP-статус и форматируют СМС. Какая буква SOLID про это?",
  answer: "S. У метода три причины измениться: правило денег, протокол ответа и текст уведомления. Буква D была бы про new конкретного класса, O — про растущий switch схем, I — про толстый интерфейс.",
},
{
  id: "which-d",
  topic: "overview",
  stuck: false,
  prompt: "Сервис сам делает new JdbcAccountRepository(). Какая буква SOLID про это в первую очередь?",
  answer: "D. Зависимость направлена на конкретный класс, и сервис сам его создаёт. Даже если обязанностей у сервиса одна, деталь базы вшита внутрь. Конструктор с AccountRepository разворачивает эту стрелку.",
},
];

type Mode = "all" | "stuck" | "open";

export default function JavaSolidFlashcards() {
  const [mode, setMode] = useCanvasState<Mode>("java-solid-mode", "all");
  const [topic, setTopic] = useCanvasState<string>("java-solid-topic", "all");
  const [index, setIndex] = useCanvasState("java-solid-index", 0);
  const [known, setKnown] = useCanvasState<string[]>("java-solid-known", []);
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
        <H1>Карточки SOLID</H1>
        <Text tone="secondary">Пять букв на сервисе перевода: что каждая запрещает и какой код её нарушает.</Text>
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
          options={[{"value": "all", "label": "Все темы"}, {"value": "overview", "label": "Все пять"}, {"value": "s", "label": "S"}, {"value": "o", "label": "O"}, {"value": "l", "label": "L"}, {"value": "i", "label": "I"}, {"value": "d", "label": "D"}]}
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
