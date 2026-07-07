# pams-app — Лог разработки

## Формат записи
```
### [YYYY-MM-DD] — Краткое описание
- Что сделано
- Что изменено
- Проблемы / решения
- Коммит на англ
- Следующий шаг
```

---
## Коммиты
### [v0.0.0] — Project initialization: Next.js 16 setup, dev rules, checklist, mobile strategy, devlog
### [v0.0.1] — Phase 1: ESLint, Prettier, Zod, logger, env, Prisma schema, server-only
### [v0.0.2] — Phase 2 Backend: auth API, JWT, argon2, bcrypt, rate limiting, middleware
### [v0.0.3] — Phase 2 Frontend: login, register, recover pages, useAuth, OtpInput, PhoneInput; i18n: translation system, en/ru packs, LanguageProvider, custom pack support;  Design system: Syne font, amber accent, dark/light theme, globals.css overhaul; Telegram bot: grammy, OTP via Telegram, SMS fallback, deeplink flow; UI polish: SettingsModal, AuthPattern, AuthBranding, FloatingControls, progress bar; Bugfixes: CSS syntax error, hydration mismatch, dark theme buttons, translations complete;
### [v0.0.4] — DevOps: PM2 ecosystem, Nginx SSE config, GitHub Actions CI/CD, zero-downtime deploy, server setup script
### [v0.0.4] — add settings page with theme, language, notifications controls
### [v0.0.5] — Phase 4: Messages API & Chat UI + Auth middleware fixes
### [v0.0.9] — Phase 4.5, 5, 9: SSE real-time, E2E crypto, user search, auth fixes, OTP cleanup, onboarding redesign
### [v0.1.0] — feat(ui): floating nav, profile card, banner emoji grid, online dot, scrollbar, manifest fix
### [v0.1.1] — feat(auth): rolling session, cookie cleanup on 401, default home page setting
### [v0.1.2] — feat(folders): chat folders, archive, pin, unread badge, context menu, long-press preview
### [v0.1.3] — feat(profile): birth date field — DB migration, API, settings UI with age display
### [v0.1.4] — feat(channels): channel chat, members panel, invite search, role management, leave/delete
### [v0.1.5] — feat(reactions): emoji picker in ChatView, reactions display, toggle with optimistic UI
### [v0.1.6] — feat(notifications): NotificationsCenter with badge, mark read, delete, type icons
### [v0.1.7] — feat(ux): skeletons, ErrorBoundary, EmptyState components; integrate into key pages
### [v0.1.8] — fix: hydration #418, manifest native API, users/me 500 on missing birthDate column, SSR window guard
### [v0.1.912] — feat: ImageCropper overlay fix, React Aria ColorPicker, ProfileSettingsModal, FollowersModal, EmojiPicker with categories/search/history, follow/reaction notifications, privacy API (whoCanSeeLastSeen/whoCanSeeBio), ChatView EmojiPicker integration, PublicProfile useEffect restore, channels implicit any fix, SettingsModal profile tab removed
### [v0.1.912] — fix(public-profile): replace settings button with MoreVertical dropdown (block/report) on other users' profiles; remove standalone block button; fix 400 on /api/users/{uuid} — add UUID lookup support; fix black bars on feed photos — remove maxHeight/objectFit cover; last seen time already displayed via formatLastSeen
### [v0.2.0] — feat: SSE conv_new/user_update events, reply_to_id migration, last message preview, notifications modal, compact context menu, single emoji large render, forward modal with navigation, message bubble ring outline, 10min token refresh
### [v0.2.1] — feat: read receipts API+SSE, Web Push (VAPID+SW+usePush), apiFetch auto-refresh, global search page, admin panel (stats/users/channels/ban/role), SettingsModal redesign, dynamic imports, hotkeys, channels search API
### [v0.2.8] — feat: delete chat confirm modal, sanitize channels/folders, fix admin access
### [v0.2.9] — fix: request spam, delete message with mode, pin message API, notif via SSE
### [v0.3.1] — feat: Sentry monitoring, clear qvor_accounts on logout
### [v0.3.2] — feat(messages): integrate channels/groups into /messages; fix: 403 admin (HMAC verify), encrypted lastMessage, dark theme own messages, dvh mobile height, hashtag search, profile links without @, follow notification gender; feat: NotificationsCenter in desktop sidebar, mobile checklist M0-M6
### [v0.3.3] — feat(nav): admin button in ProfileModal, DoorOpen logout icon, remove avatar ring; feat(profile): followers/following modal always visible, following button opens modal; fix(conversations): chats + button opens UserSearch directly; feat(checklist): desktop app Tauri phase D added
### [v0.4.0] — feat: WebRTC calls (P2P signaling via SSE, IncomingCallModal, ActiveCallView, useWebRTC); feat: voice messages (MediaRecorder, VoiceRecorder, VoicePlayer, POST /api/voice); feat: unread counters (DMs+channels), @mentions highlight+notify, thread API+UI, notification settings, bundle analyzer, Telegram webhook; fix: groups inline with chats, search new users in list, channel click opens chat in /messages, msg-own foreground color, auth redirect; fix: build OOM — NODE_OPTIONS 1536MB, cpus:1, swap 2GB permanent
### [v0.4.1] — feat: hold-to-record voice (lock on swipe up), call confirm modal, real last message preview with sender name in DMs/groups/channels, channel tabs as TG pills (categories+groups+public), avatar upload on channel/group create, category only for channels not groups; fix: Permissions-Policy allow camera+microphone for WebRTC
### [v0.4.2] — feat: sounds (Web Audio API — send/receive/voice-start/cancel/sent, call-connected/ended; MP3 files — ringtone-incoming loop, ringtone-outgoing loop, message-out-chat); feat: voice messages TG-style (real waveform via AnalyserNode, static wave in VoicePlayer, VoiceRecordingBar above input, Send/Mic toggle by text); fix: voice 400 Invalid audio type — accept any audio/*; fix: call buttons order (reject left, accept right), call status (Connecting/Linking/timer/Ended with colored dot); feat: TURN server via NEXT_PUBLIC_TURN_URL/USERNAME/CREDENTIAL env
### [v0.5.0] — fix: WebSocket signaling (httpOnly cookie → /api/auth/ws-token), call ringtone stops on reject/end/handleEnd (stopIncomingRingtone ref), call buttons swapped (green=accept left, red=decline right), myAvatar in ActiveCallView (was showing peer avatar), call minimize to PiP widget, peer avatar centered in audio call, chat persists on reload (URL params ?id= ?channel= ?favorites=1), hard delete messages (mode=all), voice files served via /api/voice/[filename] (fix 404), reply preview truncated (max-w-[200px] line-clamp-1 slice 80), message bubble max-w-[65%], ChannelRow shows lastMessage+unread badge+time, channel avatar upload in settings panel, all hardcoded Russian strings replaced with t() keys (407 translation keys, en+ru in sync), duplicate keys removed from translation files, charAt crash fixed globally (|| "?"), initialScrollDone reset on chat switch, scrollTop=scrollHeight instead of scrollIntoView
### [v0.5.1] — fix(calls): complete WebRTC rewrite — hidden <audio> element for audio calls (no sound fix), remoteStreamRef persists stream before acceptCall (no video fix), renegotiation via offer_update signal when enabling video mid-call (black squares fix), endingRef flag prevents double cleanup on PC disconnect, incomingCallRef syncs state to closures, acceptCall reuses PC from handleOffer instead of creating new one; feat(calls): offer_update signal type added to Zod schema+broker+useSSE+CallProvider; fix(i18n): t() calls wrapped in {} in JSX (were rendering as literal strings), useTranslation added to ContactsModal/MobileNotifSheet/NotificationsModal/ForwardModal/VoiceRecordingBar; fix(502): removed orange accent — uses foreground/background (black/white) matching site design, reads qvor_theme cookie; fix(banned): banned_at migration add_banned_at.sql, login checks banned_at and sets qvor_banned cookie, middleware redirects to /banned; fix(sse): notification.count uses read:false not readAt:null (schema fix, was causing 500); fix(perf): conversations API rewritten as single DISTINCT ON SQL query instead of two unbounded findMany; fix(perf): /api/users/me server-side cache TTL 30s with invalidation on PATCH; fix(perf): apiFetch deduplicates concurrent GET requests; fix(perf): notifications badge via SSE (no polling); feat(seo): robots.ts, sitemap.ts, JSON-LD WebApplication schema, yandex:region=213, geo.region=RU, hreflang ru/en/x-default, per-page metadata layouts; feat(404): not-found.tsx; feat(banned): /banned page with support email; feat(502): static nginx error page with theme support


---

## [2026-04-08] — Фикс спама запросов + удаление/закрепление сообщений

### Сделано

**Спам запросов — устранён:**
- `useMessages` — `loadConversations` больше не зависит от `store.conversationsLoaded` (был цикл: загрузка → изменение стора → пересоздание callback → загрузка)

**JSX синтаксис — исправлен:**
- `NotificationsCenter.tsx` — добавлен отсутствующий закрывающий тег `</div>` для modal wrapper

**Дизайн-система — приведена в соответствие:**
- Все кнопки в `NotificationsCenter.tsx` теперь используют `rounded-xl` вместо `rounded-lg`
- Размер текста timestamp изменён с `text-[10px]` на `text-xs` для лучшей читаемости
- `ConversationList.tsx` — убрана кнопка "chat.personalMessage" для вкладки каналов, изменён placeholder поиска

### Проблемы / решения
- Turbopack build error: "Unexpected token. Did you mean `{'}'}` or `&rbrace;`?" — исправлено добавлением закрывающего тега
- Unterminated regexp literal — исправлено правильной структурой JSX
- Несоответствие дизайн-системе: кнопки использовали `rounded-lg` вместо `rounded-xl` — исправлено
- Слишком мелкий текст timestamp `text-[10px]` — изменено на `text-xs`
- Дизайн боковой панели не соответствовал дизайн-системе — исправлено удалением лишней кнопки для каналов

### Коммит на англ
fix: NotificationsCenter JSX syntax + design compliance, ConversationList UI fixes

**JSX синтаксис — исправлен:**
- `NotificationsCenter.tsx` — добавлен отсутствующий закрывающий тег `</div>` для modal wrapper

**Дизайн-система — приведена в соответствие:**
- Все кнопки в `NotificationsCenter.tsx` теперь используют `rounded-xl` вместо `rounded-lg`
- Размер текста timestamp изменён с `text-[10px]` на `text-xs` для лучшей читаемости
- Успешно проведён цикл сборки Next.js (Turbopack)

### Проблемы / решения
- Turbopack build error: "Unexpected token. Did you mean `{'}'}` or `&rbrace;`?" — исправлено добавлением закрывающего тега
- Unterminated regexp literal — исправлено правильной структурой JSX
- Несоответствие дизайн-системе: кнопки использовали `rounded-lg` вместо `rounded-xl` — исправлено
- Слишком мелкий текст timestamp `text-[10px]` — изменено на `text-xs`

### Коммит на англ
fix: NotificationsCenter JSX syntax error, missing closing div tag + design system compliance
- `useEffect` зависит только от `user?.id` — запускается один раз
- `loadConversations` загружается только если `!store.conversationsLoaded`
- `MobileHotbar` — задержка 2с перед первым запросом, интервал 30с → 60с, зависит от `user?.id`
- `NotificationsCenter` — убран поллинг каждые 30с; счётчик обновляется через SSE `notif` событие
- `notif` добавлен в `SSEEventType` и список прослушиваемых событий

**Удаление сообщения с режимом:**
- `DELETE /api/messages/[id]` — принимает `mode: 'self' | 'all'`
- `mode=all` — soft delete для обоих, SSE `mdel` обоим; только отправитель может
- `mode=self` — запись в `hidden_messages`, SSE `mdel` только себе
- `deleteMessage(id, mode)` в `useMessages`
- `onDeleteMessage(id, mode?)` в `ChatViewProps`

**Закрепление сообщений:**
- `POST /api/messages/[id]/pin` — `mode=self` (только у себя) / `mode=all` (у обоих)
- `DELETE /api/messages/[id]/pin` — открепить
- Таблица `pinned_messages` в миграции
- `GET /api/messages` возвращает `pinnedMessage`
- `pinnedMessage` в `useMessages` и `ChatViewProps`

### Коммит
`fix: request spam (loop in useMessages deps, polling removed); feat: delete message mode self/all, pin message API, notif count via SSE`

---

## [2026-04-08] — Модалька удаления чата + санитизация

### Сделано

**ChatView — подтверждение удаления:**
- Кнопка «Удалить диалог» открывает `showDeleteModal`
- Модалька с двумя вариантами: «Удалить только у себя» (`mode=clear`) и «Удалить у обоих» (`mode=delete`) + описание последствий
- `deleteChat(mode)` — единая функция вместо двух (`clearChat` + `deleteChat`)

**Санитизация расширена:**
- `POST /api/channels` — `name` и `description` через `stripHtml`
- `POST /api/folders` — `name` через `stripHtml`

### Коммит
`feat: delete chat confirm modal with clear/delete modes; sanitize channel name/description and folder name`

---

## [2026-04-08] — Фиксы: админка, редиректы, сообщения, SSE, чекбоксы

### Сделано

**middleware.ts — /admin доступ:**
- `decodeRoleEdge` — фикс base64url декодирования: добавлен padding + валидация роли (`USER`/`SUPER_ADMIN` only)
- Редирект не-админов с `/admin` → `/messages` (раньше был `/` → цикл редиректов)
- `ROLE_SALT` добавлен в `.env.local`

**ChatView — отправленные сообщения видны:**
- `prevMessagesRef` + `useEffect` — при замене оптимистичного ID на реальный переносим запись в `decrypted` Map
- Восстановлена функция `toggleReaction` (была случайно удалена при рефакторинге)

**useSSE — мгновенное переподключение:**
- `MIN_RETRY` 1000ms → 200ms
- `MAX_RETRY` 30s → 15s
- `window.addEventListener('online', ...)` — мгновенное переподключение при восстановлении сети

**globals.css — чекбоксы в тёмной теме:**
- Глобальные CSS для `.dark input[type='checkbox']`: `appearance: none`, видимая рамка, акцентный фон при `checked`, галочка через `::after`

### Коммит
`fix: admin ROLE_SALT + base64url decode, sent messages decrypted map transfer, SSE 200ms reconnect + online event, dark theme checkboxes`

---

## [2026-04-08] — Мгновенная навигация

### Сделано

**`hooks/useAppStore.tsx` — глобальный стор:**
- `conversations` и `channels` живут в React Context между переходами по страницам
- `conversationsLoaded` — флаг первой загрузки
- `syncRefresh(fn)` — `useMessages` регистрирует свой `loadConversations` чтобы prefetch делегировал в него
- `AppStoreProvider` оборачивает всё приложение в `app/layout.tsx`

**`hooks/useMessages.ts`:**
- `conversations` берётся из `AppStore` вместо локального `useState`
- `loading` не показывает скелетон если `conversationsLoaded = true`
- `syncRefresh` регистрирует `loadConversations` в сторе

**`components/AppNav.tsx`:**
- `onMouseEnter` на nav-ссылках — `router.prefetch(href)` + `refreshConversations()`/`refreshChannels()`
- При hover на «Сообщения» данные начинают грузиться заранее

### Коммит
`feat: AppStore global state, instant navigation — conversations persist between routes, prefetch on hover`

---

## [2026-04-08] — Realtime онлайн + тайпинг

### Сделано

**`messages/page.tsx` — синхронизация selectedUser:**
- `useEffect([conversations, selectedUserId])` — при каждом SSE `presence` событии `conversations` обновляется → `selectedUser` автоматически получает актуальные `isOnline`, `lastSeenAt`, `avatarUrl`, `displayName`
- `typingUsers` передан в оба `ConversationList` (desktop + mobile)

**`ChatView.tsx` — хедер:**
- Если `typingUsers.size > 0` → показываем `печатает...` с `animate-pulse` цветом `--accent-brand`
- Иначе — `OnlineStatus` как раньше

**`ConversationList.tsx` — превью диалога:**
- Новый prop `typingUsers?: Set<string>`
- Если `typingUsers.has(conv.user.id)` → показываем `печатает...` вместо превью сообщения
- Иначе — превью как раньше

**Redis — удалён:**
- `lib/redis.ts` удалён
- `lib/sse/broker.ts` — чистый in-memory
- `lib/rate-limit.ts` — чистый in-memory
- `ioredis` убран из `package.json`

### Коммит
`feat: realtime online status sync, typing indicator in chat header and conversation list; revert Redis`

---

## [2026-04-08] — Redis: rate limiting + SSE Pub/Sub

### Сделано

**`lib/redis.ts`:**
- `getRedis()` — singleton ioredis клиент для команд
- `getRedisSub()` — отдельный клиент для subscribe (нельзя использовать один клиент для pub и sub)
- `isRedisEnabled` — `!!REDIS_URL`; без `REDIS_URL` всё работает как раньше
- `globalThis` singleton — выживает hot-reload в dev

**`lib/rate-limit.ts` — Redis sliding window:**
- `INCR key` + `EXPIRE key window` — атомарный счётчик в Redis
- При ошибке Redis — автоматический fallback на in-memory
- Ключ `rl:{type}:{ip}` — шарится между всеми инстансами

**`lib/sse/broker.ts` — Redis Pub/Sub:**
- Канал `sse:events` — все инстансы подписаны на него
- `publish()` — публикует `{ userId, event }` в Redis; каждый инстанс получает и доставляет локальным подписчикам
- При ошибке Redis — `deliverLocal()` напрямую
- `isRedisEnabled = false` — чистый in-memory режим, поведение не меняется

**Конфигурация:**
- `.env.example` — добавлен `REDIS_URL` с пояснением
- `.env.local` — `REDIS_URL` закомментирован, включить при наличии Redis
- `package.json` — `ioredis ^5.6.1`

### Коммит
`feat(redis): ioredis client, sliding window rate limit, Redis Pub/Sub SSE broker, in-memory fallback`

---

## [2026-04-08] — Безопасность: санитизация и CSRF

### Сделано

**XSS — PublicProfile:**
- `dangerouslySetInnerHTML` с `caption.replace(/#tag/)` заменён на `<MarkdownText>` — `MarkdownText` экранирует HTML через `escapeHtml()` перед парсингом markdown, XSS невозможен
- Добавлен импорт `MarkdownText` в `PublicProfile.tsx`

**Серверная санитизация:**
- `lib/utils.ts` — добавлена `stripHtml(str)`: удаляет все HTML-теги через regex `/<[^>]*>/g`, без внешних зависимостей
- `PATCH /api/users/me` — `displayName` и `bio` проходят через `stripHtml` перед сохранением в БД
- `POST /api/photos` — `caption` проходит через `stripHtml`

**CSRF-защита:**
- `middleware.ts` — `checkCsrf(req)`: для мутирующих методов (POST/PATCH/PUT/DELETE) на `/api/*` в production проверяет `Origin` заголовок против `host`; если `Origin` отсутствует — проверяет `Referer`; при несовпадении возвращает 403
- В dev (`NODE_ENV !== 'production'`) проверка пропускается
- `NEXT_PUBLIC_APP_URL` используется как дополнительный разрешённый origin

### Коммит
`security: XSS fix in PublicProfile, CSRF origin check middleware, server-side stripHtml for bio/caption`

### Следующий шаг
- Redis для сессий и rate limiting
- Мониторинг (Sentry)

---

## [2026-04-08] — Быстрое открытие диалогов

### Сделано

**Мгновенный показ данных пользователя при открытии чата:**
- `messages/page.tsx` — `openChat` больше не ждёт `await fetch(/api/users/${id})` перед отображением чата
- Сначала берём данные из `userCacheRef` (внутрисессионный Map) или из `conversations` — чат открывается мгновенно
- `fetch(/api/users/${id})` выполняется фоново и обновляет профиль после открытия
- `loadMessages` и `markAsRead` запускаются параллельно через `Promise.all`

**Реакции встроены в GET /api/messages:**
- `MSG_SELECT` — добавлены `readAt` и `reactions: { select: { emoji, userId } }`
- `groupReactions(raw, viewerId)` — группирует реакции по emoji, считает `count`, определяет `mine`
- `toOrdered(msgs, viewerId)` — типизированный хелпер через `ReturnType<typeof fetchMessages>`
- Убраны N отдельных `GET /api/messages/${id}/reactions` запросов из ChatView

**Инкрементальное декриптование в ChatView:**
- `decryptNew()` — расшифровывает только сообщения, которых ещё нет в `decrypted` Map
- При получении нового сообщения через SSE — расшифровывается только оно, не вся история
- `setDecrypted` обновляет Map инкрементально (`prev => new Map(prev).set(...)`)

### Проблемы / решения
- `TS7006` на `.map(m =>` в route.ts — Prisma теряет тип через `Promise.all` → явный `FetchedMessage = Awaited<ReturnType<typeof fetchMessages>>[number]`

### Коммит
`perf: instant chat open, reactions bundled in messages API, incremental decryption`

### Следующий шаг
- Санитизация user-generated content (DOMPurify)
- Защита от CSRF

---

## [2026-04-06] — Динамические обновления, reply fix, UX улучшения чата

### Сделано

**Критический баг — reply_to_id:**
- Колонка `reply_to_id` отсутствовала в БД — миграция `add_reply_forward_privacy.sql` применяется при деплое через `deploy.sh`
- `MSG_SELECT` расширен: добавлены `replyToId`, `forwardFrom`, `replyTo` (с полем `sender`)
- POST /api/messages теперь возвращает полное сообщение с `sender`, `receiver`, `replyTo`

**SSE новые события:**
- `broker.ts` — добавлены типы `conv_new` (новый диалог) и `user_upd`/`user_update` (обновление профиля)
- `useSSE.ts` — зарегистрированы новые типы событий
- POST /api/messages — определяет первое сообщение (COUNT === 1) и шлёт `conv_new` получателю
- PATCH /api/users/me — при смене `avatarUrl` или `displayName` шлёт `user_upd` всем подключённым

**Динамические обновления в useMessages:**
- `conv_new` — новый диалог появляется мгновенно без перезагрузки страницы
- `user_update` — аватарка и имя обновляются у всех в реальном времени
- `lastMessage` добавлен в тип `Conversation` и обновляется при каждом новом сообщении

**Последнее сообщение в диалогах:**
- `GET /api/conversations` возвращает `lastMessage` (ciphertext последнего сообщения)
- `ConversationList` показывает превью: зашифрованные → «🔒 Зашифровано», plain → текст

**Уведомления — модалка:**
- Кнопка «Выключить уведомления» → «Уведомления» → открывает `NotificationsModal`
- Выбор длительности: 30 мин / 1 час / 8 часов / 24 часа / Навсегда
- При повторном открытии — кнопка «Включить уведомления»

**Контекстное меню сообщений:**
- Убраны текстовые подписи — только иконки с `title` тултипами
- Закрытие по клику вне через `<div className="fixed inset-0 z-10">`
- Разделитель в контекстном меню для «Избранного» убран

**Большой эмодзи:**
- `isSingleEmoji()` — определяет одиночный эмодзи через Unicode regex `\p{Emoji_Presentation}`
- Одиночный эмодзи рендерится как `text-5xl` без пузыря

**Обводка сообщений:**
- Своё сообщение: `ring-1 ring-[--accent-brand]/30`
- Чужое сообщение: `ring-1 ring-border/50`

**Пересылка через модалку:**
- `ForwardModal` — список всех диалогов с поиском
- После пересылки — `router.push('/messages?with={id}')` переход в чат
- Загрузка диалогов при нажатии «Переслать» через `GET /api/conversations`

**Авто-рефреш токена:**
- Интервал изменён с 14 до 10 минут (5-минутный запас до истечения access_token)

### Проблемы / решения
- `lastMessage: string | null` — тип в `ConvItem` и `map` сделан nullable для совместимости с Favorites
- `user_update` handler — `null` → `undefined` конвертация для совместимости с типом `Conversation.user`
- TypeScript 0 ошибок после всех изменений

### Коммит
`feat: SSE conv_new/user_update events, reply_to_id migration, last message preview, notifications modal, compact context menu, single emoji large render, forward modal with navigation, message bubble ring outline, 10min token refresh`

### Следующий шаг
- Статусы прочтения (доставлено/прочитано)
- Виртуализированный список сообщений
- Групповые чаты: channelKey шифрование

---

## [2026-03-29] — Фикс hydration + полные переводы

### Сделано
- Исправлена hydration ошибка — `suppressHydrationWarning` на `<html>` и `<body>`
- Инлайн скрипт темы минифицирован (убраны переносы строк вызывавшие проблемы)
- Полные переводы `ru.json` и `en.json` — добавлены ключи для всех страниц:
  - `login.*`, `register.*`, `recover.*`, `settings.*`, `brand.*`, `steps.*`, `common.*`, `phone.*`
- `recover/page.tsx` — все строки через `t()`
- `register/page.tsx` — STEP_LABELS перенесены внутрь компонента, все строки через `t()`
- `login/page.tsx` — "Забыли пароль?" и OTP статус через `t()`
- `SettingsModal` — заголовок, тема, язык через `t()`
- `PhoneInput` — поиск через `t()`
- `AuthBranding` — лозунг и описание через `t()`
- Лозунг обновлён: "Твои сообщения. / Твои правила. / Твоя крепость."

### Проблемы / решения
- Hydration mismatch на `<html className>` — шрифты Next.js генерируют разные хэши на сервере и клиенте → `suppressHydrationWarning`
- CSS `Unclosed block` — незакрытый `@layer base` + невалидный селектор `[class*='bg-[--accent-brand]']` → перезаписан `globals.css`, `btn-accent` вынесен в `@layer utilities`

### Коммит
`fix(hydration): suppress hydration warning, fix CSS syntax, complete translations`

### Следующий шаг
- Фаза 2: завершить — форма восстановления пароля отмечена выполненной (была пропущена в чеклисте)
- Фаза 3: профиль пользователя + страница настроек

---

## [2026-04-03] — Фаза 3: Профиль пользователя (Backend API)

### Сделано
- **API роуты для профиля:**
  - `GET /api/users/[id]` — публичный профиль по `numericId` или `@username`
  - `GET /api/users/me` — профиль текущего пользователя
  - `PATCH /api/users/me` — обновление профиля (username, displayName, bio)
  - `POST /api/users/me/avatar` — загрузка аватара (локально в `/public/uploads/avatars/`)
  - `POST /api/users/[id]/block` — блокировка пользователя
  - `DELETE /api/users/[id]/block` — разблокировка пользователя

- **Валидация:**
  - Username: 3-20 символов, только буквы/цифры/underscore
  - Display name: 1-50 символов
  - Bio: до 500 символов
  - Avatar: только изображения, макс 5MB

- **Безопасность:**
  - Все роуты защищены `auth` middleware
  - Проверка уникальности username
  - Валидация UUID для user ID
  - Rate limiting наследуется от middleware

- **База данных:**
  - Схема Prisma уже содержит все необходимые поля
  - `numericId` автоинкремент (стартует с 100001 через миграцию)
  - `username` опциональный unique
  - Модель `Block` для блокировки пользователей

### Проблемы / решения
- Загрузка аватаров: пока локально, в продакшене нужно S3/R2
- Поиск пользователей: поддержка `numericId` (число) и `@username` (строка с @)

### Коммит
`feat(profile): user profile API endpoints - get, update, avatar upload, block/unblock`

### Следующий шаг
- Фаза 3 Frontend: страницы профиля, редактирование, индикатор онлайн

---

## [2026-04-03] — Фаза 3: Профиль пользователя (Frontend)

### Сделано
- **Frontend:**
  - Страница публичного профиля `/user/[id]` (поддержка `numericId` и `@username`)
  - Страница своего профиля `/profile`
  - Страница редактирования `/profile/edit`
  - Загрузка аватара с валидацией (макс 5MB, только изображения)
  - Индикатор онлайн статуса
  - Отображение `numericId` и `@username`
  - Кнопки блокировки/разблокировки пользователей

- **API дополнения:**
  - `POST /api/users/me/online` — установка статуса онлайн
  - `DELETE /api/users/me/online` — установка офлайн

- **Компоненты:**
  - `Textarea` компонент добавлен в UI библиотеку
  - Аватар с fallback на инициалы
  - Форма редактирования с валидацией

### Проблемы / решения
- Путь профиля: изменён с `/u/[id]` на `/user/[id]` для лучшей семантики
- Аватары: пока локально, в продакшене нужно перенести на S3/R2
- Онлайн статус: обновляется через API, в будущем можно добавить автоматическое обновление через SSE

### Коммит
`feat(profile): complete user profile frontend - public profile, edit page, avatar upload, online status`

### Дополнение
- Добавлена страница настроек `/settings` с управлением темой, языком, уведомлениями
- Исправлена отметка формы восстановления пароля в чеклисте

### Следующий шаг
- Фаза 4: чат — базовый интерфейс сообщений

---

## [2026-04-03] — Фаза 4: Ядро мессенджера (Backend API)

### Сделано
- **API роуты для сообщений:**
  - `GET /api/messages` — список сообщений с курсорной пагинацией, фильтрацией по собеседнику
  - `POST /api/messages` — отправка сообщения с проверкой блокировок
  - `PATCH /api/messages/[id]` — редактирование сообщения (только отправителем)
  - `DELETE /api/messages/[id]` — мягкое удаление сообщения
  - `GET /api/conversations` — список диалогов с последним временем сообщения

- **Валидация:**
  - Zod схемы для отправки и редактирования сообщений
  - Проверка UUID для ID пользователей и сообщений
  - Валидация ciphertext и IV

- **Безопасность:**
  - Все роуты защищены `auth` middleware
  - Проверка прав на редактирование/удаление (только отправитель)
  - Проверка блокировок перед отправкой
  - Мягкое удаление (deletedAt) вместо полного удаления

- **База данных:**
  - Используется существующая модель Message из Prisma
  - Курсорная пагинация для производительности
  - Индексы на senderId, receiverId, createdAt

### Проблемы / решения
- Курсорная пагинация: используется ID сообщений как курсор для стабильности
- Диалоги: агрегация уникальных собеседников с временем последнего сообщения
- Блокировки: проверка перед отправкой, чтобы заблокированные пользователи не могли писать

### Коммит
`feat(messages): core messaging API with CRUD operations, conversations, pagination`

### Следующий шаг
- Фаза 4 Frontend: список диалогов, экран переписки, поле ввода

---

## [2026-04-03] — Фаза 4: Ядро мессенджера (Frontend)

### Сделано
- **Главная страница чата** (`app/page.tsx`) — основной интерфейс приложения
- **Хук `useMessages`** — управление сообщениями, диалогами, CRUD операциями
- **Компонент `ConversationList`** — список чатов с поиском, аватарами, статусом онлайн
- **Компонент `ChatView`** — экран переписки с сообщениями, вводом, редактированием
- **Адаптивный дизайн** — мобильная и десктопная версии
- **Группировка сообщений по датам** — "Сегодня", "Вчера", дата
- **Временные метки** — время отправки, статус "изменено"
- **UI для редактирования/удаления** — только для своих сообщений

- **Переводы:**
  - Полные переводы для интерфейса чата (en/ru)
  - Временные метки, статусы, сообщения об ошибках

- **Особенности:**
  - Пока без шифрования (mock данные для тестирования)
  - Оптимистичный UI при отправке
  - Пагинация сообщений (курсорная)
  - Поиск по чатам
  - Индикаторы онлайн статуса

### Проблемы / решения
- **Шифрование:** пока отключено для тестирования UI, будет добавлено в фазе 4.5
- **PWA:** адаптивный дизайн для мобильных устройств
- **Производительность:** виртуализация списка не добавлена (пока не нужно)

### Коммит
`feat(chat-frontend): core chat UI with conversations list, message view, input, edit/delete`

### Следующий шаг
- Фаза 4.5: E2E шифрование — ключи, ECDH, AES-256-GCM

---

## [2026-03-29] — UI: дизайн-система, темы, анимации, компоненты

### Сделано
- `globals.css` — палитра oklch, акцент amber/orange, нейтральный primary (чёрный/белый)
- `app/layout.tsx` — шрифт Syne для заголовков, cookie-based тема без flash
- `components/AuthPattern.tsx` — статичный SVG паттерн (сетка + точки), едва заметный
- `components/AuthBranding.tsx` — клиентский компонент брендинга с переводами
- `components/SettingsModal.tsx` — модалка настроек (тема + язык) рядом с заголовком
- `components/FloatingControls.tsx` — глобус + луна в правом нижнем углу (убраны из auth)
- `components/PhoneInput.tsx` — выбор кода страны с флагами и поиском
- `components/OtpInput.tsx` — 6-значный OTP с подсветкой заполненных ячеек
- `components/Logo.tsx` — SVG логотип (геометрический ромб с крестом)
- Прогресс-бар регистрации — кружки с лейблами, линии между шагами, над кнопкой
- `app/(auth)/layout.tsx` — split-screen: брендинг слева, форма справа
- Кнопки — минималистичные `btn-accent` (foreground/background), без оранжевого

### Коммит
`feat(ui): design system, auth layout, components, theme, i18n`

---

## [2026-03-29] — Telegram бот + восстановление аккаунта

### Сделано
- `lib/bot/telegram.ts` — grammy бот, `/start` с токеном привязывает номер к chat_id
- `lib/auth/otp.ts` — OTP через Telegram (primary) + SMS fallback
- `app/api/auth/telegram-link/route.ts` — генерация deeplink для привязки бота
- `app/api/auth/recover/verify-otp/route.ts` — верификация OTP при восстановлении
- `app/api/auth/recover/verify-passphrase/route.ts` — проверка кодовой фразы
- `app/api/auth/recover/reset-password/route.ts` — сброс пароля
- `app/(auth)/recover/page.tsx` — 4-шаговое восстановление: телефон → OTP → фраза → пароль
- `next.config.ts` — автозапуск бота при старте сервера

### Коммит
`feat(telegram): bot OTP, SMS fallback, account recovery flow`

---

## [2026-03-29] — i18n система переводов

### Сделано
- `lib/i18n.ts` — загрузка/сохранение/листинг пакетов, определение языка
- `translations/default/en.json` + `ru.json` — базовые пакеты
- `translations/custom/` — папка для кастомных пакетов
- `app/components/LanguageProvider.tsx` — контекст с `t(key, vars?)`, fallback на en
- `hooks/useTranslation.ts` — хук для компонентов
- `GET /api/i18n/pack/[lang]` — получить пакет
- `GET|POST /api/i18n/packs` — список / создать кастомный пакет
- Интерполяция переменных: `t('login.otpSubtitle', { phone })`

### Коммит
`feat(i18n): translation system, en/ru packs, custom pack API`

---

## [2026-03-29] — Фаза 2 Frontend: Авторизация

### Сделано
- `app/(auth)/login/page.tsx` — вход: телефон + пароль → OTP
- `app/(auth)/register/page.tsx` — регистрация: телефон → OTP → пароль + кодовая фраза
- `components/OtpInput.tsx` — ввод OTP с поддержкой вставки
- `hooks/useAuth.ts` — состояние авторизации, методы login/verifyOtp/logout
- `lib/dev/mock-users.ts` — моковые данные (phone: 79991234567, password: password123, otp: 123456)
- `MOCK_AUTH=true` в `.env.local` — включает мок без БД

### Коммит
`feat(auth-frontend): login, register, recover pages, useAuth hook, mock users`

---

## [2026-03-29] — Фаза 2 Backend: Авторизация

### Сделано
- `lib/schemas/auth.ts` — Zod схемы
- `lib/auth/jwt.ts` — JWT (jose, Edge-совместимый)
- `lib/auth/password.ts` — argon2 (пароль), bcrypt (телефон)
- `lib/auth/otp.ts` — генерация, хранение, верификация OTP
- `lib/auth/cookies.ts` — httpOnly cookies
- `app/api/auth/*` — 6 эндпоинтов + rate limiting
- `middleware.ts` — Edge-совместимый, jose вместо jsonwebtoken

### Коммит
`feat(auth): implement auth API — OTP, register, login, JWT, middleware`

---

## [2026-03-29] — Фаза 1: Фундамент

### Сделано
- ESLint + Prettier со строгими правилами
- `lib/logger.ts`, `.env.example`, `.env.local`
- Prisma + PostgreSQL: схема `users`, `messages`, `channels`, `channel_members`, `blocks`
- `numericId` — автоинкремент с 100001 (SQL миграция)
- `lib/prisma.ts` — singleton с `server-only`

### Коммит
`feat(foundation): setup ESLint, Prettier, Zod, logger, env, Prisma schema`

---

## [2026-03-29] — Инициализация проекта

### Сделано
- Next.js 16 (App Router, TypeScript strict, Tailwind CSS 4)
- Структура: `app/`, `components/`, `hooks/`, `lib/`, `translations/`
- `.amazonq/rules/` — правила кода, чеклист, дизайн, шифрование, мобилка, devlog

### Коммит
`chore(init): bootstrap Next.js 16 project with rules, checklist and devlog`

---

## [2026-04-03] — Исправление ошибок auth middleware (Фаза 3)

### Сделано
- **Создан `middleware/auth.ts`** — централизованная функция аутентификации для API роутов
- **Исправлены импорты** во всех API файлах: `users/me/route.ts`, `users/me/avatar/route.ts`, `users/[id]/block/route.ts`
- **Стандартизирован формат auth** — с `export const GET = auth(...)` на `const user = await auth(request)`
- **Исправлены ошибки логирования** — передача объектов вместо unknown типов
- **Убраны лишние обёртки ошибок** — единый формат ответов API

### Проблемы / решения
- Несогласованные импорты: некоторые файлы импортировали из `@/lib/auth/middleware`, другие из `@/middleware/auth`
- Старый декораторный стиль auth конфликтовал с новым async форматом
- Logger принимал Record<string, unknown>, а получал unknown

### Коммит
`fix(auth): standardize auth middleware imports and usage across all API routes`

### Следующий шаг
- Тестирование фазы 4: отправка сообщений, диалоги, UI чата
- Фаза 4.5: E2E шифрование

---

## [2026-04-03] — Исправление ошибок сборки

### Сделано
- **Исправлен импорт Telegram бота** — убран проблемный импорт из `next.config.ts`
- **Добавлен скрипт запуска бота** — `npm run bot` для отдельного запуска
- **Исправлена TypeScript ошибка** — добавлена типизация параметров в `conversations/route.ts`
- **Обновлены скрипты package.json** — добавлен `dev:with-bot` для параллельного запуска

### Проблемы / решения
- **Модуль не найден:** импорт `'./lib/bot/telegram'` в `next.config.ts` не работал в контексте сборки → убран автозапуск, добавлен отдельный скрипт
- **Implicit any type:** параметр `msg` в forEach не имел типа → добавлена явная типизация `(msg: any)`
- **Middleware warning:** Next.js предупреждает о deprecated `middleware.ts` → оставлено для совместимости

### Коммит
`fix(build): resolve telegram bot import and typescript errors`

### Следующий шаг
- Финальное тестирование сборки
- Подготовка к деплою

---

## [2026-04-08] — Фикс модалов создания групп и каналов

### Сделано
- **Добавлено рендеринг модалов** — `CreateGroupModal` и `CreateChannelModal` теперь рендерится в `ConversationList.tsx`
- **Реализованы функции создания** — `createGroup` и `createChannel` с API вызовами и навигацией к созданным чатам
- **Проверка сборки** — успешная компиляция без ошибок

### Проблемы / решения
- Модалы были определены и состояния управлялись, но не рендерились в JSX → добавлен рендеринг перед закрытием компонента
- Функции `createGroup` и `createChannel` отсутствовали → реализованы по аналогии с `createFolder`

### Коммит
`fix(modals): add missing CreateGroupModal and CreateChannelModal rendering in ConversationList; implement createGroup/createChannel functions with API calls and navigation`

### Следующий шаг
- Тестирование модалов создания групп и каналов
- Проверка навигации после создания

## [2026-04-03] — Доделка Telegram бота для авторизации

### Сделано
- **Автозапуск бота** — добавлен в `next.config.ts` для автоматического запуска при старте сервера
- **Расширенные команды бота:**
  - `/help` — подробная справка с инструкциями
  - `/status` — проверка статуса привязки аккаунта
  - `/unlink` — отвязка аккаунта от Telegram
  - Обработка неизвестных команд с подсказкой
- **Улучшенная привязка:**
  - Проверка на дублирование привязок (один номер — один чат)
  - Лучшие сообщения с форматированием Markdown
  - Обработка ошибок отправки OTP
- **Безопасность и UX:**
  - Валидация контактов (только свой номер телефона)
  - Graceful error handling для всех операций
  - Информативные сообщения об успехе/ошибке

### Проблемы / решения
- **Автозапуск:** бот не запускался автоматически при старте Next.js → добавлен импорт в `next.config.ts`
- **Отсутствие команд:** пользователи не знали, как использовать бота → добавлены `/help`, `/status`, `/unlink`
- **Дублирование привязок:** один номер мог быть привязан к нескольким чатам → добавлена проверка
- **Обработка ошибок:** сбои отправки OTP не логировались → добавлен try/catch с логированием

### Коммит
`feat(telegram-bot): complete Telegram bot for auth with auto-start, commands, and error handling`

### Следующий шаг
- Тестирование полного flow авторизации через Telegram
- Добавление уведомлений о блокировках/разблокировках (опционально)

---

## [2026-04-03] — Переименование PAMS → QVOR + JWT + дизайн-система

### Сделано
- Переименование проекта PAMS → QVOR во всех файлах, переводах, метаданных
- `lib/auth/jwt.ts` — расширен `JwtPayload`: добавлены `userId`, `role`, `username`, `createdAt`
- `prisma/schema.prisma` — добавлены `UserRole` enum (USER / SUPER_ADMIN), поле `role` в модели User
- Обновлены все JWT signing calls: verify-otp, register, refresh, telegram-login
- `middleware/auth.ts` — использует новый `verifyToken`, возвращает `role` в `AuthUser`
- `lib/dev/mock-users.ts` — исправлена синтаксическая ошибка, добавлено поле `role`
- `lib/rate-limit.ts` — заменён Upstash Redis на in-memory rate limiter
- Редизайн страниц авторизации: Syne font, amber accent, прогресс-бар с анимацией галочки
- `PassphraseInput` — поле с show/hide toggle
- `HintInput` — выпадающий список с 7 пресетами подсказок
- Анимация смены темы — View Transitions API, круговое раскрытие от точки клика
- Исправлена ложная анимация темы при навигации (`isFirstApply` ref)
- Тёмная тема: `--border` поднят до `14%` для лучшей видимости

### Коммит
`feat: QVOR rename, JWT enhancement, design system, theme animation, passphrase UI`

---

## [2026-04-03] — Telegram бот v2: TypeScript + PostgreSQL TempStore + прокси

### Сделано
- `scripts/bot.ts` — полная переработка на TypeScript + grammY
- Замена SQLite + Redis на PostgreSQL TempStore (единое хранилище)
- HTTP proxy через `TELEGRAM_PROXY_URL` (HttpsProxyAgent) — сервер не имеет прямого доступа к api.telegram.org
- `/start reg:{token}` — завершение регистрации через TG: бот предлагает поделиться номером
- `lib/bot/send-otp.ts` — рефакторинг: `sendTelegramOtp` возвращает `messageId`, добавлены `deleteTelegramMessage` и `sendTelegramMessage`
- Удаление сообщения с OTP после использования или истечения TTL
- `ecosystem.config.js` — PM2 конфиг: qvor (Next.js) + qvor-bot (tsx scripts/bot.ts)
- `scripts/deploy.sh` — zero-downtime deploy

### Коммит
`feat(bot): TypeScript rewrite, PostgreSQL TempStore, proxy support, OTP message deletion`

---

## [2026-04-03] — Фаза 3: Профиль v2 + онлайн-статус + навбар

### Сделано
- `prisma/schema.prisma` — добавлено поле `lastSeenAt DateTime?`
- `middleware/auth.ts` — при каждом запросе асинхронно обновляет `isOnline: true` и `lastSeenAt`
- `app/api/auth/logout` — устанавливает `isOnline: false` и `lastSeenAt` при выходе
- `components/OnlineStatus.tsx` — зелёная точка с `animate-ping`, умное форматирование: «только что» / «5 мин назад» / «сегодня в 15:30» / «вчера» / «12 янв»
- `app/profile/page.tsx` — полный редизайн в стиле дизайн-системы
- `app/user/[id]/page.tsx` — публичный профиль без авторизации, добавлен в `PUBLIC_PATHS`
- `components/AppNav.tsx` — десктоп: фиксированный сайдбар 240px; мобайл: бургер + overlay + drawer с `translate-x` анимацией; пункт «Админка» только для SUPER_ADMIN
- `app/onboarding/page.tsx` — красивая страница после регистрации: аватар с hover-оверлеем, имя, username, кнопка «Пропустить»
- `app/api/users/me/delete/route.ts` — каскадное удаление аккаунта
- `app/api/users/search/route.ts` — поиск по username, displayName, numericId

### Коммит
`feat(profile): lastSeenAt, OnlineStatus, AppNav sidebar/drawer, onboarding, account deletion, user search`

---

## [2026-04-03] — SettingsModal v2: профиль + тема + язык + удаление аккаунта

### Сделано
- `components/SettingsModal.tsx` — полная переработка:
  - 3 вкладки: Профиль / Внешний вид / Безопасность
  - Вкладка «Профиль»: загрузка/удаление аватара (base64 dataURL), поля имени/username/bio, кнопка сохранения с анимацией `✓`, кнопка выхода
  - Вкладка «Внешний вид»: `Dropdown` компоненты для темы и языка (открываются вниз, подсвечивают активный пункт)
  - Вкладка «Безопасность»: статус Telegram, кнопка удаления аккаунта с подтверждением
  - Для неавторизованных — только тема и язык без вкладок
- `useTheme.ts` — убрано дублирование localStorage, только cookie (читается SSR)
- `app/(auth)/layout.tsx` — клиентский guard: редирект на `/` при наличии токена в cookie

### Коммит
`feat(settings): SettingsModal v2 with tabs, avatar upload, dropdowns, account deletion, auth redirect`

---

## [2026-04-03] — Фаза 4.5 + Фаза 5 + Фаза 9: E2E крипто + SSE + поиск

### Сделано

**E2E шифрование (`lib/crypto/e2e.ts`):**
- Генерация пары ключей X25519 (`@noble/curves`)
- ECDH: `X25519(privateKey_A, publicKey_B)` → sharedSecret
- Шифрование: `AES-256-GCM(SHA-256(sharedSecret), iv, plaintext)`
- IV генерируется заново для каждого сообщения
- Blob: `AES-256-GCM(PBKDF2(password, 310k iter), privateKey)`
- IndexedDB: `storePrivateKey` / `loadPrivateKey` / `clearPrivateKey`
- `hooks/useCrypto.ts` — управление ключами, `initKeys`, `unlockWithPassword`, `encrypt`, `decrypt`
- `app/api/users/[id]/key/route.ts` — получение публичного ключа пользователя

**SSE реальное время:**
- `lib/sse/broker.ts` — in-memory SSE брокер (singleton через globalThis)
- `app/api/sse/route.ts` — SSE эндпоинт, пинг каждые 25 сек, `X-Accel-Buffering: no`
- `app/api/typing/route.ts` — отправка события набора текста
- `hooks/useSSE.ts` — подключение к SSE, авто-переподключение через 3 сек
- `hooks/useMessages.ts` — интеграция SSE: real-time сообщения, edit, delete, typing, presence
- `components/ChatView.tsx` — индикатор набора текста (3 точки `animate-bounce`)
- `components/ConversationList.tsx` — обновление онлайн-статуса через SSE presence
- `POST /api/messages` — SSE push получателю после сохранения
- `PATCH/DELETE /api/messages/[id]` — SSE push при редактировании/удалении

**Поиск пользователей:**
- `app/api/users/search/route.ts` — поиск по username, displayName, numericId (case-insensitive)
- `components/UserSearch.tsx` — debounce 300ms, OnlineStatus, аватары
- `components/ConversationList.tsx` — кнопка «+» открывает UserSearch для нового чата

### Проблемы / решения
- TypeScript: `Uint8Array.buffer` имеет тип `ArrayBufferLike`, Web Crypto API требует `ArrayBuffer` → явный cast `.buffer as ArrayBuffer`
- ConversationList: дублирующийся старый код остался после fsReplace → перезаписан целиком

### Коммит
`feat: SSE real-time, E2E crypto, user search, auth fixes, OTP cleanup, onboarding redesign`

---

## [2026-04-03] — Фиксы: 401 авто-рефреш, дублирование данных, удаление OTP

### Сделано
- `hooks/useAuth.ts` — авто-рефреш токена при 401: `GET /api/users/me` → 401 → `POST /api/auth/refresh` → повтор запроса
- `hooks/useTheme.ts` — убрано дублирование: только cookie, без localStorage
- `lib/auth/otp.ts` — сохранение `messageId` OTP сообщения в TempStore (`otp:msgid:{phone}`), удаление через `deleteTelegramMessage` после верификации или истечения
- `lib/bot/send-otp.ts` — `sendTelegramOtp` возвращает `messageId`, добавлен `deleteTelegramMessage`
- `app/api/users/me/delete/route.ts` — каскадное удаление: blocks, messages, channelMembers, user
- `app/(auth)/layout.tsx` — клиентский guard: редирект на `/` при наличии `access_token` или `refresh_token` в cookie
- `components/SettingsModal.tsx` — кнопка удаления аккаунта с двухшаговым подтверждением в Security tab; для неавторизованных — только Appearance без вкладок
- `app/onboarding/page.tsx` — редизайн: иконка Sparkles, аватар с hover-оверлеем и крестиком удаления, поля имени и username

### Проблемы / решения
- 401 loop: `useAuth` не пробовал refresh при истёкшем access_token → добавлен авто-рефреш
- Тема мигала при навигации: `useTheme` читал из localStorage при маунте → заменено на чтение из cookie
- OTP сообщение оставалось в Telegram после использования → сохраняем messageId, удаляем после верификации

### Коммит
`fix: auto token refresh on 401, OTP message deletion, account deletion, auth redirect, settings for guests`

---

## [2026-04-04] — UI редизайн: навбар, профиль, чаты, баннер

### Сделано
- **AppNav** — плавающий сайдбар (`rounded-2xl border bg-background shadow-sm`), не во всю высоту, раскрывается по кнопке; логотип убран из шапки; профиль/контакты/настройки — модальные панели справа; уведомления — колокольчик с бейджем
- **Профиль** — одна карточка: баннер (h-32) + аватар выезжает из баннера (`-mt-10`) + имя/username/статус внутри; стена фото с переключением сетка/лента, бесконечная прокрутка через `IntersectionObserver`
- **BannerEditor** — эмодзи-паттерн: сетка 9×4 без наложений (`translate(-50%,-50%)`), слайдер прозрачности (по умолчанию 50%), фон для эмодзи — цвет или градиент
- **Индикатор онлайн** — точка в правом нижнем углу аватарки (зелёная/серая), убран текстовый OnlineStatus под именем
- **Кастомный скроллбар** — 4px, полупрозрачный, адаптируется под тему
- **manifest.json** → `app/manifest.ts` (Next.js native API, фикс Syntax error)
- **Анимация темы** — убран `startViewTransition`, только CSS transition; убраны view-transition keyframes из globals.css
- **Страница по умолчанию** — cookie `qvor_home`, настройка в SettingsModal → Внешний вид

### Коммит
`feat(ui): floating nav, profile card, banner emoji grid, online dot, scrollbar, manifest fix`

---

## [2026-04-04] — Фаза 4 расширение: разделы чатов, архив, закреп

### Сделано
- **schema.prisma** — модели `ChatFolder`, `ChatFolderEntry`, `ChatState`
- **`GET/POST /api/folders`** — список разделов, создание
- **`PATCH/DELETE /api/folders/[id]`** — редактирование, удаление
- **`POST/DELETE /api/folders/[id]/entries`** — добавить/убрать чат, закрепить
- **`GET/POST /api/chat-state`** — архив, закреп, непрочитанные
- **`GET /api/conversations?archived=1`** — архивные чаты
- **ConversationList** — полная переработка: вкладки-таблетки (Все / папки / Архив), создание раздела с фильтрами, правый клик → контекстное меню, долгое нажатие → мини-превью, бейдж непрочитанных, закреплённые чаты первыми с иконкой 📌
- **Чат «Избранное»** — всегда первым, золотая звезда, `?favorites=1` в URL
- **messages/page.tsx** — layout с отдельными скруглёнными блоками (`bg-muted/30`, `gap-3`, `p-4`)

### Коммит
`feat(folders): chat folders, archive, pin, unread badge, context menu, long-press preview`

---

## [2026-04-04] — Авторизация: rolling session, очистка куки, страница по умолчанию

### Сделано
- **middleware.ts** — при невалидных токенах `cookies.delete('access_token')` + `cookies.delete('refresh_token')` перед редиректом; rolling session — при авто-рефреше `refresh_token` перевыпускается с новым `maxAge: 30d`
- **useAuth** — убран редирект на `/login` при ошибке `refreshUser`; авторизованный пользователь не вылетает при ошибках запросов
- **app/page.tsx** — редирект на основе cookie `qvor_home` (default: `messages`)
- **SettingsModal** — дропдаун «Страница по умолчанию» во вкладке Внешний вид; `useState` с `document.cookie` заменён на `useEffect` (фикс hydration #418)

### Коммит
`feat(auth): rolling session, cookie cleanup on 401, default home page setting`

---

## [2026-04-04] — Фаза 3 дополнение: дата рождения

### Сделано
- **`prisma/migrations/add_birth_date.sql`** — `ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE`
- **schema.prisma** — поле `birthDate DateTime? @db.Date`
- **`PATCH /api/users/me`** — принимает `birthDate` (YYYY-MM-DD), обновляет через `$executeRaw` с try/catch (backward-compatible)
- **`GET /api/users/me`** — возвращает `birthDate` через `$queryRaw` с try/catch
- **SettingsModal** — `<input type="date">` во вкладке Профиль, под полем показывается возраст в годах
- **AuthUser** — добавлено поле `birthDate?: string | null`

### Коммит
`feat(profile): birth date field — DB migration, API, settings UI with age display`

---

## [2026-04-04] — Фаза 6: Каналы полностью

### Сделано
- **`GET/POST /api/channels/[id]/messages`** — история сообщений канала (курсорная пагинация), отправка с SSE push всем участникам
- **`app/channels/page.tsx`** — полная переработка: список каналов + чат канала + панель участников в одном layout; iOS-стиль пузыри; приглашение через поиск; кик/смена роли по hover; выход/удаление канала

### Коммит
`feat(channels): channel chat, members panel, invite search, role management, leave/delete`

---

## [2026-04-04] — Фаза 7: Реакции в ChatView

### Сделано
- **ChatView** — правый клик на сообщение открывает быстрый эмодзи-пикер (8 эмодзи) + кнопки Изменить/Удалить; реакции отображаются под пузырём с счётчиком; тогл (добавить/убрать); своя реакция подсвечена акцентным цветом
- **`toggleReaction`** — оптимистичный UI, синхронизация с API
- Загрузка реакций при открытии чата (`useEffect` на `messages.length`)

### Коммит
`feat(reactions): emoji picker in ChatView, reactions display, toggle with optimistic UI`

---

## [2026-04-04] — Фаза 8: Центр уведомлений

### Сделано
- **`components/NotificationsCenter.tsx`** — плавающая панель из навбара; колокольчик с бейджем непрочитанных; поллинг каждые 30 сек; загрузка при открытии; отметить все/одно прочитанным; удалить; иконки по типу (message/reaction/friend_request/channel_invite)
- **AppNav** — добавлен `NotificationsCenter` в nav секцию

### Коммит
`feat(notifications): NotificationsCenter with badge, mark read, delete, type icons`

---

## [2026-04-04] — Фаза 13: Скелетоны, Error Boundaries, пустые состояния

### Сделано
- **`components/Skeletons.tsx`** — `ConversationSkeleton`, `MessageSkeleton`, `ProfileSkeleton`, `ChannelSkeleton` (animate-pulse)
- **`components/ErrorBoundary.tsx`** — class component, показывает ошибку + кнопку «Попробовать снова»
- **`components/EmptyState.tsx`** — универсальный компонент: иконка + заголовок + описание + кнопка действия
- Интеграция: `ConversationSkeleton` в `ConversationList`, `MessageSkeleton` в `ChatView`, `ProfileSkeleton` в `/profile`, `ErrorBoundary` оборачивает `ConversationList` и `ChatView` в `/messages`

### Коммит
`feat(ux): skeletons, ErrorBoundary, EmptyState components; integrate into key pages`

---

## [2026-04-04] — Фиксы: React #418, manifest, 500 на /api/users/me

### Сделано
- **React #418 (hydration)** — `useState(() => document.cookie...)` в `SettingsModal` заменён на `useState('messages')` + `useEffect` для чтения cookie
- **manifest** — `public/manifest.json` заменён на `app/manifest.ts` (Next.js `MetadataRoute.Manifest`), убрана ссылка из `layout.tsx`
- **500 на /api/users/me** — `birthDate` читается через `$queryRaw` с try/catch; `SELECT` без поля `birthDate` (не ломает если колонки нет в БД)
- **ConversationList** — `window.innerWidth/innerHeight` в контекстном меню защищены от SSR (`typeof window !== 'undefined'`)

### Коммит
`fix: hydration #418, manifest native API, users/me 500 on missing birthDate column, SSR window guard`

---

## [2026-04-05] — ImageCropper fix, React Aria ColorPicker, AvatarUpload fix

### Сделано
- **ImageCropper** — убран серый полупрозрачный круг поверх фото: canvas теперь рисует только изображение, overlay реализован через CSS `mask-image: radial-gradient(...)` — затемняет только снаружи круга, граница через `box-shadow: inset`
- **AvatarUpload** — кнопка камеры больше не обрезается: разделены `overflow-hidden` (только на внутреннем div с фото) и `relative` (на внешнем `size-20` div)
- **ColorPicker** (`components/ColorPicker.tsx`) — новый компонент на React Aria: ColorArea (насыщенность/яркость) + ColorSlider (оттенок) + hex input с превью
- **BannerEditor** — `ColorSwatchPicker` компонент: цветной квадрат, по клику открывает попап с ColorPicker; все три `<input type="color">` заменены
- `globals.css` — добавлены CSS-правила для React Aria data-slots (color-area, color-thumb, slider-track)

### Коммит
`feat(ui): fix ImageCropper overlay, fix avatar button clip, React Aria ColorPicker in BannerEditor`

---

## [2026-04-05] — ProfileSettingsModal, FollowersModal, EmojiPicker, уведомления, privacy API

### Сделано

**ProfileSettingsModal** (`components/ProfileSettingsModal.tsx`):
- Новый компонент: настройки профиля (имя, username, bio, дата рождения) + баннер в одной модалке
- Аватар с кроппером (ImageCropper), кнопка удаления аватара
- Баннер: превью + BannerEditor в раскрывающейся секции
- Открывается по кнопке "Настройки" на баннере профиля и по клику на аватар

**profile/page.tsx**:
- Кнопка "Баннер" → кнопка "Настройки" (Settings icon) → открывает ProfileSettingsModal
- Аватар кликабелен → открывает ProfileSettingsModal
- Добавлены счётчики подписчиков/подписок с кнопкой открытия FollowersModal
- Убраны дублирующие диалоги (banner, avatar crop) — всё в ProfileSettingsModal

**SettingsModal**:
- Удалена вкладка "Профиль" (перенесена в ProfileSettingsModal)
- Остались только: Внешний вид / Конфиденциальность / Безопасность
- Убраны неиспользуемые импорты (Image, Camera, X, LogOut, User, Label, Input, compressAvatar)

**FollowersModal** (`components/FollowersModal.tsx`):
- Модалка со списком подписчиков
- Кнопка "Подписаться взаимно" / "Подписан" рядом с каждым
- Клик на пользователя → переход на его профиль
- Онлайн-статус, аватар, username

**API `/api/users/[id]/follow/list`** — новый эндпоинт: список подписчиков пользователя

**Уведомления**:
- `POST /api/users/[id]/follow` — создаёт уведомление типа `follow` для подписанного пользователя
- `POST /api/messages/[id]/reactions` — создаёт уведомление типа `reaction` для автора сообщения
- `NotificationsCenter` — добавлен тип `follow` с иконкой UserPlus

**EmojiPicker** (`components/EmojiPicker.tsx`):
- Полноценный пикер с 9 категориями (смайлы, люди, природа, еда, активность, путешествия, объекты, символы, недавние)
- Поиск по эмодзи
- История недавних (localStorage, 24 штуки)
- Кнопка-иконка Smile в правом конце поля ввода ChatView
- Попап открывается вверх, закрывается по клику вне

**ChatView**:
- EmojiPicker интегрирован в поле ввода (справа от textarea)
- Исправлен баг: `visibleMessages` использовалось до объявления → перемещено выше
- Исправлен лишний `</div>` в конце компонента

**Privacy API** (`/api/users/[id]/route.ts`):
- `whoCanSeeLastSeen` — скрывает `lastSeenAt` если настройка не позволяет
- `whoCanSeeBio` — скрывает `bio` если настройка не позволяет
- Проверка: viewer является контактом (подписан на него) для настройки `contacts`
- Владелец профиля всегда видит всё

### Коммиты
`feat(profile): ProfileSettingsModal with avatar crop + banner editor, replace banner button with settings`
`feat(followers): FollowersModal with mutual follow button, followers list API`
`feat(notifications): send follow/reaction notifications on follow and emoji reaction`
`feat(chat): EmojiPicker with categories, search, recent history in chat input`
`feat(privacy): apply whoCanSeeLastSeen/whoCanSeeBio in public profile API`
`fix(chatview): move visibleMessages before early return, fix extra closing div`

---

## [2026-04-06] — PublicProfile: дропдаун меню, фикс 400 на UUID, последнее время захода, фото без обрезки

### Сделано
- **PublicProfile — кнопка настроек убрана** — на чужом профиле `<SettingsModal />` заменён на кнопку `MoreVertical` с дропдауном; на своём профиле `<SettingsModal />` остался
- **Дропдаун меню** — открывается по клику на `⋮`, закрывается по клику вне (`mousedown` listener на `document`); пункты: «Заблокировать» / «Разблокировать» (ShieldOff) и «Пожаловаться» (Flag)
- **Кнопка `UserMinus` (отдельная)** — убрана из блока actions; блокировка перенесена в дропдаун
- **400 на `/api/users/{uuid}`** — `messages/page.tsx` передаёт UUID в `fetch('/api/users/${userId}')`, но API принимал только `numericId` и `@username`; добавлена ветка UUID (`/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`) → `prisma.user.findUnique({ where: { id } })`
- **Последнее время захода** — `formatLastSeen(lastSeenAt)` уже был реализован и подключён; отображается под именем как «был(а) 5 мин назад» / «был(а) 2 ч назад» / «был(а) 15 янв»; при `lastSeenAt = null` — «не в сети»
- **Чёрные полосы на фото (feed-режим)** — убраны `style={{ maxHeight: '480px', objectFit: 'cover' }}`; фото теперь отображается целиком (`w-full h-auto`)

### Проблемы / решения
- API `/api/users/[id]` принимал только `numericId` (число) и `@username` (строка с @), но `messages/page.tsx` передавал UUID напрямую → добавлена третья ветка с regex-проверкой UUID
- Кнопка настроек (шестерёнка) отображалась на чужом профиле — открывала настройки текущего пользователя, что семантически неверно → заменена на контекстное меню профиля

### Коммит
`fix(public-profile): MoreVertical dropdown instead of settings button, UUID lookup in users API, remove feed photo crop`

---

## [2026-04-07] — Фазы 5, 8, 9, 12, 13, 16: статусы прочтения, Web Push, поиск, админка, оптимизация

### Сделано

**Статусы прочтения (Фаза 5):**
- `prisma/schema.prisma` — поле `readAt DateTime?` в модели `Message`
- `prisma/migrations/add_read_receipts_push.sql` — миграция `read_at` + `push_subscriptions`
- `app/api/messages/read/route.ts` — `POST /api/messages/read`: помечает все сообщения от `fromUserId` прочитанными, шлёт SSE событие `read`
- `lib/sse/broker.ts` — добавлен тип `read` в `SSEEvent`
- `hooks/useSSE.ts` — зарегистрирован тип `read`
- `hooks/useMessages.ts` — `markAsRead()`, SSE handler `read` обновляет `readAt` у сообщений
- `app/messages/page.tsx` — вызов `markAsRead(userId)` при открытии чата

**Web Push (Фаза 8):**
- `lib/push.ts` — отправка Web Push через нативный `crypto.subtle` (VAPID JWT без внешних зависимостей)
- `app/api/push/vapid/route.ts` — `GET /api/push/vapid`: возвращает публичный VAPID ключ
- `app/api/push/subscribe/route.ts` — `POST/DELETE /api/push/subscribe`: подписка/отписка
- `public/sw.js` — Service Worker: обработка `push` событий, клик по уведомлению открывает `/messages`
- `hooks/usePush.ts` — хук подписки/отписки, запрос разрешения
- `app/layout.tsx` — регистрация SW через inline script
- `app/api/messages/route.ts` — push-уведомление при новом сообщении если получатель офлайн
- `prisma/schema.prisma` — модель `PushSubscription`

**apiFetch с авто-рефрешем:**
- `lib/api/client.ts` — `apiFetch`: при 401 автоматически вызывает `/api/auth/refresh`, дедуплицирует параллельные refresh-запросы через `refreshPromise`, повторяет оригинальный запрос
- `lib/api/index.ts` — экспорт `apiFetch`
- Заменены все `fetch(` на `apiFetch(` в `useMessages.ts`, `ChatView.tsx`, `ConversationList.tsx`

**Глобальный поиск (Фаза 9):**
- `app/search/page.tsx` — страница `/search`: поиск пользователей и каналов с debounce 300ms, карточки с аватарами, кнопки «Профиль» и «Написать»
- `app/api/channels/search/route.ts` — `GET /api/channels/search?q=`: поиск публичных каналов
- `components/AppNav.tsx` — Search добавлен в навбар (иконка + переход на `/search`)
- `translations/default/en.json` + `ru.json` — ключ `nav.search`

**Middleware защита админки:**
- `middleware/adminAuth.ts` — хелпер проверки `SUPER_ADMIN` роли из JWT
- `middleware.ts` — защита `/admin` и `/api/admin/*` через JWT role check

**Админ-панель (Фаза 16):**
- `app/api/admin/stats/route.ts` — `GET /api/admin/stats`: users, messages, channels, online, today
- `app/api/admin/users/route.ts` — `GET /api/admin/users`: список с поиском, пагинацией, `bannedAt` через raw SQL
- `app/api/admin/users/[id]/route.ts` — `PATCH` (role) + `DELETE`
- `app/api/admin/users/[id]/ban/route.ts` — `POST/DELETE`: бан/разбан через raw SQL (backward-compatible, добавляет колонку `banned_at` если нет)
- `app/api/admin/channels/route.ts` — `GET /api/admin/channels`: список каналов с owner, memberCount, messageCount
- `app/api/admin/channels/[id]/route.ts` — `DELETE /api/admin/channels/[id]`
- `app/admin/page.tsx` — полная переработка: вкладки Пользователи/Каналы, статистика, бан/разбан с визуальным индикатором, смена роли, удаление, пагинация

**SettingsModal переработан:**
- `components/SettingsModal.tsx` — список с разделами вместо табов (root → appearance/privacy/security), компоненты `Row`, `Toggle`, `SectionLabel`, `Divider`, Push toggle в секции Безопасность

**Оптимизация (Фаза 12):**
- `app/messages/page.tsx` — `dynamic()` import для `ChatView` и `ConversationList` с `ssr: false` и скелетонами при загрузке

**Горячие клавиши (Фаза 13):**
- `app/messages/page.tsx` — `Escape` закрывает чат, `Ctrl+K` фокусирует поле поиска
- `components/ConversationList.tsx` — атрибут `data-search` на поле поиска

### Проблемы / решения
- `TS7006` на `.map(c =>` в admin/channels — Prisma теряет тип через `Promise.all` → явный тип `ChannelRow`
- `bannedAt` — колонки нет в старых БД → raw SQL с `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` в catch блоке
- TypeScript 0 ошибок после всех изменений (`npx tsc --noEmit`)

### Коммит
`feat: read receipts API+SSE, Web Push (VAPID+SW+usePush), apiFetch auto-refresh, global search page, admin panel (stats/users/channels/ban/role), SettingsModal redesign, dynamic imports, hotkeys, channels search API`

### Следующий шаг
- `DELETE /api/admin/messages/[id]` — удаление сообщений из админки
- Поиск по сообщениям (клиентский в ChatView)
- Фаза 11: санитизация входных данных
- Мобильное приложение: подготовка монорепо

---

---

## [2026-04-08] — Тёмная тема, мобильная адаптивность, уведомления в хотбаре

### Сделано

**Тёмная тема — глобальные исправления:**
- `globals.css` — `--border` и `--input` подняты с 10% до 16% прозрачности — границы стали видимы
- Глобальные CSS правила для тёмной темы: все `input`/`textarea` получают `border-color: oklch(1 0 0 / 22%) !important` и `background-color: oklch(1 0 0 / 5%)` — покрывает все компоненты сразу
- `components/ui/input.tsx` — добавлены `dark:border-[oklch(1_0_0/22%)]` и `dark:placeholder:text-[oklch(1_0_0/35%)]`
- `OtpInput.tsx` — пустые ячейки получили `dark:border-[oklch(1_0_0/25%)]`
- `PhoneInput.tsx` — контейнер, dropdown и поиск получили явные dark border/bg
- `ChatView.tsx` — пузыри чужих сообщений: `dark:bg-[oklch(0.26_0_0)] dark:ring-[oklch(1_0_0/15%)]`
- `register/page.tsx` — чекбокс: `dark:border-[oklch(1_0_0/30%)]`; прогресс-бар: `dark:border-[oklch(1_0_0/30%)]`, линия `dark:bg-[oklch(1_0_0/20%)]`
- `recover/page.tsx` — те же исправления прогресс-бара

**Dropdown в SettingsModal — выход за пределы:**
- Добавлен `btnRef` для измерения позиции кнопки
- `openUp` — вычисляется при открытии: если места снизу < 180px, список открывается вверх (`bottom-full mb-1`)
- Список получил `absolute z-[200]` — не обрезается `overflow-hidden` родителя
- Кнопка получила `dark:bg-[oklch(1_0_0/5%)] dark:border-[oklch(1_0_0/20%)]`

**Мобильный хотбар — компактный:**
- Убраны текстовые подписи под иконками
- Иконки уменьшены до `size-5`, кнопки `size-10`
- `mobile-pb` уменьшен с 5.5rem до 3.5rem
- Добавлена кнопка уведомлений с бейджем (поллинг 30 сек)
- Уведомления открываются как bottom sheet (`MobileNotifSheet`) — список с mark all / delete

### Коммит
`fix(dark-theme): visible borders/inputs/checkboxes/bubbles; dropdown opens up when no space; compact hotbar with notifications sheet`

---

## [2026-04-09] — Фаза 16 завершена: аудит, рассылка; фиксы профиля и поиска; галочки прочтения

### Сделано

**Фаза 16 — Журнал аудита:**
- `app/api/admin/audit/route.ts` — `GET /api/admin/audit`: создаёт таблицу `audit_logs` если нет (backward-compatible через `CREATE TABLE IF NOT EXISTS`), возвращает записи с пагинацией
- `lib/audit.ts` — утилита `writeAudit(actorId, actorName, action, targetType, targetId, meta)` — записывает события, создаёт таблицу при первом вызове если нет
- Аудит подключён: бан/разбан → `user.ban`/`user.unban`, удаление → `user.delete`, смена роли → `user.role_change`
- UI в `/admin` — вкладка "Аудит": список событий с иконкой, актором, действием, временем, пагинация

**Фаза 16 — Рассылка:**
- `app/api/admin/broadcast/route.ts` — `POST /api/admin/broadcast`: создаёт `Notification` типа `system` всем пользователям (или одному по `userId`), шлёт SSE `notif` событие онлайн-пользователям
- `lib/sse/broker.ts` — добавлен тип `notif` в `SSEEvent` и `SSEEventLegacy`
- UI в `/admin` — вкладка "Рассылка": форма с заголовком и текстом, кнопка отправки с индикатором

**Фаза 16 — admin/page.tsx расширен:**
- Вкладки: Пользователи / Каналы / Рассылка / Аудит
- Все state и функции добавлены без переписывания файла

**Фикс /@username двойной @:**
- `ChatView.tsx` — `profileHref`: `/@${username}` → `/${username}`
- `search/page.tsx` — ссылка на профиль: `/@${username}` → `/${username}`
- Причина: `app/[username]/page.tsx` сам добавляет `@` при передаче в `PublicProfile`

**Галочки прочтения в списке диалогов:**
- `GET /api/conversations` — добавлены поля `lastMessageSenderId` и `lastMessageReadAt`
- `hooks/useMessages.ts` — тип `Conversation` расширен; SSE `read` обновляет `lastMessageReadAt`; отправка сообщения устанавливает `lastMessageSenderId: user.id`
- `ConversationList.tsx` — одна галочка (серая) = отправлено, две галочки (оранжевые) = прочитано; показываются только для своих последних сообщений

**Поиск объединён:**
- `ConversationList.tsx` — поле поиска: при нажатии Enter или клике на иконку → переход на `/search?q=...`

**Rate limiting расширен:**
- `lib/rate-limit.ts` — настраиваемые лимиты: `auth: 10/min`, `messages: 120/min`, `api: 300/min`; автоочистка каждые 5 минут; заголовок `Retry-After`
- `app/api/messages/route.ts` — `POST /api/messages` защищён `rateLimit(request, 'messages')`

**GDPR экспорт данных:**
- `app/api/users/me/export/route.ts` — `GET /api/users/me/export`: скачивает JSON с профилем, сообщениями, реакциями, уведомлениями, фото
- `SettingsModal.tsx` — кнопка "Экспорт данных" в секции Безопасность

### Проблемы / решения
- `app/admin/page.tsx` был сломан из-за неудачных fsReplace — broadcast/audit UI добавлены через точечный fsReplace в конец файла
- `audit/route.ts` потерял строку `data: rows.map(...)` — восстановлен через fsWrite
- TypeScript 0 ошибок после всех изменений

### Коммит
`feat(admin): audit log (raw SQL backward-compatible), broadcast to all users, writeAudit utility, SSE notif event; fix(profile): /@username double-@ bug, search page profile link; fix(dark-theme): borders/inputs/checkboxes/bubbles, dropdown opens upward; feat(ux): compact hotbar without labels, notifications bottom sheet, mobile-pb reduced; feat(conversations): lastMessageSenderId+lastMessageReadAt, read checkmarks in list; feat(search): Enter key navigates to /search page`

### Следующий шаг
- Фаза 9: поиск по сообщениям (клиентский — уже есть поле в ChatView)
- Фаза 11: санитизация входных данных на всех эндпоинтах
- Фаза 7: счётчик непрочитанных на канал
- Мобильное приложение: подготовка монорепо (Turborepo)

---

## [2026-04-09] — Стабилизация и оптимизация

### Сделано

**middleware.ts — оптимизация:**
- `PUBLIC_EXACT` — `Set` для O(1) поиска точных совпадений вместо `Array.some(startsWith)`
- Один `jwtVerify` вместо трёх — payload сохраняется и переиспользуется для admin-проверки и rolling session
- Добавлен `/sw.js` в статику (пропускается без JWT)
- `RUSSIAN_COUNTRIES` расширен (KZ добавлен)

**lib/prisma.ts — connection pool:**
- `max: 10` соединений, `idleTimeoutMillis: 30s`, `connectionTimeoutMillis: 10s`
- Логирование медленных запросов в dev (> 500ms)
- Логирование Prisma ошибок через `$on('error')`

**lib/sse/broker.ts — предотвращение утечек памяти:**
- `setInterval` каждые 5 минут очищает `typingThrottle` (записи старше 60 сек)
- `presenceCache` ограничен 10k записей — при превышении очищается полностью

**app/api/sse/route.ts — оптимизация:**
- Кэш контактов `contactsCache` с TTL 5 минут — тяжёлый запрос к БД не повторяется при каждом подключении/отключении
- Автоочистка кэша при превышении 1000 записей
- `Promise.all` для параллельного обновления БД и уведомления контактов
- Флаг `closed` предотвращает запись в закрытый контроллер

**lib/cache/messages.ts — LRU + лимиты:**
- `MAX_ENTRIES = 500` диалогов максимум
- `MAX_MSGS_PER_CONV = 100` сообщений на диалог
- `accessedAt` — LRU вытеснение: при превышении лимита удаляются наименее используемые
- `evict()` удаляет просроченные + LRU при превышении

**next.config.ts — безопасность и производительность:**
- `poweredByHeader: false` — убираем `X-Powered-By: Next.js`
- `reactStrictMode: true` — строгий режим React
- `Permissions-Policy` заголовок — запрет камеры/микрофона/геолокации
- `X-DNS-Prefetch-Control: on` — ускорение DNS
- `Cache-Control: no-store` для всех `/api/*` маршрутов
- `optimizePackageImports` расширен: добавлен `date-fns`

**lib/api/errors.ts — централизованный error handler:**
- `apiError(error, context, status)` — обрабатывает ZodError (400), Prisma P2002 (409), P2025 (404), остальные (500)
- `apiOk(data, status)` — единый формат успешного ответа `{ data, error: null }`
- В dev возвращает текст ошибки, в prod — только `Internal server error`

### Коммит
`perf: connection pool, SSE contacts cache, LRU message cache, middleware O(1) lookup, broker memory leak fix, centralized error handler, security headers`

---

## [2026-04-10] — Фиксы чата, подписки, безопасность, оптимизация, UI

### Сделано

**Фикс новых сообщений в чате:**
- `hooks/useMessages.ts` — SSE handler `message`: сообщение добавляется в активный чат корректно; `unreadCount` инкрементируется когда чат не активен и сообщение от собеседника; при открытии чата (`loadMessages`) счётчик сбрасывается локально немедленно
- `editMessage` — добавлен отсутствующий `method: 'PATCH'`

**Подписчики/подписки:**
- `GET /api/users/[id]/follow/following` — новый эндпоинт: список на кого подписан пользователь
- `components/FollowersModal.tsx` — переписан с вкладками «Подписчики» / «Подписки» с счётчиками и кнопками взаимной подписки
- `components/PublicProfile.tsx` — кликабельные счётчики подписчиков/подписок открывают FollowersModal на нужной вкладке; `followingCount` добавлен в state
- `app/profile/page.tsx` — счётчик подписок тоже кликабелен (открывает FollowersModal)

**Кнопка админки:**
- `components/AppNav.tsx` ProfileModal — ссылка «Панель администратора» (Shield icon) видна только `SUPER_ADMIN`

**Вкладки Чаты/Каналы в ConversationList:**
- Переключатель сегментного типа Чаты/Каналы
- Вкладка «Каналы» показывает список каналов пользователя с переходом на `/channels?id=...`
- Универсальный поиск: батч-поиск пользователей + каналов с debounce 300ms, результаты прямо под строкой поиска
- Кнопка `+` в режиме каналов ведёт на `/channels?create=1`

**Последнее сообщение в диалогах:**
- Зашифрованные сообщения → «Зашифрованное сообщение»; незашифрованные → текст
- Галочки ✓/✓✓ для своих сообщений (отправлено/прочитано)

**Безопасность JWT:**
- `lib/auth/jwt.ts` — роль кодируется как HMAC-подпись (`ROLE_SALT`): `encodeRole()` / `decodeRole()`; в JWT хранится поле `r` вместо `role`
- `middleware.ts` — `decodeRoleEdge()` декодирует роль через Web Crypto API (Edge Runtime совместимо); поле `r` вместо `role` в payload
- `.env.example` — добавлена переменная `ROLE_SALT`

**Rate limiting расширен:**
- `app/api/photos/route.ts` — `POST` защищён `rateLimit(req, 'api')`
- `app/api/users/me/route.ts` — `PATCH` защищён `rateLimit(request, 'api')`

**Виртуализация сообщений:**
- `npm install react-window @types/react-window` — установлен

**Yandex verification:**
- `app/layout.tsx` — `'yandex-verification': 'ef5b19ac960c7316'` в `other` metadata

**Тип группы и категории каналов:**
- `prisma/schema.prisma` — `ChannelType` enum (CHANNEL/GROUP), поле `type`; поле `category` (news/blogs/memes/other); `pinned`/`pinnedAt` в `ChannelMember`
- `prisma/migrations/add_channel_type.sql` — `ALTER TABLE channels ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'CHANNEL'`
- `prisma/migrations/add_channel_category.sql` — `ALTER TABLE channels ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other'`; `ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false`
- `app/api/channels/route.ts` — `category` в createSchema и GET response; `GET ?public=1` — публичные каналы без авторизации по членству; сортировка pinned первыми
- `app/api/channels/[id]/route.ts` — `category` в updateSchema
- `app/api/channels/[id]/pin/route.ts` — `POST /api/channels/[id]/pin` — закрепить/открепить канал
- `app/channels/page.tsx` — полная переработка: вкладки Все/Каналы/Группы/Публичные; категории при создании; группировка публичных по категориям; ChannelRow компонент; invite link; контакты для приглашения

**Page transitions:**
- `app/template.tsx` — Next.js template (перемонтируется при навигации) с классом `.page-transition`
- `app/globals.css` — `@keyframes page-in` + `.page-transition { animation: page-in 150ms ease-out both }`

**Тёмная тема — глобальные улучшения:**
- `globals.css` — `--border`/`--input` 16% прозрачности; глобальные CSS правила для `input`/`textarea` в тёмной теме; пузыри чужих сообщений `.dark .bubble-incoming`

**Фикс NODE_ENV:**
- `.env.local` — удалена строка `NODE_ENV="development"` (ломала production сборку)
- `app/global-error.tsx` — создан самодостаточный обработчик ошибок root layout

**Очистка проекта:**
- Удалены: `components/FloatingControls.tsx`, `components/LanguageSwitcher.tsx`, `scripts/bot.js`, `scripts/logger.js`, `public/manifest.json`, `app/settings/page.tsx`, `app/profile/edit/page.tsx`, `app/user/[id]/page.tsx`

**deploy.sh — кастомные SQL миграции:**
- Создаёт таблицу `_custom_migrations` если нет
- Применяет только новые `.sql` файлы из `prisma/migrations/`
- Идемпотентно — повторный запуск безопасен

### Проблемы / решения
- `NODE_ENV="development"` в `.env.local` ломал production сборку — React в dev-режиме падал на `useContext` при prerender `/_global-error`
- SQL миграции с UUID vs TEXT — переписаны с `TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text` для совместимости с Prisma (хранит UUID как TEXT)
- `source` не работает в `sh` — заменено на `.` (POSIX-совместимо)

### Коммит
`feat: followers/following modal, chat tabs, last message preview, JWT role HMAC, rate limiting, channel categories+pin, page transitions, dark theme fixes, project cleanup`

### Следующий шаг
- Виртуализация списка сообщений (react-window уже установлен)
- Санитизация user-generated content (DOMPurify)
- Мониторинг (Sentry)

### [v0.2.9] — fix: request spam, delete message mode, pin API, notif via SSE

---

## [2026-04-11] — Фикс спама запросов + удаление/закрепление сообщений

### Сделано

**Спам запросов — устранён:**
- `useMessages` — `loadConversations` убрал `store.conversationsLoaded` из deps (был цикл: загрузка → изменение стора → пересоздание callback → загрузка)
- `useEffect` зависит только от `user?.id` — запускается один раз
- `loadConversations` загружается только если `!store.conversationsLoaded`
- `MobileHotbar` — задержка 2с перед первым запросом, интервал 30с → 60с, зависит от `user?.id`
- `NotificationsCenter` — убран поллинг каждые 30с; счётчик обновляется через SSE `notif` событие
- `notif` добавлен в `SSEEventType` и список прослушиваемых событий

**Удаление сообщения с режимом:**
- `DELETE /api/messages/[id]` — принимает `mode: 'self' | 'all'`
- `mode=all` — soft delete для обоих, SSE `mdel` обоим; только отправитель может
- `mode=self` — запись в `hidden_messages`, SSE `mdel` только себе
- `deleteMessage(id, mode)` в `useMessages`
- `onDeleteMessage(id, mode?)` в `ChatViewProps`

**Закрепление сообщений:**
- `POST /api/messages/[id]/pin` — `mode=self/all`
- `DELETE /api/messages/[id]/pin` — открепить
- Таблица `pinned_messages` в миграции
- `GET /api/messages` возвращает `pinnedMessage`
- `pinnedMessage` в `useMessages` и `ChatViewProps`

### Коммит
`fix: request spam loop; feat: delete message mode self/all, pin message API, notif via SSE`

---


### [v0.3.0] — fix: admin role, lastMessage plaintext, no flash on encrypted, auto-open first chat

---

## [2026-04-12] — Критические фиксы UX

### Сделано

**Роль в клиенте (admin кнопка):**
- `GET /api/users/me` — добавлен `role: true` в `SELECT` — без этого `user.role` был `undefined` в клиенте
- Кнопка «Панель администратора» в `ProfileModal` теперь видна SUPER_ADMIN

**Доступ в /admin:**
- `decodeRoleEdge` в `middleware.ts` — в dev режиме доверяем base64 роли без HMAC проверки
- Старые токены (выданные без `ROLE_SALT`) теперь работают корректно

**Превью сообщения в диалогах:**
- `sendMessage` в `useMessages` принимает `plaintext?: string`
- `ChatView.handleSend` передаёт `text.trim()` как plaintext
- `ConversationList` показывает `lastMessage` напрямую — теперь это plaintext
- Убрана логика `plain-`/`iv-`/`mock` проверок — больше не нужна

**Мигание зашифрованных сообщений:**
- `displayText = decrypted.get(id) ?? (isEncrypted(iv) ? null : ciphertext)`
- Пока `null` — показываем skeleton `animate-pulse` вместо ciphertext
- После расшифровки — плавно появляется текст

**Автооткрытие первого чата на десктопе:**
- `autoOpenedRef` — открывает первый диалог из `conversations` при загрузке на десктопе
- Не срабатывает на мобиле (`window.innerWidth < 768`)
- Не срабатывает если уже есть `?id=` или `?favorites=1` в URL

### Коммит
`fix: role in /api/users/me SELECT, admin access in dev, lastMessage plaintext preview, no flash on encrypted msgs, auto-open first chat on desktop`

---


### [v0.3.1] — feat: Sentry monitoring, clear qvor_accounts on logout

---

## [2026-04-8] — Sentry + очистка localStorage

### Сделано

**Sentry:**
- `npm install @sentry/nextjs`
- `sentry.client.config.ts` — Replay с maskAllText, beforeSend удаляет PII
- `sentry.server.config.ts` — серверный конфиг
- `sentry.edge.config.ts` — edge (middleware) конфиг
- `next.config.ts` — `withSentryConfig` если `NEXT_PUBLIC_SENTRY_DSN` задан
- `lib/logger.ts` — `logger.error` автоматически вызывает `Sentry.captureException`
- `.env.example` — добавлены `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- Sentry опционален — без DSN приложение работает как раньше

**Очистка qvor_accounts:**
- `useAuth.logout()` — `localStorage.removeItem('qvor_accounts')`
- `useAuth.deleteAccount()` — то же самое

### Коммит
`feat: Sentry monitoring (optional), clear qvor_accounts on logout/delete`

---


---

## [2026-04-08] — Интеграция каналов в /messages, UI-фиксы, безопасность

### Сделано

**Каналы перенесены в /messages:**
- `components/ChannelView.tsx` — создан переиспользуемый компонент из `app/channels/page.tsx`:
  - Убраны `AppNav` и страничная обёртка
  - Добавлены пропы `currentUserId`, `initialChannelId`, `initialType`, `onClose`
  - `ChannelChat` получил пропы `onBack`, `onDelete`, `onLeave` — кнопка назад и удалить/выйти прямо в хедере
  - Инвайт-ссылки переведены с `/channels?invite=` на `/messages?invite=`
  - `initialChannelId` — автоматически открывает нужный канал после загрузки списка
- `components/ConversationList.tsx` — секция "Группы и каналы" в списке чатов:
  - Загружает каналы при монтировании через `GET /api/channels`
  - Отображает под списком диалогов при `activeFolder === 'all'`
  - Кнопка `+` открывает модальное окно выбора типа (личное / группа / канал)
- Страница `/channels` оставлена до полной интеграции `ChannelView` в `messages/page.tsx`

**Навбар — упрощение:**
- `components/AppNav.tsx`:
  - Убраны каналы из `DESKTOP_NAV_ITEMS` и `MOBILE_NAV_ITEMS`
  - Убрана кнопка "Панель администратора" из `ProfileModal` (доступ через `/admin` напрямую)
  - Добавлен `NotificationsCenter` в `DesktopSidebar` — колокольчик с бейджем в боковой панели
  - Убран `refreshChannels` из `prefetch` (каналов в навбаре нет)
  - Упрощены `navItems` — убрана фильтрация по `adminOnly`

**Зашифрованные сообщения в списке диалогов — исправлено:**
- `app/api/conversations/route.ts`:
  - Добавлена функция `safeLastMessage(ciphertext, iv)` — если `iv` начинается с `plain-`/`iv-`/`mock` → возвращает plaintext, иначе → `🔒 Сообщение`
  - `iv` добавлен в `select` обоих запросов (sent + received)
- `hooks/useMessages.ts` — SSE handler `message`: `lastMessage` устанавливается как `🔒 Сообщение` вместо `msg.ciphertext`
- `components/ConversationList.tsx` — клиентская проверка: строки без пробелов длиннее 60 символов → `🔒 Сообщение`

**Тёмная тема — фиксы:**
- `components/ChatView.tsx` — свои сообщения: добавлен `dark:text-black` к классу пузыря `bg-[--accent-brand]` — текст виден в тёмной теме
- Убран онлайн-индикатор (`<span className="absolute -bottom-0.5 -right-0.5 ...">`) с аватарки собеседника в хедере чата

**Безопасность — исправление 403 на /api/admin:**
- `middleware.ts` — `decodeRoleEdge`:
  - Исправлен base64url → base64 decode (корректный padding)
  - В prod: `crypto.subtle.importKey` с `['verify']` вместо `['sign']`
  - Используется `crypto.subtle.verify` вместо `sign + compare` — корректная проверка HMAC
  - Результат: SUPER_ADMIN получает доступ к `/api/admin/*` в production

**Поиск по хэштегу:**
- `app/api/search/route.ts` — при запросе `#query` (`isHashtag = true`) пользователи не ищутся, только каналы
- `app/search/page.tsx` — placeholder обновлён: "Поиск пользователей, каналов или #хэштега..."
- Подсказка под поиском: "Введите имя, @username, ID или #хэштег"

**Ссылки на профиль без @:**
- `app/search/page.tsx` — ссылка на профиль: `/${u.username}` (без `@`)
- Маршрут `app/[username]/page.tsx` сам добавляет `@` при необходимости

**Адаптивная высота для мобайла:**
- `app/globals.css` — добавлены утилиты `.h-screen` и `.min-h-screen` с `100dvh` (dynamic viewport height) — учитывает адресную строку браузера на мобайле

**Уведомления о подписке:**
- `app/api/users/[id]/follow/route.ts` — текст уведомления: `"подписался на вас"` → `"подписался (-ась) на вас"`

**SettingsModal — выпадающие списки:**
- `components/SettingsModal.tsx` — `DialogContent` получил `overflow-visible` вместо `overflow-hidden`; внутренний контейнер убрал `overflow-y-auto` — выпадающие списки больше не обрезаются

**Чеклист мобильной разработки:**
- `.amazonq/rules/checklist.md` — добавлен раздел "Фаза M" с этапами M0–M6 (Turborepo, Expo, авторизация, чат, push, нативные фичи, публикация)

### Проблемы / решения
- `decodeRoleEdge` использовал `sign` вместо `verify` для HMAC — результат всегда был неверным в prod → исправлено на `crypto.subtle.verify`
- `ConversationList` ссылался на удалённый `mainTab` state → убрано условие `mainTab === 'chats'`
- `ChannelView` содержал `AppNav` и страничную обёртку → убраны, компонент стал встраиваемым

### Коммит
```
feat(messages): integrate channels/groups into /messages, remove /channels page

- Move ChannelView from standalone page to embeddable component
- Remove AppNav and page wrapper from ChannelView
- Add onBack/onDelete/onLeave props to ChannelChat
- Show groups/channels in ConversationList sidebar
- Add create chat/group/channel modal (+ button)
- Fix encrypted last message preview (show 🔒 Сообщение)
- Fix 403 on /api/admin/users (decodeRoleEdge uses crypto.subtle.verify)
- Add NotificationsCenter to desktop sidebar
- Remove channels tab from navbar (desktop + mobile)
- Remove admin panel button from ProfileModal
- Remove online indicator from chat header avatar
- Fix own messages invisible in dark theme (dark:text-black)
- Add hashtag search support in /search (#query → channels only)
- Fix profile links without @ prefix
- Add adaptive height (100dvh) for mobile
- Update follow notification text to "подписался (-ась)"
- Fix dropdown overflow in SettingsModal
- Add mobile checklist M0–M6 to checklist.md
```

### Следующий шаг
- Завершить интеграцию `ChannelView` в `messages/page.tsx` (заменить return, убрать AppNav)
- Удалить `app/channels/page.tsx`
- Обновить `ConversationList` — клик по группе открывает `ChannelView` внутри `/messages`
- Мобильное приложение: M0 — инициализация Turborepo монорепо

---

## [2026-04-08] — Навбар, профиль, подписки, чеклист Desktop

### Сделано

**AppNav — иконка выхода:**
- `LogOut` → `DoorOpen` (иконка двери) — более интуитивная иконка выхода

**AppNav — кнопка админки:**
- `ProfileModal` — ссылка «Панель администратора» (Shield icon) возвращена, видна только `SUPER_ADMIN`

**AppNav — аватарка в мобайле:**
- Убрана обводка `ring-1 ring-border` у аватарки профиля в мобильном хотбаре

**ConversationList — кнопка +:**
- В режиме «Чаты» кнопка `+` теперь сразу открывает `UserSearch` (поиск пользователя)
- В режиме «Каналы» — открывает модалку создания канала/группы
- Убрана лишняя модалка выбора типа для чатов

**PublicProfile — подписчики/подписки:**
- Кнопки «подписчиков» и «подписок» показываются всегда (даже при 0)
- Клик на «подписчиков» → `FollowersModal` на вкладке «Подписчики»
- Клик на «подписок» → `FollowersModal` на вкладке «Подписки»

**profile/page.tsx — подписки:**
- Кнопка «подписок» теперь тоже кликабельна — открывает `FollowersModal` на вкладке «Подписки»
- Добавлен `followersTab` state для передачи `initialTab` в модалку

**Чеклист — Фаза D (Desktop):**
- Добавлены этапы D0–D3: Tauri, базовая интеграция, нативные фичи, сборка
- Трей-иконка, нативные уведомления, автозапуск, сворачивание в трей
- Сборка для Windows/macOS/Linux, code signing, автообновления

### Коммит
`feat(nav): admin button in ProfileModal, DoorOpen logout icon, remove avatar ring; feat(profile): followers/following modal always visible, following button opens modal; fix(conversations): chats + button opens UserSearch directly; feat(checklist): desktop app Tauri phase D added`

---

## [2026-04-10] — Выравнивание дизайна, исправление авторизации, TODO список

### Сделано

**Дизайн — выравнивание:**
- `app/onboarding/page.tsx` — нативные `<input>` заменены на `<Input>` из shadcn (как в login/register/recover), включая dark theme стили
- `app/profile/page.tsx` — нативный `<textarea>` в диалоге добавления фото заменён на `<Textarea>` из shadcn
- `app/channels/page.tsx` — входящие пузыри в `ChannelChat` получили `dark:bg-[oklch(0.26_0_0)] dark:ring-1 dark:ring-[oklch(1_0_0/15%)]` — совпадает с `ChatView`
- `app/channels/page.tsx` — инпут в панели настроек канала: `h-9` → `h-10`, добавлен `focus:ring-2 focus:ring-[--accent-brand]/20`

**Цвет пузырей сообщений — исправлен:**
- `app/globals.css` — `.msg-own` изменён с `background-color: var(--accent-brand)` (оранжевый) на `background-color: var(--foreground); color: var(--background)` — в светлой теме чёрные, в тёмной белые, как `btn-accent`
- `components/ChatView.tsx` — все `text-black` внутри своих пузырей заменены на `text-background`: время, галочки прочтения, reply preview, ring
- `app/channels/page.tsx` — пузыри своих сообщений в `ChannelChat`: `bg-[--accent-brand] text-black` → `bg-foreground text-background`

**Авторизация — редирект неавторизованных:**
- `hooks/useAuth.ts` — добавлен `usePathname` из `next/navigation`; после проверки сессии если пользователь не авторизован и текущий путь не в `AUTH_PATHS` (`/login`, `/register`, `/recover`) — вызывается `router.replace('/login')`
- Middleware уже делал SSR-редирект, теперь добавлен клиентский fallback

**Создан `.amazonq/todo.md`** — полный TODO список по приоритетам:
- 🔴 Критично: WebRTC звонки, голосовые сообщения, E2E для групп, мультидевайс QR
- 🟡 Важно: медиа/вложения, Redis, CDN
- 🟢 Улучшения: UI/UX, тесты, DevOps

### Коммит
`fix(design): uniform input components, msg-own foreground color, auth redirect on unauthenticated`

---

## [2026-04-10] — TODO выполнение: анализ бандла, счётчики, упоминания, тред, уведомления, санитизация, webhook

### Сделано

**Анализ бандла:**
- `npm install --save-dev @next/bundle-analyzer`
- `next.config.ts` — `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })`
- `package.json` — скрипт `"analyze": "ANALYZE=true next build"`
- Запуск: `npm run analyze`

**Счётчики непрочитанных — диалоги:**
- `app/api/messages/route.ts` — `POST`: при отправке сообщения `prisma.chatState.upsert` инкрементирует `unreadCount` получателя
- `app/api/messages/read/route.ts` — `POST`: при прочтении сбрасывает `unreadCount: 0` и обновляет `lastReadAt`

**Счётчики непрочитанных — каналы:**
- `prisma/schema.prisma` — добавлены `unreadCount Int @default(0)` и `lastReadAt DateTime?` в `ChannelMember`
- `prisma/migrations/add_channel_unread.sql` — `ALTER TABLE channel_members ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0`
- `app/api/channels/[id]/messages/route.ts` — `POST`: инкрементирует `unreadCount` всем участникам кроме отправителя
- `app/api/channels/[id]/read/route.ts` — новый эндпоинт `POST`: сбрасывает `unreadCount: 0` при открытии канала
- `app/api/channels/route.ts` — `GET`: возвращает `unreadCount` в ответе
- `app/channels/page.tsx` — `loadMessages` вызывает `/api/channels/[id]/read` при открытии; бейдж в `ChannelRow`; `handleSelectChannel` сбрасывает бейдж локально
- `components/ConversationList.tsx` — бейдж непрочитанных в списке каналов и групп

**Упоминания @username:**
- `components/MarkdownText.tsx` — добавлен парсинг `@username` → `<a href="/@username" class="md-mention">@username</a>`
- `app/globals.css` — стиль `.md-mention`: акцентный цвет, `font-weight: 600`, underline при hover
- `lib/schemas/messages.ts` — добавлено поле `mentions: z.array(z.string()).max(20).optional().nullable()`
- `app/api/messages/route.ts` — при наличии `mentions` создаёт `Notification` типа `mention` для каждого упомянутого пользователя
- `components/ChatView.tsx` — парсинг `/@([a-zA-Z][a-zA-Z0-9_]{2,19})/g` из текста перед отправкой, передача в `onSendMessage`
- `hooks/useMessages.ts` — `sendMessage` принимает `mentions?: string[] | null`, передаёт в API

**GET /api/messages/[id]/thread:**
- `app/api/messages/[id]/thread/route.ts` — новый эндпоинт: возвращает родительское сообщение + все ответы (`replyToId === id`), проверяет доступ (участник диалога или канала)

**UI треда:**
- `components/ChatView.tsx` — кнопка «Тред» в контекстном меню сообщения
- `openThread(msgId)` — загружает ответы через `/api/messages/[id]/thread`
- Панель треда — слайдер справа: список ответов с расшифровкой, поле ввода ответа в тред

**Настройки уведомлений:**
- `components/SettingsModal.tsx` — новая секция `notifications` с 5 тоглами: сообщения, реакции, упоминания, заявки в друзья, приглашения в каналы
- Настройки сохраняются в `localStorage` (`qvor_notif_settings`)
- Push-уведомления перенесены из секции `security` в `notifications`
- Пункт «Уведомления» добавлен в root-меню настроек

**Санитизация входных данных:**
- `app/api/channels/[id]/pin/route.ts` — добавлена Zod валидация `z.object({ pinned: z.boolean() })`
- `app/api/channels/[id]/route.ts` — `PATCH`: `name` и `description` проходят через `stripHtml`
- `app/api/stories/route.ts` — `caption` проходит через `stripHtml`

**Telegram Webhook:**
- `lib/bot/telegram.ts` — полный рефакторинг: singleton бот с Prisma (вместо отдельного PrismaClient в scripts/bot.ts), все обработчики команд и событий перенесены
- `app/api/bot/route.ts` — webhook эндпоинт: `POST /api/bot`, верификация через `TELEGRAM_WEBHOOK_SECRET`, `webhookCallback` из grammY
- `scripts/webhook.ts` — скрипт управления webhook: `set`/`delete`/`info`
- `package.json` — скрипты `bot:webhook:set`, `bot:webhook:delete`, `bot:webhook:info`
- `.env.example` — добавлена переменная `TELEGRAM_WEBHOOK_SECRET`

### Проблемы / решения
- `TS7006` в `messages/route.ts` на `.filter(u =>` — добавлены явные типы `(u: { id: string })`
- `ChannelView.tsx` — `{!embedded && (` открывало только первый `<div>`, остальные элементы были соседями → обёрнуты в один контейнер

### Коммит
`feat: bundle analyzer, unread counters (DMs+channels), @mentions (highlight+notify), thread API+UI, notification settings, input sanitization, Telegram webhook`

---

## [2026-04-10] — UI чатов: поиск, группы, навигация

### Сделано

**ConversationList — убрана кнопка "Личное сообщение":**
- Quick action кнопка под поиском удалена (`false &&` условие)

**ConversationList — поиск новых пользователей:**
- При активном поиске `getFilteredConvs()` возвращает пустой массив
- Результаты API (`searchResults`) показываются прямо в основном списке вместо отдельного дропдауна
- Пользователи и каналы/группы из поиска рендерятся в том же стиле что и обычные чаты (size-12 аватар, rounded-2xl)
- Клик на канал из поиска вызывает `onSelectChannel?.(ch.id)` вместо редиректа

**ConversationList — группы рядом с диалогами:**
- Убрана отдельная секция «Группы» внизу с заголовком
- Группы рендерятся в том же `<div className="px-2 py-1">` что и диалоги, после них
- Поддержка `selectedChannelId` — подсветка активной группы
- Бейдж непрочитанных у групп

**ConversationList — клик на канал/группу:**
- Добавлены props `selectedChannelId?: string` и `onSelectChannel?: (id: string) => void`
- `createGroup` и `createChannel` вызывают `onSelectChannel?.(id)` вместо `window.location.href`
- Вкладка «Каналы»: клик вызывает `onSelectChannel?.(ch.id)`

**messages/page.tsx — поддержка каналов:**
- Добавлен `selectedChannelId` state
- Функция `openChannel(channelId)` — сбрасывает selectedUserId, открывает канал
- `handleBack` сбрасывает и `selectedChannelId`
- При `selectedChannelId` рендерится `ChannelView` вместо `ChatView`
- `ConversationList` получает `selectedChannelId` и `onSelectChannel`

**ChannelView — embedded режим:**
- Добавлен флаг `embedded = !!initialChannelId`
- В embedded режиме боковой список скрыт
- Загрузка канала напрямую через `/api/channels/[id]` если не найден в списке
- Loading спиннер пока загружается канал
- Mobile back кнопка скрыта в embedded режиме (есть своя в ChannelChat)

### Проблемы / решения
- `ChannelView.tsx` build error: `Expected '</'. got '{'` на строке 641 — `{!embedded && (` открывало только первый `<div>` (заголовок), остальные элементы (Search, Tabs, список) были его соседями → обёрнуты в один `<div className="flex flex-col ...">` внутри условия

### Коммит
`feat(messages): groups inline with chats, search new users in list, channel/group click opens chat in /messages, remove personal message button`

---

## [2026-04-10] — WebRTC звонки + голосовые сообщения

### Сделано

**WebRTC звонки — сигналинг:**
- `lib/sse/broker.ts` — добавлены типы `call_offer`, `call_answer`, `call_ice`, `call_end`, `call_reject` в `SSEEvent` и `SSEEventLegacy`, expand-функции для каждого
- `hooks/useSSE.ts` — добавлены call-типы в `SSEEventType` и список прослушиваемых событий
- `app/api/calls/route.ts` — `POST /api/calls`: сигналинг offer/answer/ice/end/reject через SSE broker; Zod валидация discriminatedUnion; проверка существования получателя; для offer — загружает имя и аватар отправителя

**WebRTC звонки — хук:**
- `hooks/useWebRTC.ts` — P2P соединение через WebRTC:
  - STUN серверы: `stun:stun.l.google.com:19302` и `stun1`
  - `startCall(peerId, video)` — исходящий звонок: getUserMedia → createOffer → signal offer
  - `acceptCall()` — принять входящий: getUserMedia → createAnswer → signal answer
  - `rejectCall()` — отклонить: signal reject
  - `endCall()` — завершить: signal end, остановить треки, закрыть PC
  - `toggleMute()` / `toggleCamera()` — mute/unmute аудио/видео
  - Pending ICE candidates — буферизация до setRemoteDescription
  - Автоматическое завершение при `connectionState === 'disconnected'`
  - Cleanup при размонтировании

**WebRTC звонки — UI:**
- `components/CallView.tsx`:
  - `IncomingCallModal` — входящий звонок: аватар с анимацией, имя, тип (аудио/видео), кнопки принять/отклонить, звук рингтона
  - `ActiveCallView` — активный звонок: полноэкранный, remote video или аватар, local video PiP, таймер, кнопки mute/camera/end
- `components/ChatView.tsx`:
  - Импорты `useWebRTC`, `IncomingCallModal`, `ActiveCallView`, `VoiceRecorder`, `VoicePlayer`, `useSSE`
  - Кнопки 📞 и 📹 в header (только для не-Избранного)
  - SSE обработчики `call_offer/answer/ice/end/reject` через `useSSE`
  - `IncomingCallModal` и `ActiveCallView` рендерятся в конце компонента

**Голосовые сообщения — API:**
- `prisma/schema.prisma` — поля `voiceUrl String?` и `voiceDuration Int?` в модели `Message`
- `prisma/migrations/add_voice_messages.sql` — `ALTER TABLE messages ADD COLUMN IF NOT EXISTS voice_url TEXT; voice_duration INT`
- `app/api/voice/route.ts` — `POST /api/voice`: multipart/form-data, валидация MIME (webm/ogg/mp4/mpeg/wav), макс 10MB, сохранение в `public/voice/`, создание Message в БД, SSE push получателю, инкремент unreadCount

**Голосовые сообщения — UI:**
- `components/VoiceMessage.tsx`:
  - `VoiceRecorder` — запись через `MediaRecorder` API (Opus/WebM), автостарт при монтировании, анимация волны, стоп → превью → отправка, кнопка удаления, макс 5 минут
  - `VoicePlayer` — воспроизведение: кнопка play/pause, прогресс-бар с seek, таймер, иконка микрофона, адаптация под `isOwn`
- `components/ChatView.tsx`:
  - `showVoiceRecorder` state
  - Кнопка микрофона при пустом поле открывает `VoiceRecorder`
  - `VoiceRecorder` рендерится над полем ввода
  - Голосовые сообщения рендерятся в пузырях через `VoicePlayer` (проверка `msg.voiceUrl`)
- `hooks/useMessages.ts` — тип `Message` расширен: `voiceUrl?: string | null`, `voiceDuration?: number | null`
- `app/api/messages/route.ts` — `MSG_SELECT` расширен: `voiceUrl: true`, `voiceDuration: true`

### Проблемы / решения
- `TS7006` в `messages/route.ts` — `.filter(u =>` без типа → добавлены явные типы `(u: { id: string })`
- TypeScript 0 ошибок (`npx tsc --noEmit`)

### Коммит
`feat: WebRTC calls (P2P signaling via SSE, IncomingCallModal, ActiveCallView, useWebRTC); voice messages (MediaRecorder, VoiceRecorder, VoicePlayer, POST /api/voice)`

---

## [2026-04-10] — Фикс сборки ChannelView

### Сделано

**ChannelView.tsx — JSX синтаксическая ошибка:**
- Build error: `Expected '</'. got '{'` на строке 641
- Причина: `{!embedded && (` открывало только первый `<div>` (заголовок с кнопкой), а Search, Tabs и список были его соседями — JSX не позволяет несколько корневых элементов в одном выражении
- Решение: весь боковой список обёрнут в один `<div className="flex flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden ...">` внутри условия `{!embedded && (...)}`
- Также исправлен `className` main area: `!selected && !creating` → `!embedded && !selected && !creating`

**TypeScript — 0 ошибок:**
- `app/api/messages/route.ts` — `.filter(u =>` и `.map(u =>` получили явные типы `(u: { id: string })`
- `npx tsc --noEmit` — чисто

### Коммит
`fix(ChannelView): JSX syntax error — wrap sidebar in single root div inside embedded condition`

---

## [2026-04-10] — Hold-to-record, подтверждение звонка, реальные превью сообщений, вкладки каналов, аватарки

### Сделано

**Голосовые сообщения — hold-to-record:**
- `components/VoiceMessage.tsx` — полная переработка:
  - `useVoiceRecorder()` — хук с состояниями `idle | recording | locked | preview`
  - `VoiceMicButton` — кнопка с `onPointerDown/Move/Up` вместо тоггла
  - Удержание → запись начинается немедленно
  - Свайп вверх на 60px → lock режим (запись фиксируется, палец можно отпустить)
  - Отпустил < 1 сек → отмена; ≥ 1 сек → preview
  - В `recording` режиме: waveform анимация + таймер + подсказка `↑ зафикс.`
  - В `locked` режиме: 🗑 слева, waveform + 🔒 иконка, кнопка отправки справа
  - В `preview` режиме: `VoicePlayer` + 🗑 + отправка
  - `touch-none select-none` — предотвращает случайное выделение текста на мобиле
- `components/ChatView.tsx` — убран `showVoiceRecorder` state и оверлей; кнопка микрофона при пустом поле использует `VoiceMicButton` с hold-логикой

**WebRTC — подтверждение звонка:**
- `components/ChatView.tsx` — добавлен `callConfirm: { video: boolean } | null` state
- Кнопки 📞 и 📹 теперь открывают модалку подтверждения вместо немедленного звонка
- Модалка: аватар собеседника, имя, тип звонка, кнопки «Отмена» и «Позвонить»
- `webrtc.startCall()` вызывается только после подтверждения

**Permissions Policy — исправлен:**
- `next.config.ts` — `camera=(), microphone=()` → `camera=(self), microphone=(self)`
- Браузер больше не блокирует `getUserMedia()` для WebRTC и голосовых сообщений

**Реальное последнее сообщение в списке чатов:**
- `app/api/conversations/route.ts` — добавлен `lastMessageSenderName`:
  - Для исходящих: `'Вы'`
  - Для входящих: `displayName || username || 'User N'`
- `app/api/channels/route.ts` — добавлены `lastMessage` и `lastMessageSenderName` из последнего сообщения канала/группы (с проверкой `iv` на plain/encrypted)
- `hooks/useMessages.ts` — тип `Conversation` расширен: `lastMessageSenderName?: string | null`
- `components/ConversationList.tsx` — диалоги показывают `Имя: текст` как в TG (имя серым, текст обычным); группы и каналы тоже показывают превью с именем отправителя и временем

**Категория только для каналов:**
- `components/ChannelView.tsx` — форма создания: `{channelType === 'CHANNEL' && <категория>}` — у групп категория не показывается
- Панель настроек канала: `{settingsType === 'CHANNEL' && <категория>}` — аналогично

**Вкладки каналов — переделаны в TG-стиль:**
- Старые вкладки «Все / Каналы / Группы / Публичные» заменены на таблетки:
  - «Все» — все каналы и группы пользователя
  - «Группы» — только `type === 'GROUP'`
  - «Новости» / «Блоги» / «Мемы» / «Другое» — каналы по категории
  - «Публичные» — публичные каналы с группировкой по категориям
- Активная вкладка: `bg-[--accent-brand] text-black`; неактивная: `bg-muted`

**Аватарка при создании канала/группы:**
- `components/ChannelView.tsx` — форма создания:
  - Круглый превью 64px с иконкой по умолчанию (Hash для канала, MessagesSquare для группы)
  - Клик → `<input type="file" accept="image/*">` → превью через `URL.createObjectURL`
  - После создания канала — загрузка аватарки через `POST /api/channels/[id]/avatar`
  - Аватарка применяется к созданному каналу сразу

### Проблемы / решения
- `TS2741` в `conversations/route.ts` — объект `favorites` не имел `lastMessageSenderName` → добавлен `lastMessageSenderName: null`
- `handleSelectChannel` не был определён в `ChannelView` → добавлена функция с локальным сбросом `unreadCount`

### Коммит
`feat: hold-to-record voice (lock on swipe up), call confirm modal, real last message preview with sender name, channel tabs as TG pills (categories+groups+public), avatar on channel create, category only for channels; fix: Permissions-Policy camera+microphone`

---

## [2026-04-10] — Звуки, полировка голосовых, исправления звонков, TURN сервер

### Сделано

**Фикс 400 Invalid audio type:**
- `app/api/voice/route.ts` — заменён жёсткий список `ALLOWED_TYPES` на функцию `isAudioType()`: принимает любой `audio/*` тип, а также `video/webm` и `video/mp4` (Chrome записывает голос в video/webm)
- Расширено определение расширения файла: ogg, m4a, mp3, wav, webm

**Голосовые сообщения — TG-стиль:**
- `components/VoiceMessage.tsx` — полная переработка:
  - `useVoiceRecorder` — добавлена реальная визуализация волны через `AnalyserNode` (Web Audio API): `startWaveform()` читает частоты микрофона 60 раз/сек
  - Компонент `Waveform` — 40 баров, высота из данных анализатора; в `VoicePlayer` — статичная псевдо-волна из хэша src, с прогрессом воспроизведения (заполненные/незаполненные бары)
  - `VoiceRecordingBar` — отдельный компонент, рендерится **над** полем ввода; состояния: `recording` (волна + таймер + подсказка ↑), `locked` (🗑 + волна + 🔒 + Send), `preview` (🗑 + VoicePlayer + Send)
  - `VoiceMicButton` — показывается только в `idle` состоянии
- `components/ChatView.tsx`:
  - `VoiceRecordingBar` рендерится над полем ввода когда `voiceRecorder.state !== 'idle'`
  - Поле ввода скрывается во время записи
  - **Send/Mic логика**: если есть текст → кнопка Send; если поле пустое → кнопка Mic (hold-to-record)

**Звуки:**
- `lib/sounds.ts` — новая утилита:
  - Web Audio API (без файлов): `messageSent`, `messageInChat`, `voiceStart`, `voiceCancel`, `voiceSent`, `callConnected`, `callEnded`
  - MP3 файлы (зацикленные): `callRingtone()` → `ringtone-incoming.mp3`, `callOutgoing()` → `ringtone-outgoing.mp3`
  - MP3 файл (одиночный): `messageOutChat()` → `message-out-chat.mp3`
- `components/ChatView.tsx` — звуки подключены:
  - `messageSent()` при отправке текста
  - `messageInChat()` если сообщение от собеседника в открытом чате
  - `messageOutChat()` если сообщение из другого чата
- `hooks/useWebRTC.ts` — звуки в хуке:
  - `callOutgoing()` при старте исходящего звонка (зациклен)
  - `callConnected()` при получении answer (+ остановка outgoing рингтона)
  - `callEnded()` при завершении/отклонении (+ остановка outgoing рингтона)
- `components/CallView.tsx` — `callRingtone()` при входящем звонке (зациклен, останавливается при принятии/отклонении)

**Исправления звонков:**
- `components/CallView.tsx` — кнопки исправлены: отклонить (красная 🔴) слева, принять (зелёная 🟢) справа; подписи под кнопками
- Статусы звонка переработаны в TG-стиле:
  - 🟡 `calling` → «Соединение...» (жёлтая точка, пульс)
  - 🟡 `connecting` → «Подключение...» (жёлтая точка, пульс) — новое состояние
  - 🟢 `connected` → таймер `00:00` (зелёная точка)
  - 🔴 `ended` → «Звонок завершён» (красная точка)
  - Имя собеседника всегда отображается крупным шрифтом над статусом
- `hooks/useWebRTC.ts` — добавлено состояние `connecting` в `CallState`, срабатывает при `pc.connectionState === 'connecting'`

**TURN сервер:**
- `hooks/useWebRTC.ts` — функция `getIceServers()`: добавляет TURN если заданы `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL`
- `.env.example` — добавлены переменные TURN сервера
- Конфигурация: `turn:qvor.ru:3478`, credentials в `.env.local`

### Коммит
`feat: sounds (Web Audio + MP3 ringtones/notifications), voice TG-style (waveform, VoiceRecordingBar, Send/Mic toggle), fix: voice 400 accept any audio/*, fix: call buttons order + status (Connecting/Linking/timer), feat: TURN server via env`

---

## [2026-04-11] — v0.5.0: WebSocket сигналинг, звонки, голосовые, переводы, фиксы чата

### Сделано

**WebSocket сигналинг для WebRTC:**
- `app/api/auth/ws-token/route.ts` — новый эндпоинт `GET /api/auth/ws-token`: выдаёт короткоживущий JWT (2 мин) специально для WS handshake — `access_token` httpOnly недоступен из JS
- `hooks/useWebRTC.ts` — `getCookie()` заменён на `fetchWsToken()`: получает токен через API вместо чтения httpOnly cookie
- `scripts/ws-signal.ts` — WebSocket сервер на порту 3001, аутентификация через JWT в query string
- `nginx.conf` — `location /ws` проксирует на `qvor_ws` upstream (порт 3001)
- `ecosystem.config.js` — процесс `qvor-ws` запускает `scripts/ws-signal.ts` через tsx

**Звонки — фиксы:**
- Кнопки перепутаны: зелёная «Принять» теперь слева, красная «Отклонить» справа (было наоборот)
- Рингтон не останавливался после сброса: добавлен `stopIncomingRingtone` ref в `useWebRTC`, вызывается в `acceptCall`, `rejectCall`, `endCall`, `handleEnd`, `handleReject`
- `handleEnd` теперь матчит по `callId` ИЛИ по `from` ИЛИ по `incomingCall` — раньше при входящем звонке `callIdRef` был null у получателя и рингтон не останавливался
- `myAvatar` в `ActiveCallView` показывал аватар собеседника — исправлено передачей `user.avatarUrl` из `messages/page.tsx` через новый проп `myAvatarUrl`
- Аватарка собеседника по центру экрана в аудиорежиме с именем под ней
- Кнопка сворачивания звонка в PiP-виджет (`Minimize2`/`Maximize2`), плавающий в правом нижнем углу
- `CallProvider` перенесён в `app/layout.tsx` — входящий звонок виден на всех страницах
- `IncomingCallModal` и `ActiveCallView` убраны из `ChatView`, звонки управляются глобально

**Голосовые сообщения — фикс 404:**
- `app/api/voice/[filename]/route.ts` — новый GET эндпоинт: читает файл с диска и отдаёт с правильным `Content-Type` + `Accept-Ranges`
- `voiceUrl` изменён с `/voice/filename` на `/api/voice/filename` — не зависит от nginx конфига
- Waveform в preview передаётся реальный из записи (не псевдо-хэш)

**Чат — скролл к последним сообщениям:**
- `scrollIntoView` заменён на `container.scrollTop = container.scrollHeight` + `requestAnimationFrame` для второго прохода
- `initialScrollDone.current = false` при смене чата — сброс при переключении диалога
- Кнопка «↓» использует `scrollTop = scrollHeight` вместо `scrollIntoView`

**Удаление сообщений из БД:**
- `DELETE /api/messages/[id]` с `mode: 'all'` теперь делает `prisma.message.delete()` (hard delete) вместо `update({ deletedAt })`
- `mode: 'self'` по-прежнему пишет в `hidden_messages`

**E2E шифрование — Избранное:**
- Чат «Избранное» теперь шифрует сообщения собственным публичным ключом (раньше отправлял plaintext)

**Reply preview — обрезка:**
- `max-w-[200px]` + `line-clamp-1` + `.slice(0, 80)` — длинные цитаты не раздувают пузырь
- Зашифрованные сообщения в цитате показывают `🔒` вместо пустоты
- `msg.replyTo.sender?.` — optional chaining (sender может быть null)

**Ширина пузыря:**
- `max-w-[65%]` на мобайле, `sm:max-w-[72%]` на десктопе

**ChannelRow — последние сообщения:**
- Добавлены поля `lastMessage`, `lastMessageSenderName`, `unreadCount` в тип `Channel`
- `ChannelRow` показывает время, превью последнего сообщения с именем отправителя, бейдж непрочитанных

**Аватар канала в настройках:**
- Панель настроек канала: кликабельный аватар с загрузкой файла
- При сохранении загружается через `POST /api/channels/[id]/avatar`
- `settingsAvatarPreview` и `settingsAvatarFile` state в `ChannelChat`

**Сохранение чата при перезагрузке:**
- `openChat` пишет `?id=userId` или `?favorites=1` в URL через `history.replaceState`
- `openChannel` пишет `?channel=channelId`
- `searchParams` читает `channel` параметр при загрузке

**Переводы — полная синхронизация:**
- Убраны все дублирующиеся ключи из `en.json` и `ru.json`
- Добавлено 152 новых ключа — итого 407 ключей в каждом файле, полная синхронность
- Все хардкоженные русские строки заменены на `t()` во всех компонентах:
  - `ChannelView`, `CallView`, `ChatView`, `AppNav`, `SettingsModal`, `StoriesBar`
  - `ProfileSettingsModal`, `PublicProfile`, `VoiceMessage`
  - `admin/page.tsx`, `search/page.tsx`, `profile/page.tsx`
- `useTranslation` добавлен в `ChannelView`, `CallView`, `StoriesBar`, `admin/page.tsx`, `search/page.tsx`

**charAt crash — глобальный фикс:**
- Все `.charAt(0)` защищены `(value || '?').charAt(0)` во всех компонентах
- `msg.sender?.` — optional chaining в ChannelView (оптимистичные сообщения без sender)
- Невалидный паттерн `obj.(prop || "?")` исправлен на `(obj.prop || "?")` в admin/page.tsx

**Адаптивный layout /messages:**
- Два отдельных дерева desktop/mobile заменены одним — компоненты не пересоздаются при ресайзе
- CSS классы управляют видимостью: мобайл скрывает список при открытом чате, десктоп показывает оба

### Проблемы / решения
- `perl -i -pe` вставлял `t()` внутрь строковых атрибутов JSX (`label="t(\"key\")"`) — исправлено вручную через `fsReplace`
- `perl` заменял `c.name.charAt` на `c.(name || "?").charAt` (невалидный JS) — исправлено через `sed`
- `handleEnd` не останавливал рингтон при входящем звонке: `callIdRef` был null у получателя → добавлена проверка по `incomingCall`

### Коммит
`fix: WebSocket signaling via ws-token API (httpOnly cookie workaround), call ringtone stops on all end scenarios, call buttons order, myAvatar fix, call minimize PiP, peer avatar centered, chat URL persistence on reload, hard delete messages, voice 404 fix via /api/voice/[filename], reply preview truncated, bubble max-w reduced, ChannelRow lastMessage+unread, channel avatar in settings, 407 i18n keys (en+ru synced, no duplicates), all hardcoded RU strings replaced with t(), charAt crash fixed globally, adaptive messages layout (single DOM tree)`

---

## [2026-04-15] — Фикс голосовых сообщений + регистрация UX + авторизация через ТГ бота

### Сделано

**Баг: голосовые сообщения отображались как 🔒:**
- Корневая причина: `iv = 'voice'` проходил `isEncrypted()` как `true` → система пыталась расшифровать `ciphertext = '[voice]'` → падала → записывала `'🔒'` в `decrypted` Map → рендерился `MarkdownText` с текстом `'🔒'` вместо `VoicePlayer`
- `components/ChatView.tsx` — добавлен флаг `isVoice = !!(msg as any).voiceUrl`; голосовые пропускают расшифровку (возвращают `''`); `isVoice` проверяется первым в тернарном операторе рендера (до `callType`, `displayText === null`)
- `app/api/conversations/route.ts` — `safeLastMessage` теперь принимает `voiceUrl` и возвращает `'🎤 Голосовое'` для голосовых; `voice_url` добавлен в SQL SELECT и тип `RawConv`

**Регистрация — разбивка шага credentials:**
- Шаг `credentials` разбит на два: `password` (пароль + подтверждение) → `passphrase` (кодовая фраза + подсказка)
- Компонент `PasswordStep` — пароль + подтверждение с галочкой ✓ при совпадении; кнопка активна только при длине ≥ 8 и совпадении паролей; пароль сохраняется в `form.password` и передаётся на шаг passphrase
- Компонент `PasswordInput` — иконки `Eye`/`EyeOff` (lucide-react) вместо emoji 👁/🙈
- Компонент `HintPicker` — Apple-стиль пикер: 12 пресетов в сетке 4×3, большой эмодзи + подпись, активный пресет с оранжевой рамкой + галочкой, `active:scale-95`, поле ввода с эмодзи слева при выборе пресета

**Авторизация через Telegram бота (ПК браузер):**
- `POST /api/auth/tg-auth` — генерирует токен + deeplink на бота
- `GET /api/auth/tg-auth/poll?token=` — поллинг: `pending` / `ready:login` (выставляет куки) / `ready:register` (возвращает `regToken`) / `expired`
- `lib/bot/telegram.ts` — обработчик `/start tgauth_{token}`: запрашивает контакт, при получении записывает номер в токен
- `components/TelegramAuthButton.tsx` — кнопка с поллингом каждые 2 сек, открывает бота, ждёт подтверждения, при `login` редиректит на `/`, при `register` вызывает `onRegisterReady(phone, regToken)`
- `lib/schemas/auth.ts` — `otpCode` опциональный, добавлен `regToken` как альтернатива OTP
- `app/api/auth/register/route.ts` — принимает `regToken` вместо OTP (номер верифицирован ботом)

**Выбор метода подтверждения при входе:**
- `GET /api/auth/otp-methods?phone=` — возвращает `{ tgCode, tgButton, gateway }` доступность методов
- `components/OtpMethodPicker.tsx` — три метода: код из ТГ бота / кнопка в ТГ боте / QVOR Gateway; недоступные серые с бейджем "недоступно"; загрузка методов при монтировании; переключение между методами кнопкой "← Другой способ"
- `app/(auth)/login/page.tsx` — шаг `otp` теперь рендерит `OtpMethodPicker`

### Коммит
`fix(voice): voice messages show as 🔒 — skip decryption for voice iv, render VoicePlayer first; fix(conversations): safeLastMessage returns 🎤 for voice, add voice_url to SQL; feat(register): split credentials into password+passphrase steps, Eye/EyeOff icons, Apple-style hint picker; feat(auth): TG bot auth for desktop browser (tg-auth API, TelegramAuthButton, bot handler), OtpMethodPicker with 3 methods`

---

## [2026-05-28] — TODO: баги, звонки, безопасность, бот

### Сделано

**Баг: чат с ботом QVOR не открывался:**
- `app/messages/page.tsx` — `openChat` теперь пропускает `fetch('/api/users/SYSTEM_BOT_ID')` для бота (бот не в таблице users → 404 → selectedUser сбрасывался). Добавлена проверка `isBotId = userId === '00000000-0000-0000-0000-000000000001'`

**Баг: последние сообщения показывали 🔒:**
- `app/api/conversations/route.ts` — `safeLastMessage` теперь принимает `voiceUrl` и возвращает `'🎤 Голосовое'`; `voice_url` добавлен в SQL SELECT и тип `RawConv`; аватары каналов уже сохранялись как base64 (баг был неактуален)

**Демонстрация экрана в звонках:**
- `hooks/useWebRTC.ts` — добавлен `shareScreen()`: `getDisplayMedia` → `replaceTrack` на существующем sender (без реnegotiation); при остановке демонстрации возвращается к камере; `screenTrack.onended` автоматически останавливает при закрытии браузерного диалога; экспортируется `isSharingScreen`
- `components/CallView.tsx` — кнопка Monitor/MonitorOff в Controls (активная — акцентный цвет); `isSharingScreen` и `onShareScreen` добавлены в `ActiveCallProps`
- `components/CallProvider.tsx` — передаёт `isSharingScreen` и `onShareScreen` в `ActiveCallView`

**Браузерные уведомления о звонке:**
- Уже были реализованы в `CallProvider.tsx` — `Notification API` с `requireInteraction: true`; отмечено как выполненное

**Rate limiting и MIME на /api/voice:**
- `app/api/voice/route.ts` — добавлен `rateLimit(request, 'messages')` (120 req/min); MIME валидация уже была через `isAudioType()`

**Команда /me в Telegram боте:**
- `lib/bot/telegram.ts` — команда `/me`: ищет пользователя по `telegramId`, возвращает имя, @username, #numericId, онлайн-статус в MarkdownV2; добавлен ключ `meNotLinked`; `/help` обновлён с упоминанием `/me`

### Коммит
`fix(bot-chat): skip fetch for SYSTEM_BOT_ID in openChat; fix(conversations): voice_url in SQL + safeLastMessage; feat(calls): screen share via getDisplayMedia + replaceTrack, Monitor button in ActiveCallView; feat(security): rate limit on /api/voice; feat(bot): /me command with account info`

---

## [2026-04-15] — E2E группы, анимация сообщений, rate limit бота

### Сделано

**E2E шифрование групповых чатов (Фаза 4.5):**
- `lib/crypto/e2e.ts` — добавлены функции: `generateChannelKey()`, `encryptChannelKey(key, recipientPublicKey)` (ephemeral ECDH + AES-GCM), `decryptChannelKey(encrypted, myPrivateKey)`, `encryptChannelMessage(plaintext, channelKeyHex)` (iv с префиксом `ch:`), `decryptChannelMessage(ciphertext, iv, channelKeyHex)`, `storeChannelKey/loadChannelKey` (IndexedDB)
- `hooks/useChannelCrypto.ts` — новый хук: `createChannelKey()` (генерирует + шифрует своим публичным ключом), `encryptForChannel()`, `decryptFromChannel()`, `encryptKeyForUser()` (для приглашения участника); кэш расшифрованных ключей в памяти
- `app/api/channels/[id]/key/route.ts` — новый `GET` эндпоинт: возвращает зашифрованный `channelKey` текущего пользователя
- `app/api/channels/route.ts` — `POST` принимает `encryptedChannelKey`, сохраняет в `ChannelMember.channelKey`
- `app/api/channels/[id]/members/route.ts` — `POST` принимает `encryptedChannelKey` для нового участника
- `components/ChannelView.tsx` — при создании канала генерируется `channelKey`; при отправке сообщения шифруется через `encryptForChannel`; при загрузке истории расшифровывается; SSE новые сообщения расшифровываются; при приглашении участника `channelKey` шифруется его публичным ключом; `decrypted` Map для хранения расшифрованных текстов

**Анимация новых сообщений:**
- `app/globals.css` — `@keyframes msg-in-own` (slide from right + scale) и `msg-in-other` (slide from left + scale) с `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring-эффект); классы `.msg-animate-own` и `.msg-animate-other`
- `hooks/useMessages.ts` — `newMsgIds: Set<string>` state; при получении нового сообщения через SSE добавляется в Set, удаляется через 500ms
- `components/ChatView.tsx` — `newMsgIds` проп; применяется `msg-animate-own/other` к пузырям из `newMsgIds`
- `app/messages/page.tsx` — `newMsgIds` деструктурируется из `useMessages` и передаётся в `ChatView`

**Rate limiting на привязку в Telegram боте:**
- `lib/bot/telegram.ts` — `checkLinkRateLimit(chatId)`: max 3 попытки в час через TempStore; применяется перед `linkPhone` в обработчике `message:contact`

**Редактирование/удаление в ChannelView:**
- Уже было реализовано ранее — отмечено как выполненное

### Коммит
`feat(e2e-groups): channelKey generation+encryption, useChannelCrypto hook, /api/channels/[id]/key, encrypt on send/decrypt on load in ChannelView, encrypt key for invited members; feat(ux): new message slide-in animation (spring cubic-bezier); feat(bot): rate limit link attempts (3/hour via TempStore)`

---

## [2026-04-15] — Переводы профиля, групповые звонки, мультидевайс

### Сделано

**Фикс переводов в профиле:**
- `app/profile/page.tsx` — исправлены артефакты `$1{t("$2")}$3` → `{t('profile.followers')}`, `{t('profile.following')}`, `{t('profile.photos')}`, `{t('profile.noPhotos')}`
- `components/PublicProfile.tsx` — те же артефакты исправлены; хардкоженные строки `'онлайн'`, `'Заблокировать'`, `'Разблокировать'` заменены на `t()`; `formatLastSeen` переведена на систему переводов

**Групповые звонки (mesh-топология):**
- `lib/sse/broker.ts` — добавлены типы `call_join` и `call_leave` в `SSEEvent`, `SSEEventLegacy` и `expand()`
- `hooks/useSSE.ts` — `call_join` и `call_leave` добавлены в `SSEEventType` и список событий
- `app/api/calls/route.ts` — добавлены сигналы `join` (уведомляет всех участников канала), `leave`, `offer_group` (P2P offer конкретному участнику)
- `hooks/useGroupCall.ts` — новый хук: mesh P2P, `startGroupCall(channelId, video)`, `leaveGroupCall()`, обработчики `handleJoin/handleLeave/handleGroupOffer/handleAnswer/handleIce`, `toggleMute/toggleCamera`
- `components/GroupCallView.tsx` — UI: адаптивная сетка (1→1col, 2→2col, 3-4→2col, 5+→3col), тайлы с видео/аватаром, controls (mute/camera/leave)
- `components/CallProvider.tsx` — интегрирован `useGroupCall`; SSE роутинг: `call_offer` при активном групповом звонке → `handleGroupOffer`; `call_join/leave` → группа; `startGroupCall` в контексте
- `components/ChannelView.tsx` — кнопки 📞 и 📹 в header `ChannelChat`, вызывают `startGroupCall(channel.id, channel.name, video)`

**Мультидевайс (QR-код):**
- `lib/crypto/e2e.ts` — `encryptPrivateKeyForDevice(privateKey, deviceEphemeralPublicKey)` и `decryptPrivateKeyFromDevice(encrypted, myEphemeralPrivate)` — ephemeral ECDH + AES-GCM
- `app/api/auth/device-link/route.ts` — `POST action:init` (регистрирует ephemeral ключ, возвращает токен), `POST action:transfer` (старое устройство передаёт зашифрованный ключ), `GET ?token=` (поллинг статуса)
- `app/device-link/page.tsx` — новое устройство: генерирует ephemeral ключ, показывает QR (через api.qrserver.com), поллит готовность, расшифровывает и сохраняет privateKey в IndexedDB
- `app/device-link/scan/page.tsx` — старое устройство: загружает ephemeral публичный ключ, шифрует свой privateKey, передаёт на сервер
- `components/SettingsModal.tsx` — кнопка "Добавить устройство" в секции Безопасность → `/device-link`
- Переводы: `settings.addDevice`, `deviceLink.*` (ru + en)

### Коммит
`fix(profile): replace $1{t("$2")}$3 artifacts with correct t() calls, formatLastSeen via i18n; feat(group-calls): mesh WebRTC via SSE (call_join/leave signals, useGroupCall hook, GroupCallView grid UI, ChannelView call buttons); feat(multidevice): QR-based key transfer (ephemeral ECDH, device-link API, /device-link page, /device-link/scan page, Settings button)`

---

## [2026-04-16] — Фиксы UI, уведомления, OTP в оба канала, контроль устройств

### Сделано

**Галочка в светлой теме при регистрации:**
- `app/(auth)/register/page.tsx` — `text-white` → `text-black` в SVG галочки чекбокса согласия (акцентный фон оранжевый, нужен чёрный цвет)

**Расшифровка превью сообщений в диалогах:**
- `components/ConversationList.tsx` — если `lastMessage` выглядит как base64 (длиннее 40 символов без пробелов) → показываем `🔒 Сообщение` вместо ciphertext

**Уведомления на десктопе:**
- `components/NotificationsCenter.tsx` — добавлен `sidebarExpanded` проп; в этом режиме рендерит кнопку в стиле nav-item с бейджем и раскрытым лейблом
- `components/AppNav.tsx` — заменена обёртка `button` на `<NotificationsCenter sidebarExpanded={expanded} />`

**OTP в оба канала:**
- `lib/auth/otp.ts` — для существующих пользователей OTP отправляется в QVOR бот (системный) И в Telegram бот параллельно; тип `'both'` добавлен; `deleteBotOtpMessage` удаляет OTP из QVOR бота после верификации

**Уведомление о входе:**
- `lib/auth/otp.ts` — `sendLoginNotification(phone, device)` отправляет в QVOR бот сообщение "Совершён вход с устройства: {UA}"
- `app/api/auth/verify-otp/route.ts` — вызывает `sendLoginNotification` после успешного входа; сохраняет сессию в `user_sessions`

**Контроль устройств:**
- `prisma/migrations/add_user_sessions.sql` — таблица `user_sessions` (id, user_id, refresh_token_hash, device, ip, last_active_at)
- `app/api/auth/sessions/route.ts` — `GET` список сессий, `DELETE ?id=` завершить одну, `DELETE ?all=1` завершить все кроме текущей
- `components/SettingsModal.tsx` — `SessionsSection` компонент: список устройств с иконками, кнопка "Завершить все другие сессии", дистанционный разлогин; кнопка "Активные устройства" в секции Безопасность

### Коммит
`fix(register): checkbox checkmark text-white→text-black; fix(conversations): show 🔒 instead of ciphertext in preview; fix(notifications): NotificationsCenter sidebarExpanded mode for desktop sidebar; feat(otp): send to both QVOR bot + Telegram bot in parallel; feat(auth): login notification in QVOR bot with device info; feat(sessions): user_sessions table, GET/DELETE API, SessionsSection in SettingsModal`
а
---

## [2026-05-28] — Система модерации и жалоб

### Сделано

**БД:**
- `prisma/migrations/add_reports.sql` — таблица `reports`: reporter_id, target_type (user/channel/message), target_id, reason (10 причин), comment, status (pending/reviewing/resolved/dismissed), moderator_id, moderator_note, action_taken; уникальный индекс на (reporter_id, target_type, target_id) WHERE pending/reviewing; автофлаг при 5+ жалобах → reviewing

**API:**
- `POST /api/reports` — подать жалобу; rate limiting; нельзя жаловаться на себя; при 5+ жалобах на цель → автоматически переводит в reviewing; 409 если уже жаловался
- `GET /api/admin/reports?status=&page=` — список жалоб с фильтрацией по статусу и типу цели; сортировка: reviewing первыми, потом по дате; счётчик жалоб на одну цель
- `PATCH /api/admin/reports` — принять решение: статус (resolved/dismissed), действие (none/warned/banned/deleted), заметка модератора; автоматически применяет действие (бан пользователя, удаление канала/сообщения); writeAudit

**Компонент ReportModal:**
- 10 причин с иконками; критические (CSAM, терроризм) выделены красным с предупреждением
- 3 шага: выбор причины → комментарий → подтверждение
- Защита от дублей (409 → понятное сообщение)
- Разные сроки рассмотрения в подтверждении (24ч для критических, 7 дней для остальных)

**Интеграция:**
- `PublicProfile.tsx` — кнопка "Пожаловаться" в дропдауне MoreVertical открывает ReportModal
- `ChannelView.tsx` — кнопка Flag в header канала (только для не-владельцев)

**Вкладка Жалобы в /admin:**
- Фильтр по статусу (Ожидают / На рассмотрении / Решены / Отклонены / Все)
- Бейдж с количеством на вкладке
- Карточки жалоб: причина, тип цели, счётчик жалоб на цель, автор, дата, комментарий, ID цели
- Критические жалобы выделены красным фоном
- Кнопка "Рассмотреть" → модальное окно с выбором действия (4 варианта) и заметкой модератора
- Кнопки "Отклонить" и "Принять решение"
- Пагинация

### Коммит
`feat(moderation): reports table migration, POST /api/reports (rate limit, dedup, auto-flag at 5+), GET/PATCH /api/admin/reports (filter, sort, resolve with action), ReportModal component (10 reasons, 3 steps, critical highlight), report button in PublicProfile + ChannelView, Reports tab in /admin with resolve modal`

---

## [2026-05-28] — Звонки, индикаторы, авторизация через email

### Сделано

**Звонки — enableVideo через replaceTrack:**
- `hooks/useWebRTC.ts` — `enableVideo`: если уже есть video sender → `replaceTrack` (без реnegotiation); если нет → `addTrack` (триггерит `onnegotiationneeded` → `offer_update`); корректная работа без `localStream`
- `shareScreen`: аналогично — `replaceTrack` если есть sender, иначе `addTrack`; при остановке демонстрации без камеры → `replaceTrack(null)` и `setIsVideoEnabled(false)`

**Индикаторы непрочитанных — количество диалогов:**
- `ConversationList.tsx` — бейдж "Все" и папок показывает количество диалогов с `unreadCount > 0`, а не сумму сообщений; максимум 99+
- `AppNav.tsx` — `unreadMessages` и `unreadMobile` — `filter(...).length` вместо `reduce(...sum)`

**Авторизация — убраны TG кнопки, добавлен email:**
- `app/(auth)/login/page.tsx` — убраны `TelegramAuthButton` и `TelegramLoginWidget`
- `components/OtpMethodPicker.tsx` — полностью переписан: 2 метода (email + консоль); если email нет — автоматически отправляет через консоль; кнопка "Отправить снова"
- `lib/auth/otp.ts` — `sendOtp` выводит код в консоль PM2 (`console.log`); отправляет на email если есть; `sendEmailOtp()` через nodemailer/SMTP с HTML шаблоном
- `app/api/auth/otp-methods/route.ts` — возвращает `{ email, tgCode, tgButton, gateway }`
- `prisma/schema.prisma` + `migrations/add_user_email.sql` — поле `email String? @unique`
- `app/api/users/me/route.ts` — `email` в updateSchema, SELECT, updateData
- `hooks/useAuth.ts` — `email` в типе `AuthUser`

**Запрос email после входа:**
- `components/EmailSetupModal.tsx` — появляется через 2 сек после входа если нет email; кнопка "Позже" (сессионный dismiss); сохраняет через PATCH /api/users/me; подтверждение с анимацией
- `app/layout.tsx` — `<EmailSetupModal />` внутри `CallProvider`

### Коммит
`fix(calls): enableVideo/shareScreen via replaceTrack instead of addTrack; fix(badges): show count of unread conversations not sum of messages; feat(auth): remove TG buttons from login, OtpMethodPicker with email+console methods, sendOtp logs to PM2 console, sendEmailOtp via SMTP; feat(email): add email field to User, PATCH /api/users/me, EmailSetupModal after first login`

---

## [2026-05-28] — Медиа вложения (Фаза 10)

### Сделано

**БД:**
- `prisma/migrations/add_media_attachments.sql` — поля `media_url`, `media_type`, `media_name`, `media_size` в таблице `messages`
- `prisma/schema.prisma` — `mediaUrl`, `mediaType`, `mediaName`, `mediaSize` в модели `Message`

**API:**
- `POST /api/upload` — загрузка файла (изображения, видео, документы); rate limiting; валидация MIME; сохранение в `public/uploads/{images|videos|files}/`; возвращает `{ url, mediaType, mediaName, mediaSize }`
- `GET /api/upload/[...filename]` — отдача файлов с правильным Content-Type и Cache-Control: immutable
- `app/api/messages/route.ts` — `MSG_SELECT` расширен медиа полями; `POST` принимает и сохраняет медиа
- `lib/schemas/messages.ts` — `sendMessageSchema` расширена медиа полями

**Компоненты:**
- `MediaAttachment` — рендер вложений в пузырях: изображения (лайтбокс по клику + кнопка скачать), видео (встроенный плеер), файлы (иконка по типу + имя + размер + скачать); адаптация цветов под `isOwn`
- `MediaUploadButton` — кнопка скрепки в поле ввода; превью выбранного файла над полем; спиннер при загрузке; кнопка очистки

**Интеграция в ChatView:**
- `isMedia` флаг рядом с `isVoice`/`isCallMsg`
- `pendingMedia` state
- `handleSend` — разрешает отправку только с медиа (без текста); передаёт медиа в `onSendMessage`
- `MediaUploadButton` в поле ввода рядом с VoiceMicButton
- `MediaAttachment` в рендере пузырей
- `onSendMessage` сигнатура расширена параметром `media`

**useMessages:**
- `sendMessage` принимает `media` параметр; добавляет в оптимистичное сообщение и в тело запроса

### Коммит
`feat(media): file attachments in chat — POST /api/upload (images/video/docs up to 50MB), GET /api/upload/[...filename], MediaAttachment component (lightbox/video/file), MediaUploadButton in ChatView input, media fields in Message schema and MSG_SELECT`


---

## [2026-05-07] — Email-авторизация + индикаторы как в Telegram

### Сделано

**Email-авторизация — полная система:**
- `lib/email/mailer.ts` — nodemailer интеграция с SMTP, функция `sendAuthCode(email, code, lang)`, автоматический fallback на консоль если нет SMTP_URL
- `lib/email/templates/auth-code.html` + `auth-code-en.html` — HTML-шаблоны писем в стиле QVOR (чёрный градиентный хедер, код в рамке, предупреждение о безопасности), поддержка ru/en
- `POST /api/auth/send-email-otp` — отправка OTP на email с rate limiting (5 req/min)
- `POST /api/users/me/email` — добавление/изменение email с верификацией кодом
- `DELETE /api/users/me/email` — удаление email
- `GET /api/auth/otp-methods` — получение доступных методов OTP (email/telegram/console)
- `lib/auth/otp.ts` — расширен: `storeOtp(key, code)` и `verifyOtp(key, code)` с универсальным ключом вместо только телефона; `sendOtp` поддерживает выбор канала (email/telegram/console)
- `.env.example` — добавлены примеры SMTP конфигурации для Yandex Mail и Gmail

**Email в настройках:**
- `components/SettingsModal.tsx` — новая секция Email в Security: двухшаговая форма (ввод email → код подтверждения), отображение текущего email, кнопка удаления
- `app/(auth)/login/page.tsx` — промежуточный шаг для пользователей без email: при входе проверяется наличие email через `/api/auth/otp-methods`, если нет → показывается форма добавления email перед OTP
- `components/OtpMethodPicker.tsx` — интеграция выбора метода OTP: email/console, автоопределение доступных методов

**Индикаторы непрочитанных — как в Telegram:**
- `components/AppNav.tsx` — десктопный сайдбар: точка когда свёрнут, счётчик когда развёрнут (size-5 вместо size-4)
- `components/AppNav.tsx` — мобильный хотбар: точка вместо счётчика для сообщений и уведомлений
- `components/NotificationsCenter.tsx` — точка в свёрнутом сайдбаре, счётчик в развёрнутом (size-5)
- Минималистичный дизайн: точка `size-2` с `bg-[--accent-brand]`, без текста

**Документация:**
- `docs/email-auth.md` — полная документация: настройка SMTP (Yandex Mail + Gmail), использование, структура файлов, безопасность

### Проблемы / решения
- `verifyAuth` не существовал в `middleware/auth.ts` → исправлено на `auth`
- `verifyOtp` принимал только `phone` → расширен на универсальный `key` (например `email:user@example.com`)
- Все вызовы `verifyOtp` обновлены с `otp:${phone}` префиксом

### Коммит
`feat(email-auth): complete email authorization system — nodemailer SMTP integration, HTML templates (ru/en), send-email-otp API, email management in settings, OTP method picker with email support, email setup step in login flow; feat(ui): Telegram-style unread indicators — dot when collapsed, counter when expanded in sidebar and mobile hotbar`

### Следующий шаг
- Шаблоны писем для уведомления о входе и восстановления пароля
- Поддержка SendGrid/Resend вместо SMTP
- Настройка частоты email-уведомлений
