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

type Topic = "class" | "access" | "methods" | "types";

type StudyCard = {
  id: string;
  topic: Topic;
  stuck: boolean;
  prompt: string;
  answer: string;
};

const TOPIC_LABEL: Record<Topic, string> = {
  "class": "Класс и объект",
  "access": "Доступ и static",
  "methods": "Методы",
  "types": "Типы"
};

const CARDS: StudyCard[] = [
{
  id: "class-object",
  topic: "class",
  stuck: false,
  prompt: "Чем класс отличается от объекта?",
  answer: "Класс — чертёж: поля и методы. Объект — конкретный экземпляр, созданный через new, он лежит в куче. Account описывает, какие поля есть у счёта. new Account(\"A\", 100_000) создаёт один счёт. Вторым new получится другой объект по тому же чертежу.",
},
{
  id: "field-local",
  topic: "class",
  stuck: false,
  prompt: "Чем поле объекта отличается от локальной переменной?",
  answer: "Поле объявлено в классе и живёт внутри объекта в куче, пока объект достижим. Локальная переменная объявлена внутри метода и лежит в кадре этого вызова. Кадр выбрасывается на return. Поле balanceTyiyn переживёт метод debit, локальный amount нет.",
},
{
  id: "constructor",
  topic: "class",
  stuck: false,
  prompt: "Что такое конструктор и чем он не является методом с возвращаемым типом?",
  answer: "Конструктор вызывается при new и заполняет новый объект. Его имя совпадает с именем класса, возвращаемого типа у него нет. Account(String id, long balance) не возвращает Account отдельно от самого создания. Обычный метод можно вызвать у уже существующего объекта сколько угодно раз.",
},
{
  id: "this-keyword",
  topic: "class",
  stuck: false,
  prompt: "Зачем в конструкторе пишут this.id = id?",
  answer: "Параметр и поле называются одинаково. this — ссылка на объект, который сейчас создаётся. this.id — поле объекта, id без this — аргумент конструктора. Без this присваивание попало бы в аргумент, а поле осталось бы пустым.",
},
{
  id: "one-file",
  topic: "class",
  stuck: false,
  prompt: "Почему публичный класс TransferService лежит в файле TransferService.java?",
  answer: "Имя публичного класса и имя файла совпадают. В одном файле может быть только один public class. Классы без public рядом с ним допустимы, снаружи пакета их не видно. Точка входа ищет класс по имени файла, которое ты передаёшь команде java.",
},
{
  id: "package-import",
  topic: "class",
  stuck: false,
  prompt: "Что делают package и import? Это модуль Ruby?",
  answer: "package объявляет пространство имён, обычно совпадающее с папкой: package com.mbank.transfer. import позволяет писать короткое имя класса из другого пакета. Методов в класс это не подмешивает. Примесь Ruby через include сюда не входит. Модуль Java, файл module-info.java, отдельно решает, какие пакеты jar открывает наружу.",
},
{
  id: "access",
  topic: "access",
  stuck: false,
  prompt: "Кто видит private, публичный член, член без модификатора и protected?",
  answer: "private виден только внутри своего класса. public виден отовсюду. Без слова член виден классам того же пакета, это пакетный доступ. protected виден в своём пакете и в наследниках, даже если наследник в другом пакете. Поле баланса держат private, чтобы снаружи его меняли только методы.",
},
{
  id: "static-method",
  topic: "access",
  stuck: false,
  prompt: "Чем статический метод отличается от метода объекта?",
  answer: "static принадлежит классу. Его вызывают без объекта: Integer.valueOf(100), main у JVM. Внутри него нет this, полей конкретного счёта он не видит. Метод debit без static вызывается у объекта и меняет именно его баланс.",
},
{
  id: "static-field",
  topic: "access",
  stuck: false,
  prompt: "Сколько копий у статического поля?",
  answer: "Одна на весь класс, не на каждый объект. Все счета видят одно и то же статическое поле. Поэтому туда не кладут баланс конкретного клиента. Описание класса лежит в Metaspace, сам объект, если статическое поле на него ссылается, всё равно в куче.",
},
{
  id: "final-ref",
  topic: "access",
  stuck: false,
  prompt: "Что запрещает final у локальной переменной и у поля?",
  answer: "final запрещает новое присваивание этой ячейке. final Account from = ... нельзя потом направить на другой объект. Поля объекта при этом менять можно: from.debit(100) законен, если метод меняет поле внутри. final на поле id значит, что ссылку на строку id после конструктора не заменят.",
},
{
  id: "final-class-method",
  topic: "access",
  stuck: false,
  prompt: "Что даёт final на классе и на методе?",
  answer: "final класс нельзя указать в extends, наследника у него не будет. final метод нельзя заменить в наследнике через override. Это закрывает поведение, на которое уже рассчитывает остальной код. String как раз final.",
},
{
  id: "overload",
  topic: "methods",
  stuck: false,
  prompt: "Что такое перегрузка метода?",
  answer: "Несколько методов с одним именем и разными параметрами. debit(long amount) и debit(long amount, String reason) — перегрузка. Какой вызовется, компилятор выбирает по аргументам в месте вызова. Это не замена метода родителя.",
},
{
  id: "override",
  topic: "methods",
  stuck: false,
  prompt: "Что такое переопределение и зачем @Override?",
  answer: "Наследник объявляет метод с той же сигнатурой, что у родителя, и подставляет своё тело. Вызов через переменную родителя попадёт в метод фактического объекта. @Override просит компилятор проверить, что сигнатура правда совпала. Опечатка в имени без этой пометки создаст второй, новый метод, а старый останется.",
},
{
  id: "void-return",
  topic: "methods",
  stuck: false,
  prompt: "Что означают void и return?",
  answer: "void — метод не отдаёт значение, его вызывают ради действия, как debit. return завершает метод. Если тип не void, return обязан принести значение этого типа. return в void допустим без значения и просто выходит из метода.",
},
{
  id: "main-signature",
  topic: "methods",
  stuck: false,
  prompt: "Какой метод ищет JVM при запуске java TransferApp?",
  answer: "public static void main(String[] args). public, чтобы его можно было вызвать снаружи, static, потому что объекта приложения ещё нет, void, потому что процесс не возвращает объект, String[] args — аргументы командной строки. Имя класса в команде java — это класс, где лежит этот метод.",
},
{
  id: "null-npe",
  topic: "types",
  stuck: false,
  prompt: "Что такое null?",
  answer: "Пустая ссылка: переменная объектного типа не указывает ни на какой объект в куче. Это не объект и не строка \"null\". Вызов метода у такой переменной бросает NullPointerException. У примитива null не бывает, у long всегда есть число.",
},
{
  id: "eight-primitives",
  topic: "types",
  stuck: false,
  prompt: "Какие типы хранят само значение, а не ссылку?",
  answer: "byte, short, int, long, float, double, char, boolean. Локальная переменная такого типа лежит в кадре метода как само число. Деньги держат в long в тыйынах или в BigDecimal. double для денег не берут: 0.1 + 0.2 даёт 0.30000000000000004.",
},
{
  id: "wrapper",
  topic: "types",
  stuck: false,
  prompt: "Зачем существуют Integer и Long, если есть int и long?",
  answer: "Коллекции и generics принимают только объекты. List<long> не компилируется, нужен List<Long>. Компилятор сам упаковывает число в обёртку и достаёт его обратно. У Integer == сравнивает ссылки, и значения от -128 до 127 берутся из кэша.",
},
{
  id: "array-fixed",
  topic: "types",
  stuck: false,
  prompt: "Чем массив Java отличается от Array в Ruby и от ArrayList?",
  answer: "String[] создаётся с фиксированной длиной, добавить элемент сверх неё нельзя. ArrayList внутри держит массив и при нехватке места выделяет новый. Индекса -1, «последний элемент», у обоих нет. Массив тоже объект в куче, даже int[].",
},
{
  id: "string-immutable",
  topic: "types",
  stuck: false,
  prompt: "Почему говорят, что String неизменяема?",
  answer: "После создания символы строки нельзя заменить. toUpperCase и concat возвращают новый объект, старый остаётся прежним. Поэтому строку безопасно держать ключом HashMap: hashCode не съедет. Литералы \"mbank\" ещё и попадают в пул, одинаковые литералы — один объект.",
},
{
  id: "eq-vs-equals",
  topic: "types",
  stuck: false,
  prompt: "Что сравнивает == у примитива и у объекта?",
  answer: "У примитива == сравнивает само число. У объекта == сравнивает ссылки: один ли это объект в куче. Совпадение значения спрашивают через equals. Строки и счета сравнивают equals, если важно содержимое, а не факт, что это та же ссылка.",
},
{
  id: "var-local",
  topic: "types",
  stuck: false,
  prompt: "Что выводит var и где его нельзя поставить?",
  answer: "var у локальной переменной значит: тип возьми у выражения справа. var accounts = new ArrayList<Account>() — это ArrayList<Account>. Поле класса, параметр и ситуацию без правой части var не описывает. Это по-прежнему статическая проверка компилятором, не динамический тип Ruby.",
},
{
  id: "interface-intro",
  topic: "types",
  stuck: false,
  prompt: "Что обязан сделать класс, который пишет implements AccountRepository?",
  answer: "Реализовать все методы интерфейса без тела. Интерфейс задаёт договор, объект по нему создать нельзя. Один класс может реализовать несколько интерфейсов. С Java 8 у интерфейса бывает default-метод с телом, его класс получает, если не заменит своим.",
},
{
  id: "abstract-intro",
  topic: "types",
  stuck: false,
  prompt: "Чем абстрактный класс отличается от обычного?",
  answer: "Абстрактный класс может содержать методы без тела и обычные методы с телом, а также поля. new по нему не вызывают. Наследник обязан реализовать абстрактные методы, иначе он тоже остаётся абстрактным. В отличие от интерфейса, класс наследует только один такой родитель.",
},
{
  id: "enum-status",
  topic: "types",
  stuck: false,
  prompt: "Когда вместо строк берут enum?",
  answer: "Когда значений заведомо конечный набор: статус перевода POSTED, REJECTED, а не произвольный текст. Компилятор не даст присвоить постороннюю строку. У enum есть имя и порядковый номер, сравнивать такие константы можно через ==, потому что каждая константа — один объект.",
},
{
  id: "record-intro",
  topic: "types",
  stuck: false,
  prompt: "Что собирает record AccountKey(String id)?",
  answer: "Неизменяемый носитель данных. Компилятор пишет конструктор, equals, hashCode и toString по компонентам. Для ключа счёта этого достаточно, свой hashCode писать не нужно. record не заменяет сервис с поведением, это данные.",
},
{
  id: "throw-catch",
  topic: "methods",
  stuck: false,
  prompt: "Что происходит в момент throw?",
  answer: "Создаётся объект исключения и выполнение поднимается по кадрам, пока не найдётся catch на этот тип или его родителя. Кадры без catch снимаются. finally выполняется при любом выходе из try. Ближайший аналог в Ruby: raise, rescue, ensure.",
},
{
  id: "try-with-resources",
  topic: "methods",
  stuck: false,
  prompt: "Зачем ресурс объявляют в скобках try?",
  answer: "try (var reader = Files.newBufferedReader(path)) сам вызовет close(), когда блок закончится, в том числе из-за исключения. Класс ресурса реализует AutoCloseable. Раньше закрытие писали в finally, его легко было пропустить.",
},
{
  id: "pass-value",
  topic: "methods",
  stuck: false,
  prompt: "Что именно копируется в параметр метода, если передали Account?",
  answer: "Копируется значение переменной. Для объекта значение — ссылка, поэтому в методе лежит вторая ячейка с тем же адресом. Поля объекта менять видно снаружи. Присваивание account = new Account(...) меняет только ячейку на кадре метода, переменная вызывающего остаётся на старом объекте.",
},
];

type Mode = "all" | "stuck" | "open";

export default function JavaBasicsFlashcards() {
  const [mode, setMode] = useCanvasState<Mode>("java-basics-mode", "all");
  const [topic, setTopic] = useCanvasState<string>("java-basics-topic", "all");
  const [index, setIndex] = useCanvasState("java-basics-index", 0);
  const [known, setKnown] = useCanvasState<string[]>("java-basics-known", []);
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
        <H1>Карточки Java: база языка</H1>
        <Text tone="secondary">Класс, доступ, методы и типы. Колода для прохода с нуля, без повтора всей колоды internals.</Text>
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
          options={[{"value": "all", "label": "Все темы"}, {"value": "class", "label": "Класс и объект"}, {"value": "access", "label": "Доступ и static"}, {"value": "methods", "label": "Методы"}, {"value": "types", "label": "Типы"}]}
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
