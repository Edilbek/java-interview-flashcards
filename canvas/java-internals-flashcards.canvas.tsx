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

type Topic = "memory" | "map" | "collections" | "exceptions" | "generics" | "threads" | "gc";

type StudyCard = {
  id: string;
  topic: Topic;
  /** Место, где определение спрашивали отдельно или ответ сначала был неверным. */
  stuck: boolean;
  prompt: string;
  answer: string;
};

const TOPIC_LABEL: Record<Topic, string> = {
  memory: "Память",
  map: "HashMap",
  collections: "Коллекции",
  exceptions: "Исключения",
  generics: "Generics",
  threads: "Потоки",
  gc: "Сборка мусора",
};

const CARDS: StudyCard[] = [
  {
    id: "frame",
    topic: "memory",
    stuck: true,
    prompt: "Что такое кадр метода?",
    answer:
      "Кадр — это лист стека на один вызов метода. На нём лежат параметры и локальные переменные этого вызова. Вызов кладёт лист сверху, return снимает его. Ячейка — одна переменная на листе, кадр — весь лист.",
  },
  {
    id: "ref-heap",
    topic: "memory",
    stuck: false,
    prompt: "Account from = new Account(\"A\", 100_000). Что лежит в from и что лежит в куче?",
    answer:
      "В ячейке from на стеке лежит ссылка, то есть адрес. Сам объект Account с полями id и balance лежит в куче.",
  },
  {
    id: "amount-slot",
    topic: "memory",
    stuck: false,
    prompt: "Где лежит long amount внутри debit и кто освобождает эту ячейку?",
    answer:
      "amount — само число в кадре debit, не объект в куче. Кадр выбрасывается, когда debit возвращается. Сборщик мусора эту ячейку не трогает: он работает с кучей.",
  },
  {
    id: "rebind-print",
    topic: "memory",
    stuck: true,
    prompt: "from указывает на счёт A. rebind делает account = new Account(\"Z\", 0). Что напечатает from.id после вызова?",
    answer:
      "A. В метод скопировали адрес. Присваивание записывает адрес Z в ячейку на листе rebind. Ячейка from лежит на листе main, её эта строка не меняет.",
  },
  {
    id: "why-rebind",
    topic: "memory",
    stuck: true,
    prompt: "Зачем в учебном примере rebind, если from всё равно остаётся на счёте A?",
    answer:
      "Такой метод ничего полезного для вызывающего кода не делает. Его показывают как ловушку: присваивание параметру меняет только локальную копию ссылки. Чтобы заменить объект у вызывающего, новый счёт возвращают и пишут from = switched() уже в main. Чтобы изменить поля того же объекта, пишут в поля, а не в саму переменную.",
  },
  {
    id: "mutate",
    topic: "memory",
    stuck: false,
    prompt: "Метод получает Account и делает account.balanceTyiyn = 0. Что увидит вызывающий код?",
    answer:
      "Баланс 0. В метод скопировали адрес того же объекта в куче. Запись в поле меняет объект, и вызывающий смотрит на него той же ссылкой.",
  },
  {
    id: "integer-cache",
    topic: "memory",
    stuck: false,
    prompt: "Почему Integer 127 == 127 даёт true, а Integer 128 == 128 даёт false?",
    answer:
      "== у объектов сравнивает ссылки. Integer.valueOf кэширует значения от -128 до 127, поэтому обе переменные 127 указывают на один объект. 128 каждый раз создаёт новый объект. equals при этом сравнивает числа и для 128 даёт true.",
  },
  {
    id: "string-pool",
    topic: "memory",
    stuck: false,
    prompt: "Что дадут a == b, a == c и a.equals(c), если a и b это литерал \"mbank\", а c это new String(\"mbank\")?",
    answer:
      "true, false, true. Одинаковые литералы — одна строка из пула. new создаёт отдельный объект, поэтому == ложен. equals сравнивает символы.",
  },
  {
    id: "money",
    topic: "memory",
    stuck: false,
    prompt: "Почему баланс хранят в long (тыйыны) или BigDecimal, а не в double?",
    answer:
      "double хранит двоичную дробь неточно: 0.1 + 0.2 даёт 0.30000000000000004. Деньги считают целыми минимальными единицами или десятичным BigDecimal.",
  },
  {
    id: "jit",
    topic: "memory",
    stuck: false,
    prompt: "Кто исполняет bytecode и что JIT делает с горячим методом?",
    answer:
      "Команда java запускает JVM, и bytecode исполняет JVM. JIT переводит в машинный код методы, которые вызываются часто, а не весь класс сразу при старте.",
  },
  {
    id: "bucket",
    topic: "map",
    stuck: true,
    prompt: "Что такое корзина в HashMap?",
    answer:
      "Корзина — одна ячейка внутреннего массива HashMap. Сама карта — весь массив плюс записи «ключ — значение». hashCode выбирает номер ячейки. В ячейке может лежать цепочка пар: несколько ключей иногда попадают в один номер.",
  },
  {
    id: "lookup-steps",
    topic: "map",
    stuck: true,
    prompt: "Как HashMap ищет значение по ключу?",
    answer:
      "Считает hashCode ключа и по нему выбирает одну ячейку массива, а не обходит всю таблицу. В ячейке пара подходит, только если число, записанное рядом с ней при put, совпало с числом текущего ключа, и дальше либо это тот же объект, либо equals вернул true.",
  },
  {
    id: "equals-hashcode",
    topic: "map",
    stuck: false,
    prompt: "Как делят работу hashCode и equals?",
    answer:
      "hashCode выбирает корзину. equals различает ключи внутри неё. Если a.equals(b), их hashCode обязаны совпасть. Разные объекты могут случайно получить одно число — это коллизия, карта переживёт её через equals.",
  },
  {
    id: "equals-only",
    topic: "map",
    stuck: false,
    prompt: "Класс переопределил equals по id и не написал свой hashCode. put(new Key(\"A\")), затем get(new Key(\"A\")). Что вернётся?",
    answer:
      "null. hashCode из Object считается по конкретному объекту. put и get — два разных объекта, два разных числа, поиск открывает другую ячейку и до equals не доходит.",
  },
  {
    id: "mutate-key",
    topic: "map",
    stuck: true,
    prompt: "В карту положили Card с pan \"1111\" и значением \"active\", затем сделали card.pan = \"2222\". Что вернут get(card), get(new Card(\"1111\")), get(new Card(\"2222\")) и size()?",
    answer:
      "null, null, null и 1. Пара осталась в ячейке, выбранной при put, а рядом записан hash(\"1111\"). get(card) и get(\"2222\") приносят уже hash(\"2222\"), он не совпадает с записанным числом. get(\"1111\") числом совпадает, но equals сравнивает текущий pan \"2222\" с \"1111\". size равен 1: пару не удаляли.",
  },
  {
    id: "equals-not-ref",
    topic: "map",
    stuck: true,
    prompt: "После смены pan на \"2222\" get(new Card(\"1111\")) даёт null. Это потому, что у ключей разные ссылки?",
    answer:
      "Нет, equals у Card сравнивает pan, не ссылки. До изменения два разных объекта с pan \"1111\" как раз находили значение. После изменения в ячейке лежит тот же объект, но его pan уже \"2222\", и сравнение полей не проходит.",
  },
  {
    id: "both-null",
    topic: "map",
    stuck: true,
    prompt: "Почему get(new Card(\"2222\")) тоже null, хотя pan у лежащего ключа уже \"2222\"?",
    answer:
      "Поиск требует сразу два совпадения: номер ячейки и число, сохранённое при put. У пары записан hash(\"1111\"). Ключ \"2222\" приносит другое число, пару пропускают и equals уже не спрашивают. Ключ \"1111\" приносит нужное число, но поля pan уже разные. Подходящего ключа больше нет, значение при этом остаётся в таблице.",
  },
  {
    id: "stored-value",
    topic: "map",
    stuck: true,
    prompt: "map.put(user, \"ok\"), затем user.name = \"bob\". Что лежит в паре как значение и что вернёт map.get(user)?",
    answer:
      "Значение — строка \"ok\". Имя \"bob\" — это поле ключа, get его не возвращает. get(user) вернёт null: текущий hashCode считается от \"bob\", а рядом с парой записан hash(\"ann\"). Это тот же поиск, что containsKey(user), он тоже false. containsValue(\"ok\") при этом true: значения он смотрит без hashCode.",
  },
  {
    id: "string-key",
    topic: "map",
    stuck: false,
    prompt: "Почему String безопасен как ключ HashMap?",
    answer:
      "Строку нельзя изменить: методы вроде toUpperCase возвращают новый объект. hashCode, по которому пару положили, не съезжает. Если поле, входящее в hashCode, переписать после put, пара останется в старой ячейке и get её не найдёт.",
  },
  {
    id: "list-ruby",
    topic: "collections",
    stuck: true,
    prompt: "List в Java — это Array в Ruby?",
    answer:
      "Ближе всего к массиву Ruby стоит ArrayList. List — интерфейс: индекс, порядок, повторы разрешены. String[] — другая вещь: длина задаётся при создании и не растёт. Отрицательного индекса, как arr[-1] в Ruby, у List нет.",
  },
  {
    id: "list-arraylist",
    topic: "collections",
    stuck: true,
    prompt: "Чем List отличается от ArrayList?",
    answer:
      "List — интерфейс, объект из него не создают. ArrayList — класс, который этот интерфейс выполняет: внутри массив, get по индексу читает ячейку сразу. Тот же интерфейс выполняет LinkedList, но get идёт по узлам. Переменная типа List обещает только методы списка.",
  },
  {
    id: "list-get",
    topic: "collections",
    stuck: false,
    prompt: "Почему get(500) у ArrayList на большом списке дешёвый, а у LinkedList дорогой?",
    answer:
      "ArrayList читает ячейку внутреннего массива по номеру. LinkedList хранит цепочку узлов и до 500-го доходит проходом от начала или от конца.",
  },
  {
    id: "hashset-size",
    topic: "collections",
    stuck: false,
    prompt: "В HashSet дважды добавили new Account(\"A\") с equals и hashCode по id. Какой размер?",
    answer:
      "2, если добавили ещё и другой id вроде \"B\". Второй Account(\"A\") совпал по hashCode и equals и был отброшен. HashSet внутри является HashMap: элемент — ключ, значение — заглушка.",
  },
  {
    id: "treemap",
    topic: "collections",
    stuck: false,
    prompt: "Чем TreeMap выбирает место ключа?",
    answer:
      "Сравнением через Comparable или Comparator, не через hashCode. Обход идёт по возрастанию ключа. Один null-ключ допустим в HashMap и недопустим в TreeMap: его не с чем сравнивать.",
  },
  {
    id: "begin-rescue",
    topic: "exceptions",
    stuck: true,
    prompt: "try / catch / finally — это begin / rescue в Ruby?",
    answer:
      "Да, та же схема. begin — try, rescue — catch, ensure — finally, raise — throw. finally выполняется и без исключения, и после catch, и когда исключение ушло выше. Отличие Java: проверяемое исключение вроде IOException компилятор не пропустит без catch или throws. IllegalStateException объявлять не нужно.",
  },
  {
    id: "checked",
    topic: "exceptions",
    stuck: false,
    prompt: "debit бросает IllegalStateException. Обязан ли метод написать throws?",
    answer:
      "Нет. IllegalStateException наследник RuntimeException, это непроверяемое исключение. throws или catch обязательны для проверяемых, например IOException и SQLException.",
  },
  {
    id: "finally-order",
    topic: "exceptions",
    stuck: false,
    prompt: "В try случился throw, есть catch на этот тип и finally. Что выполнится раньше?",
    answer:
      "Сначала тело catch, потом finally, затем код после всего блока. Строки try, стоящие ниже throw, не выполняются.",
  },
  {
    id: "oom",
    topic: "exceptions",
    stuck: false,
    prompt: "Почему OutOfMemoryError обычно не ловят в сервисе перевода?",
    answer:
      "Это Error, поломка самой JVM: память кончилась. Ловить её в бизнес-методе бессмысленно, процесс уже не в состоянии нормально продолжать перевод.",
  },
  {
    id: "generics-plain",
    topic: "generics",
    stuck: true,
    prompt: "Простыми словами: что такое generics?",
    answer:
      "Пометка компилятору, какой тип здесь допустим. List<String> — список строк: число положить нельзя, get возвращает String. В работающей программе пометка стёрта, для JVM это обычный список, а приведение при чтении вставил компилятор.",
  },
  {
    id: "generics-not-only-list",
    topic: "generics",
    stuck: true,
    prompt: "Generics существуют только для List?",
    answer:
      "Нет. Пометку ставят на класс, интерфейс и метод. Map<String, Account> помечает ключ и значение. Свой Box<T> хранит значение типа T. Метод <T> T first(List<T> items) возвращает тот тип, который лежит в переданном списке.",
  },
  {
    id: "generics-specify",
    topic: "generics",
    stuck: true,
    prompt: "Верно ли, что generics просто указывает, какой тип должен быть?",
    answer:
      "Да. Компилятор по этой пометке запрещает чужой тип и не требует ручного приведения при чтении. В JVM пометка уже не хранится: List<String> и List<Integer> — один класс.",
  },
  {
    id: "erasure-same-class",
    topic: "generics",
    stuck: false,
    prompt: "Почему names.getClass() == amounts.getClass() даёт true для List<String> и List<Integer>?",
    answer:
      "Параметр типа стирается при компиляции. В bytecode оба списка — обычный ArrayList. Отдельно «список строк» и «список чисел» JVM не различает.",
  },
  {
    id: "raw-cast",
    topic: "generics",
    stuck: false,
    prompt: "Сырой List raw = names; raw.add(100) выполнился, а names.get(1) бросил ClassCastException. Когда вставилась проверка на String?",
    answer:
      "Компилятор вставил приведение к String на get, не на add сырого списка. Число попало в список в обход проверки, исключение возникло в момент чтения. На такой add компилятор пишет предупреждение unchecked.",
  },
  {
    id: "no-primitive",
    topic: "generics",
    stuck: false,
    prompt: "Почему список тыйынов объявляют List<Long>, а не List<long>?",
    answer:
      "Параметром типа бывает только объект. long — примитив, у него нет объекта в куче. Long — обёртка, число упаковывается в неё автоматически.",
  },
  {
    id: "extends-add",
    topic: "generics",
    stuck: false,
    prompt: "Метод принимает List<? extends Number> и делает items.add(1). Что скажет компилятор?",
    answer:
      "Ошибку компиляции. ? extends Number позволяет читать Number, потому что внутри точно число или его наследник. Класть нельзя: неизвестно, Integer там, Double или другой наследник.",
  },
  {
    id: "race-exists",
    topic: "threads",
    stuck: true,
    prompt: "В Java бывает race condition?",
    answer:
      "Да. Два потока читают и пишут одно поле в куче без замка. В прогоне два потока делали balance++, в поле осталось 109449 вместо 200000. synchronized гонку не отменяет глобально: он закрывает только помеченный участок.",
  },
  {
    id: "ruby-thread",
    topic: "threads",
    stuck: true,
    prompt: "Чем поток Java отличается от Thread в Ruby?",
    answer:
      "Идея одна: отдельная линия выполнения и общие объекты. Thread.new соответствует new Thread(...).start(), join ждёт окончания. Mutex#synchronize соответствует synchronized. В MRI потоки Ruby не выполняют код сразу на двух ядрах, но balance += 1 всё равно рвётся между шагами. В Java потоки идут на разных ядрах одновременно.",
  },
  {
    id: "lost-update",
    topic: "threads",
    stuck: false,
    prompt: "Почему два потока по 100_000 раз делают balance++ и результат может быть меньше 200000?",
    answer:
      "balance++ — это прочитать, прибавить, записать. Оба потока читают одно и то же число, каждый пишет свой результат, вторая запись затирает первую.",
  },
  {
    id: "synchronized-result",
    topic: "threads",
    stuck: false,
    prompt: "Метод deposit помечен synchronized. Какой итог у двух потоков и чего ждёт второй?",
    answer:
      "Итог 200000. synchronized запирает объект на всё время метода. Второй поток ждёт этот замок и входит, когда первый из метода вышел.",
  },
  {
    id: "volatile",
    topic: "threads",
    stuck: false,
    prompt: "Поле balance сделали volatile, balance++ оставили без замка. Пропадут ли потерянные прибавления?",
    answer:
      "Нет. volatile делает отдельную запись видимой другим потокам. «Прочитал, прибавил, записал» он в одно действие не склеивает, прибавления по-прежнему могут теряться.",
  },
  {
    id: "two-accounts",
    topic: "threads",
    stuck: false,
    prompt: "Два перевода идут по разным счетам. У каждого synchronized на методе экземпляра. Мешают ли они друг другу?",
    answer:
      "Нет. Замок метода экземпляра — это сам объект, this. У счетов A и B разные замки, переводы идут одновременно. Два перевода по одному счёту выстраиваются в очередь.",
  },
  {
    id: "why-pool",
    topic: "threads",
    stuck: false,
    prompt: "Почему на каждый входящий платёж не создают свой new Thread?",
    answer:
      "Поток дорогой. Без верхней границы каждый запрос добавляет ещё один, пока не кончится память. Пул создаёт фиксированное число потоков заранее и складывает лишние задачи в очередь.",
  },
  {
    id: "five-tasks",
    topic: "threads",
    stuck: true,
    prompt: "В пуле два потока, пришли пять задач. Куда деваются три лишние?",
    answer:
      "Пул один, рабочих потоков в нём два. Первые две задачи занимают эти потоки. Остальные три стоят в очереди того же пула и стартуют, когда какой-то из двух потоков освободился. Отдельные пулы под них не создаются.",
  },
  {
    id: "then-combine",
    topic: "threads",
    stuck: false,
    prompt: "Зачем balance и owner запускать двумя supplyAsync и склеивать thenCombine?",
    answer:
      "Вызовы независимы, поэтому их выполняют одновременно. thenCombine забирает оба результата, когда готовы и баланс, и владелец. Последовательное чтение заставило бы ждать владельца только после баланса.",
  },
  {
    id: "join",
    topic: "threads",
    stuck: false,
    prompt: "Что делает join у CompletableFuture с потоком, который его вызвал?",
    answer:
      "Блокирует этот поток, пока результат не готов. Это то же ожидание, что await у Promise или Thread#join в Ruby. Пока join ждёт, поток пула сервера занят.",
  },
  {
    id: "reachability",
    topic: "gc",
    stuck: true,
    prompt: "createTemporary создал счёт Z и вернулся. main всё ещё держит счёт A в переменной kept. Кого может забрать сборщик?",
    answer:
      "Z. Его единственная обычная ссылка temp лежала в кадре createTemporary, кадр уже выброшен. A держит kept в кадре main, путь от корня есть, его не трогают. В прогоне окошко на Z стало null, окошко на A показало A.",
  },
  {
    id: "weak-window",
    topic: "gc",
    stuck: true,
    prompt: "Зачем в примере сборки мусора было окошко WeakReference?",
    answer:
      "Чтобы увидеть, жив объект или уже забран. Окошко само корнем не является и объект не удерживает. Обычные стрелки — это temp и kept. На интервью важна достижимость от кадров и статических полей, а не сам класс WeakReference.",
  },
  {
    id: "static-map",
    topic: "gc",
    stuck: false,
    prompt: "Платёжные id складывают в статическую Map и не удаляют. Почему сборщик их не забирает?",
    answer:
      "Статическое поле — корень. Пока запись лежит в этой Map, до неё есть путь, и сборщик обязан считать её живой. Так в Java выглядит утечка: объект не мусор, потому что ссылка всё ещё есть.",
  },
  {
    id: "young-gen",
    topic: "gc",
    stuck: true,
    prompt: "Куда попадает только что созданный объект и почему молодое поколение чистят чаще?",
    answer:
      "Новый объект попадает в молодое поколение. Почти все объекты умирают сразу, поэтому короткая сборка этой области освобождает много места. Кто пережил несколько таких сборок, того переносят в старое поколение. Старое чистят реже.",
  },
  {
    id: "class-init",
    topic: "gc",
    stuck: false,
    prompt: "Когда выполнился static-блок Account и куда попало описание класса?",
    answer:
      "При первом использовании, в прогоне на первом new Account, а не в момент входа в main. Методы и bytecode класса лежат в Metaspace. Сами объекты Account лежат в куче. По умолчанию кучу чистит G1, на время паузы потоки приложения стоят.",
  },
];

type Mode = "all" | "stuck" | "open";

export default function JavaInternalsFlashcards() {
  const [mode, setMode] = useCanvasState<Mode>("mode", "all");
  const [topic, setTopic] = useCanvasState<string>("topic", "all");
  const [index, setIndex] = useCanvasState("index", 0);
  const [known, setKnown] = useCanvasState<string[]>("known-ids", []);
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
        <H1>Карточки Java Internals</H1>
        <Text tone="secondary">
          Вопросы с подготовки к Senior Java: определения, которые разбирали отдельно, и места, где ответ сначала расходился с запуском программы.
        </Text>
      </Stack>

      <Row gap={16}>
        <Stat value={String(CARDS.length)} label="Всего карточек" />
        <Stat value={String(knownCount)} label="Отмечено «помню»" tone="success" />
        <Stat value={String(stuckCount)} label="Где путались" tone="warning" />
      </Row>

      <Row gap={8} wrap>
        <Pill active={mode === "all"} onClick={() => { setMode("all"); setIndex(0); setRevealed(false); }}>
          Все
        </Pill>
        <Pill active={mode === "stuck"} onClick={() => { setMode("stuck"); setIndex(0); setRevealed(false); }}>
          Где путались
        </Pill>
        <Pill active={mode === "open"} onClick={() => { setMode("open"); setIndex(0); setRevealed(false); }}>
          Ещё не помню
        </Pill>
        <Select
          value={topic}
          onChange={(value) => { setTopic(value); setIndex(0); setRevealed(false); }}
          options={[
            { value: "all", label: "Все темы" },
            { value: "memory", label: "Память" },
            { value: "map", label: "HashMap" },
            { value: "collections", label: "Коллекции" },
            { value: "exceptions", label: "Исключения" },
            { value: "generics", label: "Generics" },
            { value: "threads", label: "Потоки" },
            { value: "gc", label: "Сборка мусора" },
          ]}
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
                  <Text tone="tertiary" size="small">
                    Ответ скрыт. Сначала сформулируй его сам.
                  </Text>
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
          <Text tone="secondary">
            Либо все они отмечены как знакомые, либо фильтр слишком узкий. Сними «Ещё не помню» или сбрось отметки.
          </Text>
        </Stack>
      )}

      <Row>
        <Button
          variant="ghost"
          onClick={() => {
            setKnown([]);
            setIndex(0);
            setRevealed(false);
          }}
        >
          Сбросить отметки
        </Button>
      </Row>
    </Stack>
  );
}
