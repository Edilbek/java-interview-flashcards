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

type Topic = "postgres" | "index" | "transfer";

type StudyCard = {
  id: string;
  topic: Topic;
  stuck: boolean;
  prompt: string;
  answer: string;
};

const TOPIC_LABEL: Record<Topic, string> = {
  "postgres": "MVCC и блокировки",
  "index": "Индексы",
  "transfer": "Перевод"
};

const CARDS: StudyCard[] = [
{
  id: "mvcc-uncommitted",
  topic: "postgres",
  stuck: false,
  prompt: "T1 уменьшил баланс A, но ещё не сделал COMMIT. Что увидит SELECT перевода T2?",
  answer: "Старое закоммиченное значение. UPDATE создаёт новую версию строки, чужой запрос её не видит, пока нет COMMIT. Читатель не ждёт писателя. Это MVCC.",
},
{
  id: "lost-update-rc",
  topic: "postgres",
  stuck: false,
  prompt: "Два перевода прочитали 1000 и оба записали 900. Почему READ COMMITTED это разрешил?",
  answer: "Оба прочитали одну и ту же уже закоммиченную версию 1000: ни один ещё не сделал COMMIT. Уровень по умолчанию не склеивает чужое чтение и чужую запись в одно действие. Второй COMMIT затирает результат первого. Один UPDATE SET balance = balance - 100 уменьшает ту версию, которая есть в момент команды.",
},
{
  id: "for-update",
  topic: "postgres",
  stuck: true,
  prompt: "Что делает SELECT ... FOR UPDATE для второго перевода?",
  answer: "Первая транзакция запирает прочитанные строки до своего COMMIT или ROLLBACK. Вторая на этой строке ждёт и не читает старый баланс. После COMMIT она видит уже новое значение, после ROLLBACK — прежнее.",
},
{
  id: "why-lock-order",
  topic: "postgres",
  stuck: true,
  prompt: "Почему счета запирают в одном порядке по id, а не «сначала отправитель»?",
  answer: "Разный порядок даёт deadlock: один держит A и ждёт B, другой держит B и ждёт A. Общий порядок по возрастанию id разрешает ждать только более поздний счёт. Вторая транзакция стоит в очереди на меньший id и не держит замок, который нужен первой. Круга нет.",
},
{
  id: "idempotent-retry",
  topic: "transfer",
  stuck: false,
  prompt: "Клиент прислал тот же Idempotency-Key после таймаута. Почему деньги не спишутся второй раз?",
  answer: "Сервис находит уже сохранённый перевод по этому ключу и возвращает его результат, новых записей нет. Уникальный индекс на ключе не даст вставить второй перевод, даже если два одинаковых запроса пришли одновременно.",
},
{
  id: "lock-both",
  topic: "transfer",
  stuck: true,
  prompt: "Зачем в одной транзакции запирать оба счёта и именно в порядке id?",
  answer: "Перевод меняет две строки, обе должны остаться стабильными до COMMIT. FOR UPDATE держит их до конца транзакции. Порядок по id не даёт переводам A→B и B→A встать друг напротив друга: оба берут сначала меньший id. Второй ждёт на первом счёте и не запирает второй раньше первого.",
},
{
  id: "ledger",
  topic: "transfer",
  stuck: false,
  prompt: "Зачем писать две строки журнала, если балансы и так обновляются?",
  answer: "Баланс — итог. По числам на счетах уже не восстановить, какой перевод их изменил. Две строки журнала фиксируют списание и зачисление. Их сумма равна нулю. Балансы обновляются в той же транзакции.",
},
{
  id: "sms-after-commit",
  topic: "transfer",
  stuck: false,
  prompt: "СМС не отправилось уже после COMMIT. Откатывается ли перевод?",
  answer: "Нет. Отправка не входит в транзакцию перевода. Иначе сбой СМС откатил бы и деньги. Запись «нужно отправить СМС» сохраняют вместе с переводом, а шлют уже после COMMIT.",
},
{
  id: "seq-scan",
  topic: "index",
  stuck: false,
  prompt: "Что означает Seq Scan в плане поиска счёта по номеру?",
  answer: "Последовательный просмотр. База читает строки таблицы одну за другой и оставляет ту, у которой номер совпал. На миллионе счетов это миллион проверок ради одной строки. Индекс при таком плане не используется.",
},
{
  id: "index-scan",
  topic: "index",
  stuck: false,
  prompt: "Что меняется после Index Scan using account_number_idx?",
  answer: "Индекс — отдельное дерево, ключи в нём лежат по порядку. База спускается по дереву до номера и оттуда читает нужную строку таблицы, а не всю таблицу. Index Cond в плане — это условие, которым искали в дереве. Первичный ключ id уже имеет такой индекс.",
},
{
  id: "explain-analyze",
  topic: "index",
  stuck: false,
  prompt: "Чем EXPLAIN ANALYZE отличается от EXPLAIN?",
  answer: "EXPLAIN только показывает план и оценку планировщика, запрос не выполняется. EXPLAIN ANALYZE выполняет запрос и добавляет фактическое время и число строк. На интервью смотрят тип прохода, Seq Scan или Index Scan, и actual rows.",
},
{
  id: "expression-index",
  topic: "index",
  stuck: false,
  prompt: "Почему WHERE lower(number) = 'a-100' может не использовать индекс по колонке number?",
  answer: "Индекс по number хранит номера как они записаны и в этом порядке их сортирует. Условие number = 'A-100' совпадает с этим порядком. lower(number) сравнивает результат функции, а в дереве ключа 'a-100' нет, там лежит 'A-100'. Для такого запроса индекс строят по тому же выражению: CREATE INDEX ON account (lower(number)).",
},
{
  id: "composite-index",
  topic: "index",
  stuck: false,
  prompt: "Почему для выписки индекс (account_id, created_at), а не (created_at, account_id)?",
  answer: "Запрос звучит как WHERE account_id = 'A' AND created_at >= дата. Слева равенство по счёту, справа диапазон по времени. Составной индекс используют слева направо: сначала точное совпадение, потом диапазон. Если первой колонкой стоит время, поиск всех операций одного счёта по этому индексу уже не идёт так же прямо.",
},
{
  id: "unique-index",
  topic: "index",
  stuck: false,
  prompt: "Зачем уникальный индекс на idempotency_key платежа?",
  answer: "Вторая вставка с тем же ключом получит ошибку базы, даже если два одинаковых запроса пришли одновременно и оба не нашли перевод в начале транзакции. Повторно списать деньги из-за гонки вставки нельзя. Обычный поиск по ключу без UNIQUE такую гонку не закрывает.",
},
];

type Mode = "all" | "stuck" | "open";

export default function JavaPostgresFlashcards() {
  const [mode, setMode] = useCanvasState<Mode>("postgres-only-mode", "all");
  const [topic, setTopic] = useCanvasState<string>("postgres-only-topic", "all");
  const [index, setIndex] = useCanvasState("postgres-only-index", 0);
  const [known, setKnown] = useCanvasState<string[]>("postgres-only-known", []);
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
        <H1>Карточки PostgreSQL</H1>
        <Text tone="secondary">MVCC, блокировки, индексы и проведение перевода в одной базе.</Text>
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
          options={[{"value": "all", "label": "Все темы"}, {"value": "postgres", "label": "MVCC и блокировки"}, {"value": "index", "label": "Индексы"}, {"value": "transfer", "label": "Перевод"}]}
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
